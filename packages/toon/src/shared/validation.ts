import { DEFAULT_DELIMITER, LIST_ITEM_MARKER } from '../constants'
import { isBooleanOrNullLiteral } from './literal-utils'

const NUMERIC_LIKE_PATTERN = /^[+-]?(\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i
const LEADING_ZERO_PATTERN = /^0\d+$/

/**
 * Checks if a key can be used without quotes.
 *
 * @remarks
 * Valid unquoted keys must start with a letter or underscore,
 * followed by letters, digits, underscores, or dots.
 */
export function isValidUnquotedKey(key: string): boolean {
  return /^[A-Z_][\w.]*$/i.test(key)
}

/**
 * Checks if a key segment is a valid identifier for safe folding/expansion.
 *
 * @remarks
 * Identifier segments are more restrictive than unquoted keys:
 * - Must start with a letter or underscore
 * - Followed only by letters, digits, or underscores (no dots)
 * - Used for safe key folding and path expansion
 */
export function isIdentifierSegment(key: string): boolean {
  return /^[A-Z_]\w*$/i.test(key)
}

/**
 * Determines if a string value can be safely encoded without quotes.
 *
 * @remarks
 * A string needs quoting if it:
 * - Is empty
 * - Has leading or trailing whitespace
 * - Could be confused with a literal (boolean, null, number)
 * - Contains structural characters (colons, brackets, braces)
 * - Contains quotes or backslashes (need escaping)
 * - Contains control characters (newlines, tabs, etc.)
 * - Contains the active delimiter
 * - Starts with a list marker (hyphen)
 */
export function isSafeUnquoted(value: string, delimiter: string = DEFAULT_DELIMITER): boolean {
  if (!value) {
    return false
  }

  if (value !== value.trim()) {
    return false
  }

  // Check if it looks like any literal value (boolean, null, or numeric)
  if (isBooleanOrNullLiteral(value) || isNumericLike(value)) {
    return false
  }

  // Check for colon (always structural)
  if (value.includes(':')) {
    return false
  }

  // Check for quotes and backslash (always need escaping)
  if (value.includes('"') || value.includes('\\')) {
    return false
  }

  // Check for brackets and braces (always structural)
  if (/[[\]{}]/.test(value)) {
    return false
  }

  // Check for control characters (newline, carriage return, tab - always need quoting/escaping)
  if (/[\n\r\t]/.test(value)) {
    return false
  }

  // Check for the active delimiter
  if (value.includes(delimiter)) {
    return false
  }

  // Check for hyphen at start (list marker)
  if (value.startsWith(LIST_ITEM_MARKER)) {
    return false
  }

  return true
}

/**
 * Checks if a string looks like a number.
 *
 * @remarks
 * Match numbers like `42`, `-3.14`, `1e-6`, `05`, etc.
 */
function isNumericLike(value: string): boolean {
  return NUMERIC_LIKE_PATTERN.test(value) || LEADING_ZERO_PATTERN.test(value)
}
