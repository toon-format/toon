import type {
  CalzoonDecodeOptions,
  CalzoonDocument,
  CalzoonEncodeOptions,
  CalzoonMode,
  ModeDetectionResult,
  PlanElement,
  ResolvedCalzoonDecodeOptions,
  ResolvedCalzoonEncodeOptions,
  ValidationResult,
} from './types'
import type { JsonValue } from '@toon-format/toon'
import { DEFAULT_DELIMITER, decode as toonDecode, encode as toonEncode } from '@toon-format/toon'
import { detectMode as detectModeImpl, suggestMode } from './shared/mode-detection'

// #region Exports

export * from './types'
export * from './symbols/constants'
export { detectMode, isDataMode, isHybridMode, isPlanMode, suggestMode } from './shared/mode-detection'

// #endregion

// #region Encoder

/**
 * Encode a JavaScript value or plan into CALZOON format
 *
 * @param input - Data (JsonValue) or plan (PlanElement) or mixed
 * @param options - Encoding options
 * @returns CALZOON formatted string
 *
 * @example
 * ```ts
 * // Data mode (TOON)
 * encode({ users: [{ id: 1, name: 'Alice' }] })
 * // users[1]{id,name}:
 * //   1,Alice
 *
 * // Plan mode (CALZONE)
 * encode({
 *   type: 'section',
 *   id: '1',
 *   title: 'AUTH_SYS',
 *   content: [...]
 * }, { mode: 'plan' })
 *
 * // Hybrid mode (auto-detected)
 * encode({
 *   section: '1',
 *   data: [{ id: 1 }],
 *   flow: '→ validate → process'
 * })
 * ```
 */
export function encode(input: unknown, options?: CalzoonEncodeOptions): string {
  const resolved = resolveEncodeOptions(options)

  // Auto-detect mode if not specified
  const mode = resolved.mode === 'auto'
    ? suggestMode(input)
    : resolved.mode

  // For data mode, delegate to TOON encoder
  if (mode === 'data') {
    return toonEncode(input, {
      indent: resolved.indent,
      delimiter: resolved.delimiter,
      keyFolding: resolved.keyFolding,
      flattenDepth: resolved.flattenDepth,
    })
  }

  // For plan mode and hybrid mode, use CALZOON encoder
  // TODO: Implement plan and hybrid encoders
  throw new Error(`${mode} mode encoding not yet implemented`)
}

/**
 * Encode as lines (streaming)
 *
 * @param input - Data or plan to encode
 * @param options - Encoding options
 * @returns Iterable of CALZOON lines
 */
export function* encodeLines(input: unknown, options?: CalzoonEncodeOptions): Iterable<string> {
  const encoded = encode(input, options)
  yield* encoded.split('\n')
}

// #endregion

// #region Decoder

/**
 * Decode a CALZOON format string into JavaScript value or plan
 *
 * @param input - CALZOON formatted string
 * @param options - Decoding options
 * @returns Parsed data, plan, or hybrid document
 *
 * @example
 * ```ts
 * decode('users[1]{id,name}:\n  1,Alice')
 * // { users: [{ id: 1, name: 'Alice' }] }
 *
 * decode('§1 AUTH_SYS\n¶ Flow\nlogin → validate')
 * // { type: 'section', id: '1', title: 'AUTH_SYS', ... }
 * ```
 */
export function decode(input: string, options?: CalzoonDecodeOptions): JsonValue | PlanElement | CalzoonDocument {
  const resolved = resolveDecodeOptions(options)

  // Auto-detect mode if not specified
  const detected = resolved.mode === 'auto'
    ? detectModeImpl(input)
    : { mode: resolved.mode, confidence: 1, indicators: {} as any }

  // For data mode, delegate to TOON decoder
  if (detected.mode === 'data') {
    return toonDecode(input, {
      indent: resolved.indent,
      strict: resolved.strict,
      expandPaths: resolved.expandPaths,
    })
  }

  // For plan mode and hybrid mode, use CALZOON decoder
  // TODO: Implement plan and hybrid decoders
  throw new Error(`${detected.mode} mode decoding not yet implemented`)
}

/**
 * Decode from pre-split lines
 *
 * @param lines - CALZOON lines
 * @param options - Decoding options
 * @returns Parsed data, plan, or hybrid document
 */
export function decodeFromLines(lines: Iterable<string>, options?: CalzoonDecodeOptions): JsonValue | PlanElement | CalzoonDocument {
  const text = Array.from(lines).join('\n')
  return decode(text, options)
}

// #endregion

// #region Mode Detection

/**
 * Detect the mode of a CALZOON document
 *
 * @param input - CALZOON string or lines
 * @returns Mode detection result with confidence
 *
 * @example
 * ```ts
 * detectMode('users[1]{id,name}:\n  1,Alice')
 * // { mode: 'data', confidence: 0.7, indicators: { ... } }
 *
 * detectMode('§1 PLAN\n¶ Flow\nstep1 → step2')
 * // { mode: 'plan', confidence: 0.9, indicators: { ... } }
 * ```
 */
export function detectMode(input: string | string[]): ModeDetectionResult {
  return detectModeImpl(input)
}

// #endregion

// #region Validation

/**
 * Validate a CALZOON document
 *
 * @param input - CALZOON string or parsed document
 * @param options - Decoding options for validation
 * @returns Validation result with errors and warnings
 */
export function validate(input: string | CalzoonDocument, options?: CalzoonDecodeOptions): ValidationResult {
  // TODO: Implement validation
  return {
    valid: true,
    errors: [],
    warnings: [],
  }
}

// #endregion

// #region Options Resolution

function resolveEncodeOptions(options?: CalzoonEncodeOptions): ResolvedCalzoonEncodeOptions {
  return {
    indent: options?.indent ?? 2,
    delimiter: options?.delimiter ?? DEFAULT_DELIMITER,
    keyFolding: options?.keyFolding ?? 'off',
    flattenDepth: options?.flattenDepth ?? Number.POSITIVE_INFINITY,
    mode: options?.mode ?? 'auto',
    enableSymbols: options?.enableSymbols ?? true,
    enableSections: options?.enableSections ?? true,
  }
}

function resolveDecodeOptions(options?: CalzoonDecodeOptions): ResolvedCalzoonDecodeOptions {
  return {
    indent: options?.indent ?? 2,
    strict: options?.strict ?? true,
    expandPaths: options?.expandPaths ?? 'off',
    mode: options?.mode ?? 'auto',
    parseSymbols: options?.parseSymbols ?? true,
  }
}

// #endregion
