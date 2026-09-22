import { BACKSLASH, CARRIAGE_RETURN, DOUBLE_QUOTE, NEWLINE, SPACE, TAB } from '../constants.ts'

/**
 * Trims surrounding ASCII spaces (U+0020) from a token.
 *
 * @remarks
 * Token trimming removes spaces only: any other whitespace (NBSP, or tabs
 * outside their delimiter role) is part of the token, so a host `trim()`
 * that strips the full Unicode whitespace set must not be used here.
 */
export function trimSpaces(value: string): string {
  let start = 0
  let end = value.length

  while (start < end && value[start] === SPACE) {
    start++
  }
  while (end > start && value[end - 1] === SPACE) {
    end--
  }

  return start === 0 && end === value.length ? value : value.slice(start, end)
}

/**
 * Escapes special characters in a string for encoding.
 *
 * @remarks
 * Control characters outside `\n`, `\r`, `\t`, `\\`, and `"` are emitted as `\uXXXX`.
 */
export function escapeString(value: string): string {
  return value
    .replace(/\\/g, `${BACKSLASH}${BACKSLASH}`)
    .replace(/"/g, `${BACKSLASH}${DOUBLE_QUOTE}`)
    .replace(/\n/g, `${BACKSLASH}n`)
    .replace(/\r/g, `${BACKSLASH}r`)
    .replace(/\t/g, `${BACKSLASH}t`)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F]/g, c => `${BACKSLASH}u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)
}

/**
 * Unescapes a string by processing escape sequences.
 *
 * @remarks
 * Lone surrogates in `\uXXXX` escapes are rejected.
 */
export function unescapeString(value: string): string {
  let unescaped = ''
  let i = 0

  while (i < value.length) {
    if (value[i] === BACKSLASH) {
      if (i + 1 >= value.length) {
        throw new SyntaxError('Invalid escape sequence: backslash at end of string')
      }

      const next = value[i + 1]
      if (next === 'n') {
        unescaped += NEWLINE
        i += 2
        continue
      }
      if (next === 't') {
        unescaped += TAB
        i += 2
        continue
      }
      if (next === 'r') {
        unescaped += CARRIAGE_RETURN
        i += 2
        continue
      }
      if (next === BACKSLASH) {
        unescaped += BACKSLASH
        i += 2
        continue
      }
      if (next === DOUBLE_QUOTE) {
        unescaped += DOUBLE_QUOTE
        i += 2
        continue
      }
      if (next === 'u') {
        if (i + 6 > value.length) {
          throw new SyntaxError(`Invalid escape sequence: truncated \\u escape at "${value.slice(i, i + 6)}"`)
        }
        const hex = value.slice(i + 2, i + 6)
        if (!/^[0-9a-f]{4}$/i.test(hex)) {
          throw new SyntaxError(`Invalid escape sequence: \\u must be followed by 4 hex digits, got "${hex}"`)
        }
        const codeUnit = Number.parseInt(hex, 16)
        if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
          throw new SyntaxError(`Invalid escape sequence: \\u${hex} is a lone surrogate. Supplementary code points MUST appear as literal UTF-8`)
        }
        unescaped += String.fromCodePoint(codeUnit)
        i += 6
        continue
      }

      throw new SyntaxError(`Invalid escape sequence: \\${next}`)
    }

    unescaped += value[i]
    i++
  }

  return unescaped
}

/** Finds the index of the closing double quote, accounting for escape sequences. */
export function findClosingQuote(content: string, start: number): number {
  let i = start + 1
  while (i < content.length) {
    if (content[i] === BACKSLASH && i + 1 < content.length) {
      i += 2
      continue
    }
    if (content[i] === DOUBLE_QUOTE) {
      return i
    }
    i++
  }
  return -1
}

/** Finds the index of a character outside of quoted sections. */
export function findUnquotedChar(content: string, char: string, start = 0): number {
  let inQuotes = false
  let i = start

  while (i < content.length) {
    if (content[i] === BACKSLASH && i + 1 < content.length && inQuotes) {
      i += 2
      continue
    }

    if (content[i] === DOUBLE_QUOTE) {
      inQuotes = !inQuotes
      i++
      continue
    }

    if (content[i] === char && !inQuotes) {
      return i
    }

    i++
  }

  return -1
}
