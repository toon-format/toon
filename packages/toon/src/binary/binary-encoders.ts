/**
 * High-level Binary Encoders for TOON Format
 * Encodes JavaScript values to binary TOON format
 */

import type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from '../types'
import type { ResolvedBinaryEncodeOptions } from './binary-types'
import { isArrayOfArrays, isArrayOfObjects, isArrayOfPrimitives, isJsonArray, isJsonObject, isJsonPrimitive, normalizeValue } from '../encode/normalize'
import { BINARY_TYPE_ARRAY, BINARY_TYPE_OBJECT } from './binary-types'
import { BinaryWriter } from './binary-writer'

// Re-export for convenience
export type { BinaryEncodeOptions, ResolvedBinaryEncodeOptions } from './binary-types'

/**
 * Resolve binary encoding options with defaults
 */
export function resolveBinaryEncodeOptions(options?: import('./binary-types').BinaryEncodeOptions): ResolvedBinaryEncodeOptions {
  return {
    delimiter: options?.delimiter ?? ',',
    keyFolding: options?.keyFolding ?? 'off',
    flattenDepth: options?.flattenDepth ?? Number.POSITIVE_INFINITY,
  }
}

/**
 * Encode a JavaScript value to binary TOON format
 */
export function encodeBinaryValue(value: JsonValue, options: ResolvedBinaryEncodeOptions): Uint8Array {
  const writer = new BinaryWriter()

  if (isJsonPrimitive(value)) {
    encodePrimitive(value, writer)
  }
  else if (isJsonArray(value)) {
    encodeArray(undefined, value, writer, options)
  }
  else if (isJsonObject(value)) {
    encodeObject(value, writer, options)
  }

  return writer.toUint8Array()
}

/**
 * Binary primitive encoding
 */
function encodePrimitive(value: JsonPrimitive, writer: BinaryWriter): void {
  writer.writePrimitive(value)
}

/**
 * Binary object encoding
 */
function encodeObject(value: JsonObject, writer: BinaryWriter, options: ResolvedBinaryEncodeOptions): void {
  writer.writeStart(BINARY_TYPE_OBJECT)

  for (const [key, val] of Object.entries(value)) {
    // Type prefix + key + value
    writer.writePrimitive(key) // keys are strings
    encodeValue(val, writer, options)
  }

  writer.writeEnd()
}

/**
 * Binary array encoding
 */
function encodeArray(key: string | undefined, value: JsonArray, writer: BinaryWriter, options: ResolvedBinaryEncodeOptions): void {
  if (value.length === 0) {
    // Empty array: just header with length 0
    writer.writeArrayHeader(0, options.delimiter)
    return
  }

  const isPrimitiveArray = isArrayOfPrimitives(value)
  const isObjectArray = isArrayOfObjects(value)
  const isNestedArray = isArrayOfArrays(value) && value.every(arr => isArrayOfPrimitives(arr))

  if (isPrimitiveArray) {
    // Inline primitive array
    writer.writeArrayHeader(value.length, options.delimiter)
    for (const item of value) {
      encodePrimitive(item, writer)
    }
  }
  else if (isObjectArray) {
    // Check if tabular (uniform objects)
    const fields = extractBinaryTabularFields(value)
    if (fields) {
      // Tabular format
      writer.writeArrayHeader(value.length, options.delimiter, fields)
      encodeTabularRows(value, fields, writer, options)
    }
    else {
      // Non-tabular object array
      writer.writeArrayHeader(value.length, options.delimiter)
      writer.writeStart(BINARY_TYPE_ARRAY)
      for (const item of value) {
        encodeValue(item, writer, options)
      }
      writer.writeEnd()
    }
  }
  else if (isNestedArray) {
    // Array of primitive arrays
    writer.writeArrayHeader(value.length, options.delimiter)
    writer.writeStart(BINARY_TYPE_ARRAY)
    for (const item of value) {
      encodeArray(undefined, item, writer, options)
    }
    writer.writeEnd()
  }
  else {
    // Mixed array
    writer.writeArrayHeader(value.length, options.delimiter)
    writer.writeStart(BINARY_TYPE_ARRAY)
    for (const item of value) {
      encodeValue(item, writer, options)
    }
    writer.writeEnd()
  }
}

/**
 * Generic value encoder
 */
function encodeValue(value: JsonValue, writer: BinaryWriter, options: ResolvedBinaryEncodeOptions): void {
  if (isJsonPrimitive(value)) {
    encodePrimitive(value, writer)
  }
  else if (isJsonArray(value)) {
    encodeArray(undefined, value, writer, options)
  }
  else if (isJsonObject(value)) {
    encodeObject(value, writer, options)
  }
}

/**
 * Extract field names for tabular arrays in binary format
 */
function extractBinaryTabularFields(rows: readonly JsonObject[]): string[] | undefined {
  if (rows.length === 0)
    return

  const firstRow = rows[0]!
  const firstKeys = Object.keys(firstRow)
  if (firstKeys.length === 0)
    return

  // Check if all rows have identical keys and primitive values
  if (isBinaryTabularArray(rows, firstKeys)) {
    return firstKeys
  }
}

/**
 * Check if array is suitable for tabular binary encoding
 */
function isBinaryTabularArray(rows: readonly JsonObject[], header: readonly string[]): boolean {
  for (const row of rows) {
    const keys = Object.keys(row)

    // All objects must have the same keys (but order can differ)
    if (keys.length !== header.length) {
      return false
    }

    // Check that all header keys exist in the row and all values are primitives
    for (const key of header) {
      if (!(key in row)) {
        return false
      }
      if (!isJsonPrimitive(row[key])) {
        return false
      }
    }
  }

  return true
}

/**
 * Encode tabular rows in binary format
 */
function encodeTabularRows(rows: readonly JsonObject[], header: readonly string[], writer: BinaryWriter, options: ResolvedBinaryEncodeOptions): void {
  for (const row of rows) {
    writer.writeStart(BINARY_TYPE_ARRAY)
    for (const field of header) {
      const value = row[field]
      if (isJsonPrimitive(value)) {
        encodePrimitive(value, writer)
      }
    }
    writer.writeEnd()
  }
}

/**
 * Main binary encoding function
 */
export function encodeBinary(input: unknown, options?: import('./binary-types').BinaryEncodeOptions): Uint8Array {
  // Normalize input (reuse existing normalization)
  const normalized = normalizeValue(input)
  const resolvedOptions = resolveBinaryEncodeOptions(options)
  return encodeBinaryValue(normalized, resolvedOptions)
}
