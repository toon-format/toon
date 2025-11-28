import type { JsonArray, JsonObject, JsonPrimitive, JsonValue, Replacer, ReplacerFunction } from '../types'

// #region Replacer helpers

/**
 * Symbol used to mark a value as "should be omitted" during normalization.
 * This is needed because undefined can be a valid return from replacer meaning "omit".
 */
const OMIT_VALUE: unique symbol = Symbol('OMIT_VALUE')
type OmitValue = typeof OMIT_VALUE

/**
 * Converts a replacer (function or array) into a normalized replacer function.
 */
function createReplacerFunction(replacer: Replacer): ReplacerFunction {
  if (typeof replacer === 'function') {
    return replacer
  }

  // Array replacer: create an allowlist set for O(1) lookups
  const allowedKeys = new Set(replacer.map(String))
  return (key: string, value: unknown) => {
    // Always include root value (empty key) and array indices
    if (key === '' || !Number.isNaN(Number(key))) {
      return value
    }
    return allowedKeys.has(key) ? value : undefined
  }
}

// #endregion

// #region Normalization (unknown → JsonValue)

/**
 * Normalizes an unknown value to a JsonValue, optionally applying a replacer function.
 *
 * @param value - The value to normalize
 * @param replacer - Optional replacer function or array (like JSON.stringify)
 * @returns The normalized JsonValue
 */
export function normalizeValue(value: unknown, replacer?: Replacer): JsonValue {
  const replacerFn = replacer ? createReplacerFunction(replacer) : undefined
  const result = normalizeWithReplacer('', value, replacerFn)
  // Root value should never be OMIT_VALUE in normal usage, but handle it gracefully
  if (result === OMIT_VALUE) {
    return null
  }
  return result
}

/**
 * Internal recursive normalization with replacer support.
 * Returns OMIT_VALUE symbol if the value should be omitted from output.
 */
function normalizeWithReplacer(
  key: string,
  value: unknown,
  replacerFn: ReplacerFunction | undefined,
): JsonValue | OmitValue {
  // Apply replacer first (like JSON.stringify behavior)
  let processedValue = value
  if (replacerFn) {
    processedValue = replacerFn(key, value)
    // undefined means "omit this value"
    if (processedValue === undefined) {
      return OMIT_VALUE
    }
  }

  // null
  if (processedValue === null) {
    return null
  }

  // Primitives
  if (typeof processedValue === 'string' || typeof processedValue === 'boolean') {
    return processedValue
  }

  // Numbers: canonicalize -0 to 0, handle NaN and Infinity
  if (typeof processedValue === 'number') {
    if (Object.is(processedValue, -0)) {
      return 0
    }
    if (!Number.isFinite(processedValue)) {
      return null
    }
    return processedValue
  }

  // BigInt → number (if safe) or string
  if (typeof processedValue === 'bigint') {
    // Try to convert to number if within safe integer range
    if (processedValue >= Number.MIN_SAFE_INTEGER && processedValue <= Number.MAX_SAFE_INTEGER) {
      return Number(processedValue)
    }
    // Otherwise convert to string (will be quoted in output)
    return processedValue.toString()
  }

  // Date → ISO string
  if (processedValue instanceof Date) {
    return processedValue.toISOString()
  }

  // Array
  if (Array.isArray(processedValue)) {
    const result: JsonValue[] = []
    for (let i = 0; i < processedValue.length; i++) {
      const normalized = normalizeWithReplacer(String(i), processedValue[i], replacerFn)
      // Arrays always include the value (even if replacer returns undefined, we use null)
      // This matches JSON.stringify behavior for arrays
      if (normalized === OMIT_VALUE) {
        result.push(null)
      }
      else {
        result.push(normalized)
      }
    }
    return result
  }

  // Set → array
  if (processedValue instanceof Set) {
    const arr = Array.from(processedValue)
    const result: JsonValue[] = []
    for (let i = 0; i < arr.length; i++) {
      const normalized = normalizeWithReplacer(String(i), arr[i], replacerFn)
      if (normalized === OMIT_VALUE) {
        result.push(null)
      }
      else {
        result.push(normalized)
      }
    }
    return result
  }

  // Map → object
  if (processedValue instanceof Map) {
    const normalized: Record<string, JsonValue> = {}
    for (const [k, v] of processedValue) {
      const stringKey = String(k)
      const normalizedValue = normalizeWithReplacer(stringKey, v, replacerFn)
      if (normalizedValue !== OMIT_VALUE) {
        normalized[stringKey] = normalizedValue
      }
    }
    return normalized
  }

  // Plain object
  if (isPlainObject(processedValue)) {
    const normalized: Record<string, JsonValue> = {}

    for (const objKey in processedValue) {
      if (Object.prototype.hasOwnProperty.call(processedValue, objKey)) {
        const normalizedValue = normalizeWithReplacer(objKey, processedValue[objKey], replacerFn)
        if (normalizedValue !== OMIT_VALUE) {
          normalized[objKey] = normalizedValue
        }
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
