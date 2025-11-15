// #region JSON types

import type { Delimiter, DelimiterKey } from './constants'
// Schema types import
// Copyright (c) 2025 Hermann del Campo - hermann.delcampo@raiva.io
// License: MIT (same as TOON project)
import type { SchemaDefinition } from './schema/types'

export type JsonPrimitive = string | number | boolean | null
export type JsonObject = { [Key in string]: JsonValue } & { [Key in string]?: JsonValue | undefined }
export type JsonArray = JsonValue[] | readonly JsonValue[]
export type JsonValue = JsonPrimitive | JsonObject | JsonArray

// #endregion

// #region Encoder options

export type { Delimiter, DelimiterKey }

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
   * Schema name or definition for validation and reference.
   * When a string is provided, it must be registered in SchemaRegistry.
   * @default undefined
   * @copyright 2025 Hermann del Campo - hermann.delcampo@raiva.io
   * @license MIT (same as TOON project)
   */
  schema?: string | SchemaDefinition
  /**
   * Enable schema validation during encoding.
   * When true, data will be validated against the schema before encoding.
   * @default false
   * @copyright 2025 Hermann del Campo - hermann.delcampo@raiva.io
   * @license MIT (same as TOON project)
   */
  validateOnEncode?: boolean
  /**
   * Include schema reference in output.
   * When true, the schema name will be included in the TOON output.
   * @default false
   * @copyright 2025 Hermann del Campo - hermann.delcampo@raiva.io
   * @license MIT (same as TOON project)
   */
  includeSchema?: boolean
}

export type ResolvedEncodeOptions = Readonly<Required<Omit<EncodeOptions, 'schema'>>> & {
  schema?: string | SchemaDefinition
  validateOnEncode: boolean
  includeSchema: boolean
}

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
