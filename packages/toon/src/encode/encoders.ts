import type { Depth, FieldNode, JsonArray, JsonObject, JsonPrimitive, JsonValue, ResolvedEncodeOptions } from '../types.ts'
import { LIST_ITEM_MARKER, LIST_ITEM_PREFIX } from '../constants.ts'
import { isArrayOfArrays, isArrayOfObjects, isArrayOfPrimitives, isEmptyObject, isJsonArray, isJsonObject, isJsonPrimitive } from './normalize.ts'
import { encodeAndJoinPrimitives, encodeKey, encodePrimitive, formatHeader } from './primitives.ts'

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
): Generator<string> {
  for (const [key, val] of Object.entries(value)) {
    yield* encodeKeyValuePairLines(key, val, depth, options)
  }
}

export function* encodeKeyValuePairLines(
  key: string,
  value: JsonValue,
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
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
      yield* encodeObjectLines(value, depth + 1, options)
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
    const line = key != null ? `${encodeKey(key)}: []` : '[]'
    yield indentedLine(depth, line, options.indent)
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

export function encodeInlineArrayLine(values: readonly JsonPrimitive[], delimiter: string, prefix?: string): string {
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
  header: readonly FieldNode[],
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  const formattedHeader = formatHeader(rows.length, { key: prefix, fields: header, delimiter: options.delimiter })
  yield indentedLine(depth, formattedHeader, options.indent)

  yield* writeTabularRowsLines(rows, header, depth + 1, options)
}

export function extractTabularHeader(rows: readonly JsonObject[]): FieldNode[] | undefined {
  if (rows.length === 0)
    return

  const firstKeys = Object.keys(rows[0]!)
  if (firstKeys.length === 0)
    return

  // All objects must have the same set of keys (order per object may vary)
  for (const row of rows) {
    if (Object.keys(row).length !== firstKeys.length) {
      return
    }
    for (const key of firstKeys) {
      if (!Object.hasOwn(row, key)) {
        return
      }
    }
  }

  const fieldNodes: FieldNode[] = []
  for (const key of firstKeys) {
    const fieldNode = classifyColumn(key, rows.map(row => row[key]!))
    if (!fieldNode) {
      return
    }
    fieldNodes.push(fieldNode)
  }

  return fieldNodes
}

function classifyColumn(name: string, values: readonly JsonValue[]): FieldNode | undefined {
  // Uniform-primitive column: a bare leaf field
  if (values.every(value => isJsonPrimitive(value))) {
    return { name }
  }

  // Nested-uniform column: every value a non-empty object sharing one key
  // set whose sub-columns classify recursively
  if (!values.every(value => isJsonObject(value) && !isEmptyObject(value))) {
    return
  }

  const children = extractTabularHeader(values as JsonObject[])
  if (!children) {
    return
  }

  return { name, children }
}

function collectLeafValues(row: JsonObject, fields: readonly FieldNode[], leaves: JsonPrimitive[]): void {
  for (const field of fields) {
    const value = row[field.name]
    if (field.children) {
      collectLeafValues(value as JsonObject, field.children, leaves)
    }
    else {
      leaves.push(value as JsonPrimitive)
    }
  }
}

function* writeTabularRowsLines(
  rows: readonly JsonObject[],
  header: readonly FieldNode[],
  depth: Depth,
  options: ResolvedEncodeOptions,
): Generator<string> {
  for (const row of rows) {
    const leaves: JsonPrimitive[] = []
    collectLeafValues(row, header, leaves)
    yield indentedLine(depth, encodeAndJoinPrimitives(leaves, options.delimiter), options.indent)
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
      // Empty array: `- key: []`
      yield indentedListItem(depth, `${encodedKey}: []`, options.indent)
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
