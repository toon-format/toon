import * as fsp from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import { describe, expect, it } from 'vitest'
import { decode, encode } from '../../packages/toon/src/index.ts'
import { canonicalizeGenerationValue, GENERATION_CASES } from '../src/generation/cases.ts'
import { parseGenerationRuns, renderGenerationReport } from '../src/generation/report.ts'
import { aggregateGenerationRunsByCase, aggregateGenerationRunsByModel, flattenGenerationRun, generationCsvColumns } from '../src/generation/results.ts'
import { createGenerationRunDirectory } from '../src/generation/storage.ts'

const resultDirectory = new URL('../results/generation/', import.meta.url)

describe('generation reproducibility', () => {
  it('round-trips all committed fixtures through the current encoder and decoder', async () => {
    for (const item of GENERATION_CASES) {
      const base = new URL(`../data/generation/${item.id}.gold`, import.meta.url)
      const json = JSON.parse(await fsp.readFile(`${base.pathname}.json`, 'utf8'))
      const toon = await fsp.readFile(`${base.pathname}.toon`, 'utf8')
      expect(json).toEqual(item.gold)
      expect(canonicalizeGenerationValue(item.id, decode(toon))).toEqual(item.gold)
      expect(encode(item.gold)).toBe(toon)
    }
  })

  it('reproduces every published case and model aggregate from all 210 historical rows', async () => {
    const csv = await fsp.readFile(new URL('eval-runs.csv', resultDirectory), 'utf8')
    const runs = parseGenerationRuns(csv)
    expect(runs).toHaveLength(210)
    expect(new Set(runs.map(run => run.model)).size).toBe(21)
    const tables = [
      { file: 'eval-results-by-case.csv', actual: aggregateGenerationRunsByCase(runs), key: 'case' },
      { file: 'eval-results-by-model.csv', actual: aggregateGenerationRunsByModel(runs), key: 'model' },
    ]
    for (const { file, actual, key } of tables) {
      const expected = parse(await fsp.readFile(new URL(file, resultDirectory), 'utf8'), { columns: true }) as Record<string, string>[]
      expect(actual).toHaveLength(expected.length)
      for (const row of expected) {
        const generated = actual.find(item => item[key] === row[key])!
        for (const column of ['J1S', 'JF', 'JT', 'JSO1S', 'JSOF', 'JSOT', 'T1S', 'TF', 'TT'])
          expect(Number(generated[column]), `${file}: ${row[key]} ${column}`).toBeCloseTo(Number(row[column]), 8)
      }
    }
    expect(renderGenerationReport(runs, true)).toBe(await fsp.readFile(new URL('historical-report.md', resultDirectory), 'utf8'))
  })

  it('reads quoted CSV values and rejects missing measured fields', async () => {
    const runs = parseGenerationRuns(await fsp.readFile(new URL('eval-runs.csv', resultDirectory), 'utf8'))
    const run = { ...runs[0]!, model: 'test/model,with-comma' }
    const row = flattenGenerationRun(run)
    const csv = stringify([row], { header: true, columns: generationCsvColumns() })
    expect(parseGenerationRuns(csv)).toEqual([run])
    delete row.users_json_final
    expect(() => parseGenerationRuns(stringify([row], { header: true }))).toThrow('Invalid boolean field')
    expect(() => parseGenerationRuns('model,run\n')).toThrow('no runs')
  })

  it('creates separate run directories without touching the historical baseline', async () => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'toon-generation-test-'))
    try {
      const baseline = path.join(root, 'eval-runs.csv')
      await fsp.writeFile(baseline, 'historical data')
      const first = await createGenerationRunDirectory(path.join(root, 'runs'))
      const second = await createGenerationRunDirectory(path.join(root, 'runs'))
      expect(first).not.toBe(second)
      expect(path.dirname(first)).toBe(path.join(root, 'runs'))
      await fsp.writeFile(path.join(first, 'eval-runs.csv'), 'new data')
      expect(await fsp.readFile(baseline, 'utf8')).toBe('historical data')
    }
    finally {
      await fsp.rm(root, { recursive: true, force: true })
    }
  })
})
