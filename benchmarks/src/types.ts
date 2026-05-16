import type { DATASET_NAMES, QUESTION_TYPES, STRUCTURE_CLASSES } from './constants.ts'
import type { AnswerType, NormalizationOptions } from './normalize.ts'

export type QuestionType = typeof QUESTION_TYPES[number]
export type DatasetName = typeof DATASET_NAMES[number]
export type StructureClass = typeof STRUCTURE_CLASSES[number]

export interface DatasetMetadata {
  supportsCSV: boolean
  structureClass: StructureClass
  tabularEligibility: number
}

export interface Dataset {
  name: DatasetName
  description: string
  data: Record<string, any>
  metadata: DatasetMetadata
}

export interface Question {
  id: string
  prompt: string
  groundTruth: string
  type: QuestionType
  dataset: DatasetName
  /**
   * Expected answer kind for deterministic comparison.
   * @default 'string'
   */
  answerType?: AnswerType
  /**
   * Options for answer normalization and comparison.
   */
  normalizationOptions?: Partial<NormalizationOptions>
}

export interface EvaluationResult {
  questionId: string
  format: string
  model: string
  expected: string
  actual: string
  isCorrect: boolean
  inputTokens?: number
  outputTokens?: number
  latencyMs: number
}

export interface FormatResult {
  format: string
  accuracy: number
  totalTokens: number
  averageLatency: number
  correctCount: number
  totalCount: number
}

export interface EfficiencyRanking {
  format: string
  efficiency: number
  accuracy: number
  tokens: number
}
