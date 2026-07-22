import type { ArrayHeaderInfo, DecodeStreamOptions, Depth, FieldNode, JsonPrimitive, JsonStreamEvent, ParsedLine } from '../types.ts'
import type { StreamingScanState } from './scanner.ts'
import { COLON, DEFAULT_DELIMITER, LIST_ITEM_MARKER, LIST_ITEM_PREFIX } from '../constants.ts'
import { findClosingQuote, findUnquotedChar, trimSpaces } from '../shared/string-utils.ts'
import { ToonDecodeError, withLine } from './errors.ts'
import { countLeafFields, isArrayHeaderContent, isKeyValueContent, mapRowValuesToPrimitives, parseArrayHeaderLine, parseDelimitedValues, parseKeyToken, parsePrimitiveToken } from './parser.ts'
import { createScanState, parseLinesAsync, parseLinesSync } from './scanner.ts'
import { assertExpectedCount, isDataRow, validateNoBlankLinesInRange, validateNoExtraListItems, validateNoExtraTabularRows } from './validation.ts'

interface DecoderContext { indent: number, strict: boolean }

// #region Streaming line cursor

class StreamingLineCursor {
  private buffer: ParsedLine[] = []
  private generator: Iterator<ParsedLine> | AsyncIterator<ParsedLine>
  private done = false
  private lastLine: ParsedLine | undefined
  private scanState: StreamingScanState

  constructor(
    generator: Iterator<ParsedLine> | AsyncIterator<ParsedLine>,
    scanState: StreamingScanState,
  ) {
    this.generator = generator
    this.scanState = scanState
  }

  getBlankLines() {
    return this.scanState.blankLines
  }

  async peek(): Promise<ParsedLine | undefined> {
    if (this.buffer.length > 0) {
      return this.buffer[0]
    }

    if (this.done) {
      return undefined
    }

    const result = await this.generator.next()
    if (result.done) {
      this.done = true
      return undefined
    }

    this.buffer.push(result.value)
    return result.value
  }

  async next(): Promise<ParsedLine | undefined> {
    const line = await this.peek()
    if (line !== undefined) {
      this.buffer.shift()
      this.lastLine = line
    }

    return line
  }

  async advance(): Promise<void> {
    await this.next()
  }

  current(): ParsedLine | undefined {
    return this.lastLine
  }

  async atEnd(): Promise<boolean> {
    return (await this.peek()) === undefined
  }

  peekSync(): ParsedLine | undefined {
    if (this.buffer.length > 0) {
      return this.buffer[0]
    }

    if (this.done) {
      return undefined
    }

    const result = (this.generator as Iterator<ParsedLine>).next()
    if (result.done) {
      this.done = true
      return undefined
    }

    this.buffer.push(result.value)
    return result.value
  }

  nextSync(): ParsedLine | undefined {
    const line = this.peekSync()
    if (line !== undefined) {
      this.buffer.shift()
      this.lastLine = line
    }

    return line
  }

  advanceSync(): void {
    this.nextSync()
  }

  atEndSync(): boolean {
    return this.peekSync() === undefined
  }
}

// #endregion

// #region Synchronous streaming decode

