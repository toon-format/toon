import type { JsonPrimitive } from '../types.ts'
import { COMMA, DEFAULT_DELIMITER, DOUBLE_QUOTE, NULL_LITERAL } from '../constants.ts'
import { escapeString } from '../shared/string-utils.ts'
import { isSafeUnquoted, isValidUnquotedKey } from '../shared/validation.ts'

// #region Primitive encoding

export function encodePrimitive(value: JsonPrimitive, delimiter?: string): string {
  if (value === null) {
    return NULL_LITERAL
  }

  if (typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return encodeStringLiteral(value, delimiter)
}

export function encodeStringLiteral(value: string, delimiter: string = DEFAULT_DELIMITER): string {
  if (isSafeUnquoted(value, delimiter)) {
    return value
  }

  return `${DOUBLE_QUOTE}${escapeString(value)}${DOUBLE_QUOTE}`
}

// #endregion

// #region Key encoding

export function encodeKey(key: string): string {
  if (isValidUnquotedKey(key)) {
    return key
  }

  return `${DOUBLE_QUOTE}${escapeString(key)}${DOUBLE_QUOTE}`
}

// #endregion

// #region Value joining

export function encodeAndJoinPrimitives(values: readonly JsonPrimitive[], delimiter: string = DEFAULT_DELIMITER): string {
  return values.map(v => encodePrimitive(v, delimiter)).join(delimiter)
}

// #endregion

// #region Header formatters

export function formatHeader(
  length: number,
  options?: {
    key?: string
    fields?: readonly string[]
    delimiter?: string
  },
): string {
  const key = options?.key
  const fields = options?.fields
  const delimiter = options?.delimiter ?? COMMA

  let header = ''

  if (key != null) {
    header += encodeKey(key)
  }

  // Only include delimiter if it's not the default (comma)
  header += `[${length}${delimiter !== DEFAULT_DELIMITER ? delimiter : ''}]`

  if (fields) {
    const quotedFields = fields.map(f => encodeKey(f))
    header += `{${quotedFields.join(delimiter)}}`
  }

  header += ':'

  return header
}

// #endregion
