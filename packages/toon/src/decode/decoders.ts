import type { ArrayHeaderInfo, DecodeStreamOptions, Depth, FieldNode, JsonPrimitive, JsonStreamEvent, ParsedLine } from '../types.ts'
import type { LineReader, LineRule } from './line-reader.ts'
import type { ArrayHeaderParseResult } from './parser.ts'
import { COLON, DEFAULT_DELIMITER, LIST_ITEM_MARKER, LIST_ITEM_PREFIX } from '../constants.ts'
import { findClosingQuote, findUnquotedChar, trimSpaces } from '../shared/string-utils.ts'
import { ToonDecodeError, withLine } from './errors.ts'
import { createLineReader, driveAsync, driveSync, peekLine, readLine } from './line-reader.ts'
import { countLeafFields, isArrayHeaderContent, isKeyValueContent, mapRowValuesToPrimitives, parseArrayHeaderLine, parseDelimitedValues, parseKeyToken, parsePrimitiveToken } from './parser.ts'
import { assertExpectedCount, isDataRow, validateNoBlankLinesInRange, validateNoExtraListItems, validateNoExtraTabularRows } from './validation.ts'

interface DecoderContext { indent: number, strict: boolean }

function resolveContext(options?: DecodeStreamOptions): DecoderContext {
  return {
    indent: options?.indent ?? 2,
    strict: options?.strict ?? true,
  }
}

// #region Public entry points

export function decodeStreamSync(
  source: Iterable<string>,
  options?: DecodeStreamOptions,
): Generator<JsonStreamEvent> {
  const resolvedOptions = resolveContext(options)
  const reader = createLineReader(resolvedOptions)
  return driveSync(source, decodeDocument(reader, resolvedOptions))
}

export function decodeStream(
  source: AsyncIterable<string> | Iterable<string>,
  options?: DecodeStreamOptions,
): AsyncGenerator<JsonStreamEvent> {
  const resolvedOptions = resolveContext(options)
  const reader = createLineReader(resolvedOptions)
  return driveAsync(source, decodeDocument(reader, resolvedOptions))
}

// #endregion

// #region Document dispatch

function* decodeDocument(reader: LineReader, options: DecoderContext): LineRule {
  // Get first line to determine root form
  const first = yield* peekLine(reader)
  if (!first) {
    // Empty input decodes to empty object
    yield { type: 'startObject' }
    yield { type: 'endObject' }
    return
  }

  if (trimSpaces(first.content) === '[]') {
    yield* readLine(reader)
    yield { type: 'startArray', length: 0 }
    yield { type: 'endArray' }
    yield* assertFullyConsumed(reader, options.strict)
    return
  }

  if (isArrayHeaderContent(first.content)) {
    const headerInfo = withLine(first, () => resolveArrayHeader(parseArrayHeaderLine(first.content, DEFAULT_DELIMITER), options.strict))
    if (headerInfo) {
      yield* readLine(reader)
      yield* decodeArrayFromHeader(headerInfo.header, headerInfo.inlineValues, reader, 0, options, first)
      yield* assertFullyConsumed(reader, options.strict)
      return
    }
  }

  yield* readLine(reader)
  const following = yield* peekLine(reader)
  const hasMore = following !== undefined
  if (!hasMore && !isKeyValueLine(first)) {
    // Single non-key-value line is root primitive
    yield { type: 'primitive', value: withLine(first, () => parsePrimitiveToken(first.content)) }
    return
  }

  if (!isKeyValueLine(first) && following?.depth === 0) {
    throw new ToonDecodeError(
      'Top-level document must start with a key-value or array-header line',
      { line: first.lineNumber, source: first.raw },
    )
  }

  // Root object
  const rootSeenKeys = options.strict ? new Set<string>() : undefined
  yield { type: 'startObject' }
  yield* decodeKeyValue(first, reader, 0, options, rootSeenKeys)

  // Process remaining object fields
  while (true) {
    const line = yield* peekLine(reader)
    if (!line) {
      break
    }

    if (line.depth !== 0) {
      if (options.strict) {
        throw overIndentedLineError(line, 0)
      }
      yield* readLine(reader)
      continue
    }

    yield* readLine(reader)
    yield* decodeKeyValue(line, reader, 0, options, rootSeenKeys)
  }

  yield { type: 'endObject' }
}

// #endregion

// #region Error helpers

function assertNoDepthJump(firstNestedLine: ParsedLine, parentDepth: Depth, strict: boolean): void {
  if (strict && firstNestedLine.depth > parentDepth + 1) {
    throw new ToonDecodeError(
      `Indentation depth jump: expected depth ${parentDepth + 1}, but found ${firstNestedLine.depth}`,
      { line: firstNestedLine.lineNumber, source: firstNestedLine.raw },
    )
  }
}

