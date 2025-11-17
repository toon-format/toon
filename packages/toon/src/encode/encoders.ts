import type { Depth, JsonArray, JsonObject, JsonPrimitive, JsonValue, ResolvedEncodeOptions } from '../types'
import { DOT, LIST_ITEM_MARKER } from '../constants'
import { tryFoldKeyChain } from './folding'
import { isArrayOfArrays, isArrayOfObjects, isArrayOfPrimitives, isEmptyObject, isJsonArray, isJsonObject, isJsonPrimitive } from './normalize'
import { encodeAndJoinPrimitives, encodeKey, encodePrimitive, formatHeader } from './primitives'
import { LineWriter } from './writer'

// #region Encode normalized JsonValue

export function encodeValue(value: JsonValue, options: ResolvedEncodeOptions): string {
  if (isJsonPrimitive(value)) {
    return encodePrimitive(value, options.delimiter, options.quoteStrings)
  }

  const writer = new LineWriter(options.indent)

  if (isJsonArray(value)) {
    encodeArray(undefined, value, writer, 0, options)
  }
  else if (isJsonObject(value)) {
    encodeObject(value, writer, 0, options)
  }

  return writer.toString()
}

// #endregion

// #region Object encoding

export function encodeObject(value: JsonObject, writer: LineWriter, depth: Depth, options: ResolvedEncodeOptions, rootLiteralKeys?: Set<string>, pathPrefix?: string, remainingDepth?: number): void {
  const keys = Object.keys(value)

  // At root level (depth 0), collect all literal dotted keys for collision checking
  if (depth === 0 && !rootLiteralKeys) {
    rootLiteralKeys = new Set(keys.filter(k => k.includes('.')))
  }

  const effectiveFlattenDepth = remainingDepth ?? options.flattenDepth

  for (const [key, val] of Object.entries(value)) {
    encodeKeyValuePair(key, val, writer, depth, options, keys, rootLiteralKeys, pathPrefix, effectiveFlattenDepth)
  }
}

export function encodeKeyValuePair(key: string, value: JsonValue, writer: LineWriter, depth: Depth, options: ResolvedEncodeOptions, siblings?: readonly string[], rootLiteralKeys?: Set<string>, pathPrefix?: string, flattenDepth?: number): void {
  const currentPath = pathPrefix ? `${pathPrefix}${DOT}${key}` : key
  const effectiveFlattenDepth = flattenDepth ?? options.flattenDepth

  // Attempt key folding when enabled
  if (options.keyFolding === 'safe' && siblings) {
    const foldResult = tryFoldKeyChain(key, value, siblings, options, rootLiteralKeys, pathPrefix, effectiveFlattenDepth)

    if (foldResult) {
      const { foldedKey, remainder, leafValue, segmentCount } = foldResult
      const encodedFoldedKey = encodeKey(foldedKey)

      // Case 1: Fully folded to a leaf value
      if (remainder === undefined) {
        // The folded chain ended at a leaf (primitive, array, or empty object)
        if (isJsonPrimitive(leafValue)) {
          writer.push(depth, `${encodedFoldedKey}: ${encodePrimitive(leafValue, options.delimiter, options.quoteStrings)}`)
          return
        }
        else if (isJsonArray(leafValue)) {
          encodeArray(foldedKey, leafValue, writer, depth, options)
          return
        }
        else if (isJsonObject(leafValue) && isEmptyObject(leafValue)) {
          writer.push(depth, `${encodedFoldedKey}:`)
          return
        }
      }

      // Case 2: Partially folded with a tail object
      if (isJsonObject(remainder)) {
        writer.push(depth, `${encodedFoldedKey}:`)
        // Calculate remaining depth budget (subtract segments already folded)
        const remainingDepth = effectiveFlattenDepth - segmentCount
        const foldedPath = pathPrefix ? `${pathPrefix}${DOT}${foldedKey}` : foldedKey
        encodeObject(remainder, writer, depth + 1, options, rootLiteralKeys, foldedPath, remainingDepth)
        return
      }
    }
  }

  // No folding applied - use standard encoding
  const encodedKey = encodeKey(key)

  if (isJsonPrimitive(value)) {
    writer.push(depth, `${encodedKey}: ${encodePrimitive(value, options.delimiter, options.quoteStrings)}`)
  }
  else if (isJsonArray(value)) {
    encodeArray(key, value, writer, depth, options)
  }
  else if (isJsonObject(value)) {
    writer.push(depth, `${encodedKey}:`)
    if (!isEmptyObject(value)) {
      encodeObject(value, writer, depth + 1, options, rootLiteralKeys, currentPath, effectiveFlattenDepth)
    }
  }
}

