import type { Depth, FieldNode, JsonArray, JsonObject, JsonValue, ResolvedEncodeOptions } from '../types.ts'
import type { EncodablePrimitive } from './raw-string.ts'
import { LIST_ITEM_MARKER, LIST_ITEM_PREFIX } from '../constants.ts'
import { isArrayOfArrays, isArrayOfObjects, isArrayOfPrimitives, isEmptyObject, isEncodablePrimitive, isJsonArray, isJsonObject } from './normalize.ts'
import { encodeAndJoinPrimitives, encodeKey, encodePrimitive, formatHeader } from './primitives.ts'
import { collectRowLeaves, extractKeyedTabularFields, extractTabularFields } from './tabular.ts'

// #region Encode normalized JsonValue

export function* encodeJsonValue(value: JsonValue, options: ResolvedEncodeOptions, depth: Depth): Generator<string> {
  if (isEncodablePrimitive(value)) {
    const encodedPrimitive = encodePrimitive(value, options.delimiter)

    if (encodedPrimitive !== '')
      yield encodedPrimitive

    return
  }

  if (isJsonArray(value)) {
    yield* encodeArrayLines(undefined, value, depth, options)
  }
  else if (isJsonObject(value)) {
    // A keyed-eligible root object uses the keyless keyed header.
    const keyedFields = extractKeyedTabularFields(value)
    if (keyedFields) {
      yield* encodeKeyedObjectLines(undefined, value, keyedFields, depth, options)
      return
    }

    yield* encodeObjectLines(value, depth, options)
  }
}

// #endregion

// #region Object encoding

function* encodeObjectLines(
  value: JsonObject,
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  for (const [key, val] of Object.entries(value)) {
    yield* encodeKeyValuePairLines(key, val, depth, options)
  }
}

function* encodeKeyValuePairLines(
  key: string,
  value: JsonValue,
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  const encodedKey = encodeKey(key)

  if (isEncodablePrimitive(value)) {
    yield indentedLine(depth, `${encodedKey}: ${encodePrimitive(value, options.delimiter)}`, options.indentSize)
  }
  else if (isJsonArray(value)) {
    yield* encodeArrayLines(key, value, depth, options)
  }
  else if (isJsonObject(value)) {
    const keyedFields = extractKeyedTabularFields(value)
    if (keyedFields) {
      yield* encodeKeyedObjectLines(key, value, keyedFields, depth, options)
      return
    }

    yield indentedLine(depth, `${encodedKey}:`, options.indentSize)
    if (!isEmptyObject(value)) {
      yield* encodeObjectLines(value, depth + 1, options)
    }
  }
}

// #endregion

// #region Keyed tabular objects

function* encodeKeyedObjectLines(
  key: string | undefined,
  value: JsonObject,
  fields: readonly FieldNode[],
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  const entries = Object.entries(value)
  const header = formatHeader(entries.length, { key, fields, delimiter: options.delimiter, keyed: true })
  yield indentedLine(depth, header, options.indentSize)
  yield* encodeKeyedEntryRowsLines(entries, fields, depth + 1, options)
}

function* encodeKeyedEntryRowsLines(
  entries: readonly [string, JsonValue][],
  fields: readonly FieldNode[],
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  for (const [entryKey, entryValue] of entries) {
    const leaves = collectRowLeaves(entryValue as JsonObject, fields)
    yield indentedLine(depth, `${encodeKey(entryKey)}: ${encodeAndJoinPrimitives(leaves, options.delimiter)}`, options.indentSize)
  }
}

// #endregion

// #region Array encoding

function* encodeArrayLines(
  key: string | undefined,
  value: JsonArray,
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  if (value.length === 0) {
    const line = key != null ? `${encodeKey(key)}: []` : '[]'
    yield indentedLine(depth, line, options.indentSize)
    return
  }

  if (isArrayOfPrimitives(value)) {
    const arrayLine = encodeInlineArrayLine(value, options.delimiter, key)
    yield indentedLine(depth, arrayLine, options.indentSize)
    return
  }

  if (isArrayOfArrays(value)) {
    const allPrimitiveArrays = value.every(arr => isArrayOfPrimitives(arr))
    if (allPrimitiveArrays) {
      yield* encodeArrayOfArraysAsListItemsLines(key, value, depth, options)
      return
    }
  }

  if (isArrayOfObjects(value)) {
    const fields = extractTabularFields(value)
    if (fields) {
      yield* encodeArrayOfObjectsAsTabularLines(key, value, fields, depth, options)
    }
    else {
      yield* encodeMixedArrayAsListItemsLines(key, value, depth, options)
    }
    return
  }

  yield* encodeMixedArrayAsListItemsLines(key, value, depth, options)
}

// #endregion

// #region Array of arrays (list form)

function* encodeArrayOfArraysAsListItemsLines(
  prefix: string | undefined,
  values: readonly JsonArray[],
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  const header = formatHeader(values.length, { key: prefix, delimiter: options.delimiter })
  yield indentedLine(depth, header, options.indentSize)

  for (const arr of values) {
    if (isArrayOfPrimitives(arr)) {
      const arrayLine = encodeInlineArrayLine(arr, options.delimiter)
      yield indentedListItem(depth + 1, arrayLine, options.indentSize)
    }
  }
}

