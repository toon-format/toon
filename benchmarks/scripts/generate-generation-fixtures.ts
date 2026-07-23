import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { encode } from '../../packages/toon/src/index.ts'
import { BENCHMARKS_DIR } from '../src/constants.ts'
import { GENERATION_CASES } from '../src/generation/cases.ts'
import { ensureDir } from '../src/utils.ts'

const outputDirectory = path.join(BENCHMARKS_DIR, 'data', 'generation')
await ensureDir(outputDirectory)

for (const benchmarkCase of GENERATION_CASES) {
  const basePath = path.join(outputDirectory, `${benchmarkCase.id}.gold`)
  await Promise.all([
    fsp.writeFile(`${basePath}.json`, `${JSON.stringify(benchmarkCase.gold, undefined, 2)}\n`),
    fsp.writeFile(`${basePath}.toon`, encode(benchmarkCase.gold)),
  ])
}

console.log(`Wrote ${GENERATION_CASES.length * 2} fixtures to ${path.relative(process.cwd(), outputDirectory)}`)
