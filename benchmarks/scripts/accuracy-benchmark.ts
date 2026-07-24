import type { ModelDescriptor } from '../src/evaluate.ts'
import type { Format } from '../src/formats.ts'
import type { Question } from '../src/types.ts'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import * as prompts from '@clack/prompts'
import PQueue from 'p-queue'
import { BENCHMARKS_DIR, DEFAULT_CONCURRENCY, DRY_RUN, DRY_RUN_LIMITS, ROOT_DIR } from '../src/constants.ts'
import { ACCURACY_DATASETS } from '../src/datasets.ts'
import { evaluateQuestion, MODELS } from '../src/evaluate.ts'
import { FORMATS, supportsCSV } from '../src/formats.ts'
import { generateQuestions } from '../src/questions/index.ts'
import { calculateTokenCounts, generateAccuracyReport } from '../src/report.ts'
import { getAllModelResults, hasModelResults, saveModelResults } from '../src/storage.ts'
import { encodeDataset } from '../src/structural-corruption.ts'
import { ensureDir } from '../src/utils.ts'

// Constants
const PROGRESS_UPDATE_INTERVAL = 10
const RATE_LIMIT_INTERVAL_MS = 60_000

prompts.intro('Retrieval Accuracy Benchmark')

/**
 * Generate evaluation tasks for a model
 */
function generateEvaluationTasks(questions: Question[]): { question: Question, format: Format }[] {
  const tasks: { question: Question, format: Format }[] = []

  for (const question of questions) {
    for (const format of Object.values(FORMATS)) {
      // Skip CSV for datasets that don't support it
      const dataset = ACCURACY_DATASETS.find(d => d.name === question.dataset)
      if (format.name === 'csv' && dataset && !supportsCSV(dataset))
        continue

      tasks.push({ question, format })
    }
  }

  return tasks
}

/**
 * Check which models already have saved results
 */
async function checkExistingResults(activeModels: ModelDescriptor[]) {
  const existingModelResults: Record<string, boolean> = {}

  for (const model of activeModels) {
    const existingResult = await hasModelResults(model.id)
    if (existingResult)
      existingModelResults[model.id] = existingResult
  }

  return existingModelResults
}

/**
 * Create a progress updater function
 */
function createProgressUpdater(spinner: ReturnType<typeof prompts.spinner>, total: number) {
  let completed = 0

  return () => {
    completed++
    if (completed % PROGRESS_UPDATE_INTERVAL === 0 || completed === total) {
      const percent = ((completed / total) * 100).toFixed(1)
      spinner.message(`Progress: ${completed}/${total} (${percent}%)`)
    }
  }
}

/**
 * Create a rate-limited queue for model evaluation
 */
function createEvaluationQueue(rpm: number | undefined) {
  return new PQueue({
    concurrency: DEFAULT_CONCURRENCY,
    intervalCap: rpm ?? Infinity,
    interval: rpm ? RATE_LIMIT_INTERVAL_MS : 0,
  })
}

// Prompt user to select which models to benchmark
const modelChoices = MODELS.map(({ id }) => ({
  value: id,
  label: id,
}))

const selectedModels = await prompts.multiselect({
  message: 'Select models to benchmark (Space to select, Enter to confirm)',
  options: modelChoices,
  required: true,
})

if (prompts.isCancel(selectedModels)) {
  prompts.cancel('Benchmark cancelled')
  process.exit(0)
}

const activeModels = MODELS.filter(m => selectedModels.includes(m.id))

prompts.log.info(`Selected ${activeModels.length} model(s): ${activeModels.map(m => m.id).join(', ')}`)

const existingModelResults = await checkExistingResults(activeModels)

if (Object.keys(existingModelResults).length > 0) {
  prompts.log.info(`Found existing results for ${Object.keys(existingModelResults).length} model(s)`)
}

if (DRY_RUN) {
  prompts.log.info('Limiting questions and models for dry run')
}

let questions = generateQuestions()

// Apply dry run limits if enabled
if (DRY_RUN && DRY_RUN_LIMITS.maxQuestions) {
  questions = questions.slice(0, DRY_RUN_LIMITS.maxQuestions)
}

prompts.log.info(`Evaluating ${questions.length} questions`)
prompts.log.info(`Testing ${Object.keys(FORMATS).length} formats`)

// Evaluate each model separately and save results incrementally
for (const descriptor of activeModels) {
  const modelId = descriptor.id

  // Skip if results already exist
  if (existingModelResults[modelId]) {
    prompts.log.info(`Skipping ${modelId} (results already exist)`)
    continue
  }

  prompts.log.step(`Running benchmark for ${modelId}`)

  const tasks = generateEvaluationTasks(questions)

  const total = tasks.length
  const languageModel = descriptor.create()
  const queue = createEvaluationQueue(descriptor.rpm)

  const evalSpinner = prompts.spinner()
  evalSpinner.start(`Running ${total} evaluations (concurrency: ${DEFAULT_CONCURRENCY}, RPM limit: ${descriptor.rpm ?? 'unlimited'})`)

  const updateProgress = createProgressUpdater(evalSpinner, total)

  // Queue all tasks
  const modelResultPromises = tasks.map(task =>
    queue.add(async () => {
      // Format data on-demand
      const dataset = ACCURACY_DATASETS.find(d => d.name === task.question.dataset)!
      const formattedData = encodeDataset(task.format, dataset)

      const result = await evaluateQuestion({
        question: task.question,
        format: task.format,
        formattedData,
        model: languageModel,
        reasoning: descriptor.reasoning,
      })

      updateProgress()

      return result
    }),
  )

  const modelResults = await Promise.all(modelResultPromises)

  evalSpinner.stop(`Evaluation complete for ${modelId}`)

  // Save results immediately for this model
  await saveModelResults(modelId, modelResults)
  prompts.log.success(`Saved results for ${modelId}`)
}

// Generate/regenerate markdown report from all available model results
const reportSpinner = prompts.spinner()
reportSpinner.start('Generating report from all model results')

// Load all available model results (including any that were skipped)
const allModelResults = await getAllModelResults()
const allResults = Object.values(allModelResults).flat()

if (allResults.length === 0) {
  prompts.log.warn('No results available to generate report')
  process.exit(0)
}

const tokenCounts = calculateTokenCounts(FORMATS)
const accuracyReport = generateAccuracyReport(allResults, tokenCounts)

const resultsDir = path.join(BENCHMARKS_DIR, 'results')
await ensureDir(resultsDir)

const outputFilePath = path.join(resultsDir, 'retrieval-accuracy.md')
await fsp.writeFile(outputFilePath, accuracyReport)

reportSpinner.stop('Report generation complete!')
prompts.log.info(`Report saved to: \`${path.relative(ROOT_DIR, outputFilePath)}\``)
