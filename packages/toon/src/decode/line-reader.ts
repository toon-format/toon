import type { JsonStreamEvent, ParsedLine } from '../types.ts'
import type { StreamingScanState } from './scanner.ts'
import { createScanState, parseLineIncremental } from './scanner.ts'

// #region Fetch-line effect

// Rules yield this instead of touching a source directly, so one rule tree serves
// both sync and async sources.
export const FETCH_LINE: unique symbol = Symbol('fetch-line')

export type LineRule = Generator<JsonStreamEvent | typeof FETCH_LINE, void, string | undefined>

export type LineEffect<TReturn> = Generator<typeof FETCH_LINE, TReturn, string | undefined>

// #endregion

// #region Line reader

export interface LineReader {
  buffer: ParsedLine[]
  done: boolean
  lastLine: ParsedLine | undefined
  scanState: StreamingScanState
  indentSize: number
  strict: boolean
}

export function createLineReader(context: { indentSize: number, strict: boolean }): LineReader {
  return {
    buffer: [],
    done: false,
    lastLine: undefined,
    scanState: createScanState(),
    indentSize: context.indentSize,
    strict: context.strict,
  }
}

// At most one line of lookahead, so scanner throws and blank accounting keep
// their original ordering.
function* fillBuffer(reader: LineReader): LineEffect<void> {
  while (reader.buffer.length === 0 && !reader.done) {
    const raw = yield FETCH_LINE
    if (raw === undefined) {
      reader.done = true
      return
    }

    const parsedLine = parseLineIncremental(raw, reader.scanState, reader.indentSize, reader.strict)
    if (parsedLine !== undefined) {
      reader.buffer.push(parsedLine)
    }
  }
}

export function* peekLine(reader: LineReader): LineEffect<ParsedLine | undefined> {
  yield* fillBuffer(reader)
  return reader.buffer[0]
}

export function* readLine(reader: LineReader): LineEffect<ParsedLine | undefined> {
  yield* fillBuffer(reader)
  const line = reader.buffer[0]
  if (line !== undefined) {
    reader.buffer.shift()
    reader.lastLine = line
  }

  return line
}

// #endregion

// #region Drivers

export function* driveSync(rawSource: Iterable<string>, rule: LineRule): Generator<JsonStreamEvent> {
  const iterator = rawSource[Symbol.iterator]()
  let step = rule.next()

  while (!step.done) {
    if (step.value === FETCH_LINE) {
      const result = iterator.next()
      step = rule.next(result.done ? undefined : result.value)
    }
    else {
      yield step.value
      step = rule.next()
    }
  }
}

// Accepts a sync source too, and pulls exactly one raw line per request so a
// chunk-by-chunk reader still delivers incrementally.
export async function* driveAsync(
  rawSource: AsyncIterable<string> | Iterable<string>,
  rule: LineRule,
): AsyncGenerator<JsonStreamEvent> {
  const iterator: Iterator<string> | AsyncIterator<string> = Symbol.asyncIterator in rawSource
    ? rawSource[Symbol.asyncIterator]()
    : rawSource[Symbol.iterator]()
  let step = rule.next()

  while (!step.done) {
    if (step.value === FETCH_LINE) {
      const result = await iterator.next()
      step = rule.next(result.done ? undefined : result.value)
    }
    else {
      yield step.value
      step = rule.next()
    }
  }
}

// #endregion
