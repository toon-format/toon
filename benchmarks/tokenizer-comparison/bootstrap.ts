import type { BootstrapResult, FormatName, TokenizerAdapter, TokenizerFormatResult } from './types.ts'
import { formatters } from '../src/formatters.ts'

const N_RUNS = 30
const SAMPLE_RATIO = 0.5
const EXCLUDED_DATASETS = ['nested-config']

/**
 * Resample an array with replacement (bootstrapping)
 */
function resample<T>(array: T[], size: number): T[] {
  return Array.from({ length: size }, () =>
    array[Math.floor(Math.random() * array.length)]!)
}

/**
 * Extract the main array from a dataset
 */
function extractArray(data: Record<string, any>): any[] | null {
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length > 0) {
      return value
    }
  }
  return null
}

/**
 * Calculate mean of an array
 */
function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Calculate standard deviation
 */
function std(values: number[], meanValue: number): number {
  const variance = values.reduce((a, b) => a + (b - meanValue) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Run bootstrap analysis for a single dataset x format x tokenizer
 */
async function bootstrapOne(
  datasetName: string,
  data: Record<string, any>,
  format: FormatName,
  tokenizer: TokenizerAdapter,
): Promise<BootstrapResult | null> {
  if (EXCLUDED_DATASETS.includes(datasetName))
    return null

  const array = extractArray(data)
  if (!array)
    return null

  const sampleSize = Math.floor(array.length * SAMPLE_RATIO)
  const formatter = formatters[format]
  if (!formatter)
    return null

  const counts: number[] = []
  const arrayKey = Object.keys(data).find(k => Array.isArray(data[k]))!

  for (let i = 0; i < N_RUNS; i++) {
    const sample = resample(array, sampleSize)
    const sampleData = { [arrayKey]: sample }
    const text = formatter(sampleData)
    const count = await tokenizer.count(text)
    counts.push(count)
  }

  const meanVal = mean(counts)
  const stdVal = std(counts, meanVal)
  const ci95Low = meanVal - 1.96 * (stdVal / Math.sqrt(N_RUNS))
  const ci95High = meanVal + 1.96 * (stdVal / Math.sqrt(N_RUNS))

  return {
    tokenizer: tokenizer.name,
    format,
    dataset: datasetName,
    mean: Math.round(meanVal),
    std: Math.round(stdVal),
    ci95Low: Math.round(ci95Low),
    ci95High: Math.round(ci95High),
    runs: N_RUNS,
  }
}

/**
 * Run bootstrap analysis for all datasets x formats x tokenizers
 */
export async function runBootstrap(
  datasets: { name: string, data: Record<string, any> }[],
  formats: FormatName[],
  tokenizers: TokenizerAdapter[],
): Promise<BootstrapResult[]> {
  const results: BootstrapResult[] = []

  for (const dataset of datasets) {
    if (EXCLUDED_DATASETS.includes(dataset.name)) {
      console.warn(`  Skipping bootstrap for ${dataset.name} (excluded)`)
      continue
    }

    console.warn(`  Running bootstrap for ${dataset.name} (${N_RUNS} runs)...`)

    for (const format of formats) {
      for (const tokenizer of tokenizers) {
        const result = await bootstrapOne(dataset.name, dataset.data, format, tokenizer)
        if (result) {
          results.push(result)
          console.warn(`    [${tokenizer.name}] ${format}: ${result.mean} ± ${result.std} (95% CI: [${result.ci95Low}, ${result.ci95High}])`)
        }
      }
    }
  }

  return results
}