// #endregion

// #region Array encoding

export function encodeArray(
  key: string | undefined,
  value: JsonArray,
  writer: LineWriter,
  depth: Depth,
  options: ResolvedEncodeOptions,
): void {
  if (value.length === 0) {
    const header = formatHeader(0, { key, delimiter: options.delimiter })
    writer.push(depth, header)
    return
  }

  // Primitive array
  if (isArrayOfPrimitives(value)) {
    const arrayLine = encodeInlineArrayLine(value, options.delimiter, key, options.quoteStrings)
    writer.push(depth, arrayLine)
    return
  }

  // Array of arrays (all primitives)
  if (isArrayOfArrays(value)) {
    const allPrimitiveArrays = value.every(arr => isArrayOfPrimitives(arr))
    if (allPrimitiveArrays) {
      encodeArrayOfArraysAsListItems(key, value, writer, depth, options)
      return
    }
  }

  // Array of objects
  if (isArrayOfObjects(value)) {
    const header = extractTabularHeader(value)
    if (header) {
      encodeArrayOfObjectsAsTabular(key, value, header, writer, depth, options)
    }
    else {
      encodeMixedArrayAsListItems(key, value, writer, depth, options)
    }
    return
  }

  // Mixed array: fallback to expanded format
  encodeMixedArrayAsListItems(key, value, writer, depth, options)
}

// #endregion

// #region Array of arrays (expanded format)

export function encodeArrayOfArraysAsListItems(
  prefix: string | undefined,
  values: readonly JsonArray[],
  writer: LineWriter,
  depth: Depth,
  options: ResolvedEncodeOptions,
): void {
  const header = formatHeader(values.length, { key: prefix, delimiter: options.delimiter })
  writer.push(depth, header)

  for (const arr of values) {
    if (isArrayOfPrimitives(arr)) {
      const arrayLine = encodeInlineArrayLine(arr, options.delimiter, undefined, options.quoteStrings)
      writer.pushListItem(depth + 1, arrayLine)
    }
  }
}

export function encodeInlineArrayLine(values: readonly JsonPrimitive[], delimiter: string, prefix?: string, quoteStrings?: boolean): string {
  const header = formatHeader(values.length, { key: prefix, delimiter })
  const joinedValue = encodeAndJoinPrimitives(values, delimiter, quoteStrings)
  // Only add space if there are values
  if (values.length === 0) {
    return header
  }
  return `${header} ${joinedValue}`
}

// #endregion

// #region Array of objects (tabular format)

export function encodeArrayOfObjectsAsTabular(
  prefix: string | undefined,
  rows: readonly JsonObject[],
  header: readonly string[],
  writer: LineWriter,
  depth: Depth,
  options: ResolvedEncodeOptions,
): void {
  const formattedHeader = formatHeader(rows.length, { key: prefix, fields: header, delimiter: options.delimiter })
  writer.push(depth, `${formattedHeader}`)

  writeTabularRows(rows, header, writer, depth + 1, options)
}

export function extractTabularHeader(rows: readonly JsonObject[]): string[] | undefined {
  if (rows.length === 0)
    return

  const firstRow = rows[0]!
  const firstKeys = Object.keys(firstRow)
  if (firstKeys.length === 0)
    return

  if (isTabularArray(rows, firstKeys)) {
    return firstKeys
  }
}