function overIndentedLineError(line: ParsedLine, expectedDepth: Depth): ToonDecodeError {
  return new ToonDecodeError(
    `Over-indented line: expected depth ${expectedDepth}, but found ${line.depth}`,
    { line: line.lineNumber, source: line.raw },
  )
}

function keylessKeyedError(line: ParsedLine): ToonDecodeError {
  return new ToonDecodeError(
    'Keyless keyed header is only valid at the document root',
    { line: line.lineNumber, source: line.raw },
  )
}

function keylessHeaderError(line: ParsedLine): ToonDecodeError {
  return new ToonDecodeError(
    'Keyless array header is only valid at the document root or as a list item',
    { line: line.lineNumber, source: line.raw },
  )
}

function keylessFieldsHeaderError(line: ParsedLine): ToonDecodeError {
  return new ToonDecodeError(
    'Keyless header with a fields segment is only valid at the document root',
    { line: line.lineNumber, source: line.raw },
  )
}

// Strict decoding never silently discards input: once the root form is
// complete, any remaining line is an error rather than dropped data.
function* assertFullyConsumed(reader: LineReader, strict: boolean): LineRule {
  if (!strict) {
    return
  }
  const line = yield* peekLine(reader)
  if (line) {
    throw new ToonDecodeError(
      'Unexpected content after the document root',
      { line: line.lineNumber, source: line.raw },
    )
  }
}

function assertNoDuplicateKey(key: string, line: ParsedLine, seenKeys: Set<string> | undefined): void {
  if (!seenKeys)
    return
  if (seenKeys.has(key)) {
    throw new ToonDecodeError(
      `Duplicate sibling key "${key}"`,
      { line: line.lineNumber, source: line.raw },
    )
  }
  seenKeys.add(key)
}

// #endregion

// #region Decode rules

function* decodeKeyValue(
  line: ParsedLine,
  reader: LineReader,
  baseDepth: Depth,
  options: DecoderContext,
  seenKeys?: Set<string>,
): LineRule {
  const content = line.content

  const arrayHeader = withLine(line, () => resolveArrayHeader(parseArrayHeaderLine(content, DEFAULT_DELIMITER), options.strict))
  if (arrayHeader && arrayHeader.header.key !== undefined) {
    assertNoDuplicateKey(arrayHeader.header.key, line, seenKeys)
    yield { type: 'key', key: arrayHeader.header.key }
    yield* decodeArrayFromHeader(arrayHeader.header, arrayHeader.inlineValues, reader, baseDepth, options, line)
    return
  }

  // Keyless headers are only valid at the document root or as list items;
  // non-strict decoders fall through to key-value parsing.
  if (arrayHeader && arrayHeader.header.key === undefined && options.strict) {
    throw arrayHeader.header.keyed ? keylessKeyedError(line) : keylessHeaderError(line)
  }

  const { key, end } = withLine(line, () => parseKeyToken(content, 0))
  const rest = trimSpaces(content.slice(end))

  assertNoDuplicateKey(key, line, seenKeys)
  yield { type: 'key', key }

  // No value after colon – expect nested object or empty
  if (!rest) {
    const nextLine = yield* peekLine(reader)
    if (nextLine && nextLine.depth > baseDepth) {
      assertNoDepthJump(nextLine, baseDepth, options.strict)
      yield { type: 'startObject' }
      yield* decodeObjectFields(reader, baseDepth + 1, options)
      yield { type: 'endObject' }
      return
    }

    yield { type: 'startObject' }
    yield { type: 'endObject' }
    return
  }

  if (rest === '[]') {
    yield { type: 'startArray', length: 0 }
    yield { type: 'endArray' }
    return
  }

  yield { type: 'primitive', value: withLine(line, () => parsePrimitiveToken(rest)) }
}

function* decodeObjectFields(
  reader: LineReader,
  baseDepth: Depth,
  options: DecoderContext,
): LineRule {
  let computedDepth: Depth | undefined
  const seenKeys = options.strict ? new Set<string>() : undefined

  while (true) {
    const line = yield* peekLine(reader)
    if (!line || line.depth < baseDepth) {
      break
    }

    if (computedDepth === undefined && line.depth >= baseDepth) {
      computedDepth = line.depth
    }

    if (line.depth === computedDepth) {
      yield* readLine(reader)
      yield* decodeKeyValue(line, reader, computedDepth, options, seenKeys)
    }
    else if (computedDepth !== undefined && line.depth > computedDepth) {
      if (options.strict) {
        throw overIndentedLineError(line, computedDepth)
      }
      yield* readLine(reader)
    }
    else {
      break
    }
  }
}