export function* decodeStreamSync(
  source: Iterable<string>,
  options?: DecodeStreamOptions,
): Generator<JsonStreamEvent> {
  const resolvedOptions: DecoderContext = {
    indent: options?.indent ?? 2,
    strict: options?.strict ?? true,
  }

  const scanState = createScanState()
  const lineGenerator = parseLinesSync(source, resolvedOptions.indent, resolvedOptions.strict, scanState)
  const cursor = new StreamingLineCursor(lineGenerator, scanState)

  // Get first line to determine root form
  const first = cursor.peekSync()
  if (!first) {
    // Empty input decodes to empty object
    yield { type: 'startObject' }
    yield { type: 'endObject' }
    return
  }

  if (trimSpaces(first.content) === '[]') {
    cursor.advanceSync()
    yield { type: 'startArray', length: 0 }
    yield { type: 'endArray' }
    assertFullyConsumedSync(cursor, resolvedOptions.strict)
    return
  }

  // Check for root array
  if (isArrayHeaderContent(first.content)) {
    const headerInfo = withLine(first, () => parseArrayHeaderLine(first.content, DEFAULT_DELIMITER, resolvedOptions.strict))
    if (headerInfo) {
      cursor.advanceSync()
      yield* decodeArrayFromHeaderSync(headerInfo.header, headerInfo.inlineValues, cursor, 0, resolvedOptions, first)
      assertFullyConsumedSync(cursor, resolvedOptions.strict)
      return
    }
  }

  // Check for single primitive
  cursor.advanceSync()
  const hasMore = !cursor.atEndSync()
  if (!hasMore && !isKeyValueLineSync(first)) {
    // Single non-key-value line is root primitive
    yield { type: 'primitive', value: withLine(first, () => parsePrimitiveToken(first.content)) }
    return
  }

  if (!isKeyValueLineSync(first) && cursor.peekSync()?.depth === 0) {
    throw new ToonDecodeError(
      'Top-level document must start with a key-value or array-header line',
      { line: first.lineNumber, source: first.raw },
    )
  }

  // Root object
  const rootSeenKeys = resolvedOptions.strict ? new Set<string>() : undefined
  yield { type: 'startObject' }
  yield* decodeKeyValueSync(first, cursor, 0, resolvedOptions, rootSeenKeys)

  // Process remaining object fields
  while (!cursor.atEndSync()) {
    const line = cursor.peekSync()
    if (!line) {
      break
    }

    if (line.depth !== 0) {
      if (resolvedOptions.strict) {
        throw overIndentedLineError(line, 0)
      }
      cursor.advanceSync()
      continue
    }

    cursor.advanceSync()
    yield* decodeKeyValueSync(line, cursor, 0, resolvedOptions, rootSeenKeys)
  }

  yield { type: 'endObject' }
}

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

// Strict decoding never silently discards input: once the root form is
// complete, any remaining line is an error rather than dropped data
function assertFullyConsumedSync(cursor: StreamingLineCursor, strict: boolean): void {
  if (!strict) {
    return
  }
  const line = cursor.peekSync()
  if (line) {
    throw new ToonDecodeError(
      'Unexpected content after the document root',
      { line: line.lineNumber, source: line.raw },
    )
  }
}

