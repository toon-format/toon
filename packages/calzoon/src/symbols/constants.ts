/**
 * CALZONE Symbolic Notation Constants
 *
 * These symbols extend TOON's data encoding with semantic plan notation.
 */

// #region Section and Structure Markers

export const SECTION_MARKER = '§' as const
export const PARAGRAPH_MARKER = '¶' as const
export const BRANCH_ITEM = '├' as const
export const TERMINAL_BRANCH = '└' as const
export const CONTINUATION = '│' as const
export const SUB_ITEM = '▸' as const
export const NESTED_ITEM = '»' as const

export const STRUCTURE_MARKERS = [
  SECTION_MARKER,
  PARAGRAPH_MARKER,
  BRANCH_ITEM,
  TERMINAL_BRANCH,
  CONTINUATION,
  SUB_ITEM,
  NESTED_ITEM,
] as const

// #endregion

// #region Flow Operators

export const LEADS_TO = '→' as const
export const DEPENDS_ON = '←' as const
export const IMPLIES = '⇒' as const
export const BIDIRECTIONAL = '↔' as const

export const FLOW_OPERATORS = [
  LEADS_TO,
  DEPENDS_ON,
  IMPLIES,
  BIDIRECTIONAL,
] as const

// #endregion

// #region Logic Operators

export const AND = '∧' as const
export const OR = '∨' as const
export const NOT = '¬' as const
export const ADD = '⊕' as const
export const REMOVE = '⊗' as const
export const EQUIVALENT = '≡' as const
export const THEREFORE = '∴' as const
export const BECAUSE = '∵' as const

export const LOGIC_OPERATORS = [
  AND,
  OR,
  NOT,
  ADD,
  REMOVE,
  EQUIVALENT,
  THEREFORE,
  BECAUSE,
] as const

// #endregion

// #region Requirement Indicators

export const REQUIRED = '●' as const
export const OPTIONAL = '○' as const
export const CRITICAL = '◆' as const
export const DELTA = '△' as const

export const REQUIREMENT_INDICATORS = [
  REQUIRED,
  OPTIONAL,
  CRITICAL,
  DELTA,
] as const

// #endregion

// #region Status Indicators

export const STATUS_COMPLETE = '[✓]' as const
export const STATUS_IN_PROGRESS = '[○]' as const
export const STATUS_NOT_STARTED = '[□]' as const
export const STATUS_BLOCKED = '[×]' as const
export const STATUS_PARTIAL = '[~]' as const
export const STATUS_CONDITIONAL = '[?]' as const
export const STATUS_WARNING = '[!]' as const
export const STATUS_REFERENCE = '[@]' as const
export const STATUS_IDENTIFIER = '[#]' as const

export const STATUS_INDICATORS = [
  STATUS_COMPLETE,
  STATUS_IN_PROGRESS,
  STATUS_NOT_STARTED,
  STATUS_BLOCKED,
  STATUS_PARTIAL,
  STATUS_CONDITIONAL,
  STATUS_WARNING,
  STATUS_REFERENCE,
  STATUS_IDENTIFIER,
] as const

// #endregion

// #region All Symbols

export const ALL_CALZONE_SYMBOLS = [
  ...STRUCTURE_MARKERS,
  ...FLOW_OPERATORS,
  ...LOGIC_OPERATORS,
  ...REQUIREMENT_INDICATORS,
  ...STATUS_INDICATORS,
] as const

// #endregion

// #region Symbol Categories

export type StructureMarker = typeof STRUCTURE_MARKERS[number]
export type FlowOperator = typeof FLOW_OPERATORS[number]
export type LogicOperator = typeof LOGIC_OPERATORS[number]
export type RequirementIndicator = typeof REQUIREMENT_INDICATORS[number]
export type StatusIndicator = typeof STATUS_INDICATORS[number]
export type CalzoneSymbol = typeof ALL_CALZONE_SYMBOLS[number]

// #endregion

// #region Symbol Detection Utilities

/**
 * Check if a string contains any CALZONE structure markers
 */
export function hasStructureMarkers(text: string): boolean {
  return STRUCTURE_MARKERS.some(marker => text.includes(marker))
}

/**
 * Check if a string contains any CALZONE flow operators
 */
export function hasFlowOperators(text: string): boolean {
  return FLOW_OPERATORS.some(op => text.includes(op))
}

/**
 * Check if a string contains any CALZONE status indicators
 */
export function hasStatusIndicators(text: string): boolean {
  return STATUS_INDICATORS.some(status => text.includes(status))
}

/**
 * Check if a string contains any CALZONE symbols
 */
export function hasCalzoneSymbols(text: string): boolean {
  return ALL_CALZONE_SYMBOLS.some(symbol => text.includes(symbol))
}

/**
 * Extract all CALZONE symbols from a string
 */
export function extractCalzoneSymbols(text: string): CalzoneSymbol[] {
  return ALL_CALZONE_SYMBOLS.filter(symbol => text.includes(symbol))
}

// #endregion