function* decodeArrayFromHeader(
  header: ArrayHeaderInfo,
  inlineValues: string | undefined,
  reader: LineReader,
  baseDepth: Depth,
  options: DecoderContext,
  headerLine: ParsedLine,
): LineRule {
  // Keyed tabular header: decodes to an object, not an array
  if (header.keyed) {
    yield* decodeKeyedObject(header, reader, baseDepth, options, headerLine)
    return
  }

  yield { type: 'startArray', length: header.length }

  if (inlineValues) {
    yield* decodeInlinePrimitiveArray(header, inlineValues, options, headerLine)
    yield { type: 'endArray' }
    return
  }

  if (header.fields && header.fields.length > 0) {
    yield* decodeTabularArray(header, reader, baseDepth, options, headerLine)
    yield { type: 'endArray' }
    return
  }

  yield* decodeListArray(header, reader, baseDepth, options, headerLine)
  yield { type: 'endArray' }
}

function* decodeInlinePrimitiveArray(
  header: ArrayHeaderInfo,
  inlineValues: string,
  options: DecoderContext,
  headerLine: ParsedLine,
): Generator<JsonStreamEvent> {
  if (!trimSpaces(inlineValues)) {
    assertExpectedCount(0, header.length, 'inline array items', options, headerLine)
    return
  }

  const values = withLine(headerLine, () => parseDelimitedValues(inlineValues, header.delimiter))
  const primitives = withLine(headerLine, () => mapRowValuesToPrimitives(values))

  assertExpectedCount(primitives.length, header.length, 'inline array items', options, headerLine)

  for (const primitive of primitives) {
    yield { type: 'primitive', value: primitive }
  }
}

function* decodeKeyedObject(
  header: ArrayHeaderInfo,
  reader: LineReader,
  baseDepth: Depth,
  options: DecoderContext,
  headerLine: ParsedLine,
): LineRule {
  const entryDepth = baseDepth + 1
  const leafFieldCount = countLeafFields(header.fields!)
  const seenEntryKeys = options.strict ? new Set<string>() : undefined
  let entryCount = 0
  let startLine: number | undefined
  let endLine: number | undefined
  let lastEntryLine: ParsedLine = headerLine

  yield { type: 'startObject' }

  // A keyed scope ends only when the depth decreases to the header's
  // depth or less, or at end of input; every line at entry depth with an
  // unquoted colon is an entry row.
  while (true) {
    const line = yield* peekLine(reader)
    if (!line || line.depth <= baseDepth) {
      break
    }

    if (line.depth > entryDepth) {
      if (options.strict) {
        throw new ToonDecodeError(
          'Unexpected indentation inside keyed tabular object',
          { line: line.lineNumber, source: line.raw },
        )
      }
      yield* readLine(reader)
      continue
    }

    if (findUnquotedChar(line.content, COLON) === -1) {
      if (options.strict) {
        throw new ToonDecodeError(
          'Expected entry row inside keyed tabular object',
          { line: line.lineNumber, source: line.raw },
        )
      }
      yield* readLine(reader)
      continue
    }

    yield* readLine(reader)
    if (startLine === undefined) {
      startLine = line.lineNumber
    }
    endLine = line.lineNumber
    lastEntryLine = line

    // Split at the first unquoted colon: entry key first, then the
    // remainder splits on the active delimiter into cells.
    const { key, end } = withLine(line, () => parseKeyToken(line.content, 0))
    assertNoDuplicateKey(key, line, seenEntryKeys)
    yield { type: 'key', key }

    const cellsContent = trimSpaces(line.content.slice(end))
    const values = cellsContent === ''
      ? []
      : withLine(line, () => parseDelimitedValues(cellsContent, header.delimiter))
    assertExpectedCount(values.length, leafFieldCount, 'keyed entry cells', options, line)

    const primitives = withLine(line, () => mapRowValuesToPrimitives(values))
    yield* yieldObjectFromFields(header.fields!, primitives)

    entryCount++
  }

  assertExpectedCount(entryCount, header.length, 'keyed entries', options, lastEntryLine)

  if (options.strict && startLine !== undefined && endLine !== undefined) {
    validateNoBlankLinesInRange(startLine, endLine, reader.scanState.blankLines, options.strict, 'keyed tabular object')
  }

  yield { type: 'endObject' }
}

