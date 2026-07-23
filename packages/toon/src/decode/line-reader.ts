import type { JsonStreamEvent, ParsedLine } from '../types.ts'
import type { StreamingScanState } from './scanner.ts'
import { createScanState, parseLineIncremental } from './scanner.ts'

// #region Fetch-line effect

// The single effect a decode rule performs beyond emitting events: a request
// for the next raw line. Rules yield this instead of touching a source
// directly, so one rule tree serves both sync and async sources – the driver
// answers each request from whichever iterator it holds.
export const FETCH_LINE: unique symbol = Symbol('fetch-line')

// A decode rule emits data-model events and yields lazy line-fetch requests,
// receiving each fetched raw line (or `undefined` at end of input) back.
export type LineRule = Generator<JsonStreamEvent | typeof FETCH_LINE, void, string | undefined>

// A pure line effect only fetches lines; it emits no data-model events
export type LineEffect<TReturn> = Generator<typeof FETCH_LINE, TReturn, string | undefined>

// #endregion

// #region Line reader

export interface LineReader {
  buffer: ParsedLine[]
  done: boolean
  lastLine: ParsedLine | undefined
  scanState: StreamingScanState
  indent: number
  strict: boolean
}

export function createLineReader(context: { indent: number, strict: boolean }): LineReader {
  return {
    buffer: [],
    done: false,
    lastLine: undefined,
    scanState: createScanState(),
    indent: context.indent,
    strict: context.strict,
  }
}

// Pull raw lines one at a time until the buffer holds a single parsed line or
// the source is exhausted. Comments and blank lines parse to `undefined` and
// are skipped here, with blanks still recorded into the scan state – exactly
// as the line-parsing generators did. Fetching stays strictly lazy: at most
// one line of lookahead, so scanner throws and blank accounting keep their
// original ordering.
function* fillBuffer(reader: LineReader): LineEffect<void> {
  while (reader.buffer.length === 0 && !reader.done) {
    const raw = yield FETCH_LINE
    if (raw === undefined) {
      reader.done = true
      return
    }

    const parsedLine = parseLineIncremental(raw, reader.scanState, reader.indent, reader.strict)
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

// Pump a rule against a synchronous source: answer each fetch request with one
// raw line, forward every event to the caller.
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

// Pump a rule against either an async or a sync source, preserving the "accepts
// a sync iterable" behaviour. Each fetch request pulls exactly one raw line, so
// bounded, incremental delivery from a chunk-by-chunk reader is preserved.
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
