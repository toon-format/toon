import type { Dataset } from '../src/types.ts'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import * as prompts from '@clack/prompts'
import { encode } from '../../packages/toon/src/index.ts'
import { BENCHMARKS_DIR, FORMATTER_DISPLAY_NAMES, ROOT_DIR } from '../src/constants.ts'
import { TOKEN_EFFICIENCY_DATASETS } from '../src/datasets.ts'
import { formatters, supportsCSV } from '../src/formatters.ts'
import { createProgressBar, ensureDir, tokenize } from '../src/utils.ts'

interface FormatMetrics {
  name: string
  tokens: number
  savings: number
  savingsPercent: number
}

interface BenchmarkResult {
  dataset: Dataset
  formats: FormatMetrics[]
}

// Constants
const DATASET_ICONS: Record<string, string> = {
  'tabular': '👥',
  'nested': '🛒',
  'analytics': '📈',
  'github': '⭐',
  'event-logs': '🧾',
  'nested-config': '🧩',
}

const COMPARISON_FORMAT_ORDER = ['json-pretty', 'json-compact', 'yaml', 'xml'] as const

const PROGRESS_BAR_WIDTH = 20
const TOKEN_PADDING = 7

const DEFAULT_DATASET_ICON = '📊'

const DETAILED_EXAMPLE_DATASETS = ['github', 'analytics'] as const
const GITHUB_REPO_LIMIT = 3
const GITHUB_DESC_LIMIT = 80
const ANALYTICS_METRICS_LIMIT = 5

prompts.intro('Token Efficiency Benchmark')

/**
 * Format a comparison line showing savings vs TOON
 */
function formatComparisonLine(format: FormatMetrics, isLast: boolean = false): string {
  const label = FORMATTER_DISPLAY_NAMES[format.name] || format.name.toUpperCase()
  const signedPercent = format.savingsPercent >= 0
    ? `−${format.savingsPercent.toFixed(1)}%`
    : `+${Math.abs(format.savingsPercent).toFixed(1)}%`
  const connector = isLast ? '└─' : '├─'
  const tokenStr = format.tokens.toLocaleString('en-US').padStart(TOKEN_PADDING)
  return `${connector} vs ${label.padEnd(13)} ${`(${signedPercent})`.padEnd(20)}   ${tokenStr} tokens`
}

/**
 * Calculate total tokens and savings for a set of datasets
 */
function calculateTotalMetrics(datasets: BenchmarkResult[], formatNames: readonly string[]) {
  const totalToonTokens = datasets.reduce((sum, r) => {
    const toon = r.formats.find(f => f.name === 'toon')!
    return sum + toon.tokens
  }, 0)

  const totals = formatNames.map((formatName) => {
    const totalTokens = datasets.reduce((sum, r) => {
      const format = r.formats.find(f => f.name === formatName)
      return sum + (format?.tokens || 0)
    }, 0)
    const savings = totalTokens - totalToonTokens
    const savingsPercent = (savings / totalTokens) * 100
    return { name: formatName, tokens: totalTokens, savingsPercent }
  })

  return { totalToonTokens, totals }
}

/**
 * Generate total lines for a track
 */
function generateTotalLines(
  totalToonTokens: number,
  totals: { name: string, tokens: number, savingsPercent: number }[],
  baselineFormat?: { name: string, tokens: number },
) {
  const separatorHalf = '─'.repeat(36)
  const lines = [`${separatorHalf} Total ${separatorHalf}`]

  if (baselineFormat) {
    // Flat-only track with CSV baseline
    const csvPercentage = Math.min(100, (baselineFormat.tokens / totalToonTokens) * 100)
    const csvBar = createProgressBar(csvPercentage, 100, PROGRESS_BAR_WIDTH)
    const csvStr = baselineFormat.tokens.toLocaleString('en-US').padStart(TOKEN_PADDING)
    lines.push(`   CSV                 ${csvBar}   ${csvStr} tokens`)

    const overheadPercent = ((totalToonTokens - baselineFormat.tokens) / baselineFormat.tokens) * 100
    const toonBar = createProgressBar(100, 100, PROGRESS_BAR_WIDTH)
    const toonStr = totalToonTokens.toLocaleString('en-US').padStart(TOKEN_PADDING)
    lines.push(`   TOON                ${toonBar}   ${toonStr} tokens   (+${overheadPercent.toFixed(1)}% vs CSV)`)
  }
  else {
    // Mixed-structure track
    const totalPercentage = Math.min(100, (totalToonTokens / totals[0]!.tokens) * 100)
    const totalBar = createProgressBar(totalPercentage, 100, PROGRESS_BAR_WIDTH)
    const toonStr = totalToonTokens.toLocaleString('en-US').padStart(TOKEN_PADDING)
    lines.push(`   TOON                ${totalBar}   ${toonStr} tokens`)
  }

  // Add comparison lines
  for (let i = 0; i < totals.length; i++) {
    const format = totals[i]!
    const isLast = i === totals.length - 1
    lines.push(`   ${formatComparisonLine({
      name: format.name,
      tokens: format.tokens,
      savings: 0, // Not used in this context
      savingsPercent: format.savingsPercent,
    }, isLast)}`)
  }

  return lines.join('\n')
}