function* decodeTabularArray(
  header: ArrayHeaderInfo,
  reader: LineReader,
  baseDepth: Depth,
  options: DecoderContext,
  headerLine: ParsedLine,
): LineRule {
  const rowDepth = baseDepth + 1
  let rowCount = 0
  let startLine: number | undefined
  let endLine: number | undefined
  let lastRowLine: ParsedLine = headerLine

  while (rowCount < header.length) {
    const line = yield* peekLine(reader)
    if (!line || line.depth < rowDepth) {
      break
    }

    if (line.depth === rowDepth) {
      if (!isDataRow(line.content, header.delimiter)) {
        break
      }

      if (startLine === undefined) {
        startLine = line.lineNumber
      }
      endLine = line.lineNumber
      lastRowLine = line

      yield* readLine(reader)
      const values = withLine(line, () => parseDelimitedValues(line.content, header.delimiter))
      assertExpectedCount(values.length, countLeafFields(header.fields!), 'tabular row values', options, line)

      const primitives = withLine(line, () => mapRowValuesToPrimitives(values))
      yield* yieldObjectFromFields(header.fields!, primitives)

      rowCount++
    }
    else {
      break
    }
  }

  assertExpectedCount(rowCount, header.length, 'tabular rows', options, lastRowLine)

  if (options.strict && startLine !== undefined && endLine !== undefined) {
    validateNoBlankLinesInRange(startLine, endLine, reader.scanState.blankLines, options.strict, 'tabular array')
  }

  if (options.strict) {
    const nextLine = yield* peekLine(reader)
    validateNoExtraTabularRows(nextLine, rowDepth, header)
  }
}

function* decodeListArray(
  header: ArrayHeaderInfo,
  reader: LineReader,
  baseDepth: Depth,
  options: DecoderContext,
  headerLine: ParsedLine,
): LineRule {
  const itemDepth = baseDepth + 1
  let itemCount = 0
  let startLine: number | undefined
  let endLine: number | undefined
  let lastItemLine: ParsedLine = headerLine

  while (itemCount < header.length) {
    const line = yield* peekLine(reader)
    if (!line || line.depth < itemDepth) {
      break
    }

    const isListItem = line.content.startsWith(LIST_ITEM_PREFIX) || line.content === LIST_ITEM_MARKER

    if (line.depth === itemDepth && isListItem) {
      if (startLine === undefined) {
        startLine = line.lineNumber
      }
      endLine = line.lineNumber
      lastItemLine = line

      yield* decodeListItem(reader, itemDepth, options)

      const lastConsumedLine = reader.lastLine
      if (lastConsumedLine) {
        endLine = lastConsumedLine.lineNumber
        lastItemLine = lastConsumedLine
      }

      itemCount++
    }
    else {
      break
    }
  }

  assertExpectedCount(itemCount, header.length, 'list array items', options, lastItemLine)

  if (options.strict && startLine !== undefined && endLine !== undefined) {
    validateNoBlankLinesInRange(startLine, endLine, reader.scanState.blankLines, options.strict, 'list array')
  }

  if (options.strict) {
    const nextLine = yield* peekLine(reader)
    validateNoExtraListItems(nextLine, itemDepth, header.length)
  }
}

