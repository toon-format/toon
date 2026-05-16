import type { ParsedLine } from '../types.ts'

/**
 * Error thrown by the TOON decoder when input cannot be parsed.
 *
 * Extends `SyntaxError` so existing `instanceof SyntaxError` checks keep working.
 * Adds structured location fields for programmatic consumers and richer CLI output.
 */
export class ToonDecodeError extends SyntaxError {
  /** 1-based line number where the error was detected, if known. */
  readonly line?: number
  /** Raw source line (including indentation) where the error was detected, if known. */
  readonly source?: string

  constructor(message: string, context?: { line?: number, source?: string, cause?: unknown }) {
    const prefix = context?.line !== undefined ? `Line ${context.line}: ` : ''
    super(prefix + message, context?.cause !== undefined ? { cause: context.cause } : undefined)
    this.name = 'ToonDecodeError'
    this.line = context?.line
    this.source = context?.source
  }
}

/**
 * Runs `fn` and re-throws any non-`ToonDecodeError` `Error` as a `ToonDecodeError`
 * with line context attached and the original error preserved as `cause`.
 *
 * Pure parser helpers (parser.ts, string-utils.ts) don't know which line they're
 * parsing; this wrapper is how the streaming decoder enriches their errors.
 */
export function withLine<T>(line: ParsedLine, fn: () => T): T {
  try {
    return fn()
  }
  catch (error) {
    if (error instanceof ToonDecodeError)
      throw error
    if (error instanceof Error) {
      throw new ToonDecodeError(error.message, {
        line: line.lineNumber,
        source: line.raw,
        cause: error,
      })
    }
    throw error
  }
}
