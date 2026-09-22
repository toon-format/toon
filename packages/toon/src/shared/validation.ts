import type { Delimiter } from '../types.ts'
import { COMMENT_MARKER, DEFAULT_DELIMITER, DELIMITERS, LIST_ITEM_MARKER } from '../constants.ts'
import { isBooleanOrNullLiteral } from './literal-utils.ts'

const NUMERIC_LIKE_PATTERN = /^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i

/** Narrows an arbitrary delimiter option, shared by the library and the CLI so both report it alike. */
export function assertValidDelimiter(delimiter: string): asserts delimiter is Delimiter {
  if (!(Object.values(DELIMITERS) as string[]).includes(delimiter)) {
    throw new TypeError(`Invalid delimiter ${JSON.stringify(delimiter)}. Valid delimiters are: comma (,), tab (\\t), pipe (|)`)
  }
}

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
 * - Starts with a comment marker (#)
 */
export function isSafeUnquoted(value: string, delimiter: string = DEFAULT_DELIMITER): boolean {
  if (!value) {
    return false
  }

  // Only space and tab force quoting, unlike host `trim()`, which also strips other Unicode whitespace.
  if (/^[ \t]|[ \t]$/.test(value)) {
    return false
  }

  if (isBooleanOrNullLiteral(value) || isNumericLike(value)) {
    return false
  }

  if (value.includes(':')) {
    return false
  }

  if (value.includes('"') || value.includes('\\')) {
    return false
  }

  if (/[[\]{}]/.test(value)) {
    return false
  }

  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F]/.test(value)) {
    return false
  }

  if (value.includes(delimiter)) {
    return false
  }

  if (value.startsWith(LIST_ITEM_MARKER)) {
    return false
  }

  if (value.startsWith(COMMENT_MARKER)) {
    return false
  }

  return true
}

function isNumericLike(value: string): boolean {
  return NUMERIC_LIKE_PATTERN.test(value)
}