/**
 * Generate bar chart for a dataset
 */
function generateDatasetChart(result: BenchmarkResult): string {
  const { dataset, formats } = result
  const toon = formats.find(f => f.name === 'toon')!
  const jsonPretty = formats.find(f => f.name === 'json-pretty')!

  const emoji = DATASET_ICONS[dataset.name] || DEFAULT_DATASET_ICON
  const eligibility = dataset.metadata.tabularEligibility
  const name = dataset.description

  const percentage = Math.min(100, 100 - jsonPretty.savingsPercent)
  const bar = createProgressBar(percentage, 100, PROGRESS_BAR_WIDTH)
  const toonStr = toon.tokens.toLocaleString('en-US')

  const line1 = `${emoji} ${name}  ┊  Tabular: ${eligibility}%`
  const line2 = `   │`
  const line3 = `   TOON                ${bar}   ${toonStr.padStart(TOKEN_PADDING)} tokens`

  const comparisonLines = COMPARISON_FORMAT_ORDER.map((formatName, index, array) => {
    const format = formats.find(f => f.name === formatName)
    if (!format)
      return undefined

    return `   ${formatComparisonLine(format, index === array.length - 1)}`
  }).filter(Boolean)

  return [line1, line2, line3, ...comparisonLines].join('\n')
}

const results: BenchmarkResult[] = []

// Calculate token counts for all datasets
for (const dataset of TOKEN_EFFICIENCY_DATASETS) {
  const formatMetrics: FormatMetrics[] = []
  const tokensByFormat: Record<string, number> = {}

  // Calculate tokens for each format
  for (const [formatName, formatter] of Object.entries(formatters)) {
    // Skip CSV for datasets that don't support it
    if (formatName === 'csv' && !supportsCSV(dataset))
      continue

    const formattedData = formatter(dataset.data)
    const tokens = tokenize(formattedData)
    tokensByFormat[formatName] = tokens
  }

  // Calculate savings vs TOON
  const toonTokens = tokensByFormat.toon!
  for (const [formatName, tokens] of Object.entries(tokensByFormat)) {
    const savings = tokens - toonTokens
    formatMetrics.push({
      name: formatName,
      tokens,
      savings,
      savingsPercent: formatName === 'toon' ? 0 : (savings / tokens) * 100,
    })
  }

  results.push({
    dataset,
    formats: formatMetrics,
  })
}

// Separate datasets by CSV support
const mixedStructureDatasets = results.filter(r => !supportsCSV(r.dataset))
const flatOnlyDatasets = results.filter(r => supportsCSV(r.dataset))

// Mixed-Structure Track (no CSV)
const mixedCharts = mixedStructureDatasets
  .map(result => generateDatasetChart(result))
  .join('\n\n')

// Flat-Only Track (with CSV)
const flatCharts = flatOnlyDatasets
  .map((result) => {
    const csv = result.formats.find(f => f.name === 'csv')
    const toon = result.formats.find(f => f.name === 'toon')!

    if (!csv)
      return generateDatasetChart(result)

    // Special handling to show CSV first with TOON overhead
    const { dataset } = result
    const emoji = DATASET_ICONS[dataset.name] || DEFAULT_DATASET_ICON
    const eligibility = dataset.metadata.tabularEligibility
    const name = dataset.description

    // CSV line
    const csvPercentage = Math.min(100, (csv.tokens / toon.tokens) * 100)
    const csvBar = createProgressBar(csvPercentage, 100, PROGRESS_BAR_WIDTH)
    const csvStr = csv.tokens.toLocaleString('en-US')

    const line1 = `${emoji} ${name}  ┊  Tabular: ${eligibility}%`
    const line2 = `   │`
    const line3 = `   CSV                 ${csvBar}   ${csvStr.padStart(TOKEN_PADDING)} tokens`

    const toonOverhead = toon.tokens - csv.tokens
    const toonOverheadPercent = (toonOverhead / csv.tokens) * 100
    const toonBar = createProgressBar(100, 100, PROGRESS_BAR_WIDTH)
    const toonStr = toon.tokens.toLocaleString('en-US')
    const toonVsCSV = toonOverheadPercent >= 0
      ? `(+${toonOverheadPercent.toFixed(1)}% vs CSV)`
      : `(${toonOverheadPercent.toFixed(1)}% vs CSV)`
    const toonLine = `   TOON                ${toonBar}   ${toonStr.padStart(TOKEN_PADDING)} tokens   ${toonVsCSV}`

    // Other format comparisons (vs TOON)
    const comparisonLines = COMPARISON_FORMAT_ORDER.map((formatName, index, array) => {
      const format = result.formats.find(f => f.name === formatName)
      if (!format)
        return undefined

      return `   ${formatComparisonLine(format, index === array.length - 1)}`
    }).filter(Boolean)

    return [line1, line2, line3, toonLine, ...comparisonLines].join('\n')
  })
  .join('\n\n')

