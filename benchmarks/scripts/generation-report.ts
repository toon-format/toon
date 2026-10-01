import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { BENCHMARKS_DIR } from '../src/constants.ts'
import { parseGenerationRuns, renderGenerationReport } from '../src/generation/report.ts'

const historicalDirectory = path.join(BENCHMARKS_DIR, 'results', 'generation')
const input = process.argv[2]
if (!input)
  throw new Error('Provide a TypeScript run directory, or --historical to inspect the archived Python results')
const historical = input === '--historical'
const directory = historical ? historicalDirectory : path.resolve(input)
if (!historical && directory === historicalDirectory)
  throw new Error('Use --historical for the archived Python results')
const results = parseGenerationRuns(await fsp.readFile(path.join(directory, 'eval-runs.csv'), 'utf8'))
const output = path.join(directory, historical ? 'historical-report.md' : 'report.md')
await fsp.writeFile(output, renderGenerationReport(results, historical))
console.log(`Wrote ${output}`)
