import type { ArrayHeaderInfo, Delimiter, FieldNode, JsonPrimitive } from '../types.ts'
import { BACKSLASH, CLOSE_BRACE, CLOSE_BRACKET, COLON, DELIMITERS, DOUBLE_QUOTE, FALSE_LITERAL, NULL_LITERAL, OPEN_BRACE, OPEN_BRACKET, PIPE, TAB, TRUE_LITERAL } from '../constants.ts'
import { isBooleanOrNullLiteral, isNumericLiteral } from '../shared/literal-utils.ts'
import { findClosingQuote, findUnquotedChar, trimSpaces, unescapeString } from '../shared/string-utils.ts'

// #region Array header parsing

export function parseArrayHeaderLine(
  content: string,
  defaultDelimiter: Delimiter,
  strict: boolean = false,
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
    bracketStart = findUnquotedChar(content, OPEN_BRACKET)
  }

  if (bracketStart === -1) {
    return
  }

  // A header key can't contain an unquoted colon, so this is a key-value line
  const firstColonIndex = findUnquotedChar(content, COLON)
  if (firstColonIndex !== -1 && firstColonIndex < bracketStart) {
    return
  }

  const bracketEnd = findUnquotedChar(content, CLOSE_BRACKET, bracketStart)
  if (bracketEnd === -1) {
    return
  }

  // Find the colon that comes after all brackets and braces
  let colonIndex = bracketEnd + 1
  let braceEnd = colonIndex

  // Check for fields segment (braces come after bracket)
  const braceStart = findUnquotedChar(content, OPEN_BRACE, bracketEnd)
  if (braceStart !== -1 && braceStart < findUnquotedChar(content, COLON, bracketEnd)) {
    const gapBeforeBrace = content.slice(bracketEnd + 1, braceStart)
    if (gapBeforeBrace !== '') {
      if (strict) {
        const trimmedGap = gapBeforeBrace.trim()
        throw new SyntaxError(trimmedGap === ''
          ? `Unexpected whitespace between bracket and fields segment`
          : `Unexpected content "${trimmedGap}" between bracket and fields segment`)
      }
      return
    }

    const foundBraceEnd = findMatchingBrace(content, braceStart)
    if (foundBraceEnd !== -1) {
      braceEnd = foundBraceEnd + 1
    }
  }

  // Now find colon after brackets and braces
  colonIndex = findUnquotedChar(content, COLON, Math.max(bracketEnd, braceEnd))
  if (colonIndex === -1) {
    return
  }

  const gapStart = Math.max(bracketEnd + 1, braceEnd)
  const gapBeforeColon = content.slice(gapStart, colonIndex)
  if (gapBeforeColon !== '') {
    if (strict) {
      const trimmedGap = gapBeforeColon.trim()
      throw new SyntaxError(trimmedGap === ''
        ? `Unexpected whitespace between bracket segment and colon`
        : `Unexpected content "${trimmedGap}" between bracket segment and colon`)
    }
    return
  }

  // Extract and parse the key (might be quoted)
  let key: string | undefined
  if (bracketStart > 0) {
    const rawKey = content.slice(0, bracketStart).trim()
    key = rawKey.startsWith(DOUBLE_QUOTE) ? parseStringLiteral(rawKey) : rawKey
  }

  const afterColon = trimSpaces(content.slice(colonIndex + 1))
  const bracketContent = content.slice(bracketStart + 1, bracketEnd)

  let parsedBracket: ReturnType<typeof parseBracketSegment>
  try {
    parsedBracket = parseBracketSegment(bracketContent, defaultDelimiter)
  }
  catch (error) {
    if (strict)
      throw error
    return
  }

  const { length, delimiter } = parsedBracket

  // Check for fields segment
  let fields: FieldNode[] | undefined
  if (braceStart !== -1 && braceStart < colonIndex) {
    const foundBraceEnd = findMatchingBrace(content, braceStart)
    if (foundBraceEnd !== -1 && foundBraceEnd < colonIndex) {
      const fieldsContent = content.slice(braceStart + 1, foundBraceEnd)

      const mismatchedDelimiter = findUnquotedMismatchedDelimiter(fieldsContent, delimiter)
      if (mismatchedDelimiter !== undefined) {
        if (strict)
          throw new SyntaxError(`Header delimiter mismatch: bracket declares "${formatDelimiter(delimiter)}" but fields segment contains unquoted "${formatDelimiter(mismatchedDelimiter)}"`)
        return
      }

      try {
        fields = parseFieldEntries(fieldsContent, delimiter)
      }
      catch (error) {
        if (strict)
          throw error
        return
      }

      // Duplicate field names produce duplicate sibling keys in every
      // decoded element: strict mode errors, non-strict LWW applies
      if (strict) {
        assertNoDuplicateFieldNames(fields)
      }
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

const BRACKET_LENGTH_PATTERN = /^(?:0|[1-9]\d*)$/

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

  if (!BRACKET_LENGTH_PATTERN.test(content)) {
    throw new SyntaxError(`Invalid array length: "${seg}" (expected non-negative integer with no leading zeros)`)
  }

  return { length: Number.parseInt(content, 10), delimiter }
}

/**
 * Parses the content of a fields segment into field entries, recursively
 * descending into nested field groups (`field{sub1,sub2}`).
 *
 * @remarks
 * Throws on empty segments, empty names, unmatched braces, and content
 * after a nested group's closing brace; callers decide strict fallthrough.
 */
export function parseFieldEntries(fieldsContent: string, delimiter: Delimiter): FieldNode[] {
  const entries = splitFieldEntries(fieldsContent, delimiter)

  return entries.map((entry) => {
    const trimmedEntry = trimSpaces(entry)
    if (!trimmedEntry) {
      throw new SyntaxError('Empty field name in fields segment')
    }

    const groupStart = findUnquotedChar(trimmedEntry, OPEN_BRACE)
    if (groupStart === -1) {
      return { name: parseStringLiteral(trimmedEntry) }
    }

    const namePart = trimSpaces(trimmedEntry.slice(0, groupStart))
    if (!namePart) {
      throw new SyntaxError('Missing field name before nested field group')
    }

    const groupEnd = findMatchingBrace(trimmedEntry, groupStart)
    if (groupEnd === -1) {
      throw new SyntaxError('Unmatched brace in fields segment')
    }
    if (groupEnd !== trimmedEntry.length - 1) {
      throw new SyntaxError('Unexpected content after nested field group')
    }

    const children = parseFieldEntries(trimmedEntry.slice(groupStart + 1, groupEnd), delimiter)
    return { name: parseStringLiteral(namePart), children }
  })
}

/**
 * Splits a fields segment on the active delimiter at brace depth zero,
 * respecting quoted names and escape sequences.
 */
function splitFieldEntries(content: string, delimiter: Delimiter): string[] {
  const entries: string[] = []
  let entryBuffer = ''
  let inQuotes = false
  let braceDepth = 0
  let i = 0

  while (i < content.length) {
    const char = content[i]!

    if (char === BACKSLASH && i + 1 < content.length && inQuotes) {
      entryBuffer += char + content[i + 1]
      i += 2
      continue
    }

    if (char === DOUBLE_QUOTE) {
      inQuotes = !inQuotes
      entryBuffer += char
      i++
      continue
    }

    if (!inQuotes) {
      if (char === OPEN_BRACE) {
        braceDepth++
      }
      else if (char === CLOSE_BRACE) {
        braceDepth--
      }
      else if (char === delimiter && braceDepth === 0) {
        entries.push(entryBuffer)
        entryBuffer = ''
        i++
        continue
      }
    }

    entryBuffer += char
    i++
  }

  entries.push(entryBuffer)
  return entries
}

/**
 * Finds the index of the closing brace matching the opening brace at
 * `braceStart`, ignoring braces inside quoted names.
 */
export function findMatchingBrace(content: string, braceStart: number): number {
  let inQuotes = false
  let braceDepth = 0
  let i = braceStart

  while (i < content.length) {
    const char = content[i]

    if (char === BACKSLASH && i + 1 < content.length && inQuotes) {
      i += 2
      continue
    }

    if (char === DOUBLE_QUOTE) {
      inQuotes = !inQuotes
      i++
      continue
    }

    if (!inQuotes) {
      if (char === OPEN_BRACE) {
        braceDepth++
      }
      else if (char === CLOSE_BRACE) {
        braceDepth--
        if (braceDepth === 0) {
          return i
        }
      }
    }

    i++
  }

  return -1
}

function assertNoDuplicateFieldNames(fields: readonly FieldNode[]): void {
  const seenNames = new Set<string>()
  for (const field of fields) {
    if (seenNames.has(field.name)) {
      throw new SyntaxError(`Duplicate field name "${field.name}" in fields segment`)
    }
    seenNames.add(field.name)
    if (field.children) {
      assertNoDuplicateFieldNames(field.children)
    }
  }
}

/**
 * Counts the leaf fields of a field list: the number of cells each row
 * carries, via a depth-first walk of nested field groups.
 */
export function countLeafFields(fields: readonly FieldNode[]): number {
  let leafCount = 0
  for (const field of fields) {
    leafCount += field.children ? countLeafFields(field.children) : 1
  }
  return leafCount
}

const DELIMITER_CANDIDATES: readonly Delimiter[] = [',', '\t', '|']

function findUnquotedMismatchedDelimiter(content: string, activeDelimiter: Delimiter): Delimiter | undefined {
  for (const candidate of DELIMITER_CANDIDATES) {
    if (candidate === activeDelimiter)
      continue
    if (findUnquotedChar(content, candidate) !== -1)
      return candidate
  }
}

function formatDelimiter(delimiter: Delimiter): string {
  if (delimiter === '\t')
    return '\\t'
  return delimiter
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
      values.push(trimSpaces(valueBuffer))
      valueBuffer = ''
      i++
      continue
    }

    valueBuffer += char
    i++
  }

  // Add last value
  if (valueBuffer || values.length > 0) {
    values.push(trimSpaces(valueBuffer))
  }

  return values
}

export function mapRowValuesToPrimitives(values: string[]): JsonPrimitive[] {
  return values.map(v => parsePrimitiveToken(v))
}

// #endregion

// #region Primitive and key parsing

export function parsePrimitiveToken(token: string): JsonPrimitive {
  const trimmedToken = trimSpaces(token)

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
  const trimmedToken = trimSpaces(token)

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

export function parseKeyToken(content: string, start: number): { key: string, end: number } {
  return content[start] === DOUBLE_QUOTE
    ? parseQuotedKey(content, start)
    : parseUnquotedKey(content, start)
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
