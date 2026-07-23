import type { LanguageModelV3 } from '@ai-sdk/provider'
import type { GenerationCaseResult, GenerationRunResult } from '../src/generation/types.ts'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import * as prompts from '@clack/prompts'
import { stringify } from 'csv-stringify/sync'
import { BENCHMARKS_DIR, DRY_RUN, ROOT_DIR } from '../src/constants.ts'
import { GENERATION_CASES } from '../src/generation/cases.ts'
import { createNebiusProvider, evaluateGenerationTrack } from '../src/generation/evaluate.ts'
import { aggregateGenerationRunsByCase, aggregateGenerationRunsByModel, flattenGenerationRun, generationCsvColumns } from '../src/generation/results.ts'
import { GENERATION_TRACK_IDS } from '../src/generation/types.ts'
import { ensureDir } from '../src/utils.ts'

const DEFAULT_MODELS = [
  'deepseek-ai/DeepSeek-V3-0324-fast',
  'openai/gpt-oss-120b',
  'moonshotai/Kimi-K2-Instruct',
  'Qwen/Qwen3-Coder-480B-A35B-Instruct',
  'NousResearch/Hermes-4-405B',
  'NousResearch/Hermes-4-70B',
  'openai/gpt-oss-20b',
  'zai-org/GLM-4.5',
  'deepseek-ai/DeepSeek-R1-0528',
  'PrimeIntellect/INTELLECT-3',
  'Qwen/Qwen3-235B-A22B-Thinking-2507',
  'Qwen/Qwen3-235B-A22B-Instruct-2507',
  'Qwen/Qwen3-30B-A3B-Instruct-2507',
  'Qwen/Qwen3-Coder-30B-A3B-Instruct',
  'Qwen/Qwen3-32B',
  'nvidia/Llama-3_1-Nemotron-Ultra-253B-v1',
  'meta-llama/Llama-3.3-70B-Instruct',
  'meta-llama/Meta-Llama-3.1-8B-Instruct',
  'Qwen/Qwen2.5-Coder-7B-fast',
  'google/gemma-2-2b-it',
  'google/gemma-2-9b-it-fast',
] as const

const apiKey = process.env.NEBIUS_API_KEY ?? process.env.LLM_API_KEY
if (!apiKey)
  throw new Error('Missing NEBIUS_API_KEY environment variable')

const configuredModels = process.env.GENERATION_MODELS
  ?.split(',')
  .map(model => model.trim())
  .filter(Boolean)
const models = DRY_RUN
  ? [(configuredModels?.[0] ?? DEFAULT_MODELS[0])]
  : (configuredModels?.length ? configuredModels : [...DEFAULT_MODELS])
const runsPerModel = DRY_RUN ? 1 : positiveInteger(process.env.GENERATION_RUNS, 10)
const nebius = createNebiusProvider(apiKey)
const results: GenerationRunResult[] = []

prompts.intro('Structured Generation Benchmark')
prompts.log.info(`Running ${models.length} model(s) × ${runsPerModel} run(s) × ${GENERATION_CASES.length} cases × ${GENERATION_TRACK_IDS.length} tracks`)

for (const modelId of models) {
  const model = nebius(modelId)
  for (let run = 1; run <= runsPerModel; run++) {
    prompts.log.step(`${modelId}: run ${run}/${runsPerModel}`)
    const cases = {} as GenerationRunResult['cases']

    for (const benchmarkCase of GENERATION_CASES) {
      cases[benchmarkCase.id] = await evaluateCase(model, benchmarkCase)
      prompts.log.info(`Completed ${benchmarkCase.id}`)
    }

    results.push({ cases, model: modelId, run })
    await writeResults(results)
  }
}

prompts.outro(`Results saved to ${path.relative(ROOT_DIR, generationResultsDirectory())}`)

async function evaluateCase(model: LanguageModelV3, benchmarkCase: typeof GENERATION_CASES[number]): Promise<GenerationCaseResult> {
  const result = {} as GenerationCaseResult
  for (const track of GENERATION_TRACK_IDS) {
    prompts.log.info(`Running ${benchmarkCase.id}/${track}`)
    result[track] = await evaluateGenerationTrack({ benchmarkCase, model, track })
  }
  return result
}

async function writeResults(runResults: GenerationRunResult[]): Promise<void> {
  const directory = generationResultsDirectory()
  await ensureDir(directory)

  const runs = runResults.map(flattenGenerationRun)
  const byCase = aggregateGenerationRunsByCase(runResults)
  const byModel = aggregateGenerationRunsByModel(runResults)

  await Promise.all([
    fsp.writeFile(path.join(directory, 'eval-runs.csv'), stringify(runs, {
      header: true,
      columns: generationCsvColumns(),
    })),
    fsp.writeFile(path.join(directory, 'eval-results-by-case.csv'), stringify(byCase, { header: true })),
    fsp.writeFile(path.join(directory, 'eval-results-by-model.csv'), stringify(byModel, { header: true })),
  ])
}

function generationResultsDirectory(): string {
  return path.join(BENCHMARKS_DIR, 'results', 'generation')
}

function positiveInteger(input: string | undefined, fallback: number): number {
  if (input === undefined)
    return fallback
  const value = Number(input)
  if (!Number.isInteger(value) || value <= 0)
    throw new TypeError(`Expected a positive integer, received: ${input}`)
  return value
}
