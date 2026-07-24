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

/**
 * Descriptor for corrupting a dataset's encoded text after it is emitted.
 *
 * @remarks
 * The corruption is applied to each format's rendered text – not the source
 * data – so formats that carry length or width metadata (TOON) surface the
 * damage while metadata-less formats stay syntactically valid. Each variant is
 * discriminated on `kind` and carries exactly the fields that kind requires.
 */
export type StructuralCorruption
  = | { kind: 'control' }
  // Number of trailing records to remove
    | { kind: 'truncated', removeRecordCount: number }
  // Records appended beyond the declared length
    | { kind: 'extra-rows', appendRecords: Record<string, unknown>[] }
  // Record indices to narrow and the field dropped from each
    | { kind: 'width-mismatch', targetRecordIndices: number[], targetFieldName: string }
  // Record indices to edit and the field removed from each
    | { kind: 'missing-fields', targetRecordIndices: number[], targetFieldName: string }

/**
 * Kind of structural corruption applied to a dataset's encoded text.
 */
export type StructuralCorruptionKind = StructuralCorruption['kind']

export interface Dataset {
  name: DatasetName
  description: string
  data: Record<string, any>
  metadata: DatasetMetadata
  /** Post-encode text corruption applied only to structural-validation datasets */
  corruption?: StructuralCorruption
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
