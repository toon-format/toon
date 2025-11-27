import type { Dataset, EfficiencyRanking, EvaluationResult, FormatResult, Question } from './types'
import { FORMATTER_DISPLAY_NAMES, QUESTION_TYPE_LABELS, QUESTION_TYPES } from './constants'
import { ACCURACY_DATASETS } from './datasets'
import { models, PRIMERS } from './evaluate'
import { supportsCSV } from './formatters'
import { generateQuestions } from './questions'
import { createProgressBar, tokenize } from './utils'

const EFFICIENCY_CHART_STYLE: 'vertical' | 'horizontal' = 'horizontal'

/**
 * Calculate token counts for all format+dataset combinations
 *
 * @remarks
 * Includes primer tokens for fairer comparison across formats
 */
export function calculateTokenCounts(
  formatters: Record<string, (data: unknown) => string>,
): Record<string, number> {
  const tokenCounts: Record<string, number> = {}

  for (const [formatName, formatter] of Object.entries(formatters)) {
    for (const dataset of ACCURACY_DATASETS) {
      // Skip CSV for datasets that don't support it
      if (formatName === 'csv' && !supportsCSV(dataset))
        continue

      const formattedData = formatter(dataset.data)
      const primer = PRIMERS[formatName] ?? ''
      // Include primer in token count for fair comparison
      const fullPrompt = primer ? `${primer}\n\n${formattedData}` : formattedData
      const key = `${formatName}-${dataset.name}`
      tokenCounts[key] = tokenize(fullPrompt)
    }
  }

  return tokenCounts
}

/**
 * Calculate per-format statistics from evaluation results
 */
export function calculateFormatResults(
  results: EvaluationResult[],
  tokenCounts: Record<string, number>,
): FormatResult[] {
  const formatNames = [...new Set(results.map(r => r.format))]

  return formatNames.map((formatName) => {
    const formatResults = results.filter(r => r.format === formatName)
    const correctCount = formatResults.filter(r => r.isCorrect).length
    const totalCount = formatResults.length
    const accuracy = correctCount / totalCount

    // Calculate average tokens across all datasets for this format
    const formatTokenEntries = Object.entries(tokenCounts)
      .filter(([key]) => key.startsWith(`${formatName}-`))
    const avgTokens = formatTokenEntries.reduce((sum, [, tokens]) => sum + tokens, 0) / formatTokenEntries.length

    const averageLatency = formatResults.reduce((sum, r) => sum + r.latencyMs, 0) / totalCount

    return {
      format: formatName,
      accuracy,
      totalTokens: Math.round(avgTokens),
      averageLatency: Math.round(averageLatency),
      correctCount,
      totalCount,
    }
  }).sort((a, b) => b.accuracy - a.accuracy)
}

/**
 * Generate consolidated retrieval accuracy report
 */
export function generateAccuracyReport(
  results: EvaluationResult[],
  formatResults: FormatResult[],
  tokenCounts: Record<string, number>,
): string {
  const questions = generateQuestions()
  const totalQuestions = [...new Set(results.map(r => r.questionId))].length
  const modelIds = models.map(m => m.modelId)
  const modelNames = modelIds.filter(id => results.some(r => r.model === id))

  return `
Benchmarks test LLM comprehension across different input formats using ${totalQuestions} data retrieval questions on ${modelNames.length} ${modelNames.length === 1 ? 'model' : 'models'}.

<details>
<summary><strong>Show Dataset Catalog</strong></summary>

${generateDatasetCatalog(ACCURACY_DATASETS)}

</details>

#### Efficiency Ranking (Accuracy per 1K Tokens)

${generateEfficiencyRankingReport(formatResults, totalQuestions, modelNames.length)}

#### Per-Model Accuracy

${generateDetailedAccuracyReport(formatResults, results, questions, tokenCounts)}
`.trimStart()
}

/**
 * Generate dataset catalog section
 */
