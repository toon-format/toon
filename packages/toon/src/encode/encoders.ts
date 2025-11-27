import type { Depth, JsonArray, JsonObject, JsonPrimitive, JsonValue, ResolvedEncodeOptions } from '../types'
import { DOT, LIST_ITEM_MARKER, LIST_ITEM_PREFIX } from '../constants'
import { tryFoldKeyChain } from './folding'
import { isArrayOfArrays, isArrayOfObjects, isArrayOfPrimitives, isEmptyObject, isJsonArray, isJsonObject, isJsonPrimitive } from './normalize'
import { encodeAndJoinPrimitives, encodeKey, encodePrimitive, formatHeader } from './primitives'

// #region Encode normalized JsonValue

export function* encodeJsonValue(value: JsonValue, options: ResolvedEncodeOptions, depth: Depth): Generator<string> {
  if (isJsonPrimitive(value)) {
    // Primitives at root level are returned as a single line
    const encodedPrimitive = encodePrimitive(value, options.delimiter)

    if (encodedPrimitive !== '')
      yield encodedPrimitive

    return
  }

  if (isJsonArray(value)) {
    yield* encodeArrayLines(undefined, value, depth, options)
  }
  else if (isJsonObject(value)) {
    yield* encodeObjectLines(value, depth, options)
  }
}

// #endregion

// #region Object encoding

export function* encodeObjectLines(
  value: JsonObject,
  depth: Depth,
  options: ResolvedEncodeOptions,
  rootLiteralKeys?: Set<string>,
  pathPrefix?: string,
  remainingDepth?: number,
): Generator<string> {
  const keys = Object.keys(value)

  // At root level (depth 0), collect all literal dotted keys for collision checking
  if (depth === 0 && !rootLiteralKeys) {
    rootLiteralKeys = new Set(keys.filter(k => k.includes('.')))
  }

  const effectiveFlattenDepth = remainingDepth ?? options.flattenDepth

  for (const [key, val] of Object.entries(value)) {
    yield* encodeKeyValuePairLines(key, val, depth, options, keys, rootLiteralKeys, pathPrefix, effectiveFlattenDepth)
  }
}

export function* encodeKeyValuePairLines(
  key: string,
  value: JsonValue,
  depth: Depth,
  options: ResolvedEncodeOptions,
  siblings?: readonly string[],
  rootLiteralKeys?: Set<string>,
  pathPrefix?: string,
  flattenDepth?: number,
): Generator<string> {
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
          yield indentedLine(depth, `${encodedFoldedKey}: ${encodePrimitive(leafValue, options.delimiter)}`, options.indent)
          return
        }
        else if (isJsonArray(leafValue)) {
          yield* encodeArrayLines(foldedKey, leafValue, depth, options)
          return
        }
        else if (isJsonObject(leafValue) && isEmptyObject(leafValue)) {
          yield indentedLine(depth, `${encodedFoldedKey}:`, options.indent)
          return
        }
      }

      // Case 2: Partially folded with a tail object
      if (isJsonObject(remainder)) {
        yield indentedLine(depth, `${encodedFoldedKey}:`, options.indent)
        // Calculate remaining depth budget (subtract segments already folded)
        const remainingDepth = effectiveFlattenDepth - segmentCount
        const foldedPath = pathPrefix ? `${pathPrefix}${DOT}${foldedKey}` : foldedKey
        yield* encodeObjectLines(remainder, depth + 1, options, rootLiteralKeys, foldedPath, remainingDepth)
        return
      }
    }
  }

  const encodedKey = encodeKey(key)

  if (isJsonPrimitive(value)) {
    yield indentedLine(depth, `${encodedKey}: ${encodePrimitive(value, options.delimiter)}`, options.indent)
  }
  else if (isJsonArray(value)) {
    yield* encodeArrayLines(key, value, depth, options)
  }
  else if (isJsonObject(value)) {
    yield indentedLine(depth, `${encodedKey}:`, options.indent)
    if (!isEmptyObject(value)) {
      yield* encodeObjectLines(value, depth + 1, options, rootLiteralKeys, currentPath, effectiveFlattenDepth)
    }
  }
}

// #endregion

// #region Array encoding

export function* encodeArrayLines(
  key: string | undefined,
  value: JsonArray,
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  if (value.length === 0) {
    const header = formatHeader(0, { key, delimiter: options.delimiter })
    yield indentedLine(depth, header, options.indent)
    return
  }

  // Primitive array
  if (isArrayOfPrimitives(value)) {
    const arrayLine = encodeInlineArrayLine(value, options.delimiter, key)
    yield indentedLine(depth, arrayLine, options.indent)
    return
  }

  // Array of arrays (all primitives)
  if (isArrayOfArrays(value)) {
    const allPrimitiveArrays = value.every(arr => isArrayOfPrimitives(arr))
    if (allPrimitiveArrays) {
      yield* encodeArrayOfArraysAsListItemsLines(key, value, depth, options)
      return
    }
  }

  // Array of objects
  if (isArrayOfObjects(value)) {
    const header = extractTabularHeader(value)
    if (header) {
      yield* encodeArrayOfObjectsAsTabularLines(key, value, header, depth, options)
    }
    else {
      yield* encodeMixedArrayAsListItemsLines(key, value, depth, options)
    }
    return
  }

  // Mixed array: fallback to expanded format
  yield* encodeMixedArrayAsListItemsLines(key, value, depth, options)
}

// #endregion

// #region Array of arrays (expanded format)

export function* encodeArrayOfArraysAsListItemsLines(
  prefix: string | undefined,
  values: readonly JsonArray[],
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  const header = formatHeader(values.length, { key: prefix, delimiter: options.delimiter })
  yield indentedLine(depth, header, options.indent)

  for (const arr of values) {
    if (isArrayOfPrimitives(arr)) {
      const arrayLine = encodeInlineArrayLine(arr, options.delimiter)
      yield indentedListItem(depth + 1, arrayLine, options.indent)
    }
  }
}

