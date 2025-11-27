import type { ArrayHeaderInfo, Delimiter, JsonPrimitive } from '../types'
import { BACKSLASH, CLOSE_BRACE, CLOSE_BRACKET, COLON, DELIMITERS, DOUBLE_QUOTE, FALSE_LITERAL, NULL_LITERAL, OPEN_BRACE, OPEN_BRACKET, PIPE, TAB, TRUE_LITERAL } from '../constants'
import { isBooleanOrNullLiteral, isNumericLiteral } from '../shared/literal-utils'
import { findClosingQuote, findUnquotedChar, unescapeString } from '../shared/string-utils'

// #region Array header parsing

export function parseArrayHeaderLine(
  content: string,
  defaultDelimiter: Delimiter,
): { header: ArrayHeaderInfo, inlineValues?: string } | undefined {
  const trimmedToken = content.trimStart()

  // Find the bracket segment, accounting for quoted keys that may contain brackets
  let bracketStart = -1

  // For quoted keys, find bracket after closing quote (not inside the quoted string)
  if (trimmedToken.startsWith(DOUBLE_QUOTE)) {
    const closingQuoteIndex = findClosingQuote(trimmedToken, 0)
    if (closingQuoteIndex === -1) {
      return
    }

    const afterQuote = trimmedToken.slice(closingQuoteIndex + 1)
    if (!afterQuote.startsWith(OPEN_BRACKET)) {
      return
    }

    // Calculate position in original content and find bracket after the quoted key
    const leadingWhitespace = content.length - trimmedToken.length
    const keyEndIndex = leadingWhitespace + closingQuoteIndex + 1
    bracketStart = content.indexOf(OPEN_BRACKET, keyEndIndex)
  }
  else {
    // Unquoted key - find first bracket
    bracketStart = content.indexOf(OPEN_BRACKET)
  }

  if (bracketStart === -1) {
    return
  }

  const bracketEnd = content.indexOf(CLOSE_BRACKET, bracketStart)
  if (bracketEnd === -1) {
    return
  }

  // Find the colon that comes after all brackets and braces
  let colonIndex = bracketEnd + 1
  let braceEnd = colonIndex

  // Check for fields segment (braces come after bracket)
  const braceStart = content.indexOf(OPEN_BRACE, bracketEnd)
  if (braceStart !== -1 && braceStart < content.indexOf(COLON, bracketEnd)) {
    const foundBraceEnd = content.indexOf(CLOSE_BRACE, braceStart)
    if (foundBraceEnd !== -1) {
      braceEnd = foundBraceEnd + 1
    }
  }

  // Now find colon after brackets and braces
  colonIndex = content.indexOf(COLON, Math.max(bracketEnd, braceEnd))
  if (colonIndex === -1) {
    return
  }

  // Extract and parse the key (might be quoted)
  let key: string | undefined
  if (bracketStart > 0) {
    const rawKey = content.slice(0, bracketStart).trim()
    key = rawKey.startsWith(DOUBLE_QUOTE) ? parseStringLiteral(rawKey) : rawKey
  }

  const afterColon = content.slice(colonIndex + 1).trim()
  const bracketContent = content.slice(bracketStart + 1, bracketEnd)

  // Try to parse bracket segment
  let parsedBracket: ReturnType<typeof parseBracketSegment>
  try {
    parsedBracket = parseBracketSegment(bracketContent, defaultDelimiter)
  }
  catch {
    return
  }

  const { length, delimiter } = parsedBracket

  // Check for fields segment
  let fields: string[] | undefined
  if (braceStart !== -1 && braceStart < colonIndex) {
    const foundBraceEnd = content.indexOf(CLOSE_BRACE, braceStart)
    if (foundBraceEnd !== -1 && foundBraceEnd < colonIndex) {
      const fieldsContent = content.slice(braceStart + 1, foundBraceEnd)
      fields = parseDelimitedValues(fieldsContent, delimiter).map(field => parseStringLiteral(field.trim()))
    }
  }

  return {
    header: {
      key,
      length,
      delimiter,
      fields,
    },
    inlineValues: afterColon || undefined,
  }
}

export function parseBracketSegment(
  seg: string,
  defaultDelimiter: Delimiter,
): { length: number, delimiter: Delimiter } {
  let content = seg

  // Check for delimiter suffix
  let delimiter = defaultDelimiter
  if (content.endsWith(TAB)) {
    delimiter = DELIMITERS.tab
    content = content.slice(0, -1)
  }
  else if (content.endsWith(PIPE)) {
    delimiter = DELIMITERS.pipe
    content = content.slice(0, -1)
  }

  const length = Number.parseInt(content, 10)
  if (Number.isNaN(length)) {
    throw new TypeError(`Invalid array length: ${seg}`)
  }

  return { length, delimiter }
}

// #endregion

// #region Delimited value parsing