// Calculate totals for mixed structure
const { totalToonTokens: totalToonTokensMixed, totals: mixedTotals } = calculateTotalMetrics(mixedStructureDatasets, COMPARISON_FORMAT_ORDER)
const mixedTotalLines = generateTotalLines(totalToonTokensMixed, mixedTotals)

// Calculate totals for flat-only
const { totalToonTokens: totalToonTokensFlat, totals: flatTotals } = calculateTotalMetrics(flatOnlyDatasets, COMPARISON_FORMAT_ORDER)
const totalCSVTokensFlat = flatOnlyDatasets.reduce((sum, r) => {
  const csv = r.formats.find(f => f.name === 'csv')
  return sum + (csv?.tokens || 0)
}, 0)
const flatTotalLines = generateTotalLines(totalToonTokensFlat, flatTotals, { name: 'csv', tokens: totalCSVTokensFlat })

const barChartSection = `
#### Mixed-Structure Track

Datasets with nested or semi-uniform structures. CSV excluded as it cannot properly represent these structures.

\`\`\`
${mixedCharts}

${mixedTotalLines}
\`\`\`

#### Flat-Only Track

Datasets with flat tabular structures where CSV is applicable.

\`\`\`
${flatCharts}

${flatTotalLines}
\`\`\`
`.trim()

// Generate detailed examples (optional: show a few examples)
const detailedExamples = results
  .filter(r => DETAILED_EXAMPLE_DATASETS.includes(r.dataset.name as any))
  .map((result, i, filtered) => {
    let displayData = result.dataset.data

    // Truncate for display
    if (result.dataset.name === 'github') {
      displayData = {
        repositories: displayData.repositories.slice(0, GITHUB_REPO_LIMIT).map((repo: Record<string, any>) => ({
          ...repo,
          description: repo.description?.slice(0, GITHUB_DESC_LIMIT) + (repo.description?.length > GITHUB_DESC_LIMIT ? '…' : ''),
        })),
      }
    }
    else if (result.dataset.name === 'analytics') {
      displayData = { metrics: displayData.metrics.slice(0, ANALYTICS_METRICS_LIMIT) }
    }

    const emoji = DATASET_ICONS[result.dataset.name] || DEFAULT_DATASET_ICON
    const json = result.formats.find(f => f.name === 'json-pretty')!
    const toon = result.formats.find(f => f.name === 'toon')!
    const separator = i < filtered.length - 1 ? '---' : ''

    return `
#### ${emoji} ${result.dataset.description}

**Savings:** ${json.savings.toLocaleString('en-US')} tokens (${json.savingsPercent.toFixed(1)}% reduction vs JSON)

**JSON** (${json.tokens.toLocaleString('en-US')} tokens):

\`\`\`json
${JSON.stringify(displayData, undefined, 2)}
\`\`\`

**TOON** (${toon.tokens.toLocaleString('en-US')} tokens):

\`\`\`
${encode(displayData)}
\`\`\`

${separator}
`.trim()
  })
  .join('\n\n')

const markdown = `
${barChartSection}

<details>
<summary><strong>Show detailed examples</strong></summary>

${detailedExamples}

</details>
`.trimStart()

prompts.log.message(barChartSection)

const resultsDir = path.join(BENCHMARKS_DIR, 'results')
await ensureDir(resultsDir)

const outputFilePath = path.join(resultsDir, 'token-efficiency.md')
await fsp.writeFile(outputFilePath, markdown, 'utf-8')

prompts.log.success(`Report saved to \`${path.relative(ROOT_DIR, outputFilePath)}\``)
