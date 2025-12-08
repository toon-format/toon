import type { DecodeOptions, DecodeStreamOptions, EncodeOptions, JsonStreamEvent, JsonValue, ResolvedDecodeOptions, ResolvedEncodeOptions } from './types'
import { DEFAULT_DELIMITER } from './constants'
import { decodeStream as decodeStreamCore, decodeStreamSync as decodeStreamSyncCore } from './decode/decoders'
import { buildValueFromEvents } from './decode/event-builder'
import { expandPathsSafe } from './decode/expand'
import { encodeJsonValue } from './encode/encoders'
import { normalizeValue } from './encode/normalize'
import { applyReplacer } from './encode/replacer'

export { DEFAULT_DELIMITER, DELIMITERS } from './constants'
export type {
  DecodeOptions,
  DecodeStreamOptions,
  Delimiter,
  DelimiterKey,
  EncodeOptions,
  EncodeReplacer,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonStreamEvent,
  JsonValue,
  ResolvedDecodeOptions,
  ResolvedEncodeOptions,
} from './types'

/**
 * Encodes a JavaScript value into TOON format string.
 *
 * @param input - Any JavaScript value (objects, arrays, primitives)
 * @param options - Optional encoding configuration
 * @returns TOON formatted string
 *
 * @example
 * ```ts
 * encode({ name: 'Alice', age: 30 })
 * // name: Alice
 * // age: 30
 *
 * encode({ users: [{ id: 1 }, { id: 2 }] })
 * // users[]:
 * //   - id: 1
 * //   - id: 2
 *
 * encode(data, { indent: 4, keyFolding: 'safe' })
 * ```
 */
export function encode(input: unknown, options?: EncodeOptions): string {
  return Array.from(encodeLines(input, options)).join('\n')
}

/**
 * Decodes a TOON format string into a JavaScript value.
 *
 * @param input - TOON formatted string
 * @param options - Optional decoding configuration
 * @returns Parsed JavaScript value (object, array, or primitive)
 *
 * @example
 * ```ts
 * decode('name: Alice\nage: 30')
 * // { name: 'Alice', age: 30 }
 *
 * decode('users[]:\n  - id: 1\n  - id: 2')
 * // { users: [{ id: 1 }, { id: 2 }] }
 *
 * decode(toonString, { strict: false, expandPaths: 'safe' })
 * ```
 */
export function decode(input: string, options?: DecodeOptions): JsonValue {
  const lines = input.split('\n')
  return decodeFromLines(lines, options)
}

/**
 * Encodes a JavaScript value into TOON format as a sequence of lines.
 *
 * This function yields TOON lines one at a time without building the full string,
 * making it suitable for streaming large outputs to files, HTTP responses, or process stdout.
 *
 * @param input - Any JavaScript value (objects, arrays, primitives)
 * @param options - Optional encoding configuration
 * @returns Iterable of TOON lines (without trailing newlines)
 *
 * @example
 * ```ts
 * // Stream to stdout
 * for (const line of encodeLines({ name: 'Alice', age: 30 })) {
 *   console.log(line)
 * }
 *
 * // Collect to array
 * const lines = Array.from(encodeLines(data))
 *
 * // Equivalent to encode()
 * const toonString = Array.from(encodeLines(data, options)).join('\n')
 * ```
 */
export function encodeLines(input: unknown, options?: EncodeOptions): Iterable<string> {
  const normalizedValue = normalizeValue(input)
  const resolvedOptions = resolveOptions(options)

  // Apply replacer if provided
  const maybeReplacedValue = resolvedOptions.replacer
    ? applyReplacer(normalizedValue, resolvedOptions.replacer)
    : normalizedValue

  return encodeJsonValue(maybeReplacedValue, resolvedOptions, 0)
}

/**
 * Decodes TOON format from pre-split lines into a JavaScript value.
 *
 * This is a convenience wrapper around the streaming decoder that builds
 * the full value in memory. Useful when you already have lines as an array
 * or iterable and want the standard decode behavior with path expansion support.
 *
 * @param lines - Iterable of TOON lines (without newlines)
 * @param options - Optional decoding configuration (supports expandPaths)
 * @returns Parsed JavaScript value (object, array, or primitive)
 *
 * @example
 * ```ts
 * const lines = ['name: Alice', 'age: 30']
 * decodeFromLines(lines)
 * // { name: 'Alice', age: 30 }
 * ```
 */
