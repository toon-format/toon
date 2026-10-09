import type { EncodeReplacer, JsonArray, JsonObject, JsonValue } from '../types.ts'
import { setOwnProperty } from '../shared/object-utils.ts'
import { isEncodablePrimitive, isJsonArray, isJsonObject, normalizeValue } from './normalize.ts'
import { isRawString } from './raw-string.ts'

/**
 * Applies a replacer function to a `JsonValue` and all its descendants.
 *
 * The replacer is called for the root (key='', path=[]), every object property
 * (key = property name), and every array element (key = string index).
 */
export function applyReplacer(root: JsonValue, replacer: EncodeReplacer): JsonValue {
  const replacedRoot = replacer('', root, [])

  // At the root, `undefined` means "no change", never omission.
  if (replacedRoot === undefined) {
    return transformChildren(root, replacer, [])
  }

  return transformReplaced(root, replacedRoot, replacer, [])
}

/**
 * Resolves a replacer's (non-`undefined`) return value at a single position.
 *
 * A `RawString` only stands in for a primitive: returned for an object or
 * array value, it is ignored and the original container is traversed normally.
 */
function transformReplaced(
  original: JsonValue,
  replaced: unknown,
  replacer: EncodeReplacer,
  path: readonly (string | number)[],
): JsonValue {
  if (isRawString(replaced) && !isEncodablePrimitive(original)) {
    return transformChildren(original, replacer, path)
  }

  // Normalize in case the replacer returned a non-`JsonValue`.
  return transformChildren(normalizeValue(replaced), replacer, path)
}

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

  return value
}

function transformObject(
  obj: JsonObject,
  replacer: EncodeReplacer,
  path: readonly (string | number)[],
): JsonObject {
  const result: Record<string, JsonValue> = {}

  for (const [key, value] of Object.entries(obj)) {
    const childPath = [...path, key]
    const replacedValue = replacer(key, value, childPath)

    if (replacedValue === undefined) {
      continue
    }

    setOwnProperty(result, key, transformReplaced(value, replacedValue, replacer, childPath))
  }

  return result
}

function transformArray(
  arr: JsonArray,
  replacer: EncodeReplacer,
  path: readonly (string | number)[],
): JsonArray {
  const result: JsonValue[] = []

  for (let i = 0; i < arr.length; i++) {
    const value = arr[i]!
    // String index (`'0'`, `'1'`, etc.) matches `JSON.stringify` behavior.
    const childPath = [...path, i]
    const replacedValue = replacer(String(i), value, childPath)

    if (replacedValue === undefined) {
      continue
    }

    result.push(transformReplaced(value, replacedValue, replacer, childPath))
  }

  return result
}
