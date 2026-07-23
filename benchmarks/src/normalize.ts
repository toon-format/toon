/**
 * Type of expected answer for deterministic comparison
 */
export type AnswerType
  = | 'integer'
    | 'number'
    | 'boolean'
    | 'date'
    | 'string'
    | 'csv-list-ordered'
    | 'csv-list-unordered'

/**
 * Options for answer normalization and comparison
 */
export interface NormalizationOptions {
  /**
   * Tolerance for floating-point number comparison (e.g., 1e-6).
   * @default 1e-6
   */
  tolerance?: number

  /**
   * Whether string comparison should be case-sensitive.
   * @default false
   */
  caseSensitive?: boolean

  /**
   * Allow currency symbols ($, €, etc.) in number extraction.
   * @default true
   */
  allowCurrency?: boolean

  /**
   * Allow percent signs (%) in number extraction (will divide by 100).
   * @default true
   */
  allowPercent?: boolean

  /**
   * Number of decimal places to round to for number comparison.
   * If specified, overrides tolerance-based comparison.
   */
  decimalPlaces?: number
}

interface NormalizedResult {
  success: boolean
  value?: unknown
  error?: string
}

/**
 * Default normalization options
 */
const DEFAULT_OPTIONS: Required<NormalizationOptions> = {
  tolerance: 1e-6,
  caseSensitive: false,
  allowCurrency: true,
  allowPercent: true,
  decimalPlaces: undefined!,
}

// Regex pattern constants
const INTEGER_PATTERN_WITH_CURRENCY = /[$€£¥]?\s*-?\d[\d,]*/
const INTEGER_PATTERN = /-?\d[\d,]*/
const NUMBER_PATTERN_WITH_CURRENCY = /[$€£¥]?\s*-?\d[\d,]*(?:\.\d+)?(?:e[+-]?\d+)?%?/i
const NUMBER_PATTERN = /-?\d[\d,]*(?:\.\d+)?(?:e[+-]?\d+)?%?/i
const WRAPPING_QUOTES_PATTERN = /^["']|["']$/g
const CODE_FENCE_PATTERN = /^```[\s\S]*?```$/g
const LANGUAGE_IDENTIFIER_PATTERN = /^\w+\n/
const CURRENCY_AND_FORMATTING_CHARS = /[$€£¥,\s]/g
const NUMBER_CLEANUP_CHARS = /[$€£¥,%\s]/g
const ISO_DATE_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}/

// Boolean value constants
const TRUE_VALUES = new Set(['true', 'yes', 'y', '1'])
const FALSE_VALUES = new Set(['false', 'no', 'n', '0'])

// Numeric constants
const PERCENTAGE_DIVISOR = 100
const DECIMAL_BASE = 10
const MONTH_OFFSET = 1 // JavaScript months are 0-indexed
const DATE_COMPONENT_WIDTH = 2
const DATE_PAD_CHAR = '0'

// String constants
const CSV_DELIMITER = ','

/**
 * Strip wrapping quotes from a string
 */
function stripWrappingQuotes(text: string): string {
  return text.trim().replace(WRAPPING_QUOTES_PATTERN, '')
}

/**
 * Extract and normalize an integer from a string
 *
 * @remarks
 * Handles: "42", "1,234", "$5,678", "  -99  ", "The answer is 42."
 */
function normalizeInteger(text: string, options: Required<NormalizationOptions>): NormalizedResult {
  // Strip common formatting, extract first integer-like token
  const pattern = options.allowCurrency
    ? INTEGER_PATTERN_WITH_CURRENCY
    : INTEGER_PATTERN

  const match = text.match(pattern)
  if (!match)
    return { success: false, error: `No integer found in: "${text}"` }

  // Remove currency symbols, spaces, and thousand separators
  const normalizedValue = match[0].replace(CURRENCY_AND_FORMATTING_CHARS, '')
  const parsedNumber = Number.parseInt(normalizedValue, DECIMAL_BASE)

  if (Number.isNaN(parsedNumber))
    return { success: false, error: `Failed to parse integer: "${match[0]}"` }

  return { success: true, value: parsedNumber }
}

/**
 * Extract and normalize a floating-point number from a string
 *
 * @remarks
 * Handles: "3.14", "1,234.56", "$5,678.90", "42%", "1.5e-3", "Price: $99.99"
 */
