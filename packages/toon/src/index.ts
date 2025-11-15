import type { DecodeOptions, EncodeOptions, JsonValue, ResolvedDecodeOptions, ResolvedEncodeOptions } from './types'
import { DEFAULT_DELIMITER } from './constants'
import { decodeValueFromLines } from './decode/decoders'
import { expandPathsSafe } from './decode/expand'
import { LineCursor, toParsedLines } from './decode/scanner'
import { encodeValue } from './encode/encoders'
import { normalizeValue } from './encode/normalize'

export { DEFAULT_DELIMITER, DELIMITERS } from './constants'
export type {
  DecodeOptions,
  Delimiter,
  DelimiterKey,
  EncodeOptions,
  JsonArray,
  JsonObject,
  JsonPrimitive,
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
  const normalizedValue = normalizeValue(input)
  const resolvedOptions = resolveOptions(options)
  return encodeValue(normalizedValue, resolvedOptions)
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
  const resolvedOptions = resolveDecodeOptions(options)
  const scanResult = toParsedLines(input, resolvedOptions.indent, resolvedOptions.strict)

  if (scanResult.lines.length === 0) {
    return {}
  }

  const cursor = new LineCursor(scanResult.lines, scanResult.blankLines)
  const decodedValue = decodeValueFromLines(cursor, resolvedOptions)

  // Apply path expansion if enabled
  if (resolvedOptions.expandPaths === 'safe') {
    return expandPathsSafe(decodedValue, resolvedOptions.strict)
  }

  return decodedValue
}

function resolveOptions(options?: EncodeOptions): ResolvedEncodeOptions {
  return {
    indent: options?.indent ?? 2,
    delimiter: options?.delimiter ?? DEFAULT_DELIMITER,
    keyFolding: options?.keyFolding ?? 'off',
    flattenDepth: options?.flattenDepth ?? Number.POSITIVE_INFINITY,
  }
}

function resolveDecodeOptions(options?: DecodeOptions): ResolvedDecodeOptions {
  return {
    indent: options?.indent ?? 2,
    strict: options?.strict ?? true,
    expandPaths: options?.expandPaths ?? 'off',
  }
}
