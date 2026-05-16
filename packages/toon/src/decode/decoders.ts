import type { ArrayHeaderInfo, DecodeStreamOptions, Depth, JsonPrimitive, JsonStreamEvent, ParsedLine } from '../types.ts'
import type { StreamingScanState } from './scanner.ts'
import { COLON, DEFAULT_DELIMITER, LIST_ITEM_MARKER, LIST_ITEM_PREFIX } from '../constants.ts'
import { findClosingQuote } from '../shared/string-utils.ts'
import { ToonDecodeError, withLine } from './errors.ts'
import { isArrayHeaderContent, isKeyValueContent, mapRowValuesToPrimitives, parseArrayHeaderLine, parseDelimitedValues, parseKeyToken, parsePrimitiveToken } from './parser.ts'
import { createScanState, parseLinesAsync, parseLinesSync } from './scanner.ts'
import { assertExpectedCount, validateNoBlankLinesInRange, validateNoExtraListItems, validateNoExtraTabularRows } from './validation.ts'

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
  // Validate options
  if (options?.expandPaths !== undefined) {
    throw new Error('expandPaths is not supported in streaming decode')
  }

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

  // Check for root array
  if (isArrayHeaderContent(first.content)) {
    const headerInfo = withLine(first, () => parseArrayHeaderLine(first.content, DEFAULT_DELIMITER))
    if (headerInfo) {
      cursor.advanceSync()
      yield* decodeArrayFromHeaderSync(headerInfo.header, headerInfo.inlineValues, cursor, 0, resolvedOptions, first)
      return
    }
  }

  // Check for single primitive
  cursor.advanceSync()
  const hasMore = !cursor.atEndSync()
  if (!hasMore && !isKeyValueLineSync(first)) {
    // Single non-key-value line is root primitive
    yield { type: 'primitive', value: withLine(first, () => parsePrimitiveToken(first.content.trim())) }
    return
  }

  // Root object
  yield { type: 'startObject' }
  yield* decodeKeyValueSync(first, cursor, 0, resolvedOptions)

  // Process remaining object fields
  while (!cursor.atEndSync()) {
    const line = cursor.peekSync()
    if (!line || line.depth !== 0) {
      break
    }

    cursor.advanceSync()
    yield* decodeKeyValueSync(line, cursor, 0, resolvedOptions)
  }

  yield { type: 'endObject' }
}

