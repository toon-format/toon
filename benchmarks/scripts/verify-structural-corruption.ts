import { XMLParser } from 'fast-xml-parser'
import { parse as parseYaml } from 'yaml'
import { ACCURACY_DATASETS } from '../src/datasets.ts'
import { FORMATS } from '../src/formats.ts'
import { encodeDataset } from '../src/structural-corruption.ts'
import { assert, findDataset, reportAndExit } from './verify-utils.ts'

function encode(formatName: string, name: string): string {
  return encodeDataset(FORMATS[formatName]!, findDataset(ACCURACY_DATASETS, name))
}

// TOON row lines are every line after the `employees[N]{...}:` header
function toonRowLines(text: string): string[] {
  return text.split('\n').slice(1)
}

function toonDeclaredCount(text: string): number {
  const match = text.match(/^employees\[(\d+)\]\{/)
  return match ? Number(match[1]) : Number.NaN
}

// CSV data lines follow the `# employees` marker and the column header row
function csvDataLines(text: string): string[] {
  return text.split('\n').slice(2)
}

function cellCount(line: string): number {
  return line.split(',').length
}

// --- TOON: length metadata still declares the original shape ---

const toonTruncated = encode('toon', 'structural-validation-truncated')
assert(toonDeclaredCount(toonTruncated) === 20, 'TOON truncated: header still declares [20]')
assert(toonRowLines(toonTruncated).length === 17, 'TOON truncated: 17 row lines remain')

const toonExtra = encode('toon', 'structural-validation-extra-rows')
assert(toonDeclaredCount(toonExtra) === 20, 'TOON extra-rows: header still declares [20]')
assert(toonRowLines(toonExtra).length === 23, 'TOON extra-rows: 23 row lines present')

const toonWidth = encode('toon', 'structural-validation-width-mismatch')
const toonHeaderFieldCount = FORMATS.toon!.encode(findDataset(ACCURACY_DATASETS, 'structural-validation-control').data)
  .split('\n')[0]!
  .replace(/^[^{]*\{/, '')
  .replace(/\}.*$/, '')
  .split(',')
  .length
const toonWidthNarrowRows = toonRowLines(toonWidth).filter(line => cellCount(line) === toonHeaderFieldCount - 1)
assert(toonHeaderFieldCount === 7, 'TOON control: header declares 7 fields')
assert(
  toonWidthNarrowRows.length === 1,
  `TOON width-mismatch: exactly one row has ${toonHeaderFieldCount - 1} cells under the ${toonHeaderFieldCount}-field header`,
)
assert(
  toonRowLines(toonWidth).filter(line => cellCount(line) === toonHeaderFieldCount).length === 19,
  'TOON width-mismatch: the other 19 rows keep 7 cells',
)

const toonMissing = encode('toon', 'structural-validation-missing-fields')
assert(
  toonRowLines(toonMissing).filter(line => cellCount(line) === toonHeaderFieldCount - 1).length === 4,
  'TOON missing-fields: exactly four rows have 6 cells (informational)',
)

// --- JSON/YAML/XML: corrupted variants stay parseable ---

const jsonParsableFormats = ['json-pretty', 'json-compact'] as const
const corruptedDatasets = [
  'structural-validation-truncated',
  'structural-validation-extra-rows',
  'structural-validation-width-mismatch',
  'structural-validation-missing-fields',
] as const

for (const formatName of jsonParsableFormats) {
  for (const name of corruptedDatasets) {
    let isParsed = false
    try {
      JSON.parse(encode(formatName, name))
      isParsed = true
    }
    catch {}
    assert(isParsed, `${formatName} ${name}: JSON.parse succeeds`)
  }
}

for (const name of corruptedDatasets) {
  let isParsed = false
  try {
    parseYaml(encode('yaml', name))
    isParsed = true
  }
  catch {}
  assert(isParsed, `yaml ${name}: YAML.parse succeeds`)
}

const xmlParser = new XMLParser()
for (const name of corruptedDatasets) {
  let isParsed = false
  try {
    xmlParser.parse(encode('xml', name))
    isParsed = true
  }
  catch {}
  assert(isParsed, `xml ${name}: XMLParser.parse succeeds`)
}

// --- CSV: no length metadata, but a narrower row still surfaces width loss ---

const csvTruncated = encode('csv', 'structural-validation-truncated')
assert(csvDataLines(csvTruncated).length === 17, 'CSV truncated: 17 data lines remain')

const csvWidth = encode('csv', 'structural-validation-width-mismatch')
const csvColumnCount = encode('csv', 'structural-validation-control').split('\n')[1]!.split(',').length
assert(
  csvDataLines(csvWidth).filter(line => cellCount(line) === csvColumnCount - 1).length === 1,
  'CSV width-mismatch: exactly one data line is one cell short',
)

reportAndExit('All structural corruption assertions passed')