function* decodeListItem(
  reader: LineReader,
  baseDepth: Depth,
  options: DecoderContext,
): LineRule {
  const line = yield* readLine(reader)
  if (!line) {
    throw new ReferenceError('Expected list item')
  }

  let afterHyphen: string

  if (line.content === LIST_ITEM_MARKER) {
    // Bare list item marker: always an empty object
    yield { type: 'startObject' }
    yield { type: 'endObject' }
    return
  }
  else if (line.content.startsWith(LIST_ITEM_PREFIX)) {
    afterHyphen = line.content.slice(LIST_ITEM_PREFIX.length)
  }
  else {
    throw new ToonDecodeError(
      `Expected list item to start with "${LIST_ITEM_PREFIX}"`,
      { line: line.lineNumber, source: line.raw },
    )
  }

  if (!trimSpaces(afterHyphen)) {
    yield { type: 'startObject' }
    yield { type: 'endObject' }
    return
  }

  if (trimSpaces(afterHyphen) === '[]') {
    yield { type: 'startArray', length: 0 }
    yield { type: 'endArray' }
    return
  }

  const itemLine: ParsedLine = { ...line, content: afterHyphen }

  if (isArrayHeaderContent(afterHyphen)) {
    const arrayHeader = withLine(itemLine, () => resolveArrayHeader(parseArrayHeaderLine(afterHyphen, DEFAULT_DELIMITER), options.strict))
    if (arrayHeader) {
      // There is no keyless keyed (`- [N:]{fields}:`) or fields-bearing
      // (`- [N]{fields}:`) list-item form.
      if (arrayHeader.header.keyed || arrayHeader.header.fields !== undefined) {
        if (options.strict) {
          throw arrayHeader.header.keyed ? keylessKeyedError(itemLine) : keylessFieldsHeaderError(itemLine)
        }
      }
      else {
        yield* decodeArrayFromHeader(arrayHeader.header, arrayHeader.inlineValues, reader, baseDepth, options, itemLine)
        return
      }
    }
  }

  // Tabular-first list-item object: `- key[N]{fields}:`
  const headerInfo = withLine(itemLine, () => resolveArrayHeader(parseArrayHeaderLine(afterHyphen, DEFAULT_DELIMITER), options.strict))
  if (headerInfo && headerInfo.header.key !== undefined && headerInfo.header.fields !== undefined) {
    const header = headerInfo.header
    const seenKeys = options.strict ? new Set<string>([header.key!]) : undefined
    yield { type: 'startObject' }
    yield { type: 'key', key: header.key! }

    // Use baseDepth + 1 for the array so rows are at baseDepth + 2
    yield* decodeArrayFromHeader(header, headerInfo.inlineValues, reader, baseDepth + 1, options, itemLine)

    yield* followSiblingFields(reader, baseDepth + 1, options, seenKeys)

    yield { type: 'endObject' }
    return
  }

  if (isKeyValueContent(afterHyphen)) {
    const seenKeys = options.strict ? new Set<string>() : undefined
    yield { type: 'startObject' }
    yield* decodeKeyValue(itemLine, reader, baseDepth + 1, options, seenKeys)

    yield* followSiblingFields(reader, baseDepth + 1, options, seenKeys)

    yield { type: 'endObject' }
    return
  }

  yield { type: 'primitive', value: withLine(itemLine, () => parsePrimitiveToken(afterHyphen)) }
}

// Consume the sibling key-value fields that follow a list-item object at the
// same depth, stopping at the next list item, a shallower line, or end of input.
function* followSiblingFields(
  reader: LineReader,
  followDepth: Depth,
  options: DecoderContext,
  seenKeys?: Set<string>,
): LineRule {
  while (true) {
    const nextLine = yield* peekLine(reader)
    if (!nextLine || nextLine.depth < followDepth) {
      break
    }

    if (nextLine.depth === followDepth && !nextLine.content.startsWith(LIST_ITEM_PREFIX)) {
      yield* readLine(reader)
      yield* decodeKeyValue(nextLine, reader, followDepth, options, seenKeys)
    }
    else {
      break
    }
  }
}

function isKeyValueLine(line: ParsedLine): boolean {
  const content = line.content
  if (content.startsWith('"')) {
    const closingQuoteIndex = findClosingQuote(content, 0)
    if (closingQuoteIndex === -1) {
      return false
    }
    return content.slice(closingQuoteIndex + 1).includes(COLON)
  }
  else {
    return content.includes(COLON)
  }
}

// #endregion

// #region Shared decoder helpers

// Applies strict-mode policy to a parsed array-header result, keeping the
// detection/parse split in parser.ts free of error decisions. A bare
// SyntaxError is thrown on purpose so the caller's `withLine` wrapper enriches
// it into a `ToonDecodeError` with a `cause`, matching the direct-throw path.
function resolveArrayHeader(
  result: ArrayHeaderParseResult,
  strict: boolean,
): { header: ArrayHeaderInfo, inlineValues?: string } | undefined {
  if (result.kind === 'notHeader') {
    return undefined
  }

  if (result.kind === 'invalid') {
    if (strict) {
      throw new SyntaxError(result.reason)
    }
    return undefined
  }

  // A valid header may still carry a strict-only violation (duplicate field
  // names) that non-strict mode resolves via last-write-wins.
  if (strict && result.strictError !== undefined) {
    throw new SyntaxError(result.strictError)
  }

  return { header: result.header, inlineValues: result.inlineValues }
}

function* yieldObjectFromFields(
  fields: readonly FieldNode[],
  primitives: readonly JsonPrimitive[],
): Generator<JsonStreamEvent> {
  let cellIndex = 0

  function* walkFieldGroup(nodes: readonly FieldNode[]): Generator<JsonStreamEvent> {
    yield { type: 'startObject' }
    for (const node of nodes) {
      yield { type: 'key', key: node.name }
      if (node.children) {
        yield* walkFieldGroup(node.children)
      }
      else {
        yield { type: 'primitive', value: primitives[cellIndex++]! }
      }
    }

    yield { type: 'endObject' }
  }

  yield* walkFieldGroup(fields)
}

// #endregion