async function assertFullyConsumed(cursor: StreamingLineCursor, strict: boolean): Promise<void> {
  if (!strict) {
    return
  }
  const line = await cursor.peek()
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

function* decodeKeyValueSync(
  line: ParsedLine,
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
  seenKeys?: Set<string>,
): Generator<JsonStreamEvent> {
  const content = line.content

  // Check for array header first
  const arrayHeader = withLine(line, () => parseArrayHeaderLine(content, DEFAULT_DELIMITER, options.strict))
  if (arrayHeader && arrayHeader.header.key !== undefined) {
    assertNoDuplicateKey(arrayHeader.header.key, line, seenKeys)
    yield { type: 'key', key: arrayHeader.header.key }
    yield* decodeArrayFromHeaderSync(arrayHeader.header, arrayHeader.inlineValues, cursor, baseDepth, options, line)
    return
  }

  // The keyless keyed form is only valid as the document's root header;
  // non-strict decoders fall through to key-value parsing
  if (arrayHeader?.header.keyed && arrayHeader.header.key === undefined && options.strict) {
    throw keylessKeyedError(line)
  }

  // Regular key-value pair
  const { key, end } = withLine(line, () => parseKeyToken(content, 0))
  const rest = trimSpaces(content.slice(end))

  assertNoDuplicateKey(key, line, seenKeys)
  yield { type: 'key', key }

  // No value after colon - expect nested object or empty
  if (!rest) {
    const nextLine = cursor.peekSync()
    if (nextLine && nextLine.depth > baseDepth) {
      assertNoDepthJump(nextLine, baseDepth, options.strict)
      yield { type: 'startObject' }
      yield* decodeObjectFieldsSync(cursor, baseDepth + 1, options)
      yield { type: 'endObject' }
      return
    }

    // Empty object
    yield { type: 'startObject' }
    yield { type: 'endObject' }
    return
  }

  if (rest === '[]') {
    yield { type: 'startArray', length: 0 }
    yield { type: 'endArray' }
    return
  }

  // Inline primitive value
  yield { type: 'primitive', value: withLine(line, () => parsePrimitiveToken(rest)) }
}

function* decodeObjectFieldsSync(
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
): Generator<JsonStreamEvent> {
  let computedDepth: Depth | undefined
  const seenKeys = options.strict ? new Set<string>() : undefined

  while (!cursor.atEndSync()) {
    const line = cursor.peekSync()
    if (!line || line.depth < baseDepth) {
      break
    }

    if (computedDepth === undefined && line.depth >= baseDepth) {
      computedDepth = line.depth
    }

    if (line.depth === computedDepth) {
      cursor.advanceSync()
      yield* decodeKeyValueSync(line, cursor, computedDepth, options, seenKeys)
    }
    else if (computedDepth !== undefined && line.depth > computedDepth) {
      if (options.strict) {
        throw overIndentedLineError(line, computedDepth)
      }
      cursor.advanceSync()
    }
    else {
      break
    }
  }
}

function* decodeArrayFromHeaderSync(
  header: ArrayHeaderInfo,
  inlineValues: string | undefined,
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
  headerLine: ParsedLine,
): Generator<JsonStreamEvent> {
  // Keyed tabular header: decodes to an object, not an array
  if (header.keyed) {
    yield* decodeKeyedObjectSync(header, cursor, baseDepth, options, headerLine)
    return
  }

  yield { type: 'startArray', length: header.length }

  // Inline primitive array
  if (inlineValues) {
    yield* decodeInlinePrimitiveArraySync(header, inlineValues, options, headerLine)
    yield { type: 'endArray' }
    return
  }

  // Tabular array
  if (header.fields && header.fields.length > 0) {
    yield* decodeTabularArraySync(header, cursor, baseDepth, options, headerLine)
    yield { type: 'endArray' }
    return
  }

  // List array
  yield* decodeListArraySync(header, cursor, baseDepth, options, headerLine)
  yield { type: 'endArray' }
}

function* decodeInlinePrimitiveArraySync(
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

function* decodeKeyedObjectSync(
  header: ArrayHeaderInfo,
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
  headerLine: ParsedLine,
): Generator<JsonStreamEvent> {
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
  // unquoted colon is an entry row
  while (!cursor.atEndSync()) {
    const line = cursor.peekSync()
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
      cursor.advanceSync()
      continue
    }

    if (findUnquotedChar(line.content, COLON) === -1) {
      if (options.strict) {
        throw new ToonDecodeError(
          'Expected entry row inside keyed tabular object',
          { line: line.lineNumber, source: line.raw },
        )
      }
      cursor.advanceSync()
      continue
    }

    cursor.advanceSync()
    if (startLine === undefined) {
      startLine = line.lineNumber
    }
    endLine = line.lineNumber
    lastEntryLine = line

    // Split at the first unquoted colon: entry key first, then the
    // remainder splits on the active delimiter into cells
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
    validateNoBlankLinesInRange(startLine, endLine, cursor.getBlankLines(), options.strict, 'keyed tabular object')
  }

  yield { type: 'endObject' }
}

function* decodeTabularArraySync(
  header: ArrayHeaderInfo,
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
  headerLine: ParsedLine,
): Generator<JsonStreamEvent> {
  const rowDepth = baseDepth + 1
  let rowCount = 0
  let startLine: number | undefined
  let endLine: number | undefined
  let lastRowLine: ParsedLine = headerLine

  while (!cursor.atEndSync() && rowCount < header.length) {
    const line = cursor.peekSync()
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

      cursor.advanceSync()
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
    validateNoBlankLinesInRange(startLine, endLine, cursor.getBlankLines(), options.strict, 'tabular array')
  }

  if (options.strict) {
    const nextLine = cursor.peekSync()
    validateNoExtraTabularRows(nextLine, rowDepth, header)
  }
}

function* decodeListArraySync(
  header: ArrayHeaderInfo,
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
  headerLine: ParsedLine,
): Generator<JsonStreamEvent> {
  const itemDepth = baseDepth + 1
  let itemCount = 0
  let startLine: number | undefined
  let endLine: number | undefined
  let lastItemLine: ParsedLine = headerLine

  while (!cursor.atEndSync() && itemCount < header.length) {
    const line = cursor.peekSync()
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

      yield* decodeListItemSync(cursor, itemDepth, options)

      const currentLine = cursor.current()
      if (currentLine) {
        endLine = currentLine.lineNumber
        lastItemLine = currentLine
      }

      itemCount++
    }
    else {
      break
    }
  }

  assertExpectedCount(itemCount, header.length, 'list array items', options, lastItemLine)

  if (options.strict && startLine !== undefined && endLine !== undefined) {
    validateNoBlankLinesInRange(startLine, endLine, cursor.getBlankLines(), options.strict, 'list array')
  }

  if (options.strict) {
    const nextLine = cursor.peekSync()
    validateNoExtraListItems(nextLine, itemDepth, header.length)
  }
}