function normalizeNumber(text: string, options: Required<NormalizationOptions>): NormalizedResult {
  // Extract first number-like token (supports scientific notation)
  const pattern = options.allowCurrency
    ? NUMBER_PATTERN_WITH_CURRENCY
    : NUMBER_PATTERN

  const match = text.match(pattern)
  if (!match)
    return { success: false, error: `No number found in: "${text}"` }

  const token = match[0]
  const hasPercentSign = options.allowPercent && token.endsWith('%')

  // Remove currency, commas, spaces, and percent sign
  const normalizedToken = token.replace(NUMBER_CLEANUP_CHARS, '')
  let parsedNumber = Number.parseFloat(normalizedToken)

  if (Number.isNaN(parsedNumber))
    return { success: false, error: `Failed to parse number: "${token}"` }

  // Convert percentage to decimal if present
  if (hasPercentSign)
    parsedNumber = parsedNumber / PERCENTAGE_DIVISOR

  // Round to specified decimal places if requested
  if (options.decimalPlaces !== undefined) {
    const factor = DECIMAL_BASE ** options.decimalPlaces
    parsedNumber = Math.round(parsedNumber * factor) / factor
  }

  return { success: true, value: parsedNumber }
}

/**
 * Normalize a boolean/yes-no answer
 *
 * @remarks
 * Handles: "true", "false", "yes", "no", "y", "n", "1", "0" (case-insensitive)
 */
function normalizeBoolean(text: string): NormalizedResult {
  const normalizedValue = text.trim().toLowerCase()

  if (TRUE_VALUES.has(normalizedValue))
    return { success: true, value: true }

  if (FALSE_VALUES.has(normalizedValue))
    return { success: true, value: false }

  return { success: false, error: `Not a boolean: "${text}"` }
}

/**
 * Normalize a date string to YYYY-MM-DD format
 *
 * @remarks
 * Handles: ISO dates, "Nov 1, 2025", "2025-11-01", RFC 2822, etc.
 */
function normalizeDate(text: string): NormalizedResult {
  const cleaned = stripWrappingQuotes(text)

  const isoMatch = cleaned.match(ISO_DATE_PREFIX_PATTERN)
  if (isoMatch)
    return { success: true, value: isoMatch[0] }

  // Try parsing as date
  const parsedDate = new Date(cleaned)
  if (Number.isNaN(parsedDate.getTime()))
    return { success: false, error: `Invalid date: "${text}"` }

  // Non-ISO strings parse in local time, so local getters avoid day shifts
  const year = parsedDate.getFullYear()
  const monthPadded = String(parsedDate.getMonth() + MONTH_OFFSET).padStart(DATE_COMPONENT_WIDTH, DATE_PAD_CHAR)
  const dayPadded = String(parsedDate.getDate()).padStart(DATE_COMPONENT_WIDTH, DATE_PAD_CHAR)
  const normalized = `${year}-${monthPadded}-${dayPadded}`

  return { success: true, value: normalized }
}

/**
 * Normalize a string (trim, optionally case-insensitive)
 *
 * @remarks
 * Handles wrapping quotes and code fences.
 */
function normalizeString(text: string, options: Required<NormalizationOptions>): NormalizedResult {
  let trimmedText = text.trim()

  // Strip wrapping quotes
  trimmedText = trimmedText.replace(WRAPPING_QUOTES_PATTERN, '')

  // Strip code fences (```...```)
  trimmedText = trimmedText.replace(CODE_FENCE_PATTERN, (match) => {
    const inner = match.slice(3, -3).trim()
    // Remove language identifier if present (e.g., ```json)
    return inner.replace(LANGUAGE_IDENTIFIER_PATTERN, '')
  })

  trimmedText = trimmedText.trim()

  const value = options.caseSensitive ? trimmedText : trimmedText.toLowerCase()
  return { success: true, value }
}

/**
 * Normalize a comma-separated list (ordered)
 *
 * @remarks
 * Handles: "a,b,c", "a, b, c", " a , b , c "
 */
