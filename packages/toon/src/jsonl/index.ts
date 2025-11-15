import type { DecodeOptions, EncodeOptions, JsonValue, ResolvedDecodeOptions, ResolvedEncodeOptions } from '../types'
import { DEFAULT_DELIMITER, JSONL_SEPARATOR } from '../constants'
import { decodeValueFromLines } from '../decode/decoders'
import { expandPathsSafe } from '../decode/expand'
import { LineCursor, toParsedLines } from '../decode/scanner'
import { encodeValue } from '../encode/encoders'
import { normalizeValue } from '../encode/normalize'

/**
 * Encodes an array of values into JSONL format using TOON encoding with --- separators.
 *
 * @param input - Array of values to encode as JSONL using TOON format
 * @param options - Optional TOON encoding options
 * @returns JSONL formatted string with TOON-encoded values separated by ---
 * ```
 */
export function encodeJsonl(input: unknown, options?: EncodeOptions): string {
  if (!Array.isArray(input)) {
    throw new TypeError('JSONL encoding requires an array as input')
  }

  if (input.length === 0) {
    return ''
  }

  const resolvedOptions = resolveEncodeOptions(options)

  return input
    .map((value) => {
      const normalizedValue = normalizeValue(value)
      return encodeValue(normalizedValue, resolvedOptions)
    })
    .join(`\n${JSONL_SEPARATOR}\n`)
}

/**
 * Decodes a JSONL formatted string with TOON-encoded values and --- separators into an array.
 *
 * @param input - JSONL formatted string with TOON-encoded values and --- separators
 * @param options - Optional TOON decoding options
 * @returns Array of parsed TOON values
 */
export function decodeJsonl(input: string, options?: DecodeOptions): JsonValue[] {
  const trimmed = input.trim()

  if (trimmed === '') {
    return []
  }

  const parts = trimmed.split(`\n${JSONL_SEPARATOR}\n`)
  const result: JsonValue[] = []
  const resolvedOptions = resolveDecodeOptions(options)

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]?.trim()

    if (!part) {
      continue
    }

    try {
      const scanResult = toParsedLines(part, resolvedOptions.indent, resolvedOptions.strict)

      if (scanResult.lines.length === 0) {
        result.push({})
        continue
      }

      const cursor = new LineCursor(scanResult.lines, scanResult.blankLines)
      const decodedValue = decodeValueFromLines(cursor, resolvedOptions)

      // Apply path expansion if enabled
      const finalValue = resolvedOptions.expandPaths === 'safe'
        ? expandPathsSafe(decodedValue, resolvedOptions.strict)
        : decodedValue

      result.push(finalValue)
    }
    catch (error) {
      throw new Error(`Failed to parse TOON on section ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return result
}

function resolveEncodeOptions(options?: EncodeOptions): ResolvedEncodeOptions {
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