function* decodeListItemSync(
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
): Generator<JsonStreamEvent> {
  const line = cursor.nextSync()
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

  // Check for array header after hyphen
  if (isArrayHeaderContent(afterHyphen)) {
    const arrayHeader = withLine(itemLine, () => parseArrayHeaderLine(afterHyphen, DEFAULT_DELIMITER, options.strict))
    if (arrayHeader) {
      // There is no keyless keyed list-item form (`- [N:]{fields}:`)
      if (arrayHeader.header.keyed) {
        if (options.strict) {
          throw keylessKeyedError(itemLine)
        }
      }
      else {
        yield* decodeArrayFromHeaderSync(arrayHeader.header, arrayHeader.inlineValues, cursor, baseDepth, options, itemLine)
        return
      }
    }
  }

  // Check for tabular-first list-item object: `- key[N]{fields}:`
  const headerInfo = withLine(itemLine, () => parseArrayHeaderLine(afterHyphen, DEFAULT_DELIMITER, options.strict))
  if (headerInfo && headerInfo.header.key !== undefined && headerInfo.header.fields !== undefined) {
    // Object with tabular array as first field
    const header = headerInfo.header
    const seenKeys = options.strict ? new Set<string>([header.key!]) : undefined
    yield { type: 'startObject' }
    yield { type: 'key', key: header.key! }

    // Use baseDepth + 1 for the array so rows are at baseDepth + 2
    yield* decodeArrayFromHeaderSync(header, headerInfo.inlineValues, cursor, baseDepth + 1, options, itemLine)

    // Read sibling fields at depth = baseDepth + 1
    const followDepth = baseDepth + 1
    while (!cursor.atEndSync()) {
      const nextLine = cursor.peekSync()
      if (!nextLine || nextLine.depth < followDepth) {
        break
      }

      if (nextLine.depth === followDepth && !nextLine.content.startsWith(LIST_ITEM_PREFIX)) {
        cursor.advanceSync()
        yield* decodeKeyValueSync(nextLine, cursor, followDepth, options, seenKeys)
      }
      else {
        break
      }
    }

    yield { type: 'endObject' }
    return
  }

  // Check for object first field after hyphen
  if (isKeyValueContent(afterHyphen)) {
    const seenKeys = options.strict ? new Set<string>() : undefined
    yield { type: 'startObject' }
    yield* decodeKeyValueSync(itemLine, cursor, baseDepth + 1, options, seenKeys)

    // Read subsequent fields
    const followDepth = baseDepth + 1
    while (!cursor.atEndSync()) {
      const nextLine = cursor.peekSync()
      if (!nextLine || nextLine.depth < followDepth) {
        break
      }

      if (nextLine.depth === followDepth && !nextLine.content.startsWith(LIST_ITEM_PREFIX)) {
        cursor.advanceSync()
        yield* decodeKeyValueSync(nextLine, cursor, followDepth, options, seenKeys)
      }
      else {
        break
      }
    }

    yield { type: 'endObject' }
    return
  }

  // Primitive value
  yield { type: 'primitive', value: withLine(itemLine, () => parsePrimitiveToken(afterHyphen)) }
}

