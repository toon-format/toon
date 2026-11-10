import { XMLParser } from 'fast-xml-parser'
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { ACCURACY_DATASETS } from '../src/datasets.ts'
import { FORMATS } from '../src/formats.ts'
import { encodeDataset } from '../src/structural-corruption.ts'

const corruptedDatasetNames = [
  'structural-validation-truncated',
  'structural-validation-extra-rows',
  'structural-validation-width-mismatch',
  'structural-validation-missing-fields',
]

describe('toon', () => {
  // Row lines are every line after the `employees[N]{...}:` header.
  const rowLines = (text: string): string[] => text.split('\n').slice(1)

  it('keeps declaring the original 20 rows when rows are cut or added', () => {
    const truncated = encode('toon', 'structural-validation-truncated')
    expect(truncated).toMatch(/^employees\[20\]\{/)
    expect(rowLines(truncated)).toHaveLength(17)

    const extended = encode('toon', 'structural-validation-extra-rows')
    expect(extended).toMatch(/^employees\[20\]\{/)
    expect(rowLines(extended)).toHaveLength(23)
  })

  it('leaves exactly one row a cell short of the field list on width mismatch', () => {
    const control = ACCURACY_DATASETS.find(dataset => dataset.name === 'structural-validation-control')!
    const fieldList = FORMATS.toon!.encode(control.data).split('\n')[0]!.replace(/^[^{]*\{/, '').replace(/\}.*$/, '')
    expect(cellCount(fieldList)).toBe(7)

    const cellCounts = rowLines(encode('toon', 'structural-validation-width-mismatch')).map(cellCount)
    expect(cellCounts.filter(count => count === 6)).toHaveLength(1)
    expect(cellCounts.filter(count => count === 7)).toHaveLength(19)
  })

  it('leaves four rows a cell short when fields are missing', () => {
    const cellCounts = rowLines(encode('toon', 'structural-validation-missing-fields')).map(cellCount)
    expect(cellCounts.filter(count => count === 6)).toHaveLength(4)
  })
})

it.each(corruptedDatasetNames)('keeps %s parseable as JSON, YAML, and XML', (name) => {
  expect(() => JSON.parse(encode('json-pretty', name))).not.toThrow()
  expect(() => JSON.parse(encode('json-compact', name))).not.toThrow()
  expect(() => parseYaml(encode('yaml', name))).not.toThrow()
  expect(() => new XMLParser().parse(encode('xml', name))).not.toThrow()
})

describe('csv', () => {
  // Data lines follow the `# employees` marker and the column header row.
  const dataLines = (text: string): string[] => text.split('\n').slice(2)

  it('keeps no trace of truncated rows', () => {
    expect(dataLines(encode('csv', 'structural-validation-truncated'))).toHaveLength(17)
  })

  it('leaves exactly one data line a cell short on width mismatch', () => {
    const columnCount = cellCount(encode('csv', 'structural-validation-control').split('\n')[1]!)
    const narrowLines = dataLines(encode('csv', 'structural-validation-width-mismatch'))
      .filter(line => cellCount(line) === columnCount - 1)

    expect(narrowLines).toHaveLength(1)
  })
})

function encode(formatName: string, datasetName: string): string {
  const dataset = ACCURACY_DATASETS.find(entry => entry.name === datasetName)!
  return encodeDataset(FORMATS[formatName]!, dataset)
}

function cellCount(line: string): number {
  return line.split(',').length
}