function generateDatasetCatalog(datasets: Dataset[]): string {
  const rows = datasets.map((dataset) => {
    const csvSupport = supportsCSV(dataset) ? '✓' : '✗'
    const rowCount = Object.values(dataset.data)[0]?.length ?? 1
    const structure = dataset.metadata.structureClass
    const eligibility = `${dataset.metadata.tabularEligibility}%`

    return `| ${dataset.description} | ${rowCount} | ${structure} | ${csvSupport} | ${eligibility} |`
  }).join('\n')

  return `
#### Dataset Catalog

| Dataset | Rows | Structure | CSV Support | Eligibility |
| ------- | ---- | --------- | ----------- | ----------- |
${rows}

**Structure classes:**
- **uniform**: All objects have identical fields with primitive values
- **semi-uniform**: Mix of uniform and non-uniform structures
- **nested**: Objects with nested structures (nested objects or arrays)
- **deep**: Highly nested with minimal tabular eligibility

**CSV Support:** ✓ (supported), ✗ (not supported – would require lossy flattening)

**Eligibility:** Percentage of arrays that qualify for TOON's tabular format (uniform objects with primitive values)
`.trim()
}

/**
 * Generate efficiency ranking report
 */
function generateEfficiencyRankingReport(
  formatResults: FormatResult[],
  totalQuestions: number,
  modelCount: number,
): string {
  const toon = formatResults.find(r => r.format === 'toon')
  const json = formatResults.find(r => r.format === 'json-pretty')
  const csv = formatResults.find(r => r.format === 'csv')

  // Build efficiency ranking (accuracy per 1k tokens)
  const efficiencyRanking = formatResults
    // Exclude CSV since it only supports a subset of datasets (~half the questions)
    .filter(fr => fr.format !== 'csv')
    .map((fr) => {
      const efficiency = (fr.accuracy * 100) / (fr.totalTokens / 1000)
      return {
        format: fr.format,
        efficiency,
        accuracy: fr.accuracy,
        tokens: fr.totalTokens,
      }
    })
    .sort((a, b) => b.efficiency - a.efficiency)

  const efficiencyChart = EFFICIENCY_CHART_STYLE === 'vertical'
    ? generateVerticalEfficiencyChart(efficiencyRanking)
    : generateHorizontalEfficiencyChart(efficiencyRanking)

  // Build summary text
  let summary = ''
  if (toon && json) {
    const toonVsJson = `**${(toon.accuracy * 100).toFixed(1)}%** accuracy (vs JSON's ${(json.accuracy * 100).toFixed(1)}%)`
    const tokenSavings = `**${((1 - toon.totalTokens / json.totalTokens) * 100).toFixed(1)}% fewer tokens**`
    summary = `TOON achieves ${toonVsJson} while using ${tokenSavings}.`
  }

  // Add CSV note if available
  let csvNote = ''
  if (csv) {
    // CSV totalCount is evaluations (questions × models), so divide by number of models to get question count
    const csvQuestionCount = csv.totalCount / modelCount
    csvNote = `**Note on CSV:** Excluded from ranking as it only supports ${csvQuestionCount} of ${totalQuestions} questions (flat tabular data only). While CSV is highly token-efficient for simple tabular data, it cannot represent nested structures that other formats handle.`
  }

  return `
Each format ranked by efficiency (accuracy percentage per 1,000 tokens):

\`\`\`
${efficiencyChart}
\`\`\`

*Efficiency score = (Accuracy % ÷ Tokens) × 1,000. Higher is better.*

> [!TIP]
> ${summary}

${csvNote}
`.trim()
}

/**
 * Generate detailed accuracy report with breakdowns and methodology
 */
