import type { ArrayHeaderInfo, Delimiter, FieldDescriptor, JsonPrimitive } from '../types.ts'
import { BACKSLASH, CLOSE_BRACE, CLOSE_BRACKET, COLON, DELIMITERS, DOUBLE_QUOTE, FALSE_LITERAL, NULL_LITERAL, OPEN_BRACE, OPEN_BRACKET, PIPE, TAB, TRUE_LITERAL } from '../constants.ts'
import { isBooleanOrNullLiteral, isNumericLiteral } from '../shared/literal-utils.ts'
import { findClosingQuote, findUnquotedChar, unescapeString } from '../shared/string-utils.ts'

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
  if (braceStart !== -1) {
    // Validate: no extraneous content between bracket end and brace start
    const gapBeforeBrace = content.slice(bracketEnd + 1, braceStart)
    if (gapBeforeBrace.trim() !== '') {
      // Brace exists but has content before it — not a fields segment, skip
    }
    else {
      // Use matching brace finder to handle nested braces (e.g., customer{name,country})
      const foundBraceEnd = findMatchingBrace(content, braceStart)
      if (foundBraceEnd !== -1) {
        braceEnd = foundBraceEnd + 1
      }
    }
  }

  // Now find colon after brackets and braces
  colonIndex = content.indexOf(COLON, Math.max(bracketEnd, braceEnd))
  if (colonIndex === -1) {
    return
  }

  // Validate: no extraneous content between bracket/fields end and colon
  const gapStart = Math.max(bracketEnd + 1, braceEnd)
  const gapBeforeColon = content.slice(gapStart, colonIndex)
  if (gapBeforeColon.trim() !== '') {
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
  let fieldDescriptors: FieldDescriptor[] | undefined
  if (braceStart !== -1 && braceStart < colonIndex) {
    // Find the matching closing brace (accounting for nested braces)
    const foundBraceEnd = findMatchingBrace(content, braceStart)
    if (foundBraceEnd !== -1 && foundBraceEnd < colonIndex) {
      const fieldsContent = content.slice(braceStart + 1, foundBraceEnd)
      const parsed = parseFieldDescriptors(fieldsContent, delimiter)
      fieldDescriptors = parsed.descriptors
      fields = parsed.flatNames
    }
  }

  return {
    header: {
      key,
      length,
      delimiter,
      fields,
      fieldDescriptors: fieldDescriptors?.some(d => d.subfields) ? fieldDescriptors : undefined,
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

// #region Field descriptor parsing

/**
 * Find the matching closing brace, accounting for nested braces.
 */
function findMatchingBrace(content: string, openIndex: number): number {
  let depth = 0
  for (let i = openIndex; i < content.length; i++) {
    if (content[i] === OPEN_BRACE) depth++
    else if (content[i] === CLOSE_BRACE) {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/**
 * Parse field descriptors from the content inside `{...}` of a header.
 * Handles nested fields (field{sub1,sub2}) and strips type hint suffixes (field:type) for forward compatibility.
 * Returns both structured descriptors and flat leaf field names.
 */
export function parseFieldDescriptors(
  content: string,
  delimiter: Delimiter,
): { descriptors: FieldDescriptor[], flatNames: string[] } {
  const descriptors: FieldDescriptor[] = []
  const flatNames: string[] = []

  // Split top-level fields by delimiter, respecting nested braces
  const rawFields = splitTopLevel(content, delimiter)

  for (const raw of rawFields) {
    const trimmed = raw.trim()
    if (!trimmed) continue

    // Check for nested fields: fieldName{sub1,sub2}
    const braceIdx = trimmed.indexOf(OPEN_BRACE)
    if (braceIdx !== -1) {
      const matchEnd = findMatchingBrace(trimmed, braceIdx)
      if (matchEnd !== -1) {
        const name = parseFieldName(trimmed.slice(0, braceIdx))
        const subContent = trimmed.slice(braceIdx + 1, matchEnd)
        const subParsed = parseFieldDescriptors(subContent, delimiter)
        descriptors.push({ name, subfields: subParsed.descriptors })
        flatNames.push(...subParsed.flatNames)
        continue
      }
    }

    // Check for type hint: fieldName:type
    const { name } = parseFieldNameWithHint(trimmed)
    descriptors.push({ name })
    flatNames.push(name)
  }

  return { descriptors, flatNames }
}

/**
 * Split a string by delimiter at the top level only (not inside braces or quotes).
 */
function splitTopLevel(content: string, delimiter: Delimiter): string[] {
  const parts: string[] = []
  let current = ''
  let braceDepth = 0
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]!

    if (ch === BACKSLASH && inQuotes && i + 1 < content.length) {
      current += ch + content[i + 1]
      i++
      continue
    }

    if (ch === DOUBLE_QUOTE) {
      inQuotes = !inQuotes
      current += ch
      continue
    }

    if (!inQuotes) {
      if (ch === OPEN_BRACE) { braceDepth++; current += ch; continue }
      if (ch === CLOSE_BRACE) { braceDepth--; current += ch; continue }
      if (ch === delimiter && braceDepth === 0) {
        parts.push(current)
        current = ''
        continue
      }
    }

    current += ch
  }

  if (current || parts.length > 0) {
    parts.push(current)
  }

  return parts
}

const TOON_TYPE_HINTS = new Set(['int', 'float', 'str', 'bool', 'enum', 'date', 'null'])

/**
 * Parse a field name, stripping any type hint suffix (e.g., `:int`, `:str`).
 * Type hints are recognized and stripped for forward compatibility but not stored.
 */
function parseFieldNameWithHint(raw: string): { name: string } {
  const trimmed = raw.trim()

  // Handle quoted field names
  if (trimmed.startsWith(DOUBLE_QUOTE)) {
    const closingIdx = findClosingQuote(trimmed, 0)
    if (closingIdx !== -1) {
      const name = parseStringLiteral(trimmed.slice(0, closingIdx + 1))
      return { name }
    }
  }

  // Unquoted: look for :type suffix and strip it
  const colonIdx = trimmed.lastIndexOf(COLON)
  if (colonIdx !== -1) {
    const possibleHint = trimmed.slice(colonIdx + 1).trim()
    if (TOON_TYPE_HINTS.has(possibleHint)) {
      return { name: trimmed.slice(0, colonIdx).trim() }
    }
  }

  return { name: parseStringLiteral(trimmed) }
}

function parseFieldName(raw: string): string {
  return parseFieldNameWithHint(raw).name
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
