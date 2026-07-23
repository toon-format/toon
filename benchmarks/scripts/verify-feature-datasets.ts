import type { Contact, FeatureFlag } from '../src/datasets.ts'
import type { Dataset } from '../src/types.ts'
import process from 'node:process'
import { encode } from '../../packages/toon/src/index.ts'
import { ACCURACY_DATASETS, TOKEN_EFFICIENCY_DATASETS } from '../src/datasets.ts'
import { generateQuestions } from '../src/questions/index.ts'

const failures: string[] = []

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failures.push(message)
    console.error(`FAIL: ${message}`)
  }
}

function printHead(label: string, encoded: string): void {
  console.log(`\n=== ${label} (first 5 lines) ===`)
  console.log(encoded.split('\n').slice(0, 5).join('\n'))
}

function findDataset(datasets: Dataset[], name: string): Dataset {
  const dataset = datasets.find(d => d.name === name)
  if (!dataset)
    throw new Error(`Dataset '${name}' not found`)

  return dataset
}

// Keyed tabular form: `flags[N:]{fields}:` with one entry row per flag
function verifyKeyed(label: string, dataset: Dataset): void {
  const flags = dataset.data.flags as Record<string, FeatureFlag>
  const encoded = encode(dataset.data)
  printHead(label, encoded)

  const header = encoded.match(/^flags\[(\d+):\]\{/m)
  assert(header !== null, `${label}: expected keyed tabular header \`flags[N:]{...\``)

  if (header) {
    const declaredCount = Number(header[1])
    assert(
      declaredCount === Object.keys(flags).length,
      `${label}: header count ${declaredCount} !== entry count ${Object.keys(flags).length}`,
    )
  }

  // A plain-object fallback would emit a bare `flags:` header with per-key expansion
  assert(
    !/^flags:\s*$/m.test(encoded),
    `${label}: encoder fell back to plain per-key objects (bare \`flags:\` header present)`,
  )
}

// Nested field groups: a tabular header carrying an inner brace group
function verifyNestedGroup(label: string, dataset: Dataset): void {
  const contacts = dataset.data.contacts as Contact[]
  const encoded = encode(dataset.data)
  printHead(label, encoded)

  const header = encoded.match(/^contacts\[(\d+)\]\{[^\n]*\{/m)
  assert(header !== null, `${label}: expected nested field group header \`contacts[N]{...{...\``)

  if (header) {
    const declaredCount = Number(header[1])
    assert(
      declaredCount === contacts.length,
      `${label}: header count ${declaredCount} !== row count ${contacts.length}`,
    )
  }
}

// Re-derive each generated ground truth from the dataset object in code
function verifyKeyedGroundTruth(): void {
  const flags = findDataset(ACCURACY_DATASETS, 'keyed').data.flags as Record<string, FeatureFlag>
  const entries = Object.entries(flags)
  const questions = generateQuestions().filter(q => q.dataset === 'keyed')
  assert(questions.length > 0, 'keyed: no questions generated')

  for (const question of questions) {
    const { prompt, groundTruth } = question
    let expected: string | undefined

    let match = prompt.match(/rollout percentage of flag `(.+?)`/)
    if (match) {
      expected = String(flags[match[1]!]!.rollout)
    }
    else if ((match = prompt.match(/Who owns flag `(.+?)`/))) {
      expected = flags[match[1]!]!.owner
    }
    else if ((match = prompt.match(/Is flag `(.+?)` enabled/))) {
      expected = flags[match[1]!]!.enabled ? 'yes' : 'no'
    }
    else if ((match = prompt.match(/owner of the last flag \(`(.+?)`\)/))) {
      expected = flags[match[1]!]!.owner
    }
    else if (prompt === 'How many flags are defined?') {
      expected = String(entries.length)
    }
    else if (prompt.startsWith('List the field names for each flag')) {
      expected = 'enabled,rollout,owner,updatedAt'
    }
    else if (prompt === 'What is the 2nd field name for each flag?') {
      expected = 'rollout'
    }
    else if (prompt === 'How many fields does each flag record have?') {
      expected = '4'
    }

    assert(expected !== undefined, `keyed: no derivation for prompt "${prompt}"`)
    assert(expected === groundTruth, `keyed: derived "${expected}" !== groundTruth "${groundTruth}" for "${prompt}"`)
  }
}

function verifyNestedGroupGroundTruth(): void {
  const contacts = findDataset(ACCURACY_DATASETS, 'nested-group').data.contacts as Contact[]
  const byName = (name: string): Contact[] => contacts.filter(c => c.name === name)
  const questions = generateQuestions().filter(q => q.dataset === 'nested-group')
  assert(questions.length > 0, 'nested-group: no questions generated')

  const lastContact = contacts.at(-1)!

  for (const question of questions) {
    const { prompt, groundTruth } = question
    let isDerivable = false
    let match: RegExpMatchArray | null = null

    if (prompt === 'How many contacts are in the dataset?') {
      isDerivable = groundTruth === String(contacts.length)
    }
    else if (prompt.startsWith('List the top-level field names for contacts')) {
      isDerivable = groundTruth === 'name,age,email,address,plan'
    }
    else if (prompt.startsWith('What are the field names within a contact\'s address')) {
      isDerivable = groundTruth === 'city,country'
    }
    else if (prompt.startsWith('What are the field names within a contact\'s plan')) {
      isDerivable = groundTruth === 'name,price'
    }
    else if (prompt === 'What is the 3rd top-level field name for contacts?') {
      isDerivable = groundTruth === 'email'
    }
    else if (prompt === 'What country does the last contact in the dataset live in?') {
      isDerivable = groundTruth === lastContact.address.country
    }
    else if ((match = prompt.match(/What city is (.+?)'s address in\?/))) {
      isDerivable = byName(match[1]!).some(c => c.address.city === groundTruth)
    }
    else if ((match = prompt.match(/What country does (.+?) live in\?/))) {
      isDerivable = byName(match[1]!).some(c => c.address.country === groundTruth)
    }
    else if ((match = prompt.match(/What plan is (.+?) on\?/))) {
      isDerivable = byName(match[1]!).some(c => c.plan.name === groundTruth)
    }
    else if ((match = prompt.match(/What is the price of (.+?)'s plan\?/))) {
      isDerivable = byName(match[1]!).some(c => String(c.plan.price) === groundTruth)
    }
    else if ((match = prompt.match(/How old is (.+?)\?/))) {
      isDerivable = byName(match[1]!).some(c => String(c.age) === groundTruth)
    }
    else {
      failures.push(`nested-group: no derivation for prompt "${prompt}"`)
      console.error(`FAIL: nested-group: no derivation for prompt "${prompt}"`)
      continue
    }

    assert(isDerivable, `nested-group: groundTruth "${groundTruth}" not derivable for "${prompt}"`)
  }
}

verifyKeyed('keyed (accuracy)', findDataset(ACCURACY_DATASETS, 'keyed'))
verifyKeyed('keyed (token efficiency)', findDataset(TOKEN_EFFICIENCY_DATASETS, 'keyed'))
verifyNestedGroup('nested-group (accuracy)', findDataset(ACCURACY_DATASETS, 'nested-group'))
verifyNestedGroup('nested-group (token efficiency)', findDataset(TOKEN_EFFICIENCY_DATASETS, 'nested-group'))
verifyKeyedGroundTruth()
verifyNestedGroupGroundTruth()

console.log(`\nTotal questions: ${generateQuestions().length}`)

if (failures.length > 0) {
  console.error(`\n${failures.length} assertion(s) failed`)
  process.exit(1)
}

console.log('\nAll feature dataset assertions passed')
