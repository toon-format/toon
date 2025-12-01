import type { EncodeReplacer, JsonArray, JsonObject, JsonValue } from '../types'
import { isJsonArray, isJsonObject, normalizeValue } from './normalize'

/**
 * Applies a replacer function to a `JsonValue` and all its descendants.
 *
 * The replacer is called for:
 * - The root value (with key='', path=[])
 * - Every object property (with the property name as key)
 * - Every array element (with the string index as key: '0', '1', etc.)
 *
 * @param root - The normalized `JsonValue` to transform
 * @param replacer - The replacer function to apply
 * @returns The transformed `JsonValue`
 */
export function applyReplacer(root: JsonValue, replacer: EncodeReplacer): JsonValue {
  // Call replacer on root with empty string key and empty path
  const replacedRoot = replacer('', root, [])

  // For root, undefined means "no change" (don't omit the root)
  if (replacedRoot === undefined) {
    return transformChildren(root, replacer, [])
  }

  // Normalize the replaced value (in case user returned non-JsonValue)
  const normalizedRoot = normalizeValue(replacedRoot)

  // Recursively transform children
  return transformChildren(normalizedRoot, replacer, [])
}

/**
 * Recursively transforms the children of a `JsonValue` using the replacer.
 *
 * @param value - The value whose children should be transformed
 * @param replacer - The replacer function to apply
 * @param path - Current path from root
 * @returns The value with transformed children
 */
function transformChildren(
  value: JsonValue,
  replacer: EncodeReplacer,
  path: readonly (string | number)[],
): JsonValue {
  if (isJsonObject(value)) {
    return transformObject(value, replacer, path)
  }

  if (isJsonArray(value)) {
    return transformArray(value, replacer, path)
  }

  // Primitives have no children
  return value
}

/**
 * Transforms an object by applying the replacer to each property.
 *
 * @param obj - The object to transform
 * @param replacer - The replacer function to apply
 * @param path - Current path from root
 * @returns A new object with transformed properties
 */
function transformObject(
  obj: JsonObject,
  replacer: EncodeReplacer,
  path: readonly (string | number)[],
): JsonObject {
  const result: Record<string, JsonValue> = {}

  for (const [key, value] of Object.entries(obj)) {
    // Call replacer with the property key and current path
    const childPath = [...path, key]
    const replacedValue = replacer(key, value, childPath)

    // undefined means omit this property
    if (replacedValue === undefined) {
      continue
    }

    // Normalize the replaced value
    const normalizedValue = normalizeValue(replacedValue)

    // Recursively transform children of the replaced value
    result[key] = transformChildren(normalizedValue, replacer, childPath)
  }

  return result
}

/**
 * Transforms an array by applying the replacer to each element.
 *
 * @param arr - The array to transform
 * @param replacer - The replacer function to apply
 * @param path - Current path from root
 * @returns A new array with transformed elements
 */
function transformArray(
  arr: JsonArray,
  replacer: EncodeReplacer,
  path: readonly (string | number)[],
): JsonArray {
  const result: JsonValue[] = []

  for (let i = 0; i < arr.length; i++) {
    const value = arr[i]!
    // Call replacer with string index (`'0'`, `'1'`, etc.) to match `JSON.stringify` behavior
    const childPath = [...path, i]
    const replacedValue = replacer(String(i), value, childPath)

    // undefined means omit this element
    if (replacedValue === undefined) {
      continue
    }

    // Normalize the replaced value
    const normalizedValue = normalizeValue(replacedValue)

    // Recursively transform children of the replaced value
    result.push(transformChildren(normalizedValue, replacer, childPath))
  }

  return result
}
