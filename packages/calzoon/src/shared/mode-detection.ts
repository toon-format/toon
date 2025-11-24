import type { CalzoonMode, ModeDetectionResult } from '../types'
import { hasCalzoneSymbols, hasFlowOperators, hasStatusIndicators, hasStructureMarkers } from '../symbols/constants'

/**
 * Detect the mode of a CALZOON document
 * @param input - CALZOON formatted string or lines
 * @returns Mode detection result with confidence score
 */
export function detectMode(input: string | string[]): ModeDetectionResult {
  const text = Array.isArray(input) ? input.join('\n') : input

  // Count indicators
  const indicators = {
    hasStructureMarkers: hasStructureMarkers(text),
    hasFlowOperators: hasFlowOperators(text),
    hasStatusIndicators: hasStatusIndicators(text),
    hasToonArrays: hasToonArrayHeaders(text),
    hasToonObjects: hasToonKeyValuePairs(text),
  }

  // Calculate scores for each mode
  const scores = {
    data: calculateDataScore(indicators),
    plan: calculatePlanScore(indicators),
    hybrid: calculateHybridScore(indicators),
  }

  // Find mode with highest score
  const mode = Object.entries(scores).reduce((max, [key, value]) =>
    value > scores[max] ? key as CalzoonMode : max
  , 'data' as CalzoonMode)

  const confidence = scores[mode]

  return {
    mode,
    confidence,
    indicators,
  }
}

/**
 * Check if input is pure data mode (TOON)
 */
export function isDataMode(input: string | string[]): boolean {
  const result = detectMode(input)
  return result.mode === 'data'
}

/**
 * Check if input is pure plan mode (CALZONE)
 */
export function isPlanMode(input: string | string[]): boolean {
  const result = detectMode(input)
  return result.mode === 'plan'
}

/**
 * Check if input is hybrid mode (CALZOON)
 */
export function isHybridMode(input: string | string[]): boolean {
  const result = detectMode(input)
  return result.mode === 'hybrid'
}

// #region Score Calculation

function calculateDataScore(indicators: ModeDetectionResult['indicators']): number {
  let score = 0

  // Strong indicators for data mode
  if (indicators.hasToonArrays)
    score += 0.4
  if (indicators.hasToonObjects)
    score += 0.3

  // Negative indicators for data mode
  if (indicators.hasStructureMarkers)
    score -= 0.3
  if (indicators.hasFlowOperators)
    score -= 0.2
  if (indicators.hasStatusIndicators)
    score -= 0.1

  // Data mode is default if no plan indicators
  if (!indicators.hasStructureMarkers && !indicators.hasFlowOperators && !indicators.hasStatusIndicators) {
    score += 0.3
  }

  return Math.max(0, Math.min(1, score))
}

function calculatePlanScore(indicators: ModeDetectionResult['indicators']): number {
  let score = 0

  // Strong indicators for plan mode
  if (indicators.hasStructureMarkers)
    score += 0.4
  if (indicators.hasFlowOperators)
    score += 0.3
  if (indicators.hasStatusIndicators)
    score += 0.2

  // Negative indicators for plan mode
  if (indicators.hasToonArrays)
    score -= 0.2
  if (indicators.hasToonObjects)
    score -= 0.1

  // Pure plan mode has no TOON structures
  if (indicators.hasStructureMarkers && !indicators.hasToonArrays) {
    score += 0.2
  }

  return Math.max(0, Math.min(1, score))
}

function calculateHybridScore(indicators: ModeDetectionResult['indicators']): number {
  let score = 0

  // Hybrid mode requires both data and plan indicators
  const hasDataIndicators = indicators.hasToonArrays || indicators.hasToonObjects
  const hasPlanIndicators = indicators.hasStructureMarkers || indicators.hasFlowOperators

  if (hasDataIndicators && hasPlanIndicators) {
    score += 0.6

    // More indicators = more confidence in hybrid
    if (indicators.hasToonArrays)
      score += 0.1
    if (indicators.hasStructureMarkers)
      score += 0.1
    if (indicators.hasFlowOperators)
      score += 0.1
    if (indicators.hasStatusIndicators)
      score += 0.1
  }
  else {
    // Not hybrid if missing either data or plan indicators
    score = 0
  }

  return Math.max(0, Math.min(1, score))
}

// #endregion

// #region Pattern Detection

/**
 * Check if text contains TOON array headers like [N] or [N]{fields}
 */
function hasToonArrayHeaders(text: string): boolean {
  // Match patterns like:
  // items[3]:
  // users[2]{id,name}:
  // data[10]{field1,field2,field3}:
  const arrayHeaderPattern = /\w+\[\d+\](\{[\w,]+\})?:/g
  return arrayHeaderPattern.test(text)
}

/**
 * Check if text contains TOON key-value pairs
 */
function hasToonKeyValuePairs(text: string): boolean {
  // Match patterns like:
  // key: value
  // name: Alice
  // config.timeout: 5000
  // But avoid section markers like §1 or ¶ Title
  const lines = text.split('\n')

  let keyValueCount = 0
  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines
    if (!trimmed)
      continue

    // Skip lines with section markers
    if (trimmed.startsWith('§') || trimmed.startsWith('¶'))
      continue

    // Check for key: value pattern
    if (/^\s*[\w.]+:\s*.+/.test(line)) {
      keyValueCount++
    }
  }

  // Consider it TOON if we have at least 2 key-value pairs
  return keyValueCount >= 2
}

// #endregion

// #region Mode Conversion Hints

/**
 * Suggest what mode a document should use based on content
 */
export function suggestMode(content: unknown): CalzoonMode {
  // If it's a string, detect from the string
  if (typeof content === 'string') {
    return detectMode(content).mode
  }

  // If it's an object/array, check structure
  if (typeof content === 'object' && content !== null) {
    // Check if it looks like a plan (has section, flow, requirements)
    if ('type' in content) {
      const type = (content as any).type
      if (type === 'section' || type === 'paragraph' || type === 'flow' || type === 'requirement') {
        return 'plan'
      }
    }

    // Check if it has both data and plan elements
    if (Array.isArray(content)) {
      const hasData = content.some(item => typeof item !== 'object' || !('type' in item))
      const hasPlan = content.some(item => typeof item === 'object' && 'type' in item)
      if (hasData && hasPlan)
        return 'hybrid'
      if (hasPlan)
        return 'plan'
    }

    // Default to data mode for objects/arrays
    return 'data'
  }

  // Primitives are data mode
  return 'data'
}

// #endregion
