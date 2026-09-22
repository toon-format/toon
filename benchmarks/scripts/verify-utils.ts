import type { Dataset } from '../src/types.ts'
import process from 'node:process'

const failures: string[] = []

/** Records a failed assertion without aborting the remaining checks. */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    failures.push(message)
    console.error(`FAIL: ${message}`)
  }
}

export function findDataset(datasets: Dataset[], name: string): Dataset {
  const dataset = datasets.find(d => d.name === name)
  if (!dataset)
    throw new Error(`Dataset "${name}" not found`)

  return dataset
}

/** Exits non-zero when any assertion failed, otherwise prints the pass message. */
export function reportAndExit(passMessage: string): void {
  if (failures.length > 0) {
    console.error(`\n${failures.length} assertion(s) failed`)
    process.exit(1)
  }

  console.log(`\n${passMessage}`)
}