function isKeyValueLineSync(line: ParsedLine): boolean {
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

// #region Asynchronous streaming decode

export async function* decodeStream(
  source: AsyncIterable<string> | Iterable<string>,
  options?: DecodeStreamOptions,
): AsyncGenerator<JsonStreamEvent> {
  const resolvedOptions = {
    indent: options?.indent ?? 2,
    strict: options?.strict ?? true,
  }

  const scanState = createScanState()

  // Determine if source is async or sync
  if (Symbol.asyncIterator in source) {
    const lineGenerator = parseLinesAsync(source, resolvedOptions.indent, resolvedOptions.strict, scanState)
    const cursor = new StreamingLineCursor(lineGenerator, scanState)

    // Get first line to determine root form
    const first = await cursor.peek()
    if (!first) {
      // Empty input decodes to empty object
      yield { type: 'startObject' }
      yield { type: 'endObject' }
      return
    }

    if (trimSpaces(first.content) === '[]') {
      await cursor.advance()
      yield { type: 'startArray', length: 0 }
      yield { type: 'endArray' }
      await assertFullyConsumed(cursor, resolvedOptions.strict)
      return
    }

    // Check for root array
    if (isArrayHeaderContent(first.content)) {
      const headerInfo = withLine(first, () => parseArrayHeaderLine(first.content, DEFAULT_DELIMITER, resolvedOptions.strict))
      if (headerInfo) {
        await cursor.advance()
        yield* decodeArrayFromHeaderAsync(headerInfo.header, headerInfo.inlineValues, cursor, 0, resolvedOptions, first)
        await assertFullyConsumed(cursor, resolvedOptions.strict)
        return
      }
    }

    // Check for single primitive
    await cursor.advance()
    const hasMore = !(await cursor.atEnd())
    if (!hasMore && !isKeyValueLineSync(first)) {
      yield { type: 'primitive', value: withLine(first, () => parsePrimitiveToken(first.content)) }
      return
    }

    if (!isKeyValueLineSync(first) && (await cursor.peek())?.depth === 0) {
      throw new ToonDecodeError(
        'Top-level document must start with a key-value or array-header line',
        { line: first.lineNumber, source: first.raw },
      )
    }

    // Root object
    const rootSeenKeys = resolvedOptions.strict ? new Set<string>() : undefined
    yield { type: 'startObject' }
    yield* decodeKeyValueAsync(first, cursor, 0, resolvedOptions, rootSeenKeys)

    // Process remaining object fields
    while (!(await cursor.atEnd())) {
      const line = await cursor.peek()
      if (!line) {
        break
      }

      if (line.depth !== 0) {
        if (resolvedOptions.strict) {
          throw overIndentedLineError(line, 0)
        }
        await cursor.advance()
        continue
      }

      await cursor.advance()
      yield* decodeKeyValueAsync(line, cursor, 0, resolvedOptions, rootSeenKeys)
    }

    yield { type: 'endObject' }
  }
  else {
    // Sync source, delegate to sync generator
    yield* decodeStreamSync(source as Iterable<string>, options)
  }
}

async function* decodeKeyValueAsync(
  line: ParsedLine,
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
  seenKeys?: Set<string>,
): AsyncGenerator<JsonStreamEvent> {
  const content = line.content

  // Check for array header first
  const arrayHeader = withLine(line, () => parseArrayHeaderLine(content, DEFAULT_DELIMITER, options.strict))
  if (arrayHeader && arrayHeader.header.key !== undefined) {
    assertNoDuplicateKey(arrayHeader.header.key, line, seenKeys)
    yield { type: 'key', key: arrayHeader.header.key }
    yield* decodeArrayFromHeaderAsync(arrayHeader.header, arrayHeader.inlineValues, cursor, baseDepth, options, line)
    return
  }

  // The keyless keyed form is only valid as the document's root header;
  // non-strict decoders fall through to key-value parsing
  if (arrayHeader?.header.keyed && arrayHeader.header.key === undefined && options.strict) {
    throw keylessKeyedError(line)
  }

  // Regular key-value pair
  const { key, end } = withLine(line, () => parseKeyToken(content, 0))
  const rest = trimSpaces(content.slice(end))

  assertNoDuplicateKey(key, line, seenKeys)
  yield { type: 'key', key }

  // No value after colon - expect nested object or empty
  if (!rest) {
    const nextLine = await cursor.peek()
    if (nextLine && nextLine.depth > baseDepth) {
      assertNoDepthJump(nextLine, baseDepth, options.strict)
      yield { type: 'startObject' }
      yield* decodeObjectFieldsAsync(cursor, baseDepth + 1, options)
      yield { type: 'endObject' }
      return
    }

    // Empty object
    yield { type: 'startObject' }
    yield { type: 'endObject' }
    return
  }

  if (rest === '[]') {
    yield { type: 'startArray', length: 0 }
    yield { type: 'endArray' }
    return
  }

  // Inline primitive value
  yield { type: 'primitive', value: withLine(line, () => parsePrimitiveToken(rest)) }
}

async function* decodeObjectFieldsAsync(
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
): AsyncGenerator<JsonStreamEvent> {
  let computedDepth: Depth | undefined
  const seenKeys = options.strict ? new Set<string>() : undefined

  while (!(await cursor.atEnd())) {
    const line = await cursor.peek()
    if (!line || line.depth < baseDepth) {
      break
    }

    if (computedDepth === undefined && line.depth >= baseDepth) {
      computedDepth = line.depth
    }

    if (line.depth === computedDepth) {
      await cursor.advance()
      yield* decodeKeyValueAsync(line, cursor, computedDepth, options, seenKeys)
    }
    else if (computedDepth !== undefined && line.depth > computedDepth) {
      if (options.strict) {
        throw overIndentedLineError(line, computedDepth)
      }
      await cursor.advance()
    }
    else {
      break
    }
  }
}

async function* decodeArrayFromHeaderAsync(
  header: ArrayHeaderInfo,
  inlineValues: string | undefined,
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
  headerLine: ParsedLine,
): AsyncGenerator<JsonStreamEvent> {
  // Keyed tabular header: decodes to an object, not an array
  if (header.keyed) {
    yield* decodeKeyedObjectAsync(header, cursor, baseDepth, options, headerLine)
    return
  }

  yield { type: 'startArray', length: header.length }

  // Inline primitive array
  if (inlineValues) {
    yield* decodeInlinePrimitiveArraySync(header, inlineValues, options, headerLine)
    yield { type: 'endArray' }
    return
  }

  // Tabular array
  if (header.fields && header.fields.length > 0) {
    yield* decodeTabularArrayAsync(header, cursor, baseDepth, options, headerLine)
    yield { type: 'endArray' }
    return
  }

  // List array
  yield* decodeListArrayAsync(header, cursor, baseDepth, options, headerLine)
  yield { type: 'endArray' }
}

async function* decodeKeyedObjectAsync(
  header: ArrayHeaderInfo,
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
  headerLine: ParsedLine,
): AsyncGenerator<JsonStreamEvent> {
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
  // unquoted colon is an entry row
  while (!(await cursor.atEnd())) {
    const line = await cursor.peek()
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
      await cursor.advance()
      continue
    }

    if (findUnquotedChar(line.content, COLON) === -1) {
      if (options.strict) {
        throw new ToonDecodeError(
          'Expected entry row inside keyed tabular object',
          { line: line.lineNumber, source: line.raw },
        )
      }
      await cursor.advance()
      continue
    }

    await cursor.advance()
    if (startLine === undefined) {
      startLine = line.lineNumber
    }
    endLine = line.lineNumber
    lastEntryLine = line

    // Split at the first unquoted colon: entry key first, then the
    // remainder splits on the active delimiter into cells
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
    validateNoBlankLinesInRange(startLine, endLine, cursor.getBlankLines(), options.strict, 'keyed tabular object')
  }

  yield { type: 'endObject' }
}

