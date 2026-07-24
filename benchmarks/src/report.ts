import type { Format } from './formats.ts'
import type { Dataset, DatasetName, EfficiencyRanking, EvaluationResult, FormatResult, Question } from './types.ts'
import { QUESTION_TYPE_LABELS, QUESTION_TYPES } from './constants.ts'
import { ACCURACY_DATASETS } from './datasets.ts'
import { MODELS } from './evaluate.ts'
import { FORMATS, getFormat, supportsCSV } from './formats.ts'
import { generateQuestions } from './questions/index.ts'
import { encodeDataset } from './structural-corruption.ts'
import { createProgressBar, tokenize, wilsonInterval } from './utils.ts'

const EFFICIENCY_CHART_STYLE: 'vertical' | 'horizontal' = 'horizontal'

// Datasets flat enough for CSV to represent – the shared population every format
// can answer, used to compare CSV against the other formats on equal footing
const FLAT_DATASET_NAMES: ReadonlySet<DatasetName> = new Set(
  ACCURACY_DATASETS.filter(supportsCSV).map(dataset => dataset.name),
)

/**
 * Calculate token counts for all format+dataset combinations
 *
 * @remarks
 * Includes primer tokens for fairer comparison across formats
 */
export function calculateTokenCounts(
  formats: Record<string, Format>,
): Record<string, number> {
  const tokenCounts: Record<string, number> = {}

  for (const [formatName, format] of Object.entries(formats)) {
    for (const dataset of ACCURACY_DATASETS) {
      // Skip CSV for datasets that don't support it
      if (formatName === 'csv' && !supportsCSV(dataset))
        continue

      const formattedData = encodeDataset(format, dataset)
      const primer = format.primer
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
 *
 * @remarks
 * When `tokenDatasetNames` is provided, the average-token figure is restricted
 * to those datasets so every format is compared over the same population –
 * accuracy is always taken over the passed (pre-filtered) results.
 */
export function calculateFormatResults(
  results: EvaluationResult[],
  tokenCounts: Record<string, number>,
  tokenDatasetNames?: ReadonlySet<DatasetName>,
): FormatResult[] {
  const formatNames = [...new Set(results.map(r => r.format))]

  return formatNames.map((formatName) => {
    const formatResults = results.filter(r => r.format === formatName)
    const correctCount = formatResults.filter(r => r.isCorrect).length
    const totalCount = formatResults.length
    const accuracy = correctCount / totalCount

    // Calculate average tokens across the in-scope datasets for this format
    const formatTokenEntries = Object.entries(tokenCounts)
      .filter(([key]) => {
        if (!key.startsWith(`${formatName}-`))
          return false

        // Slice after the known formatName prefix – both format and dataset
        // names contain hyphens, so splitting on '-' would be ambiguous
        if (!tokenDatasetNames)
          return true

        return tokenDatasetNames.has(key.slice(formatName.length + 1) as DatasetName)
      })
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
  tokenCounts: Record<string, number>,
): string {
  const questions = generateQuestions()
  const totalQuestions = [...new Set(results.map(r => r.questionId))].length
  const modelIds = MODELS.map(m => m.id)
  const modelNames = modelIds.filter(id => results.some(r => r.model === id))

  // Overall track excludes CSV entirely – it cannot represent nested datasets,
  // so its numbers would otherwise cover an easier subset than every other format
  const allDatasetsFormatResults = calculateFormatResults(
    results.filter(r => r.format !== 'csv'),
    tokenCounts,
  )

  // Flat-only track puts every format on the same question population, the one
  // CSV can actually represent, so CSV can be compared fairly here
  const flatQuestionIds = new Set(
    questions.filter(question => FLAT_DATASET_NAMES.has(question.dataset)).map(question => question.id),
  )
  const flatOnlyFormatResults = calculateFormatResults(
    results.filter(r => flatQuestionIds.has(r.questionId)),
    tokenCounts,
    FLAT_DATASET_NAMES,
  )
  const flatOnlyCsvResult = flatOnlyFormatResults.find(r => r.format === 'csv')

  // Detailed breakdowns recompute accuracy from raw results, so keeping CSV in
  // their full-population input is intentional
  const fullFormatResults = calculateFormatResults(results, tokenCounts)

  return `
Benchmarks test LLM comprehension across different input formats using ${totalQuestions} data retrieval questions on ${modelNames.length} ${modelNames.length === 1 ? 'model' : 'models'}.

<details>
<summary><strong>Show Dataset Catalog</strong></summary>

${generateDatasetCatalog(ACCURACY_DATASETS)}

</details>

#### Efficiency Ranking (Accuracy per 1K Tokens)

${generateEfficiencyRankingReport(allDatasetsFormatResults, flatOnlyCsvResult, totalQuestions, modelNames.length)}

#### Accuracy by Format

${generateAccuracyComparisonTables(allDatasetsFormatResults, flatOnlyFormatResults, modelNames.length)}

#### Per-Model Accuracy

${generateDetailedAccuracyReport(fullFormatResults, results, questions, tokenCounts, flatQuestionIds.size)}
`.trimStart()
}

/**
 * Render the overall (CSV-excluded) and flat-only (all formats) accuracy tables
 */
function generateAccuracyComparisonTables(
  allDatasetsFormatResults: FormatResult[],
  flatOnlyFormatResults: FormatResult[],
  modelCount: number,
): string {
  const renderRows = (formatResults: FormatResult[]): string =>
    formatResults.map((fr) => {
      const confidenceInterval = wilsonInterval(fr.correctCount, fr.totalCount)
      const marginString = `±${(confidenceInterval.halfWidth * 100).toFixed(1)}`

      return `| \`${fr.format}\` | ${(fr.accuracy * 100).toFixed(1)}% ${marginString} | ${fr.correctCount}/${fr.totalCount} | ${fr.totalTokens.toLocaleString('en-US')} |`
    }).join('\n')

  const flatQuestionCount = flatOnlyFormatResults.length > 0
    ? flatOnlyFormatResults[0]!.totalCount / modelCount
    : 0

  return `
##### All Datasets

CSV is excluded here – it cannot represent the nested datasets.

| Format | Accuracy | Correct/Total | Avg Tokens |
| ------ | -------- | ------------- | ---------- |
${renderRows(allDatasetsFormatResults)}

##### Flat Datasets Only

Every format answers the same ${flatQuestionCount} flat-dataset questions per model.

| Format | Accuracy | Correct/Total | Avg Tokens |
| ------ | -------- | ------------- | ---------- |
${renderRows(flatOnlyFormatResults)}
`.trim()
}

/**
 * Generate dataset catalog section
 */
function generateDatasetCatalog(datasets: Dataset[]): string {
  const rows = datasets.map((dataset) => {
    const csvSupport = supportsCSV(dataset) ? '✓' : '✗'
    const first = Object.values(dataset.data)[0]
    // Keyed maps expose their entries as an object, not an array – count keys so
    // the catalog reports the real entry count instead of a misleading 1
    const rowCount = Array.isArray(first)
      ? first.length
      : (first && typeof first === 'object' ? Object.keys(first).length : 1)
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
  allDatasetsFormatResults: FormatResult[],
  flatOnlyCsvResult: FormatResult | undefined,
  totalQuestions: number,
  modelCount: number,
): string {
  const toon = allDatasetsFormatResults.find(r => r.format === 'toon')
  const json = allDatasetsFormatResults.find(r => r.format === 'json-pretty')

  // Build efficiency ranking (accuracy per 1k tokens) – input is already CSV-free
  const efficiencyRanking = allDatasetsFormatResults
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
  if (flatOnlyCsvResult) {
    // CSV totalCount is evaluations (questions × models), so divide by number of models to get question count
    const csvQuestionCount = flatOnlyCsvResult.totalCount / modelCount
    csvNote = `> [!NOTE]\n> CSV is excluded from the ranking as it only supports ${csvQuestionCount} of ${totalQuestions} questions (flat tabular data only). While CSV is highly token-efficient for simple tabular data, it cannot represent nested structures that other formats handle.`
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
  flatQuestionCount: number,
): string {
  const modelIds = MODELS.map(m => m.id)
  const modelNames = modelIds.filter(id => results.some(r => r.model === id))

  const modelBreakdown = generateModelBreakdown(formatResults, results, modelNames)

  const datasetBreakdown = generateDatasetBreakdown(formatResults, results, questions, tokenCounts)

  const modelPerformance = generateModelPerformanceTable(formatResults, results, modelNames)

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
  const keyedSize = Object.keys(ACCURACY_DATASETS.find(d => d.name === 'keyed')?.data.flags ?? {}).length
  const nestedGroupSize = ACCURACY_DATASETS.find(d => d.name === 'nested-group')?.data.contacts?.length || 0

  // Calculate number of formats and evaluations
  const formatCount = formatResults.length
  const totalEvaluations = totalQuestions * formatCount * modelNames.length

  return `
Accuracy across ${modelNames.length} ${modelNames.length === 1 ? 'LLM' : 'LLMs'} on ${totalQuestions} data retrieval questions:

\`\`\`
${modelBreakdown}
\`\`\`

> [!NOTE]
> Accuracy figures include Wilson 95% confidence intervals (±); when two formats' intervals overlap, the difference between them is not statistically meaningful. CSV answers only the ${flatQuestionCount} flat-dataset questions, so its per-model cells cover a smaller, easier population than the other formats.

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

Thirteen datasets designed to test different structural patterns and validation capabilities:

**Primary datasets:**

1. **Tabular** (${tabularSize} employee records): Uniform objects with identical fields – optimal for TOON's tabular format.
2. **Nested** (${nestedSize} e-commerce orders): Complex structures with nested customer objects and item arrays.
3. **Analytics** (${analyticsSize} days of metrics): Time-series data with dates and numeric values.
4. **GitHub** (${githubSize} repositories): Real-world data from top GitHub repos by stars.
5. **Event Logs** (${eventLogsSize} logs): Semi-uniform data with ~50% flat logs and ~50% with nested error objects.
6. **Nested Config** (${nestedConfigSize} configuration): Deeply nested configuration with minimal tabular eligibility.
7. **Keyed** (${keyedSize} feature flags): Map of uniform flat objects – exercises TOON's [keyed tabular form](https://github.com/toon-format/spec/blob/main/SPEC.md#95-keyed-objects--tabular-form) (\`key[N:]{fields}:\`).
8. **Nested Group** (${nestedGroupSize} contacts): Uniform records with nested address and plan objects – exercises TOON's [nested field groups](https://github.com/toon-format/spec/blob/main/SPEC.md#93-arrays-of-objects--tabular-form).

**Structural validation datasets:**

Each carries the same valid 20-row dataset; the corruption is applied to the encoded text after it is emitted, so TOON's \`[N]\` length and \`{fields}\` width still declare the original shape while JSON, YAML, XML, and CSV render the lossy-pipeline outcome.

9. **Control**: Valid complete dataset, text passed through untouched (baseline for validation)
10. **Truncated**: Last 3 row lines removed – TOON still declares \`[20]\`, so the shortfall is detectable; formats without length metadata stay valid and undetectable in principle
11. **Extra rows**: 3 rows appended past the declared \`[20]\` – detectable in TOON, valid and undetectable elsewhere
12. **Width mismatch**: One cell dropped from row 10 – TOON's row is narrower than its \`{fields}\` header (CSV narrower than its column row); JSON/YAML/XML only drop the property, a schema-level signal
13. **Missing fields**: The email value removed from every 5th record, surfacing the same way as width mismatch

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
  - Note: With reasoning disabled, multi-row arithmetic is hard in every format – aggregation and filtering scores mostly measure computation under format friction and sit near the floor for all formats.

- **Structure awareness (${structureAwarenessPercent}%)**: Tests format-native structural affordances (TOON's \`[N]\` count and \`{fields}\`, CSV's header row)
  - Example: "How many employees are in the dataset?" → \`100\`
  - Example: "List the field names for employees" → \`id, name, email, department, salary, yearsExperience, active\`
  - Example: "What is the department of the last employee?" → \`Sales\`

- **Structural validation (${structuralValidationPercent}%)**: Tests ability to detect incomplete, truncated, or corrupted data from the encoded text alone
  - Example: "Is this data complete and valid?" → \`YES\` (control dataset) or \`NO\` (corrupted datasets)
  - The text is corrupted post-encode: TOON's \`[N]\` length and \`{fields}\` width still declare the original shape, so truncation, extra rows, and width drops are detectable
  - JSON, YAML, XML, and CSV carry no length metadata, so their truncated and extra-row variants stay syntactically valid and cannot be flagged in principle – that contrast is the demonstration

#### Evaluation Process

1. **Format conversion**: Each dataset is converted to all ${formatCount} formats (${formatResults.map(f => getFormat(f.format).displayName).join(', ')}).
2. **Query LLM**: Each model receives formatted data + question in a prompt and extracts the answer.
3. **Validate deterministically**: Answers are validated using type-aware comparison (e.g., \`50000\` = \`$50,000\`, \`Engineering\` = \`engineering\`, \`2025-01-01\` = \`January 1, 2025\`) without requiring an LLM judge.

#### Models & Configuration

- **Models tested**: ${modelNames.map(m => `\`${m}\``).join(', ')}
- **Token counting**: Using \`gpt-tokenizer\` with \`o200k_base\` encoding (GPT-5 tokenizer). Other providers tokenize differently, so absolute counts are tokenizer-specific; relative differences between formats hold directionally.
- **Reasoning**: Disabled via the AI SDK's universal \`reasoning: 'none'\` (Gemini 3 floors at minimal thinking)
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
    ...Object.values(FORMATS).map(format => format.displayName.length),
  )
  const progressBarWidth = 20

  return modelNames.map((modelName, i) => {
    const modelResults = formatResults.map((fr) => {
      const modelFormatResults = results.filter(r => r.model === modelName && r.format === fr.format)
      const correctCount = modelFormatResults.filter(r => r.isCorrect).length
      const totalCount = modelFormatResults.length
      const accuracy = totalCount > 0 ? correctCount / totalCount : 0
      const confidenceInterval = wilsonInterval(correctCount, totalCount)

      return {
        format: fr.format,
        accuracy,
        correctCount,
        totalCount,
        halfWidth: confidenceInterval.halfWidth,
      }
    }).sort((a, b) => b.accuracy - a.accuracy)

    const formatLines = modelResults.map((result) => {
      const bar = createProgressBar(result.accuracy, 1, progressBarWidth)
      const accuracyString = `${(result.accuracy * 100).toFixed(1)}%`.padStart(6)
      const marginString = `±${(result.halfWidth * 100).toFixed(1)}`
      const countString = `(${result.correctCount}/${result.totalCount})`
      const prefix = result.format === 'toon' ? '→ ' : '  '
      const displayName = getFormat(result.format).displayName

      return `${prefix}${displayName.padEnd(maxDisplayNameWidth)}   ${bar}   ${accuracyString} ${marginString} ${countString}`
    }).join('\n')

    // Add blank line before model name, except for first model
    return `${i > 0 ? '\n' : ''}${modelName}\n${formatLines}`
  }).join('\n')
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
  const formatNames = formatResults.map(fr => getFormat(fr.format).displayName)
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
    const displayName = getFormat(r.format).displayName
    return displayName.length
  }))

  return ranking
    .map((r) => {
      const normalizedValue = r.efficiency / maxEfficiency
      const bar = createProgressBar(normalizedValue, 1, barWidth)
      const displayName = getFormat(r.format).displayName
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
