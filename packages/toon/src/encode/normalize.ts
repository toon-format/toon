import type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from '../types.ts'
import type { EncodablePrimitive } from './raw-string.ts'
import { setOwnProperty } from '../shared/object-utils.ts'
import { isRawString } from './raw-string.ts'

const SURROGATE_PATTERN = /[\uD800-\uDFFF]/

// #region Normalization (unknown → JsonValue)

export function normalizeValue(value: unknown): JsonValue {
  if (value === null) {
    return null
  }

  // `RawString` markers pass through untouched, treated as primitives and never as objects.
  if (isRawString(value)) {
    return value as unknown as JsonValue
  }

  // A host `toJSON` hook takes precedence over the default host-type mappings below.
  if (
    typeof value === 'object'
    && value !== null
    && 'toJSON' in value
    && typeof value.toJSON === 'function'
  ) {
    const next = value.toJSON()
    // Avoid infinite recursion when `toJSON` returns the same object.
    if (next !== value) {
      return normalizeValue(next)
    }
  }

  if (typeof value === 'string') {
    assertNoLoneSurrogate(value, 'string value')
    return value
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    if (Object.is(value, -0)) {
      return 0
    }
    if (!Number.isFinite(value)) {
      return null
    }
    return value
  }

  if (typeof value === 'bigint') {
    if (value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER) {
      return Number(value)
    }
    return value.toString()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue)
  }

  if (value instanceof Set) {
    return Array.from(value).map(normalizeValue)
  }

  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value, ([k, v]) => [String(k), normalizeValue(v)]),
    )
  }

  if (isPlainObject(value)) {
    const encodedValues: Record<string, JsonValue> = {}

    for (const key in value) {
      if (Object.hasOwn(value, key)) {
        assertNoLoneSurrogate(key, 'object key')
        setOwnProperty(encodedValues, key, normalizeValue(value[key]))
      }
    }

    return encodedValues
  }

  return null
}

// A lone surrogate has no UTF-8 form, so emitting it would silently substitute U+FFFD and break round-tripping.
function assertNoLoneSurrogate(value: string, context: string): void {
  if (!SURROGATE_PATTERN.test(value)) {
    return
  }

  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code < 0xD800 || code > 0xDFFF) {
      continue
    }

    const isHighSurrogate = code <= 0xDBFF
    const next = value.charCodeAt(index + 1)
    if (isHighSurrogate && next >= 0xDC00 && next <= 0xDFFF) {
      index++
      continue
    }

    throw new TypeError(
      `Cannot encode ${context} containing an unpaired surrogate U+${code.toString(16).toUpperCase()} at index ${index}`,
    )
  }
}

// #endregion

// #region Type guards

export function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return (
    value === null
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
  )
}

export function isEncodablePrimitive(value: unknown): value is EncodablePrimitive {
  return isJsonPrimitive(value) || isRawString(value)
}

export function isJsonArray(value: unknown): value is JsonArray {
  return Array.isArray(value)
}

export function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !isRawString(value)
}

export function isEmptyObject(value: JsonObject): boolean {
  return Object.keys(value).length === 0
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === null || prototype === Object.prototype
}

// #endregion

// #region Array type detection

export function isArrayOfPrimitives(value: JsonArray | readonly EncodablePrimitive[]): value is readonly EncodablePrimitive[] {
  return value.length === 0 || value.every(item => isEncodablePrimitive(item))
}

export function isArrayOfArrays(value: JsonArray): value is readonly JsonArray[] {
  return value.length === 0 || value.every(item => isJsonArray(item))
}

export function isArrayOfObjects(value: JsonArray): value is readonly JsonObject[] {
  return value.length === 0 || value.every(item => isJsonObject(item))
}

// #endregion