function generateDetailedAccuracyReport(
  formatResults: FormatResult[],
  results: EvaluationResult[],
  questions: Question[],
  tokenCounts: Record<string, number>,
): string {
  const toon = formatResults.find(r => r.format === 'toon')
  const json = formatResults.find(r => r.format === 'json-pretty')

  const modelIds = models.map(m => m.modelId)
  const modelNames = modelIds.filter(id => results.some(r => r.model === id))

  // Generate model breakdown section
  const modelBreakdown = generateModelBreakdown(formatResults, results, modelNames)

  // Generate summary comparison
  const summaryComparison = generateSummaryComparison(toon, json)

  // Generate performance by dataset
  const datasetBreakdown = generateDatasetBreakdown(formatResults, results, questions, tokenCounts)

  // Generate performance by model
  const modelPerformance = generateModelPerformanceTable(formatResults, results, modelNames)

  // Generate question type breakdown
  const questionTypeBreakdown = generateQuestionTypeBreakdown(formatResults, results, questions)
  const totalQuestions = [...new Set(results.map(r => r.questionId))].length

  // Calculate question type distribution
  const fieldRetrievalCount = questions.filter(q => q.type === 'field-retrieval').length
  const aggregationCount = questions.filter(q => q.type === 'aggregation').length
  const filteringCount = questions.filter(q => q.type === 'filtering').length
  const structureAwarenessCount = questions.filter(q => q.type === 'structure-awareness').length
  const structuralValidationCount = questions.filter(q => q.type === 'structural-validation').length

  const fieldRetrievalPercent = ((fieldRetrievalCount / totalQuestions) * 100).toFixed(0)
  const aggregationPercent = ((aggregationCount / totalQuestions) * 100).toFixed(0)
  const filteringPercent = ((filteringCount / totalQuestions) * 100).toFixed(0)
  const structureAwarenessPercent = ((structureAwarenessCount / totalQuestions) * 100).toFixed(0)
  const structuralValidationPercent = ((structuralValidationCount / totalQuestions) * 100).toFixed(0)

  // Calculate dataset sizes
  const tabularSize = ACCURACY_DATASETS.find(d => d.name === 'tabular')?.data.employees?.length || 0
  const nestedSize = ACCURACY_DATASETS.find(d => d.name === 'nested')?.data.orders?.length || 0
  const analyticsSize = ACCURACY_DATASETS.find(d => d.name === 'analytics')?.data.metrics?.length || 0
  const githubSize = ACCURACY_DATASETS.find(d => d.name === 'github')?.data.repositories?.length || 0
  const eventLogsSize = ACCURACY_DATASETS.find(d => d.name === 'event-logs')?.data.logs?.length || 0
  const nestedConfigSize = 1 // Single config object

  // Calculate number of formats and evaluations
  const formatCount = formatResults.length
  const totalEvaluations = totalQuestions * formatCount * modelNames.length

  return `
Accuracy across ${modelNames.length} ${modelNames.length === 1 ? 'LLM' : 'LLMs'} on ${totalQuestions} data retrieval questions:

\`\`\`
${modelBreakdown}
\`\`\`

${summaryComparison}

<details>
<summary><strong>Performance by dataset, model, and question type</strong></summary>

#### Performance by Question Type

${questionTypeBreakdown}

#### Performance by Dataset

${datasetBreakdown}

#### Performance by Model

${modelPerformance}

</details>

#### What's Being Measured

This benchmark tests **LLM comprehension and data retrieval accuracy** across different input formats. Each LLM receives formatted data and must answer questions about it. This does **not** test the model's ability to generate TOON output – only to read and understand it.

#### Datasets Tested

Eleven datasets designed to test different structural patterns and validation capabilities:

**Primary datasets:**

1. **Tabular** (${tabularSize} employee records): Uniform objects with identical fields – optimal for TOON's tabular format.
2. **Nested** (${nestedSize} e-commerce orders): Complex structures with nested customer objects and item arrays.
3. **Analytics** (${analyticsSize} days of metrics): Time-series data with dates and numeric values.
4. **GitHub** (${githubSize} repositories): Real-world data from top GitHub repos by stars.
5. **Event Logs** (${eventLogsSize} logs): Semi-uniform data with ~50% flat logs and ~50% with nested error objects.
6. **Nested Config** (${nestedConfigSize} configuration): Deeply nested configuration with minimal tabular eligibility.

**Structural validation datasets:**

7. **Control**: Valid complete dataset (baseline for validation)
8. **Truncated**: Array with 3 rows removed from end (tests \`[N]\` length detection)
9. **Extra rows**: Array with 3 additional rows beyond declared length
10. **Width mismatch**: Inconsistent field count (missing salary in row 10)
11. **Missing fields**: Systematic field omissions (no email in multiple rows)

#### Question Types

${totalQuestions} questions are generated dynamically across five categories:

- **Field retrieval (${fieldRetrievalPercent}%)**: Direct value lookups or values that can be read straight off a record (including booleans and simple counts such as array lengths)
  - Example: "What is Alice's salary?" → \`75000\`
  - Example: "How many items are in order ORD-0042?" → \`3\`
  - Example: "What is the customer name for order ORD-0042?" → \`John Doe\`

- **Aggregation (${aggregationPercent}%)**: Dataset-level totals and averages plus single-condition filters (counts, sums, min/max comparisons)
  - Example: "How many employees work in Engineering?" → \`17\`
  - Example: "What is the total revenue across all orders?" → \`45123.50\`
  - Example: "How many employees have salary > 80000?" → \`23\`

- **Filtering (${filteringPercent}%)**: Multi-condition queries requiring compound logic (AND constraints across fields)
  - Example: "How many employees in Sales have salary > 80000?" → \`5\`
  - Example: "How many active employees have more than 10 years of experience?" → \`8\`

- **Structure awareness (${structureAwarenessPercent}%)**: Tests format-native structural affordances (TOON's \`[N]\` count and \`{fields}\`, CSV's header row)
  - Example: "How many employees are in the dataset?" → \`100\`
  - Example: "List the field names for employees" → \`id, name, email, department, salary, yearsExperience, active\`
  - Example: "What is the department of the last employee?" → \`Sales\`

- **Structural validation (${structuralValidationPercent}%)**: Tests ability to detect incomplete, truncated, or corrupted data using structural metadata
  - Example: "Is this data complete and valid?" → \`YES\` (control dataset) or \`NO\` (corrupted datasets)
  - Tests TOON's \`[N]\` length validation and \`{fields}\` consistency checking
  - Demonstrates CSV's lack of structural validation capabilities

#### Evaluation Process

1. **Format conversion**: Each dataset is converted to all ${formatCount} formats (${formatResults.map(f => FORMATTER_DISPLAY_NAMES[f.format] || f.format).join(', ')}).
2. **Query LLM**: Each model receives formatted data + question in a prompt and extracts the answer.
3. **Validate deterministically**: Answers are validated using type-aware comparison (e.g., \`50000\` = \`$50,000\`, \`Engineering\` = \`engineering\`, \`2025-01-01\` = \`January 1, 2025\`) without requiring an LLM judge.

#### Models & Configuration

- **Models tested**: ${modelNames.map(m => `\`${m}\``).join(', ')}
- **Token counting**: Using \`gpt-tokenizer\` with \`o200k_base\` encoding (GPT-5 tokenizer)
- **Temperature**: Not set (models use their defaults)
- **Total evaluations**: ${totalQuestions} questions × ${formatCount} formats × ${modelNames.length} models = ${totalEvaluations.toLocaleString('en-US')} LLM calls
`.trim()
}

