import type { Storage, StorageValue } from 'unstorage'
import type { EvaluationResult } from './types'
import * as path from 'node:path'
import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs'
import { BENCHMARKS_DIR } from './constants'

/**
 * Storage instance for model results
 *
 * @remarks
 * Stores results in: `benchmarks/results/accuracy/models/`
 */
export const resultsStorage: Storage<StorageValue> = createStorage({
  driver: fsDriver({
    base: path.join(BENCHMARKS_DIR, 'results', 'accuracy', 'models'),
  }),
})

export async function loadModelResults(modelId: string): Promise<EvaluationResult[] | undefined> {
  const data = await resultsStorage.getItem<EvaluationResult[]>(modelId)
  return data ?? undefined
}

export async function saveModelResults(modelId: string, results: EvaluationResult[]): Promise<void> {
  await resultsStorage.setItem(modelId, results)
}

export async function getAllModelResults(): Promise<Record<string, EvaluationResult[]>> {
  const keys = await resultsStorage.getKeys()
  const results: Record<string, EvaluationResult[]> = {}

  await Promise.all(
    keys.map(async (modelId) => {
      const data = await resultsStorage.getItem<EvaluationResult[]>(modelId)
      if (data)
        results[modelId] = data
    }),
  )

  return results
}

export async function hasModelResults(modelId: string): Promise<boolean> {
  return await resultsStorage.hasItem(modelId)
}