export function encodeInlineArrayLine(values: readonly JsonPrimitive[], delimiter: string, prefix?: string, quoteStrings?: boolean): string {
  const header = formatHeader(values.length, { key: prefix, delimiter })
  const joinedValue = encodeAndJoinPrimitives(values, delimiter)

  if (values.length === 0)
    return header

  return `${header} ${joinedValue}`
}

// #endregion

// #region Array of objects (tabular format)

export function* encodeArrayOfObjectsAsTabularLines(
  prefix: string | undefined,
  rows: readonly JsonObject[],
  header: readonly string[],
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  const formattedHeader = formatHeader(rows.length, { key: prefix, fields: header, delimiter: options.delimiter })
  yield indentedLine(depth, formattedHeader, options.indent)

  yield* writeTabularRowsLines(rows, header, depth + 1, options)
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

function* writeTabularRowsLines(
  rows: readonly JsonObject[],
  header: readonly string[],
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  for (const row of rows) {
    const values = header.map(key => row[key])
    const joinedValue = encodeAndJoinPrimitives(values as JsonPrimitive[], options.delimiter)
    yield indentedLine(depth, joinedValue, options.indent)
  }
}

// #endregion

// #region Array of objects (expanded format)

export function* encodeMixedArrayAsListItemsLines(
  prefix: string | undefined,
  items: readonly JsonValue[],
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  const header = formatHeader(items.length, { key: prefix, delimiter: options.delimiter })
  yield indentedLine(depth, header, options.indent)

  for (const item of items) {
    yield* encodeListItemValueLines(item, depth + 1, options)
  }
}

export function* encodeObjectAsListItemLines(
  obj: JsonObject,
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  if (isEmptyObject(obj)) {
    yield indentedLine(depth, LIST_ITEM_MARKER, options.indent)
    return
  }

  const entries = Object.entries(obj)
  const [firstKey, firstValue] = entries[0]!
  const restEntries = entries.slice(1)

  // Check if first field is a tabular array
  if (isJsonArray(firstValue) && isArrayOfObjects(firstValue)) {
    const header = extractTabularHeader(firstValue)
    if (header) {
      // Tabular array as first field
      const formattedHeader = formatHeader(firstValue.length, { key: firstKey, fields: header, delimiter: options.delimiter })
      yield indentedListItem(depth, formattedHeader, options.indent)
      yield* writeTabularRowsLines(firstValue, header, depth + 2, options)

      if (restEntries.length > 0) {
        const restObj: JsonObject = Object.fromEntries(restEntries)
        yield* encodeObjectLines(restObj, depth + 1, options)
      }
      return
    }
  }

  const encodedKey = encodeKey(firstKey)

  if (isJsonPrimitive(firstValue)) {
    // Primitive value: `- key: value`
    const encodedValue = encodePrimitive(firstValue, options.delimiter)
    yield indentedListItem(depth, `${encodedKey}: ${encodedValue}`, options.indent)
  }
  else if (isJsonArray(firstValue)) {
    if (firstValue.length === 0) {
      // Empty array: `- key[0]:`
      const header = formatHeader(0, { delimiter: options.delimiter })
      yield indentedListItem(depth, `${encodedKey}${header}`, options.indent)
    }
    else if (isArrayOfPrimitives(firstValue)) {
      // Inline primitive array: `- key[N]: values`
      const arrayLine = encodeInlineArrayLine(firstValue, options.delimiter)
      yield indentedListItem(depth, `${encodedKey}${arrayLine}`, options.indent)
    }
    else {
      // Non-inline array: `- key[N]:` with items at depth + 2
      const header = formatHeader(firstValue.length, { delimiter: options.delimiter })
      yield indentedListItem(depth, `${encodedKey}${header}`, options.indent)

      for (const item of firstValue) {
        yield* encodeListItemValueLines(item, depth + 2, options)
      }
    }
  }
  else if (isJsonObject(firstValue)) {
    // Object value: `- key:` with fields at depth + 2
    yield indentedListItem(depth, `${encodedKey}:`, options.indent)
    if (!isEmptyObject(firstValue)) {
      yield* encodeObjectLines(firstValue, depth + 2, options)
    }
  }

  if (restEntries.length > 0) {
    const restObj: JsonObject = Object.fromEntries(restEntries)
    yield* encodeObjectLines(restObj, depth + 1, options)
  }
}

// #endregion

// #region List item encoding helpers

function* encodeListItemValueLines(
  value: JsonValue,
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  if (isJsonPrimitive(value)) {
    yield indentedListItem(depth, encodePrimitive(value, options.delimiter), options.indent)
  }
  else if (isJsonArray(value)) {
    if (isArrayOfPrimitives(value)) {
      const arrayLine = encodeInlineArrayLine(value, options.delimiter)
      yield indentedListItem(depth, arrayLine, options.indent)
    }
    else {
      const header = formatHeader(value.length, { delimiter: options.delimiter })
      yield indentedListItem(depth, header, options.indent)
      for (const item of value) {
        yield* encodeListItemValueLines(item, depth + 1, options)
      }
    }
  }
  else if (isJsonObject(value)) {
    yield* encodeObjectAsListItemLines(value, depth, options)
  }
}

// #endregion

// #region Indentation helpers

function indentedLine(depth: Depth, content: string, indentSize: number): string {
  const indentation = ' '.repeat(indentSize * depth)
  return indentation + content
}

function indentedListItem(depth: Depth, content: string, indentSize: number): string {
  return indentedLine(depth, LIST_ITEM_PREFIX + content, indentSize)
}

// #endregion