/**
 * Generate ASCII bar chart showing per-model accuracy across formats
 */
function generateModelBreakdown(
  formatResults: FormatResult[],
  results: EvaluationResult[],
  modelNames: string[],
): string {
  const maxDisplayNameWidth = Math.max(
    ...Object.values(FORMATTER_DISPLAY_NAMES).map(name => name.length),
  )
  const progressBarWidth = 20

  return modelNames.map((modelName, i) => {
    const modelResults = formatResults.map((fr) => {
      const modelFormatResults = results.filter(r => r.model === modelName && r.format === fr.format)
      const correctCount = modelFormatResults.filter(r => r.isCorrect).length
      const totalCount = modelFormatResults.length
      const accuracy = totalCount > 0 ? correctCount / totalCount : 0

      return {
        format: fr.format,
        accuracy,
        correctCount,
        totalCount,
      }
    }).sort((a, b) => b.accuracy - a.accuracy)

    const formatLines = modelResults.map((result) => {
      const bar = createProgressBar(result.accuracy, 1, progressBarWidth)
      const accuracyString = `${(result.accuracy * 100).toFixed(1)}%`.padStart(6)
      const countString = `(${result.correctCount}/${result.totalCount})`
      const prefix = result.format === 'toon' ? '→ ' : '  '
      const displayName = FORMATTER_DISPLAY_NAMES[result.format] || result.format
      return `${prefix}${displayName.padEnd(maxDisplayNameWidth)}   ${bar}   ${accuracyString} ${countString}`
    }).join('\n')

    // Add blank line before model name, except for first model
    return `${i > 0 ? '\n' : ''}${modelName}\n${formatLines}`
  }).join('\n')
}