function normalizeCsvListOrdered(text: string, options: Required<NormalizationOptions>): NormalizedResult {
  const strippedText = stripWrappingQuotes(text)
  const items = strippedText
    .split(CSV_DELIMITER)
    .map(item => item.trim())
    .filter(item => item.length > 0)

  const normalizedItems = items.map(item =>
    options.caseSensitive ? item : item.toLowerCase(),
  )

  return { success: true, value: normalizedItems }
}

/**
 * Normalize a comma-separated list (unordered, compare as sets)
 *
 * @remarks
 * Handles: "c,a,b" equals "a,b,c"
 */
function normalizeCsvListUnordered(text: string, options: Required<NormalizationOptions>): NormalizedResult {
  const result = normalizeCsvListOrdered(text, options)
  if (!result.success)
    return result

  // Type guard: ensure result.value is an array
  if (!Array.isArray(result.value))
    return { success: false, error: 'Expected array result from normalizeCsvListOrdered' }

  // Sort for deterministic comparison
  const sorted = [...result.value].sort()
  return { success: true, value: sorted }
}

/**
 * Normalize a value based on its expected kind
 */
export function normalizeAnswer(
  text: string,
  kind: AnswerType,
  options: Partial<NormalizationOptions> = {},
): NormalizedResult {
  const resolvedOptions: Required<NormalizationOptions> = { ...DEFAULT_OPTIONS, ...options }

  switch (kind) {
    case 'integer':
      return normalizeInteger(text, resolvedOptions)
    case 'number':
      return normalizeNumber(text, resolvedOptions)
    case 'boolean':
      return normalizeBoolean(text)
    case 'date':
      return normalizeDate(text)
    case 'string':
      return normalizeString(text, resolvedOptions)
    case 'csv-list-ordered':
      return normalizeCsvListOrdered(text, resolvedOptions)
    case 'csv-list-unordered':
      return normalizeCsvListUnordered(text, resolvedOptions)
    default:
      return { success: false, error: `Unknown answer kind: ${kind}` }
  }
}

/**
 * Compare two normalized values based on answer kind
 */
function compareValues(
  actual: unknown,
  expected: unknown,
  kind: AnswerType,
  options: Required<NormalizationOptions>,
): boolean {
  switch (kind) {
    case 'integer':
    case 'boolean':
    case 'date':
    case 'string':
      return actual === expected

    case 'number':
      if (typeof actual !== 'number' || typeof expected !== 'number')
        return false

      if (options.decimalPlaces !== undefined) {
        // Already rounded during normalization
        return actual === expected
      }
      return Math.abs(actual - expected) <= options.tolerance

    case 'csv-list-ordered':
      if (!Array.isArray(actual) || !Array.isArray(expected))
        return false
      if (actual.length !== expected.length)
        return false
      return actual.every((item, i) => item === expected[i])

    case 'csv-list-unordered':
      if (!Array.isArray(actual) || !Array.isArray(expected))
        return false
      if (actual.length !== expected.length)
        return false
      // Already sorted during normalization
      return actual.every((item, i) => item === expected[i])

    default:
      return false
  }
}

/**
 * Compare actual and expected answers with deterministic, type-aware normalization
 *
 * @remarks
 * Returns true if answers match within the specified tolerance/rules.
 */
export function compareAnswers(
  actual: string,
  expected: string,
  kind: AnswerType,
  options: Partial<NormalizationOptions> = {},
): { match: boolean, details?: string } {
  const resolvedOptions: Required<NormalizationOptions> = { ...DEFAULT_OPTIONS, ...options }

  // Normalize both answers
  const actualResult = normalizeAnswer(actual, kind, resolvedOptions)
  const expectedResult = normalizeAnswer(expected, kind, resolvedOptions)

  // If either normalization failed, return false with details
  if (!actualResult.success) {
    return {
      match: false,
      details: `Failed to normalize actual answer: ${actualResult.error}`,
    }
  }

  if (!expectedResult.success) {
    return {
      match: false,
      details: `Failed to normalize expected answer: ${expectedResult.error}`,
    }
  }

  // Compare normalized values
  const match = compareValues(actualResult.value, expectedResult.value, kind, resolvedOptions)

  return {
    match,
    details: match
      ? undefined
      : `Mismatch: actual="${actualResult.value}" vs expected="${expectedResult.value}"`,
  }
}
