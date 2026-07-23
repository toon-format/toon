import type { ArrayHeaderInfo, Delimiter, FieldNode, JsonPrimitive } from '../types.ts'
import { BACKSLASH, CLOSE_BRACE, CLOSE_BRACKET, COLON, DELIMITERS, DOUBLE_QUOTE, FALSE_LITERAL, NULL_LITERAL, OPEN_BRACE, OPEN_BRACKET, PIPE, TAB, TRUE_LITERAL } from '../constants.ts'
import { isBooleanOrNullLiteral, isNumericLiteral } from '../shared/literal-utils.ts'
import { findClosingQuote, findUnquotedChar, trimSpaces, unescapeString } from '../shared/string-utils.ts'

// #region Array header parsing

export type ArrayHeaderParseResult
  = | { kind: 'header', header: ArrayHeaderInfo, inlineValues?: string, strictError?: string }
    | { kind: 'notHeader' }
    | { kind: 'invalid', reason: string }

/**
 * Detects and parses an array-header line into a typed result, staying free of
 * strict-mode policy: callers decide how to treat `invalid` and `strictError`.
 */
export function parseArrayHeaderLine(
  content: string,
  defaultDelimiter: Delimiter,
): ArrayHeaderParseResult {
  const trimmedToken = content.trimStart()

  // Find the bracket segment, accounting for quoted keys that may contain brackets
  let bracketStart = -1

  // For quoted keys, find bracket after closing quote (not inside the quoted string)
  if (trimmedToken.startsWith(DOUBLE_QUOTE)) {
    const closingQuoteIndex = findClosingQuote(trimmedToken, 0)
    if (closingQuoteIndex === -1) {
      return { kind: 'notHeader' }
    }

    const afterQuote = trimmedToken.slice(closingQuoteIndex + 1)
    if (!afterQuote.startsWith(OPEN_BRACKET)) {
      return { kind: 'notHeader' }
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
    return { kind: 'notHeader' }
  }

  // A header key can't contain an unquoted colon, so this is a key-value line
  const firstColonIndex = findUnquotedChar(content, COLON)
  if (firstColonIndex !== -1 && firstColonIndex < bracketStart) {
    return { kind: 'notHeader' }
  }

  const bracketEnd = findUnquotedChar(content, CLOSE_BRACKET, bracketStart)
  if (bracketEnd === -1) {
    return { kind: 'notHeader' }
  }

  // Find the colon that comes after all brackets and braces
  let colonIndex = bracketEnd + 1
  let braceEnd = colonIndex

  // Check for fields segment (braces come after bracket)
  const braceStart = findUnquotedChar(content, OPEN_BRACE, bracketEnd)
  if (braceStart !== -1 && braceStart < findUnquotedChar(content, COLON, bracketEnd)) {
    const gapBeforeBrace = content.slice(bracketEnd + 1, braceStart)
    if (gapBeforeBrace !== '') {
      const trimmedGap = gapBeforeBrace.trim()
      return {
        kind: 'invalid',
        reason: trimmedGap === ''
          ? `Unexpected whitespace between bracket and fields segment`
          : `Unexpected content "${trimmedGap}" between bracket and fields segment`,
      }
    }

    const foundBraceEnd = findMatchingBrace(content, braceStart)
    if (foundBraceEnd !== -1) {
      braceEnd = foundBraceEnd + 1
    }
  }

  colonIndex = findUnquotedChar(content, COLON, Math.max(bracketEnd, braceEnd))
  if (colonIndex === -1) {
    return { kind: 'notHeader' }
  }

  const gapStart = Math.max(bracketEnd + 1, braceEnd)
  const gapBeforeColon = content.slice(gapStart, colonIndex)
  if (gapBeforeColon !== '') {
    const trimmedGap = gapBeforeColon.trim()
    return {
      kind: 'invalid',
      reason: trimmedGap === ''
        ? `Unexpected whitespace between bracket segment and colon`
        : `Unexpected content "${trimmedGap}" between bracket segment and colon`,
    }
  }

  // Extract and parse the key (might be quoted)
  let key: string | undefined
  if (bracketStart > 0) {
    const rawKey = content.slice(0, bracketStart).trim()
    // The upstream quote and bracket guards make a malformed quoted key
    // unreachable here, so this literal parse never actually throws; leaving
    // it uncaught preserves today's both-modes throw instead of adding a
    // non-strict swallow – do not "finish" the purity by catching it.
    key = rawKey.startsWith(DOUBLE_QUOTE) ? parseStringLiteral(rawKey) : rawKey
  }

  const afterColon = trimSpaces(content.slice(colonIndex + 1))
  const bracketContent = content.slice(bracketStart + 1, bracketEnd)

  let parsedBracket: ReturnType<typeof parseBracketSegment>
  try {
    parsedBracket = parseBracketSegment(bracketContent, defaultDelimiter)
  }
  catch (error) {
    return { kind: 'invalid', reason: (error as Error).message }
  }

  const { length, delimiter, keyed } = parsedBracket

  let fields: FieldNode[] | undefined
  if (braceStart !== -1 && braceStart < colonIndex) {
    const foundBraceEnd = findMatchingBrace(content, braceStart)
    if (foundBraceEnd !== -1 && foundBraceEnd < colonIndex) {
      const fieldsContent = content.slice(braceStart + 1, foundBraceEnd)

      const mismatchedDelimiter = findUnquotedMismatchedDelimiter(fieldsContent, delimiter)
      if (mismatchedDelimiter !== undefined) {
        return {
          kind: 'invalid',
          reason: `Header delimiter mismatch: bracket declares "${formatDelimiter(delimiter)}" but fields segment contains unquoted "${formatDelimiter(mismatchedDelimiter)}"`,
        }
      }

      try {
        fields = parseFieldEntries(fieldsContent, delimiter)
      }
      catch (error) {
        return { kind: 'invalid', reason: (error as Error).message }
      }
    }
  }

  // Duplicate field names produce duplicate sibling keys in every decoded
  // element: non-strict LWW applies, strict mode errors. The dual nature is
  // why the reason rides along on the otherwise-valid header as strictError,
  // and why the trailing-content check below prefers it – strict reports the
  // duplicate before the trailing-content violation.
  const duplicateFieldName = fields ? findDuplicateFieldName(fields) : undefined
  const duplicateReason = duplicateFieldName
    ? `Duplicate field name "${duplicateFieldName}" in fields segment`
    : undefined

  if (keyed && !fields) {
    return { kind: 'invalid', reason: 'Keyed header requires a fields segment' }
  }

  // A fields-bearing header, keyed or not, carries no inline content;
  // decoding the values as an inline array would silently drop the fields.
  if (fields && afterColon) {
    return { kind: 'invalid', reason: duplicateReason ?? 'Unexpected content after fields-bearing header colon' }
  }

  return {
    kind: 'header',
    header: {
      key,
      length,
      delimiter,
      fields,
      keyed,
    },
    inlineValues: afterColon || undefined,
    strictError: duplicateReason,
  }
}

const BRACKET_LENGTH_PATTERN = /^(?:0|[1-9]\d*)$/

export function parseBracketSegment(
  seg: string,
  defaultDelimiter: Delimiter,
): { length: number, delimiter: Delimiter, keyed: boolean } {
  let content = seg

  let delimiter = defaultDelimiter
  if (content.endsWith(TAB)) {
    delimiter = DELIMITERS.tab
    content = content.slice(0, -1)
  }
  else if (content.endsWith(PIPE)) {
    delimiter = DELIMITERS.pipe
    content = content.slice(0, -1)
  }

  // A colon immediately after the length and before the optional delimiter
  // symbol marks a keyed header: [N:], [N:<TAB>], [N:|]. Any other colon
  // placement leaves a token that fails the length check below.
  let keyed = false
  if (content.endsWith(COLON)) {
    keyed = true
    content = content.slice(0, -1)
  }

  if (!BRACKET_LENGTH_PATTERN.test(content)) {
    throw new SyntaxError(`Invalid array length: "${seg}" (expected non-negative integer with no leading zeros)`)
  }

  return { length: Number.parseInt(content, 10), delimiter, keyed }
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

function findDuplicateFieldName(fields: readonly FieldNode[]): string | undefined {
  const seenNames = new Set<string>()
  for (const field of fields) {
    if (seenNames.has(field.name)) {
      return field.name
    }
    seenNames.add(field.name)
    if (field.children) {
      const nestedDuplicate = findDuplicateFieldName(field.children)
      if (nestedDuplicate !== undefined) {
        return nestedDuplicate
      }
    }
  }
  return undefined
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

/** Parses a delimited string into values, respecting quoted strings and escape sequences. */
export function parseDelimitedValues(input: string, delimiter: Delimiter): string[] {
  const values: string[] = []
  let valueBuffer = ''
  let inQuotes = false
  let i = 0

  while (i < input.length) {
    const char = input[i]

    if (char === BACKSLASH && i + 1 < input.length && inQuotes) {
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

  if (!trimmedToken) {
    return ''
  }

  // A leading quote forces a properly quoted string
  if (trimmedToken.startsWith(DOUBLE_QUOTE)) {
    return parseStringLiteral(trimmedToken)
  }

  if (isBooleanOrNullLiteral(trimmedToken)) {
    if (trimmedToken === TRUE_LITERAL)
      return true
    if (trimmedToken === FALSE_LITERAL)
      return false
    if (trimmedToken === NULL_LITERAL)
      return null
  }

  if (isNumericLiteral(trimmedToken)) {
    const parsedNumber = Number.parseFloat(trimmedToken)
    // Normalize negative zero to positive zero
    return Object.is(parsedNumber, -0) ? 0 : parsedNumber
  }

  return trimmedToken
}

export function parseStringLiteral(token: string): string {
  const trimmedToken = trimSpaces(token)

  if (trimmedToken.startsWith(DOUBLE_QUOTE)) {
    const closingQuoteIndex = findClosingQuote(trimmedToken, 0)

    if (closingQuoteIndex === -1) {
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

  if (parsePosition >= content.length || content[parsePosition] !== COLON) {
    throw new SyntaxError('Missing colon after key')
  }

  const key = trimSpaces(content.slice(start, parsePosition))

  parsePosition++

  return { key, end: parsePosition }
}

export function parseQuotedKey(content: string, start: number): { key: string, end: number } {
  const closingQuoteIndex = findClosingQuote(content, start)

  if (closingQuoteIndex === -1) {
    throw new SyntaxError('Unterminated quoted key')
  }

  const keyContent = content.slice(start + 1, closingQuoteIndex)
  const key = unescapeString(keyContent)
  let parsePosition = closingQuoteIndex + 1

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
