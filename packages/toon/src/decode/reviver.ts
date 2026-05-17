import type { DecodeReviver, JsonArray, JsonObject, JsonValue } from '../types.ts'

/**
 * Applies a reviver function to a `JsonValue` and all its descendants.
 *
 * The reviver is called bottom-up (leaves first, then parents), matching
 * `JSON.parse` reviver semantics:
 * - Every object property (with the property name as key)
 * - Every array element (with the string index as key: '0', '1', etc.)
 * - The root value (with key='', path=[]) last
 *
 * @param root - The decoded `JsonValue` to transform
 * @param reviver - The reviver function to apply
 * @returns The transformed `JsonValue`
 */
export function applyReviver(root: JsonValue, reviver: DecodeReviver): JsonValue {
  // First, recursively transform children (bottom-up)
  const transformed = transformChildren(root, reviver, [])

  // Then call reviver on root with empty string key and empty path
  const revivedRoot = reviver('', transformed, [])

  // For root, undefined means "no change" (don't omit the root)
  if (revivedRoot === undefined) {
    return transformed
  }

  return normalizeRevivedValue(revivedRoot)
}

/**
 * Recursively transforms the children of a `JsonValue` using the reviver.
 * Children are transformed before their parents (bottom-up).
 *
 * @param value - The value whose children should be transformed
 * @param reviver - The reviver function to apply
 * @param path - Current path from root
 * @returns The value with transformed children
 */
function transformChildren(
  value: JsonValue,
  reviver: DecodeReviver,
  path: readonly (string | number)[],
): JsonValue {
  if (isJsonObject(value)) {
    return transformObject(value, reviver, path)
  }

  if (isJsonArray(value)) {
    return transformArray(value, reviver, path)
  }

  // Primitives have no children
  return value
}

/**
 * Transforms an object by applying the reviver to each property (bottom-up).
 *
 * @param obj - The object to transform
 * @param reviver - The reviver function to apply
 * @param path - Current path from root
 * @returns A new object with transformed properties
 */
function transformObject(
  obj: JsonObject,
  reviver: DecodeReviver,
  path: readonly (string | number)[],
): JsonObject {
  const result: Record<string, JsonValue> = {}

  for (const [key, value] of Object.entries(obj)) {
    const childPath = [...path, key]

    // First, recursively transform children of this value (bottom-up)
    const transformedValue = transformChildren(value, reviver, childPath)

    // Then call reviver on this property
    const revivedValue = reviver(key, transformedValue, childPath)

    // undefined means omit this property
    if (revivedValue === undefined) {
      continue
    }

    result[key] = normalizeRevivedValue(revivedValue)
  }

  return result
}

/**
 * Transforms an array by applying the reviver to each element (bottom-up).
 *
 * @param arr - The array to transform
 * @param reviver - The reviver function to apply
 * @param path - Current path from root
 * @returns A new array with transformed elements
 */
function transformArray(
  arr: JsonArray,
  reviver: DecodeReviver,
  path: readonly (string | number)[],
): JsonArray {
  const result: JsonValue[] = []

  for (let i = 0; i < arr.length; i++) {
    const value = arr[i]!
    const childPath = [...path, i]

    // First, recursively transform children of this value (bottom-up)
    const transformedValue = transformChildren(value, reviver, childPath)

    // Then call reviver with string index to match JSON.parse behavior
    const revivedValue = reviver(String(i), transformedValue, childPath)

    // undefined means omit this element
    if (revivedValue === undefined) {
      continue
    }

    result.push(normalizeRevivedValue(revivedValue))
  }

  return result
}

/**
 * Normalizes a revived value back to a `JsonValue`.
 * Handles common non-JSON returns (Date, undefined, etc.).
 */
function normalizeRevivedValue(value: unknown): JsonValue {
  if (value === null)
    return null
  if (typeof value === 'string')
    return value
  if (typeof value === 'number')
    return value
  if (typeof value === 'boolean')
    return value

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map(v => normalizeRevivedValue(v))
  }

  if (typeof value === 'object') {
    const result: Record<string, JsonValue> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = normalizeRevivedValue(v)
    }
    return result
  }

  // Fallback: convert to string
  return String(value)
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isJsonArray(value: JsonValue): value is JsonArray {
  return Array.isArray(value)
}