function* decodeKeyValueSync(
  line: ParsedLine,
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
): Generator<JsonStreamEvent> {
  const content = line.content

  // Check for array header first
  const arrayHeader = withLine(line, () => parseArrayHeaderLine(content, DEFAULT_DELIMITER))
  if (arrayHeader && arrayHeader.header.key !== undefined) {
    yield { type: 'key', key: arrayHeader.header.key }
    yield* decodeArrayFromHeaderSync(arrayHeader.header, arrayHeader.inlineValues, cursor, baseDepth, options, line)
    return
  }

  // Regular key-value pair
  const { key, isQuoted } = withLine(line, () => parseKeyToken(content, 0))
  const colonIndex = content.indexOf(COLON, key.length)
  const rest = colonIndex >= 0 ? content.slice(colonIndex + 1).trim() : ''

  yield isQuoted ? { type: 'key', key, wasQuoted: true } : { type: 'key', key }

  // No value after colon - expect nested object or empty
  if (!rest) {
    const nextLine = cursor.peekSync()
    if (nextLine && nextLine.depth > baseDepth) {
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

  // Inline primitive value
  yield { type: 'primitive', value: withLine(line, () => parsePrimitiveToken(rest)) }
}

function* decodeObjectFieldsSync(
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
): Generator<JsonStreamEvent> {
  let computedDepth: Depth | undefined

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
      yield* decodeKeyValueSync(line, cursor, computedDepth, options)
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
  if (!inlineValues.trim()) {
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
      if (startLine === undefined) {
        startLine = line.lineNumber
      }
      endLine = line.lineNumber
      lastRowLine = line

      cursor.advanceSync()
      const values = withLine(line, () => parseDelimitedValues(line.content, header.delimiter))
      assertExpectedCount(values.length, header.fields!.length, 'tabular row values', options, line)

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

  if (!afterHyphen.trim()) {
    yield { type: 'startObject' }
    yield { type: 'endObject' }
    return
  }

  const itemLine: ParsedLine = { ...line, content: afterHyphen }

  // Check for array header after hyphen
  if (isArrayHeaderContent(afterHyphen)) {
    const arrayHeader = withLine(itemLine, () => parseArrayHeaderLine(afterHyphen, DEFAULT_DELIMITER))
    if (arrayHeader) {
      yield* decodeArrayFromHeaderSync(arrayHeader.header, arrayHeader.inlineValues, cursor, baseDepth, options, itemLine)
      return
    }
  }

  // Check for tabular-first list-item object: `- key[N]{fields}:`
  const headerInfo = withLine(itemLine, () => parseArrayHeaderLine(afterHyphen, DEFAULT_DELIMITER))
  if (headerInfo && headerInfo.header.key !== undefined && headerInfo.header.fields !== undefined) {
    // Object with tabular array as first field
    const header = headerInfo.header
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
        yield* decodeKeyValueSync(nextLine, cursor, followDepth, options)
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
    yield { type: 'startObject' }
    yield* decodeKeyValueSync(itemLine, cursor, baseDepth + 1, options)

    // Read subsequent fields
    const followDepth = baseDepth + 1
    while (!cursor.atEndSync()) {
      const nextLine = cursor.peekSync()
      if (!nextLine || nextLine.depth < followDepth) {
        break
      }

      if (nextLine.depth === followDepth && !nextLine.content.startsWith(LIST_ITEM_PREFIX)) {
        cursor.advanceSync()
        yield* decodeKeyValueSync(nextLine, cursor, followDepth, options)
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
  // Validate options
  if (options?.expandPaths !== undefined) {
    throw new Error('expandPaths is not supported in streaming decode')
  }

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

    // Check for root array
    if (isArrayHeaderContent(first.content)) {
      const headerInfo = withLine(first, () => parseArrayHeaderLine(first.content, DEFAULT_DELIMITER))
      if (headerInfo) {
        await cursor.advance()
        yield* decodeArrayFromHeaderAsync(headerInfo.header, headerInfo.inlineValues, cursor, 0, resolvedOptions, first)
        return
      }
    }

    // Check for single primitive
    await cursor.advance()
    const hasMore = !(await cursor.atEnd())
    if (!hasMore && !isKeyValueLineSync(first)) {
      yield { type: 'primitive', value: withLine(first, () => parsePrimitiveToken(first.content.trim())) }
      return
    }

    // Root object
    yield { type: 'startObject' }
    yield* decodeKeyValueAsync(first, cursor, 0, resolvedOptions)

    // Process remaining object fields
    while (!(await cursor.atEnd())) {
      const line = await cursor.peek()
      if (!line || line.depth !== 0) {
        break
      }
      await cursor.advance()
      yield* decodeKeyValueAsync(line, cursor, 0, resolvedOptions)
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
): AsyncGenerator<JsonStreamEvent> {
  const content = line.content

  // Check for array header first
  const arrayHeader = withLine(line, () => parseArrayHeaderLine(content, DEFAULT_DELIMITER))
  if (arrayHeader && arrayHeader.header.key !== undefined) {
    yield { type: 'key', key: arrayHeader.header.key }
    yield* decodeArrayFromHeaderAsync(arrayHeader.header, arrayHeader.inlineValues, cursor, baseDepth, options, line)
    return
  }

  // Regular key-value pair
  const { key, isQuoted } = withLine(line, () => parseKeyToken(content, 0))
  const colonIndex = content.indexOf(COLON, key.length)
  const rest = colonIndex >= 0 ? content.slice(colonIndex + 1).trim() : ''

  yield isQuoted ? { type: 'key', key, wasQuoted: true } : { type: 'key', key }

  // No value after colon - expect nested object or empty
  if (!rest) {
    const nextLine = await cursor.peek()
    if (nextLine && nextLine.depth > baseDepth) {
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

  // Inline primitive value
  yield { type: 'primitive', value: withLine(line, () => parsePrimitiveToken(rest)) }
}

async function* decodeObjectFieldsAsync(
  cursor: StreamingLineCursor,
  baseDepth: Depth,
  options: DecoderContext,
): AsyncGenerator<JsonStreamEvent> {
  let computedDepth: Depth | undefined

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
      yield* decodeKeyValueAsync(line, cursor, computedDepth, options)
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
      if (startLine === undefined) {
        startLine = line.lineNumber
      }
      endLine = line.lineNumber
      lastRowLine = line

      await cursor.advance()
      const values = withLine(line, () => parseDelimitedValues(line.content, header.delimiter))
      assertExpectedCount(values.length, header.fields!.length, 'tabular row values', options, line)

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

  if (!afterHyphen.trim()) {
    yield { type: 'startObject' }
    yield { type: 'endObject' }
    return
  }

  const itemLine: ParsedLine = { ...line, content: afterHyphen }

  // Check for array header after hyphen
  if (isArrayHeaderContent(afterHyphen)) {
    const arrayHeader = withLine(itemLine, () => parseArrayHeaderLine(afterHyphen, DEFAULT_DELIMITER))
    if (arrayHeader) {
      yield* decodeArrayFromHeaderAsync(arrayHeader.header, arrayHeader.inlineValues, cursor, baseDepth, options, itemLine)
      return
    }
  }

  // Check for tabular-first list-item object: `- key[N]{fields}:`
  const headerInfo = withLine(itemLine, () => parseArrayHeaderLine(afterHyphen, DEFAULT_DELIMITER))
  if (headerInfo && headerInfo.header.key !== undefined && headerInfo.header.fields !== undefined) {
    // Object with tabular array as first field
    const header = headerInfo.header
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
        yield* decodeKeyValueAsync(nextLine, cursor, followDepth, options)
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
    yield { type: 'startObject' }
    yield* decodeKeyValueAsync(itemLine, cursor, baseDepth + 1, options)

    // Read subsequent fields
    const followDepth = baseDepth + 1
    while (!(await cursor.atEnd())) {
      const nextLine = await cursor.peek()
      if (!nextLine || nextLine.depth < followDepth) {
        break
      }

      if (nextLine.depth === followDepth && !nextLine.content.startsWith(LIST_ITEM_PREFIX)) {
        await cursor.advance()
        yield* decodeKeyValueAsync(nextLine, cursor, followDepth, options)
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
  fields: string[],
  primitives: JsonPrimitive[],
): Generator<JsonStreamEvent> {
  yield { type: 'startObject' }
  for (let i = 0; i < fields.length; i++) {
    yield { type: 'key', key: fields[i]! }
    yield { type: 'primitive', value: primitives[i]! }
  }
  yield { type: 'endObject' }
}

// #endregion
