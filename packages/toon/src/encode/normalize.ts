import type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from '../types'

// #region Normalization (unknown → JsonValue)

export function normalizeValue(value: unknown): JsonValue {
  // null
  if (value === null) {
    return null
  }

  // Primitives
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  // Numbers: canonicalize -0 to 0, handle NaN and Infinity
  if (typeof value === 'number') {
    if (Object.is(value, -0)) {
      return 0
    }
    if (!Number.isFinite(value)) {
      return null
    }
    return value
  }

  // BigInt → number (if safe) or string
  if (typeof value === 'bigint') {
    // Try to convert to number if within safe integer range
    if (value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER) {
      return Number(value)
    }
    // Otherwise convert to string (will be quoted in output)
    return value.toString()
  }

  // Date → ISO string
  if (value instanceof Date) {
    return value.toISOString()
  }

  // Array
  if (Array.isArray(value)) {
    return value.map(normalizeValue)
  }

  // Set → array
  if (value instanceof Set) {
    return Array.from(value).map(normalizeValue)
  }

  // Map → object
  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value, ([k, v]) => [String(k), normalizeValue(v)]),
    )
  }

  // Plain object
  if (isPlainObject(value)) {
    const normalized: Record<string, JsonValue> = {}

    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        normalized[key] = normalizeValue(value[key])
      }
    }

    return normalized
  }

  // Fallback: function, symbol, undefined, or other → null
  return null
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

export function isJsonArray(value: unknown): value is JsonArray {
  return Array.isArray(value)
}

export function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
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

export function isArrayOfPrimitives(value: JsonArray): value is readonly JsonPrimitive[] {
  return value.length === 0 || value.every(item => isJsonPrimitive(item))
}

export function isArrayOfArrays(value: JsonArray): value is readonly JsonArray[] {
  return value.length === 0 || value.every(item => isJsonArray(item))
}

export function isArrayOfObjects(value: JsonArray): value is readonly JsonObject[] {
  return value.length === 0 || value.every(item => isJsonObject(item))
}

// #endregion
