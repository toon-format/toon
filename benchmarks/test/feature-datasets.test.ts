import type { Contact, FeatureFlag } from '../src/datasets.ts'
import type { Dataset } from '../src/types.ts'
import { describe, expect, it } from 'vitest'
import { encode } from '../../packages/toon/src/index.ts'
import { ACCURACY_DATASETS, TOKEN_EFFICIENCY_DATASETS } from '../src/datasets.ts'
import { generateQuestions } from '../src/questions/index.ts'

describe.each([
  ['accuracy', ACCURACY_DATASETS],
  ['token efficiency', TOKEN_EFFICIENCY_DATASETS],
])('%s datasets', (_label, datasets) => {
  it('encode the flags in keyed tabular form', () => {
    const { data } = findDataset(datasets, 'keyed')
    const flagCount = Object.keys(data.flags as Record<string, FeatureFlag>).length

    expect(encode(data)).toMatch(new RegExp(`^flags\\[${flagCount}:\\]\\{`, 'm'))
  })

  it('encode the contacts with nested field groups', () => {
    const { data } = findDataset(datasets, 'nested-group')
    const contactCount = (data.contacts as Contact[]).length

    expect(encode(data)).toMatch(new RegExp(`^contacts\\[${contactCount}\\]\\{[^\\n]*\\{`, 'm'))
  })
})

describe('ground truths', () => {
  it('derive from the keyed flags', () => {
    const flags = findDataset(ACCURACY_DATASETS, 'keyed').data.flags as Record<string, FeatureFlag>
    const questions = generateQuestions().filter(question => question.dataset === 'keyed')
    expect(questions).not.toHaveLength(0)

    for (const { prompt, groundTruth } of questions)
      expect(deriveKeyedAnswer(flags, prompt), prompt).toBe(groundTruth)
  })

  it('derive from the nested-group contacts', () => {
    const contacts = findDataset(ACCURACY_DATASETS, 'nested-group').data.contacts as Contact[]
    const questions = generateQuestions().filter(question => question.dataset === 'nested-group')
    expect(questions).not.toHaveLength(0)

    for (const { prompt, groundTruth } of questions)
      expect(isNestedGroupAnswerDerivable(contacts, prompt, groundTruth), `${prompt} → ${groundTruth}`).toBe(true)
  })
})

function findDataset(datasets: Dataset[], name: string): Dataset {
  return datasets.find(entry => entry.name === name)!
}

function deriveKeyedAnswer(flags: Record<string, FeatureFlag>, prompt: string): string | undefined {
  let match = prompt.match(/rollout percentage of flag `(.+?)`/)
  if (match)
    return String(flags[match[1]!]!.rollout)
  if ((match = prompt.match(/Who owns flag `(.+?)`/)))
    return flags[match[1]!]!.owner
  if ((match = prompt.match(/Is flag `(.+?)` enabled/)))
    return flags[match[1]!]!.enabled ? 'yes' : 'no'
  if ((match = prompt.match(/owner of the last flag \(`(.+?)`\)/)))
    return flags[match[1]!]!.owner
  if (prompt === 'How many flags are defined?')
    return String(Object.keys(flags).length)
  if (prompt.startsWith('List the field names for each flag'))
    return 'enabled,rollout,owner,updatedAt'
  if (prompt === 'What is the 2nd field name for each flag?')
    return 'rollout'
  if (prompt === 'How many fields does each flag record have?')
    return '4'
}

function isNestedGroupAnswerDerivable(contacts: Contact[], prompt: string, groundTruth: string): boolean {
  const byName = (name: string): Contact[] => contacts.filter(contact => contact.name === name)
  let match: RegExpMatchArray | null

  if (prompt === 'How many contacts are in the dataset?')
    return groundTruth === String(contacts.length)
  if (prompt.startsWith('List the top-level field names for contacts'))
    return groundTruth === 'name,age,email,address,plan'
  if (prompt.startsWith('What are the field names within a contact\'s address'))
    return groundTruth === 'city,country'
  if (prompt.startsWith('What are the field names within a contact\'s plan'))
    return groundTruth === 'name,price'
  if (prompt === 'What is the 3rd top-level field name for contacts?')
    return groundTruth === 'email'
  if (prompt === 'What country does the last contact in the dataset live in?')
    return groundTruth === contacts.at(-1)!.address.country
  if ((match = prompt.match(/What city is (.+?)'s address in\?/)))
    return byName(match[1]!).some(contact => contact.address.city === groundTruth)
  if ((match = prompt.match(/What country does (.+?) live in\?/)))
    return byName(match[1]!).some(contact => contact.address.country === groundTruth)
  if ((match = prompt.match(/What plan is (.+?) on\?/)))
    return byName(match[1]!).some(contact => contact.plan.name === groundTruth)
  if ((match = prompt.match(/What is the price of (.+?)'s plan\?/)))
    return byName(match[1]!).some(contact => String(contact.plan.price) === groundTruth)
  if ((match = prompt.match(/How old is (.+?)\?/)))
    return byName(match[1]!).some(contact => String(contact.age) === groundTruth)

  return false
}