/**
 * Parses a delimited string into values, respecting quoted strings and escape sequences.
 *
 * @remarks
 * Uses a state machine that tracks:
 * - `inQuotes`: Whether we're inside a quoted string (to ignore delimiters)
 * - `valueBuffer`: Accumulates characters for the current value
 * - Escape sequences: Handled within quoted strings
 */
export function parseDelimitedValues(input: string, delimiter: Delimiter): string[] {
  const values: string[] = []
  let valueBuffer = ''
  let inQuotes = false
  let i = 0

  while (i < input.length) {
    const char = input[i]

    if (char === BACKSLASH && i + 1 < input.length && inQuotes) {
      // Escape sequence in quoted string
      valueBuffer += char + input[i + 1]
      i += 2
      continue
    }

    if (char === DOUBLE_QUOTE) {
      inQuotes = !inQuotes
      valueBuffer += char
      i++
      continue
    }

    if (char === delimiter && !inQuotes) {
      values.push(valueBuffer.trim())
      valueBuffer = ''
      i++
      continue
    }

    valueBuffer += char
    i++
  }

  // Add last value
  if (valueBuffer || values.length > 0) {
    values.push(valueBuffer.trim())
  }

  return values
}

export function mapRowValuesToPrimitives(values: string[]): JsonPrimitive[] {
  return values.map(v => parsePrimitiveToken(v))
}

// #endregion

// #region Primitive and key parsing

export function parsePrimitiveToken(token: string): JsonPrimitive {
  const trimmedToken = token.trim()

  // Empty token
  if (!trimmedToken) {
    return ''
  }

  // Quoted string (if starts with quote, it MUST be properly quoted)
  if (trimmedToken.startsWith(DOUBLE_QUOTE)) {
    return parseStringLiteral(trimmedToken)
  }

  // Boolean or null literals
  if (isBooleanOrNullLiteral(trimmedToken)) {
    if (trimmedToken === TRUE_LITERAL)
      return true
    if (trimmedToken === FALSE_LITERAL)
      return false
    if (trimmedToken === NULL_LITERAL)
      return null
  }

  // Numeric literal
  if (isNumericLiteral(trimmedToken)) {
    const parsedNumber = Number.parseFloat(trimmedToken)
    // Normalize negative zero to positive zero
    return Object.is(parsedNumber, -0) ? 0 : parsedNumber
  }

  // Unquoted string
  return trimmedToken
}

export function parseStringLiteral(token: string): string {
  const trimmedToken = token.trim()

  if (trimmedToken.startsWith(DOUBLE_QUOTE)) {
    // Find the closing quote, accounting for escaped quotes
    const closingQuoteIndex = findClosingQuote(trimmedToken, 0)

    if (closingQuoteIndex === -1) {
      // No closing quote was found
      throw new SyntaxError('Unterminated string: missing closing quote')
    }

    if (closingQuoteIndex !== trimmedToken.length - 1) {
      throw new SyntaxError('Unexpected characters after closing quote')
    }

    const content = trimmedToken.slice(1, closingQuoteIndex)
    return unescapeString(content)
  }

  return trimmedToken
}

export function parseUnquotedKey(content: string, start: number): { key: string, end: number } {
  let parsePosition = start
  while (parsePosition < content.length && content[parsePosition] !== COLON) {
    parsePosition++
  }

  // Validate that a colon was found
  if (parsePosition >= content.length || content[parsePosition] !== COLON) {
    throw new SyntaxError('Missing colon after key')
  }

  const key = content.slice(start, parsePosition).trim()

  // Skip the colon
  parsePosition++

  return { key, end: parsePosition }
}

export function parseQuotedKey(content: string, start: number): { key: string, end: number } {
  // Find the closing quote, accounting for escaped quotes
  const closingQuoteIndex = findClosingQuote(content, start)

  if (closingQuoteIndex === -1) {
    throw new SyntaxError('Unterminated quoted key')
  }

  // Extract and unescape the key content
  const keyContent = content.slice(start + 1, closingQuoteIndex)
  const key = unescapeString(keyContent)
  let parsePosition = closingQuoteIndex + 1

  // Validate and skip colon after quoted key
  if (parsePosition >= content.length || content[parsePosition] !== COLON) {
    throw new SyntaxError('Missing colon after key')
  }
  parsePosition++

  return { key, end: parsePosition }
}

export function parseKeyToken(content: string, start: number): { key: string, end: number, isQuoted: boolean } {
  const isQuoted = content[start] === DOUBLE_QUOTE
  const result = isQuoted
    ? parseQuotedKey(content, start)
    : parseUnquotedKey(content, start)
  return { ...result, isQuoted }
}

// #endregion

// #region Array content detection helpers

export function isArrayHeaderContent(content: string): boolean {
  return content.trim().startsWith(OPEN_BRACKET) && findUnquotedChar(content, COLON) !== -1
}

export function isKeyValueContent(content: string): boolean {
  return findUnquotedChar(content, COLON) !== -1
}

// #endregion
