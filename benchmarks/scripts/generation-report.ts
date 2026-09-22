import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { BENCHMARKS_DIR } from '../src/constants.ts'
import { parseGenerationRuns, renderGenerationReport } from '../src/generation/report.ts'

const historicalDirectory = path.join(BENCHMARKS_DIR, 'results', 'generation')
const directory = process.argv[2] ? path.resolve(process.argv[2]) : historicalDirectory
const historical = directory === historicalDirectory
const results = parseGenerationRuns(await fsp.readFile(path.join(directory, 'eval-runs.csv'), 'utf8'))
const output = path.join(directory, historical ? 'historical-report.md' : 'report.md')
await fsp.writeFile(output, renderGenerationReport(results, historical))
console.log(`Wrote ${output}`)
