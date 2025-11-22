import type { JsonPrimitive } from '../types'
import { COMMA, DEFAULT_DELIMITER, DOUBLE_QUOTE, NULL_LITERAL } from '../constants'
import { escapeString } from '../shared/string-utils'
import { isSafeUnquoted, isValidUnquotedKey } from '../shared/validation'

// #region Primitive encoding


export function encodePrimitive(value: JsonPrimitive, delimiter?: string, quoteStrings?: boolean): string {
  if (value === null) {
    return NULL_LITERAL
  }

  if (typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return encodeStringLiteral(value, delimiter, quoteStrings)
}


export function encodeStringLiteral(value: string, delimiter: string = DEFAULT_DELIMITER, quoteStrings?: boolean): string {
  if (quoteStrings) {
    return `${DOUBLE_QUOTE}${escapeString(value)}${DOUBLE_QUOTE}`
  }
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

export function encodeAndJoinPrimitives(values: readonly JsonPrimitive[], delimiter: string = DEFAULT_DELIMITER, quoteStrings?: boolean): string {
  return values.map(v => encodePrimitive(v, delimiter, quoteStrings)).join(delimiter)
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

  if (key) {
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