/**
 * Generate summary comparison between TOON and JSON formats
 */
function generateSummaryComparison(
  toon: FormatResult | undefined,
  json: FormatResult | undefined,
): string {
  if (!toon || !json)
    return ''

  return `
> [!TIP]
> TOON achieves **${(toon.accuracy * 100).toFixed(1)}% accuracy** (vs JSON's ${(json.accuracy * 100).toFixed(1)}%) while using **${((1 - toon.totalTokens / json.totalTokens) * 100).toFixed(1)}% fewer tokens** on these datasets.
`.trim()
}

/**
 * Generate per-dataset performance breakdown tables
 */
function generateDatasetBreakdown(
  formatResults: FormatResult[],
  results: EvaluationResult[],
  questions: Question[],
  tokenCounts: Record<string, number>,
): string {
  // Build question ID to dataset mapping for O(1) lookups
  const questionDatasetMap = new Map(questions.map(q => [q.id, q.dataset]))

  return ACCURACY_DATASETS.map((dataset) => {
    const datasetResults = formatResults.map((fr) => {
      const datasetFormatResults = results.filter(r => questionDatasetMap.get(r.questionId) === dataset.name)
      if (datasetFormatResults.length === 0)
        return undefined

      const formatDatasetResults = datasetFormatResults.filter(r => r.format === fr.format)
      if (formatDatasetResults.length === 0)
        return undefined

      const correctCount = formatDatasetResults.filter(r => r.isCorrect).length
      const totalCount = formatDatasetResults.length
      const accuracy = totalCount > 0 ? correctCount / totalCount : 0

      // Get token count for this dataset+format
      const tokenKey = `${fr.format}-${dataset.name}`
      const tokens = tokenCounts[tokenKey] || fr.totalTokens

      return {
        format: fr.format,
        accuracy,
        tokens,
        correctCount,
        totalCount,
      }
    }).filter(Boolean) as { format: string, accuracy: number, tokens: number, correctCount: number, totalCount: number }[]

    if (datasetResults.length === 0)
      return ''

    // Sort by efficiency
    datasetResults.sort((a, b) => {
      const effA = (a.accuracy ** 2) / (a.tokens / 1000)
      const effB = (b.accuracy ** 2) / (b.tokens / 1000)
      return effB - effA
    })

    const tableRows = datasetResults.slice(0, 6).map(result =>
      `| \`${result.format}\` | ${(result.accuracy * 100).toFixed(1)}% | ${result.tokens.toLocaleString('en-US')} | ${result.correctCount}/${result.totalCount} |`,
    ).join('\n')

    return `
##### ${dataset.description}

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
${tableRows}
`.trimStart()
  }).filter(Boolean).join('\n').trim()
}

/**
 * Generate question type breakdown table
 */
function generateQuestionTypeBreakdown(
  formatResults: FormatResult[],
  results: EvaluationResult[],
  questions: Question[],
): string {
  // Build header
  const formatNames = formatResults.map(fr => FORMATTER_DISPLAY_NAMES[fr.format] || fr.format)
  const header = `| Question Type | ${formatNames.join(' | ')} |`
  const separator = `| ------------- | ${formatNames.map(() => '----').join(' | ')} |`

  // Build rows
  const rows = QUESTION_TYPES.map((type) => {
    const questionIds = questions.filter(q => q.type === type).map(q => q.id)
    const typeResults = results.filter(r => questionIds.includes(r.questionId))

    if (typeResults.length === 0)
      return undefined

    const accuracies = formatResults.map((fr) => {
      const formatTypeResults = typeResults.filter(r => r.format === fr.format)
      if (formatTypeResults.length === 0)
        return 'N/A'

      const correctCount = formatTypeResults.filter(r => r.isCorrect).length
      const totalCount = formatTypeResults.length
      const accuracy = totalCount > 0 ? correctCount / totalCount : 0
      return `${(accuracy * 100).toFixed(1)}%`
    })

    return `| ${QUESTION_TYPE_LABELS[type]} | ${accuracies.join(' | ')} |`
  }).filter(Boolean)

  return `
${header}
${separator}
${rows.join('\n')}
`.trim()
}