export function decodeFromLines(lines: Iterable<string>, options?: DecodeOptions): JsonValue {
  const resolvedOptions = resolveDecodeOptions(options)

  // Use streaming decoder without expandPaths
  const streamOptions: DecodeStreamOptions = {
    indent: resolvedOptions.indent,
    strict: resolvedOptions.strict,
  }

  const events = decodeStreamSyncCore(lines, streamOptions)
  const decodedValue = buildValueFromEvents(events)

  // Apply path expansion if enabled
  if (resolvedOptions.expandPaths === 'safe') {
    return expandPathsSafe(decodedValue, resolvedOptions.strict)
  }

  return decodedValue
}

/**
 * Synchronously decodes TOON lines into a stream of JSON events.
 *
 * This function yields structured events (startObject, endObject, startArray, endArray,
 * key, primitive) that represent the JSON data model without building the full value tree.
 * Useful for streaming processing, custom transformations, or memory-efficient parsing.
 *
 * @remarks
 * Path expansion (`expandPaths: 'safe'`) is not supported in streaming mode.
 *
 * @param lines - Iterable of TOON lines (without newlines)
 * @param options - Optional decoding configuration (expandPaths not supported)
 * @returns Iterable of JSON stream events
 *
 * @example
 * ```ts
 * const lines = ['name: Alice', 'age: 30']
 * for (const event of decodeStreamSync(lines)) {
 *   console.log(event)
 *   // { type: 'startObject' }
 *   // { type: 'key', key: 'name' }
 *   // { type: 'primitive', value: 'Alice' }
 *   // ...
 * }
 * ```
 */
export function decodeStreamSync(lines: Iterable<string>, options?: DecodeStreamOptions): Iterable<JsonStreamEvent> {
  return decodeStreamSyncCore(lines, options)
}

/**
 * Asynchronously decodes TOON lines into a stream of JSON events.
 *
 * This function yields structured events (startObject, endObject, startArray, endArray,
 * key, primitive) that represent the JSON data model without building the full value tree.
 * Supports both sync and async iterables for maximum flexibility with file streams,
 * network responses, or other async sources.
 *
 * @remarks
 * Path expansion (`expandPaths: 'safe'`) is not supported in streaming mode.
 *
 * @param source - Async or sync iterable of TOON lines (without newlines)
 * @param options - Optional decoding configuration (expandPaths not supported)
 * @returns Async iterable of JSON stream events
 *
 * @example
 * ```ts
 * const fileStream = createReadStream('data.toon', 'utf-8')
 * const lines = splitLines(fileStream) // Async iterable of lines
 *
 * for await (const event of decodeStream(lines)) {
 *   console.log(event)
 *   // { type: 'startObject' }
 *   // { type: 'key', key: 'name' }
 *   // { type: 'primitive', value: 'Alice' }
 *   // ...
 * }
 * ```
 */
export function decodeStream(
  source: AsyncIterable<string> | Iterable<string>,
  options?: DecodeStreamOptions,
): AsyncIterable<JsonStreamEvent> {
  return decodeStreamCore(source, options)
}

function resolveOptions(options?: EncodeOptions): ResolvedEncodeOptions {
  return {
    indent: options?.indent ?? 2,
    delimiter: options?.delimiter ?? DEFAULT_DELIMITER,
    keyFolding: options?.keyFolding ?? 'off',
    flattenDepth: options?.flattenDepth ?? Number.POSITIVE_INFINITY,
    quoteStrings: options?.quoteStrings ?? false,
    replacer: options?.replacer,
  }
}

function resolveDecodeOptions(options?: DecodeOptions): ResolvedDecodeOptions {
  return {
    indent: options?.indent ?? 2,
    strict: options?.strict ?? true,
    expandPaths: options?.expandPaths ?? 'off',
  }
}
