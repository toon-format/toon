import type { GenerationCaseId, GenerationRunResult, GenerationTrackId } from './types.ts'
import { GENERATION_CASE_IDS } from './types.ts'

type CsvValue = boolean | number | string
type CsvRow = Record<string, CsvValue>

const TRACK_CSV_NAMES = {
  'json-object': 'json',
  'json-plain': 'json_plain',
  'toon': 'toon',
} satisfies Record<GenerationTrackId, string>

export function generationCsvColumns(): string[] {
  const columns = ['model', 'run']

  for (const caseId of GENERATION_CASE_IDS) {
    for (const track of ['json-object', 'json-plain', 'toon'] as const) {
      const prefix = `${caseId}_${TRACK_CSV_NAMES[track]}`
      columns.push(
        `${prefix}_one_shot`,
        `${prefix}_final`,
        `${prefix}_attempts`,
        `${prefix}_prompt_tokens`,
        `${prefix}_completion_tokens`,
      )
    }
  }

  for (const format of ['json', 'json_plain', 'toon']) {
    columns.push(
      `${format}_one_shot_accuracy`,
      `${format}_final_accuracy`,
      `${format}_prompt_tokens`,
      `${format}_completion_tokens`,
      `${format}_total_tokens`,
    )
  }

  columns.push('overall_prompt_tokens', 'overall_completion_tokens', 'overall_total_tokens')
  return columns
}

export function flattenGenerationRun(result: GenerationRunResult): CsvRow {
  const row: CsvRow = { model: result.model, run: result.run }

  for (const caseId of GENERATION_CASE_IDS) {
    for (const track of ['json-object', 'json-plain', 'toon'] as const) {
      const trackResult = result.cases[caseId][track]
      const prefix = `${caseId}_${TRACK_CSV_NAMES[track]}`
      row[`${prefix}_one_shot`] = trackResult.oneShotOk ? 'True' : 'False'
      row[`${prefix}_final`] = trackResult.finalOk ? 'True' : 'False'
      row[`${prefix}_attempts`] = trackResult.attemptsUsed
      row[`${prefix}_prompt_tokens`] = trackResult.inputTokens
      row[`${prefix}_completion_tokens`] = trackResult.outputTokens
    }
  }

  const summaries = {
    json: summarizeTrack(result, 'json-object'),
    json_plain: summarizeTrack(result, 'json-plain'),
    toon: summarizeTrack(result, 'toon'),
  }

  for (const [format, summary] of Object.entries(summaries)) {
    row[`${format}_one_shot_accuracy`] = summary.oneShotAccuracy
    row[`${format}_final_accuracy`] = summary.finalAccuracy
    row[`${format}_prompt_tokens`] = summary.inputTokens
    row[`${format}_completion_tokens`] = summary.outputTokens
    row[`${format}_total_tokens`] = summary.inputTokens + summary.outputTokens
  }

  row.overall_prompt_tokens = sum(Object.values(summaries).map(summary => summary.inputTokens))
  row.overall_completion_tokens = sum(Object.values(summaries).map(summary => summary.outputTokens))
  row.overall_total_tokens = row.overall_prompt_tokens + row.overall_completion_tokens
  return row
}

export function aggregateGenerationRunsByCase(results: GenerationRunResult[]): CsvRow[] {
  return GENERATION_CASE_IDS.map((caseId) => {
    const row: CsvRow = { case: caseId }
    addAggregateTrackFields(row, results, 'json-plain', caseId, 'J')
    addAggregateTrackFields(row, results, 'json-object', caseId, 'JSO')
    addAggregateTrackFields(row, results, 'toon', caseId, 'T')
    return row
  })
}

export function aggregateGenerationRunsByModel(results: GenerationRunResult[]): CsvRow[] {
  const models = [...new Set(results.map(result => result.model))]
  return models.map((model) => {
    const modelResults = results.filter(result => result.model === model)
    const row: CsvRow = { model }
    addAggregateModelFields(row, modelResults, 'json-plain', 'J')
    addAggregateModelFields(row, modelResults, 'json-object', 'JSO')
    addAggregateModelFields(row, modelResults, 'toon', 'T')
    return row
  })
}

function summarizeTrack(result: GenerationRunResult, track: GenerationTrackId): {
  finalAccuracy: number
  inputTokens: number
  oneShotAccuracy: number
  outputTokens: number
} {
  const trackResults = GENERATION_CASE_IDS.map(caseId => result.cases[caseId][track])
  return {
    finalAccuracy: count(trackResults.map(item => item.finalOk)) / trackResults.length,
    inputTokens: sum(trackResults.map(item => item.inputTokens)),
    oneShotAccuracy: count(trackResults.map(item => item.oneShotOk)) / trackResults.length,
    outputTokens: sum(trackResults.map(item => item.outputTokens)),
  }
}

function addAggregateTrackFields(
  row: CsvRow,
  results: GenerationRunResult[],
  track: GenerationTrackId,
  caseId: GenerationCaseId,
  prefix: string,
): void {
  const values = results.map(result => result.cases[caseId][track])
  row[`${prefix}1S`] = average(values.map(value => Number(value.oneShotOk)))
  row[`${prefix}F`] = average(values.map(value => Number(value.finalOk)))
  row[`${prefix}T`] = average(values.map(value => value.inputTokens + value.outputTokens))
}

function addAggregateModelFields(
  row: CsvRow,
  results: GenerationRunResult[],
  track: GenerationTrackId,
  prefix: string,
): void {
  const values = results.flatMap(result => GENERATION_CASE_IDS.map(caseId => result.cases[caseId][track]))
  row[`${prefix}1S`] = average(values.map(value => Number(value.oneShotOk)))
  row[`${prefix}F`] = average(values.map(value => Number(value.finalOk)))
  row[`${prefix}T`] = average(results.map((result) => {
    const perRun = GENERATION_CASE_IDS.map(caseId => result.cases[caseId][track])
    return sum(perRun.map(value => value.inputTokens + value.outputTokens))
  }))
}

function count(values: boolean[]): number {
  return values.filter(Boolean).length
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length
}
