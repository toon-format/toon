import type { Dataset } from '../src/types.ts'
import process from 'node:process'

const failures: string[] = []

/**
 * Record a failed assertion without aborting the remaining checks
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    failures.push(message)
    console.error(`FAIL: ${message}`)
  }
}

/**
 * Find a dataset by name
 */
export function findDataset(datasets: Dataset[], name: string): Dataset {
  const dataset = datasets.find(d => d.name === name)
  if (!dataset)
    throw new Error(`Dataset '${name}' not found`)

  return dataset
}

/**
 * Exit non-zero when any assertion failed, otherwise print the pass message
 */
export function reportAndExit(passMessage: string): void {
  if (failures.length > 0) {
    console.error(`\n${failures.length} assertion(s) failed`)
    process.exit(1)
  }

  console.log(`\n${passMessage}`)
}
