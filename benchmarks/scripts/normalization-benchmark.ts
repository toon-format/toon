import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import * as prompts from '@clack/prompts'
import { encode, normalizeForToon } from '../../packages/toon/src/index.ts'
import { BENCHMARKS_DIR, ROOT_DIR } from '../src/constants.ts'
import { TOKEN_EFFICIENCY_DATASETS } from '../src/datasets.ts'
import { ensureDir, tokenize } from '../src/utils.ts'

prompts.intro('Normalization Benchmark')

const datasets = TOKEN_EFFICIENCY_DATASETS.filter(
  d => d.metadata.structureClass === 'semi-uniform' || d.metadata.structureClass === 'deep',
)

interface Row {
  name: string
  rows: number
  jsonCompact: number
  toon: number
  toonNorm: number
}

const rows: Row[] = datasets.map((ds) => {
  const jsonCompact = tokenize(JSON.stringify(ds.data))
  const toon = tokenize(encode(ds.data))
  const toonNorm = tokenize(encode(normalizeForToon(ds.data as Record<string, unknown>)))

  // Count data rows
  const arrays = Object.values(ds.data).filter(Array.isArray)
  const rowCount = arrays.length > 0 ? arrays[0].length : 1

  return { name: ds.name, rows: rowCount, jsonCompact, toon, toonNorm }
})

const totals = rows.reduce(
  (acc, r) => ({
    rows: acc.rows + r.rows,
    jsonCompact: acc.jsonCompact + r.jsonCompact,
    toon: acc.toon + r.toon,
    toonNorm: acc.toonNorm + r.toonNorm,
  }),
  { rows: 0, jsonCompact: 0, toon: 0, toonNorm: 0 },
)

function pct(tokens: number, baseline: number): string {
  const diff = ((tokens - baseline) / baseline) * 100
  return diff <= 0 ? `${diff.toFixed(1)}%` : `+${diff.toFixed(1)}%`
}

function fmtRow(r: Row | { name: string, rows: number, jsonCompact: number, toon: number, toonNorm: number }): string {
  return `| ${r.name} | ${r.rows.toLocaleString()} | ${r.jsonCompact.toLocaleString()} | ${r.toon.toLocaleString()} (${pct(r.toon, r.jsonCompact)}) | ${r.toonNorm.toLocaleString()} (${pct(r.toonNorm, r.jsonCompact)}) |`
}

const tableHeader = `| Dataset | Rows | JSON compact | TOON (vs JSON) | TOON normalized (vs JSON) |
| --- | ---: | ---: | ---: | ---: |`

const tableRows = rows.map(fmtRow).join('\n')
const totalRow = fmtRow({ name: '**Total**', ...totals })

// Key findings
const bestGain = rows.reduce((best, r) => {
  const normGain = ((r.toon - r.toonNorm) / r.toon) * 100
  return normGain > best.gain ? { name: r.name, gain: normGain } : best
}, { name: '', gain: 0 })

const avgNormVsJson = ((totals.toonNorm - totals.jsonCompact) / totals.jsonCompact) * 100
const avgNormVsToon = ((totals.toonNorm - totals.toon) / totals.toon) * 100

const markdown = `# Normalization Benchmark

Token counts for semi-uniform and deep datasets comparing JSON compact, TOON, and TOON with normalization.

## Summary

${tableHeader}
${tableRows}
${totalRow}

## Key Findings

- **Best normalization gain:** ${bestGain.name} — TOON normalized saves ${bestGain.gain.toFixed(1)}% tokens vs plain TOON
- **Overall TOON normalized vs JSON compact:** ${avgNormVsJson.toFixed(1)}% tokens
- **Overall TOON normalized vs plain TOON:** ${avgNormVsToon.toFixed(1)}% tokens
`

prompts.log.message(markdown)

const resultsDir = path.join(BENCHMARKS_DIR, 'results')
await ensureDir(resultsDir)

const outputPath = path.join(resultsDir, 'normalization-benchmark.md')
await fsp.writeFile(outputPath, markdown, 'utf-8')

prompts.log.success(`Report saved to \`${path.relative(ROOT_DIR, outputPath)}\``)
