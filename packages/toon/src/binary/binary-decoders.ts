/**
 * High-level Binary Decoders for TOON Format
 * Decodes binary TOON format to JavaScript values
 */

import type { JsonArray, JsonObject, JsonValue } from '../types'
import type { BinaryDecodeOptions, ResolvedBinaryDecodeOptions } from './binary-types'
import { BinaryReader } from './binary-reader'
import { BINARY_TYPE_ARRAY, BINARY_TYPE_ARRAY_HEADER, BINARY_TYPE_OBJECT } from './binary-types'

export type { BinaryDecodeOptions, ResolvedBinaryDecodeOptions } from './binary-types'

/**
 * Resolve binary decoding options with defaults
 */
export function resolveBinaryDecodeOptions(options?: BinaryDecodeOptions): ResolvedBinaryDecodeOptions {
  return {
    strict: options?.strict ?? true,
    expandPaths: options?.expandPaths ?? 'off',
  }
}

/**
 * Decode binary TOON format to JavaScript value
 */
export function decodeBinaryValue(buffer: Uint8Array, options: ResolvedBinaryDecodeOptions): JsonValue {
  const reader = new BinaryReader(buffer, options)
  return decodeValue(reader)
}

/**
 * Generic value decoder
 */
function decodeValue(reader: BinaryReader): JsonValue {
  // Peek at the first byte to determine type without consuming it
  const typeByte = reader.readByte()

  switch (typeByte) {
    case BINARY_TYPE_OBJECT:
      return decodeObject(reader)
    case BINARY_TYPE_ARRAY:
      return decodeArray(reader)
    case BINARY_TYPE_ARRAY_HEADER:
      return decodeArrayWithHeader(reader)
    default:
      // It's a primitive value type byte, rewind and read as primitive
      ;(reader as any).state.position -= 1 // rewind
      return reader.readPrimitive()
  }
}

/**
 * Decode array with header (for arrays and tabular data)
 */
function decodeArrayWithHeader(reader: BinaryReader): JsonArray {
  const header = reader.readArrayHeader()
  const result: JsonValue[] = []

  // If we have tabular fields, this is a tabular array format
  if (header.fields && header.fields.length > 0) {
    // Read each row as an array of values
    for (let i = 0; i < header.length; i++) {
      reader.readStart() // Each row starts with array marker
      const row: JsonValue[] = []
      for (let j = 0; j < header.fields.length; j++) {
        row.push(decodeValue(reader))
      }
      reader.readEnd() // End of row
      result.push(row)
    }
    return result
  }

  // If no tabular fields, read values as a regular array
  reader.readStart() // Start of array
  while (!reader.peekEnd()) {
    const value = decodeValue(reader)
    result.push(value)
  }
  reader.readEnd() // End of array

  return result
}

/**
 * Decode binary object
 */
function decodeObject(reader: BinaryReader): JsonObject {
  const result: JsonObject = {}

  while (!reader.peekEnd()) {
    const key = reader.readPrimitive()
    if (typeof key !== 'string') {
      throw new TypeError('Object key must be a string')
    }

    const value = decodeValue(reader)
    result[key] = value
  }

  // Consume the end marker
  reader.readEnd()

  return result
}

/**
 * Decode binary array
 */
function decodeArray(reader: BinaryReader): JsonArray {
  const result: JsonValue[] = []

  while (!reader.peekEnd()) {
    const value = decodeValue(reader)
    result.push(value)
  }

  // Consume the end marker
  reader.readEnd()

  return result
}

/**
 * Main binary decoding function
 */
export function decodeBinary(buffer: Uint8Array, options?: BinaryDecodeOptions): JsonValue {
  if (buffer.length === 0) {
    return {}
  }

  const resolvedOptions = resolveBinaryDecodeOptions(options)
  return decodeBinaryValue(buffer, resolvedOptions)
}

/**
 * Advanced decoding with header support (for arrays)
 */
export function decodeBinaryWithHeaders(buffer: Uint8Array, options?: BinaryDecodeOptions): { value: JsonValue, headers?: import('./binary-types').BinaryArrayHeader[] } {
  // For now, just return the value
  // In a more advanced implementation, we could track headers found during parsing
  const value = decodeBinary(buffer, options)
  return { value }
}