/**
 * Generate per-model performance comparison tables
 */
function generateModelPerformanceTable(
  formatResults: FormatResult[],
  results: EvaluationResult[],
  modelNames: string[],
): string {
  return modelNames.map((modelName) => {
    const modelResults = formatResults.map((fr) => {
      const modelFormatResults = results.filter(r => r.model === modelName && r.format === fr.format)
      const correctCount = modelFormatResults.filter(r => r.isCorrect).length
      const totalCount = modelFormatResults.length
      const accuracy = correctCount / totalCount

      return {
        format: fr.format,
        accuracy,
        correctCount,
        totalCount,
      }
    }).sort((a, b) => b.accuracy - a.accuracy)

    const tableRows = modelResults.map(result =>
      `| \`${result.format}\` | ${(result.accuracy * 100).toFixed(1)}% | ${result.correctCount}/${result.totalCount} |`,
    ).join('\n')

    return `
##### ${modelName}

| Format | Accuracy | Correct/Total |
| ------ | -------- | ------------- |
${tableRows}
`.trimStart()
  }).join('\n').trim()
}

/**
 * Generate horizontal bar chart for efficiency ranking
 */
function generateHorizontalEfficiencyChart(
  ranking: EfficiencyRanking[],
): string {
  const barWidth = 20
  const maxEfficiency = Math.max(...ranking.map(r => r.efficiency))
  const maxFormatWidth = Math.max(...ranking.map((r) => {
    const displayName = FORMATTER_DISPLAY_NAMES[r.format] || r.format
    return displayName.length
  }))

  return ranking
    .map((r) => {
      const normalizedValue = r.efficiency / maxEfficiency
      const bar = createProgressBar(normalizedValue, 1, barWidth)
      const displayName = FORMATTER_DISPLAY_NAMES[r.format] || r.format
      const formatName = displayName.padEnd(maxFormatWidth)
      const efficiency = r.efficiency.toFixed(1).padStart(4)
      const accuracy = `${(r.accuracy * 100).toFixed(1)}%`.padStart(5)
      const tokens = r.tokens.toLocaleString('en-US').padStart(5)

      return `${formatName}   ${bar}   ${efficiency} acc%/1K tok  │  ${accuracy} acc  │  ${tokens} tokens`
    })
    .join('\n')
}

/**
 * Generate vertical bar chart for efficiency ranking
 */
function generateVerticalEfficiencyChart(
  ranking: EfficiencyRanking[],
): string {
  const maxEfficiency = Math.max(...ranking.map(r => r.efficiency))
  const chartHeight = 8

  // Generate rows from top to bottom
  const rows: string[] = []

  // Y-axis and bars
  for (let i = chartHeight; i >= 0; i--) {
    const threshold = (i / chartHeight) * maxEfficiency
    const yLabel = i === chartHeight || i === Math.floor(chartHeight / 2) || i === 0
      ? Math.round(threshold).toString().padStart(4)
      : '    '

    const bars = ranking
      .map((r) => {
        const barHeight = (r.efficiency / maxEfficiency) * chartHeight
        let char = ' '
        if (barHeight >= i) {
          // Use different characters for visual distinction
          if (ranking.indexOf(r) === 0)
            char = '▓' // Top format
          else if (ranking.indexOf(r) <= 2)
            char = '▒' // Top 3
          else
            char = '░' // Rest
        }
        return char
      })
      .join('    ')

    rows.push(`${yLabel}│  ${bars}`)
  }

  // X-axis
  const axis = `    └──${ranking.map(() => '┴').join('────')}──`
  rows.push(axis)

  // Format labels (split long names into multiple rows)
  const formatRow1 = ranking
    .map((r) => {
      const parts = r.format.split('-')
      return (parts[0] || '').padEnd(5).substring(0, 5)
    })
    .join('')
  rows.push(`      ${formatRow1}`)

  const formatRow2 = ranking
    .map((r) => {
      const parts = r.format.split('-')
      return (parts[1] || '').padEnd(5).substring(0, 5)
    })
    .join('')
  if (formatRow2.trim())
    rows.push(`      ${formatRow2}`)

  return rows.join('\n')
}
