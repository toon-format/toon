/**
 * Benchmark comparing token counts for TOON with and without nested tables.
 *
 * Usage: node benchmarks/scripts/type-hints-benchmark.ts
 */
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import { encode } from '../../packages/toon/src/index.ts'
import { TOKEN_EFFICIENCY_DATASETS } from '../src/datasets.ts'
import { tokenize } from '../src/utils.ts'

interface Result {
  dataset: string
  toonTokens: number
  toonWithNestedTokens: number
  jsonCompactTokens: number
  nestedSavings: string
  nestedVsJson: string
}

const results: Result[] = []

console.log('=== TOON Nested Tables — Token Benchmark ===\n')

for (const dataset of TOKEN_EFFICIENCY_DATASETS) {
  const data = dataset.data

  const toon = encode(data)
  const toonWithNested = encode(data, { nestedTables: true })
  const jsonCompact = JSON.stringify(data)

  const toonTokens = tokenize(toon)
  const toonNestedTokens = tokenize(toonWithNested)
  const jsonTokens = tokenize(jsonCompact)

  const nestedSavings = ((toonTokens - toonNestedTokens) / toonTokens * 100).toFixed(1)
  const nestedVsJson = ((jsonTokens - toonNestedTokens) / jsonTokens * 100).toFixed(1)

  results.push({
    dataset: dataset.name,
    toonTokens,
    toonWithNestedTokens: toonNestedTokens,
    jsonCompactTokens: jsonTokens,
    nestedSavings: `${nestedSavings}%`,
    nestedVsJson: `${nestedVsJson}%`,
  })

  console.log(`📊 ${dataset.name}`)
  console.log(`   TOON (baseline):       ${toonTokens.toLocaleString()} tokens`)
  console.log(`   TOON + nested tables:  ${toonNestedTokens.toLocaleString()} tokens (${nestedSavings}% saved vs TOON)`)
  console.log(`   JSON (compact):        ${jsonTokens.toLocaleString()} tokens`)
  console.log(`   Nested vs JSON:        ${nestedVsJson}% fewer tokens`)
  console.log()
}

// Write results to BENCHMARKS.md
const md = `# TOON Nested Tables — Benchmark Results

## Token Count Comparison

| Dataset | TOON | TOON + Nested | JSON Compact | Nested Savings | Nested vs JSON |
|---------|------|---------------|-------------|----------------|---------------|
${results.map(r =>
  `| ${r.dataset} | ${r.toonTokens.toLocaleString()} | ${r.toonWithNestedTokens.toLocaleString()} | ${r.jsonCompactTokens.toLocaleString()} | ${r.nestedSavings} | ${r.nestedVsJson} |`
).join('\n')}

## Key Findings

- **Nested tables** save tokens when data contains uniform nested objects by flattening them into the tabular format instead of falling back to list items.
- For datasets without nested structures, output is identical to standard TOON.
- The feature is opt-in and backwards-compatible.
`

const benchmarkPath = path.resolve(import.meta.dirname, '..', '..', 'BENCHMARKS.md')
await fsp.writeFile(benchmarkPath, md, 'utf-8')
console.log(`Results written to BENCHMARKS.md`)
