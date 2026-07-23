import type { JsonPrimitive } from '../types.ts'
import { COMMENT_MARKER } from '../constants.ts'

// A line whose first non-space character is the comment marker would be
// silently stripped by decoders, so raw output must never form one
const COMMENT_LINE_PATTERN = new RegExp(`(?:^|\\n) *${COMMENT_MARKER}`)

/**
 * Pre-formatted string that the encoder emits verbatim at a primitive value
 * position, bypassing quoting, escaping, and number/keyword detection.
 *
 * Returned from a replacer for an object or array value, it is ignored and
 * the container is encoded normally.
 */
export class RawString {
  readonly value: string

  constructor(value: string) {
    if (COMMENT_LINE_PATTERN.test(value)) {
      throw new TypeError(`Raw string must not contain a line starting with "${COMMENT_MARKER}": ${JSON.stringify(value)}`)
    }
    this.value = value
  }
}

/** Values the encoder can emit at a primitive position. */
export type EncodablePrimitive = JsonPrimitive | RawString

/**
 * Wraps a pre-formatted string for verbatim emission, typically returned from
 * an encode `replacer`. Compose with `escapeString` to control quoting yourself.
 *
 * @param value - The exact text to emit at the value position
 * @returns A `RawString` marker honored at primitive value positions
 *
 * @example
 * ```ts
 * encode({ name: 'Ada', age: 30 }, {
 *   replacer: (key, value) => rawString(`"${escapeString(String(value))}"`)
 * })
 * // name: "Ada"
 * // age: "30"
 * ```
 */
export function rawString(value: string): RawString {
  return new RawString(value)
}

export function isRawString(value: unknown): value is RawString {
  return value instanceof RawString
}
