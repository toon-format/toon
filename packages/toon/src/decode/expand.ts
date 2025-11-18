import type { JsonObject, JsonValue } from '../types'
import { DOT } from '../constants'
import { isJsonObject } from '../encode/normalize'
import { isIdentifierSegment } from '../shared/validation'

// #region Path expansion (safe)

/**
 * Symbol used to mark object keys that were originally quoted in the TOON source.
 * Quoted dotted keys should not be expanded, even if they meet expansion criteria.
 */
export const QUOTED_KEY_MARKER: unique symbol = Symbol('quotedKey')

/**
 * Type for objects that may have quoted key metadata attached.
 */
export interface ObjectWithQuotedKeys extends JsonObject {
  [QUOTED_KEY_MARKER]?: Set<string>
}

/**
 * Expands dotted keys into nested objects in safe mode.
 *
 * @remarks
 * This function recursively traverses a decoded TOON value and expands any keys
 * containing dots (`.`) into nested object structures, provided all segments
 * are valid identifiers.
 *
 * Expansion rules:
 * - Keys containing dots are split into segments
 * - All segments must pass `isIdentifierSegment` validation
 * - Non-eligible keys (with special characters) are left as literal dotted keys
 * - Deep merge: When multiple dotted keys expand to the same path, their values are merged if both are objects
 * - Conflict handling:
 *   - `strict=true`: Throws TypeError on conflicts (non-object collision)
 *   - `strict=false`: LWW (silent overwrite)
 *
 * @param value - The decoded value to expand
 * @param strict - Whether to throw errors on conflicts
 * @returns The expanded value with dotted keys reconstructed as nested objects
 * @throws TypeError if conflicts occur in strict mode
 */
export function expandPathsSafe(value: JsonValue, strict: boolean): JsonValue {
  if (Array.isArray(value)) {
    // Recursively expand array elements
    return value.map(item => expandPathsSafe(item, strict))
  }

  if (isJsonObject(value)) {
    const expandedObject: JsonObject = {}

    // Check if this object has quoted key metadata
    const quotedKeys = (value as ObjectWithQuotedKeys)[QUOTED_KEY_MARKER]

    for (const [key, keyValue] of Object.entries(value)) {
      // Skip expansion for keys that were originally quoted
      const isQuoted = quotedKeys?.has(key)

      // Check if key contains dots and should be expanded
      if (key.includes(DOT) && !isQuoted) {
        const segments = key.split(DOT)

        // Validate all segments are identifiers
        if (segments.every(seg => isIdentifierSegment(seg))) {
          // Expand this dotted key
          const expandedValue = expandPathsSafe(keyValue, strict)
          insertPathSafe(expandedObject, segments, expandedValue, strict)
          continue
        }
      }

      // Not expandable - keep as literal key, but still recursively expand the value
      const expandedValue = expandPathsSafe(keyValue, strict)

      // Check for conflicts with already-expanded keys
      if (key in expandedObject) {
        const conflictingValue = expandedObject[key]!
        // If both are objects, try to merge them
        if (canMerge(conflictingValue, expandedValue)) {
          mergeObjects(conflictingValue as JsonObject, expandedValue as JsonObject, strict)
        }
        else {
          // Conflict: incompatible types
          if (strict) {
            throw new TypeError(
              `Path expansion conflict at key "${key}": cannot merge ${typeof conflictingValue} with ${typeof expandedValue}`,
            )
          }
          // Non-strict: overwrite (LWW)
          expandedObject[key] = expandedValue
        }
      }
      else {
        // No conflict - insert directly
        expandedObject[key] = expandedValue
      }
    }

    return expandedObject
  }

  // Primitive value - return as-is
  return value
}

/**
 * Inserts a value at a nested path, creating intermediate objects as needed.
 *
 * @remarks
 * This function walks the segment path, creating nested objects as needed.
 * When an existing value is encountered:
 * - If both are objects: deep merge (continue insertion)
 * - If values differ: conflict
 *   - strict=true: throw TypeError
 *   - strict=false: overwrite with new value (LWW)
 *
 * @param target - The object to insert into
 * @param segments - Array of path segments (e.g., ['data', 'metadata', 'items'])
 * @param value - The value to insert at the end of the path
 * @param strict - Whether to throw on conflicts
 * @throws TypeError if a conflict occurs in strict mode
 */
function insertPathSafe(
  target: JsonObject,
  segments: readonly string[],
  value: JsonValue,
  strict: boolean,
): void {
  let currentNode: JsonObject = target

  // Walk to the penultimate segment, creating objects as needed
  for (let i = 0; i < segments.length - 1; i++) {
    const currentSegment = segments[i]!
    const segmentValue = currentNode[currentSegment]

    if (segmentValue === undefined) {
      // Create new intermediate object
      const newObj: JsonObject = {}
      currentNode[currentSegment] = newObj
      currentNode = newObj
    }
    else if (isJsonObject(segmentValue)) {
      // Continue into existing object
      currentNode = segmentValue
    }
    else {
      // Conflict: existing value is not an object
      if (strict) {
        throw new TypeError(
          `Path expansion conflict at segment "${currentSegment}": expected object but found ${typeof segmentValue}`,
        )
      }
      // Non-strict: overwrite with new object
      const newObj: JsonObject = {}
      currentNode[currentSegment] = newObj
      currentNode = newObj
    }
  }

  // Insert at the final segment
  const lastSeg = segments[segments.length - 1]!
  const destinationValue = currentNode[lastSeg]

  if (destinationValue === undefined) {
    // No conflict - insert directly
    currentNode[lastSeg] = value
  }
  else if (canMerge(destinationValue, value)) {
    // Both are objects - deep merge
    mergeObjects(destinationValue as JsonObject, value as JsonObject, strict)
  }
  else {
    // Conflict: incompatible types
    if (strict) {
      throw new TypeError(
        `Path expansion conflict at key "${lastSeg}": cannot merge ${typeof destinationValue} with ${typeof value}`,
      )
    }
    // Non-strict: overwrite (LWW)
    currentNode[lastSeg] = value
  }
}

/**
 * Deep merges properties from source into target.
 *
 * @remarks
 * For each key in source:
 * - If key doesn't exist in target: copy it
 * - If both values are objects: recursively merge
 * - Otherwise: conflict (strict throws, non-strict overwrites)
 *
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @param strict - Whether to throw on conflicts
 * @throws TypeError if a conflict occurs in strict mode
 */
function mergeObjects(
  target: JsonObject,
  source: JsonObject,
  strict: boolean,
): void {
  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = target[key]

    if (targetValue === undefined) {
      // Key doesn't exist in target - copy it
      target[key] = sourceValue
    }
    else if (canMerge(targetValue, sourceValue)) {
      // Both are objects - recursively merge
      mergeObjects(targetValue as JsonObject, sourceValue as JsonObject, strict)
    }
    else {
      // Conflict: incompatible types
      if (strict) {
        throw new TypeError(
          `Path expansion conflict at key "${key}": cannot merge ${typeof targetValue} with ${typeof sourceValue}`,
        )
      }
      // Non-strict: overwrite (LWW)
      target[key] = sourceValue
    }
  }
}

// #endregion

function canMerge(a: JsonValue, b: JsonValue): a is JsonObject {
  return isJsonObject(a) && isJsonObject(b)
}
