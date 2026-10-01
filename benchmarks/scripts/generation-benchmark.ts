import type { LanguageModelV4 } from '@ai-sdk/provider'
import type { GenerationCaseResult, GenerationRunResult } from '../src/generation/types.ts'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import * as prompts from '@clack/prompts'
import { stringify } from 'csv-stringify/sync'
import { BENCHMARKS_DIR, DRY_RUN, ROOT_DIR } from '../src/constants.ts'
import { GENERATION_CASES } from '../src/generation/cases.ts'
import { createNebiusProvider, evaluateGenerationTrack, GENERATION_SETTINGS } from '../src/generation/evaluate.ts'
import { renderGenerationReport } from '../src/generation/report.ts'
import { aggregateGenerationRunsByCase, aggregateGenerationRunsByModel, flattenGenerationRun, generationCsvColumns } from '../src/generation/results.ts'
import { createGenerationRunDirectory, writeGenerationCheckpoint } from '../src/generation/storage.ts'
import { GENERATION_TRACK_IDS } from '../src/generation/types.ts'

const apiKey = process.env.NEBIUS_API_KEY?.trim()
if (!apiKey)
  throw new Error('Missing NEBIUS_API_KEY environment variable')

const configuredModels = process.env.GENERATION_MODELS
  ?.split(',')
  .map(model => model.trim())
  .filter(Boolean)
if (!configuredModels?.length)
  throw new Error('Missing GENERATION_MODELS: set a comma-separated list of model IDs available to your Nebius account')
const models = DRY_RUN
  ? [configuredModels[0]!]
  : [...new Set(configuredModels)]
const runsPerModel = DRY_RUN ? 1 : positiveInteger(process.env.GENERATION_RUNS, 10)
const nebius = createNebiusProvider(apiKey)
const results: GenerationRunResult[] = []
const directory = await createGenerationRunDirectory(path.join(BENCHMARKS_DIR, 'results', 'generation', 'runs'))
const gitStatus = gitOutput(['status', '--porcelain', '--untracked-files=no'])
const metadata = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  completed: false,
  completedModelRuns: 0,
  provider: 'nebius',
  baseURL: 'https://api.tokenfactory.nebius.com/v1/',
  models,
  runsPerModel,
  settings: GENERATION_SETTINGS,
  nodeVersion: process.version,
  toonVersion: JSON.parse(await fsp.readFile(path.join(ROOT_DIR, 'packages/toon/package.json'), 'utf8')).version as string,
  gitRevision: gitOutput(['rev-parse', 'HEAD']),
  workingTreeDirty: gitStatus === null ? null : gitStatus !== '',
  sourceHashes: await sourceHashes(),
}
await fsp.writeFile(path.join(directory, 'metadata.json'), `${JSON.stringify(metadata, undefined, 2)}\n`)

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

metadata.completed = true
await writeResults(results)
prompts.outro(`Results saved to ${path.relative(ROOT_DIR, directory)}`)

async function evaluateCase(model: LanguageModelV4, benchmarkCase: typeof GENERATION_CASES[number]): Promise<GenerationCaseResult> {
  const result = {} as GenerationCaseResult
  for (const track of GENERATION_TRACK_IDS) {
    prompts.log.info(`Running ${benchmarkCase.id}/${track}`)
    result[track] = await evaluateGenerationTrack({ benchmarkCase, model, track })
  }
  return result
}

async function writeResults(runResults: GenerationRunResult[]): Promise<void> {
  metadata.completedModelRuns = runResults.length

  const runs = runResults.map(flattenGenerationRun)
  const byCase = aggregateGenerationRunsByCase(runResults)
  const byModel = aggregateGenerationRunsByModel(runResults)

  await Promise.all([
    writeGenerationCheckpoint(path.join(directory, 'report.md'), renderGenerationReport(runResults)),
    writeGenerationCheckpoint(path.join(directory, 'eval-runs.csv'), stringify(runs, {
      header: true,
      columns: generationCsvColumns(),
    })),
    writeGenerationCheckpoint(path.join(directory, 'eval-results-by-case.csv'), stringify(byCase, { header: true })),
    writeGenerationCheckpoint(path.join(directory, 'eval-results-by-model.csv'), stringify(byModel, { header: true })),
  ])
  await writeGenerationCheckpoint(path.join(directory, 'metadata.json'), `${JSON.stringify(metadata, undefined, 2)}\n`)
}

function gitOutput(args: string[]): string | null {
  try {
    return execFileSync('git', args, { cwd: ROOT_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  }
  catch {
    return null
  }
}

async function sourceHashes(): Promise<Record<string, string>> {
  const files = [
    'pnpm-lock.yaml',
    'packages/toon/package.json',
    'benchmarks/scripts/generation-benchmark.ts',
    ...['cases', 'evaluate', 'results', 'types', 'report'].map(name => `benchmarks/src/generation/${name}.ts`),
  ]
  const entries = await Promise.all(files.map(async file => [
    file,
    createHash('sha256').update(await fsp.readFile(path.join(ROOT_DIR, file))).digest('hex'),
  ]))
  return Object.fromEntries(entries)
}

function positiveInteger(input: string | undefined, fallback: number): number {
  if (input === undefined)
    return fallback
  const value = Number(input)
  if (!Number.isInteger(value) || value <= 0)
    throw new TypeError(`Expected a positive integer, received: ${input}`)
  return value
}