async function* decodeTabularArrayAsync(
  header: ArrayHeaderInfo,
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
  headerLine: ParsedLine,
): AsyncGenerator<JsonStreamEvent> {
  const rowDepth = baseDepth + 1
  let rowCount = 0
  let startLine: number | undefined
  let endLine: number | undefined
  let lastRowLine: ParsedLine = headerLine

  while (!(await cursor.atEnd()) && rowCount < header.length) {
    const line = await cursor.peek()
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

      await cursor.advance()
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
    validateNoBlankLinesInRange(startLine, endLine, cursor.getBlankLines(), options.strict, 'tabular array')
  }

  if (options.strict) {
    const nextLine = await cursor.peek()
    validateNoExtraTabularRows(nextLine, rowDepth, header)
  }
}

async function* decodeListArrayAsync(
  header: ArrayHeaderInfo,
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
  headerLine: ParsedLine,
): AsyncGenerator<JsonStreamEvent> {
  const itemDepth = baseDepth + 1
  let itemCount = 0
  let startLine: number | undefined
  let endLine: number | undefined
  let lastItemLine: ParsedLine = headerLine

  while (!(await cursor.atEnd()) && itemCount < header.length) {
    const line = await cursor.peek()
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

      yield* decodeListItemAsync(cursor, itemDepth, options)

      const currentLine = cursor.current()
      if (currentLine) {
        endLine = currentLine.lineNumber
        lastItemLine = currentLine
      }

      itemCount++
    }
    else {
      break
    }
  }

  assertExpectedCount(itemCount, header.length, 'list array items', options, lastItemLine)

  if (options.strict && startLine !== undefined && endLine !== undefined) {
    validateNoBlankLinesInRange(startLine, endLine, cursor.getBlankLines(), options.strict, 'list array')
  }

  if (options.strict) {
    const nextLine = await cursor.peek()
    validateNoExtraListItems(nextLine, itemDepth, header.length)
  }
}

