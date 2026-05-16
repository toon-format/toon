import type { JsonValue, ResolvedEncodeOptions } from '../types.ts'
import { DOT } from '../constants.ts'
import { isIdentifierSegment } from '../shared/validation.ts'
import { isEmptyObject, isJsonObject } from './normalize.ts'

// #region Key folding helpers

/**
 * Result of attempting to fold a key chain.
 */
export interface FoldResult {
  /**
   * The folded key with dot-separated segments (e.g., "data.metadata.items")
   */
  foldedKey: string
  /**
   * The remainder value after folding:
   * - `undefined` if the chain was fully folded to a leaf (primitive, array, or empty object)
   * - An object if the chain was partially folded (depth limit reached with nested tail)
   */
  remainder?: JsonValue
  /**
   * The leaf value at the end of the folded chain.
   * Used to avoid redundant traversal when encoding the folded value.
   */
  leafValue: JsonValue
  /**
   * The number of segments that were folded.
   * Used to calculate remaining depth budget for nested encoding.
   */
  segmentCount: number
}

/**
 * Attempts to fold a single-key object chain into a dotted path.
 *
 * @remarks
 * Folding traverses nested objects with single keys, collapsing them into a dotted path.
 * It stops when:
 * - A non-single-key object is encountered
 * - An array is encountered (arrays are not "single-key objects")
 * - A primitive value is reached
 * - The flatten depth limit is reached
 * - Any segment fails safe mode validation
 *
 * Safe mode requirements:
 * - `options.keyFolding` must be `'safe'`
 * - Every segment must be a valid identifier (no dots, no special chars)
 * - The folded key must not collide with existing sibling keys
 * - No segment should require quoting
 *
 * @param key - The starting key to fold
 * @param value - The value associated with the key
 * @param siblings - Array of all sibling keys at this level (for collision detection)
 * @param options - Resolved encoding options
 * @returns A FoldResult if folding is possible, undefined otherwise
 */
export function tryFoldKeyChain(
  key: string,
  value: JsonValue,
  siblings: readonly string[],
  options: ResolvedEncodeOptions,
  rootLiteralKeys?: Set<string>,
  pathPrefix?: string,
  flattenDepth?: number,
): FoldResult | undefined {
  // Only fold when safe mode is enabled
  if (options.keyFolding !== 'safe') {
    return undefined
  }

  // Can only fold objects
  if (!isJsonObject(value)) {
    return undefined
  }

  // Use provided flattenDepth or fall back to options default
  const effectiveFlattenDepth = flattenDepth ?? options.flattenDepth

  // Collect the chain of single-key objects
  const { segments, tail, leafValue } = collectSingleKeyChain(key, value, effectiveFlattenDepth)

  // Need at least 2 segments for folding to be worthwhile
  if (segments.length < 2) {
    return undefined
  }

  // Validate all segments are safe identifiers
  if (!segments.every(seg => isIdentifierSegment(seg))) {
    return undefined
  }

  // Build the folded key (relative to current nesting level)
  const foldedKey = buildFoldedKey(segments)

  // Build the absolute path from root
  const absolutePath = pathPrefix ? `${pathPrefix}${DOT}${foldedKey}` : foldedKey

  // Check for collision with existing literal sibling keys (at current level)
  if (siblings.includes(foldedKey)) {
    return undefined
  }

  // Check for collision with root-level literal dotted keys
  if (rootLiteralKeys && rootLiteralKeys.has(absolutePath)) {
    return undefined
  }

  return {
    foldedKey,
    remainder: tail,
    leafValue,
    segmentCount: segments.length,
  }
}

/**
 * Collects a chain of single-key objects into segments.
 *
 * @remarks
 * Traverses nested objects, collecting keys until:
 * - A non-single-key object is found
 * - An array is encountered
 * - A primitive is reached
 * - An empty object is reached
 * - The depth limit is reached
 *
 * @param startKey - The initial key to start the chain
 * @param startValue - The value to traverse
 * @param maxDepth - Maximum number of segments to collect
 * @returns Object containing segments array, tail value, and leaf value
 */
function collectSingleKeyChain(
  startKey: string,
  startValue: JsonValue,
  maxDepth: number,
): { segments: string[], tail: JsonValue | undefined, leafValue: JsonValue } {
  const segments: string[] = [startKey]
  let currentValue = startValue

  // Traverse nested single-key objects, collecting each key into segments array
  // Stop when we encounter: multi-key object, array, primitive, or depth limit
  while (segments.length < maxDepth) {
    // Must be an object to continue
    if (!isJsonObject(currentValue)) {
      break
    }

    const keys = Object.keys(currentValue)

    // Must have exactly one key to continue the chain
    if (keys.length !== 1) {
      break
    }

    const nextKey = keys[0]!
    const nextValue = currentValue[nextKey]!

    segments.push(nextKey)
    currentValue = nextValue
  }

  // Determine the tail
  if (!isJsonObject(currentValue) || isEmptyObject(currentValue)) {
    // Array, primitive, null, or empty object - this is a leaf value
    return { segments, tail: undefined, leafValue: currentValue }
  }

  // Has keys - return as tail (remainder)
  return { segments, tail: currentValue, leafValue: currentValue }
}

function buildFoldedKey(segments: readonly string[]): string {
  return segments.join(DOT)
}

// #endregion