function encodeInlineArrayLine(values: readonly EncodablePrimitive[], delimiter: string, prefix?: string): string {
  const header = formatHeader(values.length, { key: prefix, delimiter })
  const joinedValue = encodeAndJoinPrimitives(values, delimiter)

  if (values.length === 0)
    return header

  return `${header} ${joinedValue}`
}

// #endregion

// #region Array of objects (tabular form)

function* encodeArrayOfObjectsAsTabularLines(
  prefix: string | undefined,
  rows: readonly JsonObject[],
  fields: readonly FieldNode[],
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  const header = formatHeader(rows.length, { key: prefix, fields, delimiter: options.delimiter })
  yield indentedLine(depth, header, options.indentSize)

  yield* writeTabularRowsLines(rows, fields, depth + 1, options)
}

function* writeTabularRowsLines(
  rows: readonly JsonObject[],
  fields: readonly FieldNode[],
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  for (const row of rows) {
    const leaves = collectRowLeaves(row, fields)
    yield indentedLine(depth, encodeAndJoinPrimitives(leaves, options.delimiter), options.indentSize)
  }
}

// #endregion

// #region Array of objects (list form)

function* encodeMixedArrayAsListItemsLines(
  prefix: string | undefined,
  items: readonly JsonValue[],
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  const header = formatHeader(items.length, { key: prefix, delimiter: options.delimiter })
  yield indentedLine(depth, header, options.indentSize)

  for (const item of items) {
    yield* encodeListItemValueLines(item, depth + 1, options)
  }
}

function* encodeObjectAsListItemLines(
  obj: JsonObject,
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  if (isEmptyObject(obj)) {
    yield indentedLine(depth, LIST_ITEM_MARKER, options.indentSize)
    return
  }

  const entries = Object.entries(obj)
  const [firstKey, firstValue] = entries[0]!
  const restEntries = entries.slice(1)

  if (isJsonArray(firstValue) && isArrayOfObjects(firstValue)) {
    const fields = extractTabularFields(firstValue)
    if (fields) {
      const header = formatHeader(firstValue.length, { key: firstKey, fields, delimiter: options.delimiter })
      yield indentedListItem(depth, header, options.indentSize)
      yield* writeTabularRowsLines(firstValue, fields, depth + 2, options)

      if (restEntries.length > 0) {
        const restObj: JsonObject = Object.fromEntries(restEntries)
        yield* encodeObjectLines(restObj, depth + 1, options)
      }
      return
    }
  }

  // Keyed first field: header on the hyphen line, entry rows at depth +2, siblings at +1.
  if (isJsonObject(firstValue)) {
    const keyedFields = extractKeyedTabularFields(firstValue)
    if (keyedFields) {
      const keyedEntries = Object.entries(firstValue)
      const header = formatHeader(keyedEntries.length, { key: firstKey, fields: keyedFields, delimiter: options.delimiter, keyed: true })
      yield indentedListItem(depth, header, options.indentSize)
      yield* encodeKeyedEntryRowsLines(keyedEntries, keyedFields, depth + 2, options)

      if (restEntries.length > 0) {
        const restObj: JsonObject = Object.fromEntries(restEntries)
        yield* encodeObjectLines(restObj, depth + 1, options)
      }
      return
    }
  }

  const encodedKey = encodeKey(firstKey)

  if (isEncodablePrimitive(firstValue)) {
    const encodedValue = encodePrimitive(firstValue, options.delimiter)
    yield indentedListItem(depth, `${encodedKey}: ${encodedValue}`, options.indentSize)
  }
  else if (isJsonArray(firstValue)) {
    if (firstValue.length === 0) {
      yield indentedListItem(depth, `${encodedKey}: []`, options.indentSize)
    }
    else if (isArrayOfPrimitives(firstValue)) {
      const arrayLine = encodeInlineArrayLine(firstValue, options.delimiter)
      yield indentedListItem(depth, `${encodedKey}${arrayLine}`, options.indentSize)
    }
    else {
      // Non-inline array items sit at depth + 2, below the hyphen line.
      const header = formatHeader(firstValue.length, { delimiter: options.delimiter })
      yield indentedListItem(depth, `${encodedKey}${header}`, options.indentSize)

      for (const item of firstValue) {
        yield* encodeListItemValueLines(item, depth + 2, options)
      }
    }
  }
  else if (isJsonObject(firstValue)) {
    yield indentedListItem(depth, `${encodedKey}:`, options.indentSize)
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
  if (isEncodablePrimitive(value)) {
    yield indentedListItem(depth, encodePrimitive(value, options.delimiter), options.indentSize)
  }
  else if (isJsonArray(value)) {
    if (isArrayOfPrimitives(value)) {
      const arrayLine = encodeInlineArrayLine(value, options.delimiter)
      yield indentedListItem(depth, arrayLine, options.indentSize)
    }
    else {
      const header = formatHeader(value.length, { delimiter: options.delimiter })
      yield indentedListItem(depth, header, options.indentSize)
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
