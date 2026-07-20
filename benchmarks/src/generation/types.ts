import type { JSONSchema7, LanguageModelV3 } from '@ai-sdk/provider'

export const GENERATION_CASE_IDS = ['users', 'order', 'company', 'invoice'] as const
export const GENERATION_TRACK_IDS = ['json-object', 'json-plain', 'toon'] as const

export type GenerationCaseId = typeof GENERATION_CASE_IDS[number]
export type GenerationTrackId = typeof GENERATION_TRACK_IDS[number]

export interface GenerationCase {
  id: GenerationCaseId
  gold: unknown
  jsonPrompt: string
  toonPrompt: string
  schema: JSONSchema7
}

export interface GenerationTokenUsage {
  inputTokens: number
  outputTokens: number
}

export interface GenerationCompletion extends GenerationTokenUsage {
  text: string
}

export interface GenerationTrackResult extends GenerationTokenUsage {
  attemptsUsed: number
  finalOk: boolean
  oneShotOk: boolean
}

export type GenerationCaseResult = Record<GenerationTrackId, GenerationTrackResult>

export interface GenerationRunResult {
  cases: Record<GenerationCaseId, GenerationCaseResult>
  model: string
  run: number
}

export interface EvaluateGenerationTrackOptions {
  benchmarkCase: GenerationCase
  model: LanguageModelV3
  track: GenerationTrackId
}
