// #region JSON types

import type { Delimiter, DelimiterKey } from './constants'

export type JsonPrimitive = string | number | boolean | null
export type JsonObject = { [Key in string]: JsonValue } & { [Key in string]?: JsonValue | undefined }
export type JsonArray = JsonValue[] | readonly JsonValue[]
export type JsonValue = JsonPrimitive | JsonObject | JsonArray

// #endregion

// #region Encoder options

export type { Delimiter, DelimiterKey }

/**
 * A function that transforms or filters values during encoding.
 *
 * Called for every value (root, object properties, array elements) during the encoding process.
 * Similar to `JSON.stringify`'s replacer, but with path tracking.
 *
 * @param key - The property key or array index (as string). Empty string (`''`) for root value.
 * @param value - The normalized `JsonValue` at this location.
 * @param path - Array representing the path from root to this value.
 *
 * @returns The replacement value (will be normalized again), or `undefined` to omit.
 *          For root value, returning `undefined` means "no change" (don't omit root).
 *
 * @example
 * ```ts
 * // Remove password fields
 * const replacer = (key, value) => {
 *   if (key === 'password') return undefined
 *   return value
 * }
 *
 * // Add timestamps
 * const replacer = (key, value, path) => {
 *   if (path.length === 0 && typeof value === 'object' && value !== null) {
 *     return { ...value, _timestamp: Date.now() }
 *   }
 *   return value
 * }
 * ```
 */
export type EncodeReplacer = (
  key: string,
  value: JsonValue,
  path: readonly (string | number)[],
) => unknown

export interface EncodeOptions {
  /**
   * Number of spaces per indentation level.
   * @default 2
   */
  indent?: number
  /**
   * Delimiter to use for tabular array rows and inline primitive arrays.
   * @default DELIMITERS.comma
   */
  delimiter?: Delimiter
  /**
   * Enable key folding to collapse single-key wrapper chains.
   * When set to 'safe', nested objects with single keys are collapsed into dotted paths
   * (e.g., data.metadata.items instead of nested indentation).
   * @default 'off'
   */
  keyFolding?: 'off' | 'safe'
  /**
   * Maximum number of segments to fold when keyFolding is enabled.
   * Controls how deep the folding can go in single-key chains.
   * Values 0 or 1 have no practical effect (treated as effectively disabled).
   * @default Infinity
   */
  flattenDepth?: number
    /**
   * Always wrap string values in quotes during encoding.
   * Useful for consistent string serialization or when building formats that require strict quoting.
   * @default false
   */
  quoteStrings?: boolean
  /**
   * A function to transform or filter values during encoding.
   * Called for the root value and every nested property/element.
   * Return `undefined` to omit properties/elements (root cannot be omitted).
   * @default undefined
   */
  replacer?: EncodeReplacer
}

export type ResolvedEncodeOptions = Readonly<Required<Omit<EncodeOptions, 'replacer'>>> & Pick<EncodeOptions, 'replacer'>

// #endregion

// #region Decoder options

export interface DecodeOptions {
  /**
   * Number of spaces per indentation level.
   * @default 2
   */
  indent?: number
  /**
   * When true, enforce strict validation of array lengths and tabular row counts.
   * @default true
   */
  strict?: boolean
  /**
   * Enable path expansion to reconstruct dotted keys into nested objects.
   * When set to 'safe', keys containing dots are expanded into nested structures
   * if all segments are valid identifiers (e.g., data.metadata.items becomes nested objects).
   * Pairs with keyFolding='safe' for lossless round-trips.
   * @default 'off'
   */
  expandPaths?: 'off' | 'safe'
}

export type ResolvedDecodeOptions = Readonly<Required<DecodeOptions>>

/**
 * Options for streaming decode operations.
 *
 * @remarks
 * Path expansion is not supported in streaming mode.
 */
export interface DecodeStreamOptions extends Omit<DecodeOptions, 'expandPaths'> {
  /**
   * Path expansion is not supported in streaming decode.
   * This option is explicitly omitted.
   */
  expandPaths?: never
}

// #endregion

// #region Streaming decoder types

export type JsonStreamEvent
  = | { type: 'startObject' }
    | { type: 'endObject' }
    | { type: 'startArray', length: number }
    | { type: 'endArray' }
    | { type: 'key', key: string, wasQuoted?: boolean }
    | { type: 'primitive', value: JsonPrimitive }

// #endregion

// #region Decoder parsing types

export interface ArrayHeaderInfo {
  key?: string
  length: number
  delimiter: Delimiter
  fields?: string[]
}

export interface ParsedLine {
  raw: string
  depth: Depth
  indent: number
  content: string
  lineNumber: number
}

export interface BlankLineInfo {
  lineNumber: number
  indent: number
  depth: Depth
}

// #endregion

export type Depth = number
