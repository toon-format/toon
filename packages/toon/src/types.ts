// #region JSON types

import type { Delimiter, DelimiterKey } from './constants.ts'

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
}

export type ResolvedDecodeOptions = Readonly<Required<DecodeOptions>>

/**
 * Options for streaming decode operations.
 */
export type DecodeStreamOptions = DecodeOptions

// #endregion

// #region Streaming decoder types

export type JsonStreamEvent
  = | { type: 'startObject' }
    | { type: 'endObject' }
    | { type: 'startArray', length: number }
    | { type: 'endArray' }
    | { type: 'key', key: string }
    | { type: 'primitive', value: JsonPrimitive }

// #endregion

// #region Header field types

/**
 * One entry of a tabular header's fields segment.
 *
 * @remarks
 * A leaf field (no children) maps to one row cell; a nested field group
 * carries its subfields and materializes a nested object per row.
 */
export interface FieldNode {
  name: string
  children?: FieldNode[]
}

// #endregion

// #region Decoder parsing types

export interface ArrayHeaderInfo {
  key?: string
  length: number
  delimiter: Delimiter
  fields?: FieldNode[]
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