async function* decodeListItemAsync(
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
): AsyncGenerator<JsonStreamEvent> {
  const line = await cursor.next()
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

  // Check for array header after hyphen
  if (isArrayHeaderContent(afterHyphen)) {
    const arrayHeader = withLine(itemLine, () => parseArrayHeaderLine(afterHyphen, DEFAULT_DELIMITER, options.strict))
    if (arrayHeader) {
      // There is no keyless keyed list-item form (`- [N:]{fields}:`)
      if (arrayHeader.header.keyed) {
        if (options.strict) {
          throw keylessKeyedError(itemLine)
        }
      }
      else {
        yield* decodeArrayFromHeaderAsync(arrayHeader.header, arrayHeader.inlineValues, cursor, baseDepth, options, itemLine)
        return
      }
    }
  }

  // Check for tabular-first list-item object: `- key[N]{fields}:`
  const headerInfo = withLine(itemLine, () => parseArrayHeaderLine(afterHyphen, DEFAULT_DELIMITER, options.strict))
  if (headerInfo && headerInfo.header.key !== undefined && headerInfo.header.fields !== undefined) {
    // Object with tabular array as first field
    const header = headerInfo.header
    const seenKeys = options.strict ? new Set<string>([header.key!]) : undefined
    yield { type: 'startObject' }
    yield { type: 'key', key: header.key! }

    // Use baseDepth + 1 for the array so rows are at baseDepth + 2
    yield* decodeArrayFromHeaderAsync(header, headerInfo.inlineValues, cursor, baseDepth + 1, options, itemLine)

    // Read sibling fields at depth = baseDepth + 1
    const followDepth = baseDepth + 1
    while (!(await cursor.atEnd())) {
      const nextLine = await cursor.peek()
      if (!nextLine || nextLine.depth < followDepth) {
        break
      }

      if (nextLine.depth === followDepth && !nextLine.content.startsWith(LIST_ITEM_PREFIX)) {
        await cursor.advance()
        yield* decodeKeyValueAsync(nextLine, cursor, followDepth, options, seenKeys)
      }
      else {
        break
      }
    }

    yield { type: 'endObject' }
    return
  }

  // Check for object first field after hyphen
  if (isKeyValueContent(afterHyphen)) {
    const seenKeys = options.strict ? new Set<string>() : undefined
    yield { type: 'startObject' }
    yield* decodeKeyValueAsync(itemLine, cursor, baseDepth + 1, options, seenKeys)

    // Read subsequent fields
    const followDepth = baseDepth + 1
    while (!(await cursor.atEnd())) {
      const nextLine = await cursor.peek()
      if (!nextLine || nextLine.depth < followDepth) {
        break
      }

      if (nextLine.depth === followDepth && !nextLine.content.startsWith(LIST_ITEM_PREFIX)) {
        await cursor.advance()
        yield* decodeKeyValueAsync(nextLine, cursor, followDepth, options, seenKeys)
      }
      else {
        break
      }
    }

    yield { type: 'endObject' }
    return
  }

  // Primitive value
  yield { type: 'primitive', value: withLine(itemLine, () => parsePrimitiveToken(afterHyphen)) }
}

// #endregion

// #region Shared decoder helpers

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
