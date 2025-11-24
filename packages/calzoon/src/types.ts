import type { DecodeOptions as ToonDecodeOptions, EncodeOptions as ToonEncodeOptions, JsonValue } from '@toon-format/toon'
import type { CalzoneSymbol, FlowOperator, LogicOperator, RequirementIndicator, StatusIndicator, StructureMarker } from './symbols/constants'

// #region CALZOON Modes

export type CalzoonMode = 'data' | 'plan' | 'hybrid'

// #endregion

// #region Encoder/Decoder Options

export interface CalzoonEncodeOptions extends ToonEncodeOptions {
  /**
   * Encoding mode - auto-detects if not specified
   * - 'data': Pure TOON data encoding
   * - 'plan': CALZONE plan notation
   * - 'hybrid': Mixed data and plans
   * @default 'auto'
   */
  mode?: CalzoonMode | 'auto'
  /**
   * Enable symbolic notation for plan mode
   * @default true
   */
  enableSymbols?: boolean
  /**
   * Enable section markers (§, ¶)
   * @default true in plan/hybrid mode
   */
  enableSections?: boolean
}

export interface CalzoonDecodeOptions extends ToonDecodeOptions {
  /**
   * Expected mode - auto-detects if not specified
   * @default 'auto'
   */
  mode?: CalzoonMode | 'auto'
  /**
   * Parse symbolic notation
   * @default true
   */
  parseSymbols?: boolean
}

export type ResolvedCalzoonEncodeOptions = Required<CalzoonEncodeOptions>
export type ResolvedCalzoonDecodeOptions = Required<CalzoonDecodeOptions>

// #endregion

// #region Plan Structure Types

/**
 * A section in a CALZONE plan (marked with §)
 */
export interface Section {
  type: 'section'
  id: string // e.g., "1", "1.1", "2"
  title?: string
  content: PlanElement[]
}

/**
 * A paragraph block in a CALZONE plan (marked with ¶)
 */
export interface Paragraph {
  type: 'paragraph'
  title?: string
  content: PlanElement[]
}

/**
 * A flow diagram showing process steps
 */
export interface Flow {
  type: 'flow'
  nodes: FlowNode[]
  edges: FlowEdge[]
}

/**
 * A node in a flow diagram
 */
export interface FlowNode {
  id: string
  label: string
  status?: StatusIndicator
  requirement?: RequirementIndicator
}

/**
 * An edge connecting flow nodes
 */
export interface FlowEdge {
  from: string
  to: string
  operator: FlowOperator
  condition?: string
}

/**
 * A requirement item (●, ○, ◆, △)
 */
export interface Requirement {
  type: 'requirement'
  indicator: RequirementIndicator
  label: string
  children?: Requirement[]
  metadata?: Record<string, string>
}

/**
 * A logical expression using logic operators
 */
export interface LogicExpression {
  type: 'logic'
  operator: LogicOperator
  operands: (string | LogicExpression)[]
}

/**
 * Any element that can appear in a plan
 */
export type PlanElement =
  | Section
  | Paragraph
  | Flow
  | Requirement
  | LogicExpression
  | JsonValue // Can embed TOON data

// #endregion

// #region Document Structure

/**
 * A CALZOON document can be pure data, pure plan, or hybrid
 */
export interface CalzoonDocument {
  mode: CalzoonMode
  content: JsonValue | PlanElement | (JsonValue | PlanElement)[]
}

// #endregion

// #region Mode Detection

export interface ModeDetectionResult {
  mode: CalzoonMode
  confidence: number // 0-1
  indicators: {
    hasStructureMarkers: boolean
    hasFlowOperators: boolean
    hasStatusIndicators: boolean
    hasToonArrays: boolean
    hasToonObjects: boolean
  }
}

// #endregion

// #region Validation

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  type: 'syntax' | 'semantic' | 'structure'
  message: string
  line?: number
  column?: number
}

export interface ValidationWarning {
  type: 'style' | 'best-practice' | 'compatibility'
  message: string
  line?: number
  column?: number
}

// #endregion

// #region Parsing Context

export interface ParseContext {
  mode: CalzoonMode
  currentSection?: Section
  currentParagraph?: Paragraph
  inFlow: boolean
  depth: number
}

// #endregion