export function isTabularArray(
  rows: readonly JsonObject[],
  header: readonly string[],
): boolean {
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

function writeTabularRows(
  rows: readonly JsonObject[],
  header: readonly string[],
  writer: LineWriter,
  depth: Depth,
  options: ResolvedEncodeOptions,
): void {
  for (const row of rows) {
    const values = header.map(key => row[key])
    const joinedValue = encodeAndJoinPrimitives(values as JsonPrimitive[], options.delimiter, options.quoteStrings)
    writer.push(depth, joinedValue)
  }
}

// #endregion

// #region Array of objects (expanded format)

export function encodeMixedArrayAsListItems(
  prefix: string | undefined,
  items: readonly JsonValue[],
  writer: LineWriter,
  depth: Depth,
  options: ResolvedEncodeOptions,
): void {
  const header = formatHeader(items.length, { key: prefix, delimiter: options.delimiter })
  writer.push(depth, header)

  for (const item of items) {
    encodeListItemValue(item, writer, depth + 1, options)
  }
}

export function encodeObjectAsListItem(obj: JsonObject, writer: LineWriter, depth: Depth, options: ResolvedEncodeOptions): void {
  if (isEmptyObject(obj)) {
    writer.push(depth, LIST_ITEM_MARKER)
    return
  }

  const entries = Object.entries(obj)
  const [firstKey, firstValue] = entries[0]!
  const encodedKey = encodeKey(firstKey)

  if (isJsonPrimitive(firstValue)) {
    writer.pushListItem(depth, `${encodedKey}: ${encodePrimitive(firstValue, options.delimiter, options.quoteStrings)}`)
  }
  else if (isJsonArray(firstValue)) {
    if (isArrayOfPrimitives(firstValue)) {
      // Inline format for primitive arrays
      const arrayPropertyLine = encodeInlineArrayLine(firstValue, options.delimiter, firstKey, options.quoteStrings)
      writer.pushListItem(depth, arrayPropertyLine)
    }
    else if (isArrayOfObjects(firstValue)) {
      // Check if array of objects can use tabular format
      const header = extractTabularHeader(firstValue)
      if (header) {
        // Tabular format for uniform arrays of objects
        const formattedHeader = formatHeader(firstValue.length, { key: firstKey, fields: header, delimiter: options.delimiter })
        writer.pushListItem(depth, formattedHeader)
        writeTabularRows(firstValue, header, writer, depth + 1, options)
      }
      else {
        // Fall back to list format for non-uniform arrays of objects
        writer.pushListItem(depth, `${encodedKey}[${firstValue.length}]:`)
        for (const item of firstValue) {
          encodeObjectAsListItem(item, writer, depth + 1, options)
        }
      }
    }
    else {
      // Complex arrays on separate lines (array of arrays, etc.)
      writer.pushListItem(depth, `${encodedKey}[${firstValue.length}]:`)

      // Encode array contents at depth + 1
      for (const item of firstValue) {
        encodeListItemValue(item, writer, depth + 1, options)
      }
    }
  }
  else if (isJsonObject(firstValue)) {
    writer.pushListItem(depth, `${encodedKey}:`)
    if (!isEmptyObject(firstValue)) {
      encodeObject(firstValue, writer, depth + 2, options)
    }
  }

  // Remaining entries on indented lines
  for (let i = 1; i < entries.length; i++) {
    const [key, value] = entries[i]!
    encodeKeyValuePair(key, value, writer, depth + 1, options)
  }
}

// #endregion

// #region List item encoding helpers

function encodeListItemValue(
  value: JsonValue,
  writer: LineWriter,
  depth: Depth,
  options: ResolvedEncodeOptions,
): void {
  if (isJsonPrimitive(value)) {
    writer.pushListItem(depth, encodePrimitive(value, options.delimiter, options.quoteStrings))
  }
  else if (isJsonArray(value) && isArrayOfPrimitives(value)) {
    const arrayLine = encodeInlineArrayLine(value, options.delimiter)
    writer.pushListItem(depth, arrayLine)
  }
  else if (isJsonObject(value)) {
    encodeObjectAsListItem(value, writer, depth, options)
  }
}

// #endregion
