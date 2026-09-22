import type { BlankLineInfo, Depth, ParsedLine } from '../types.ts'
import { BYTE_ORDER_MARK, CARRIAGE_RETURN, COMMENT_MARKER, SPACE, TAB } from '../constants.ts'
import { ToonDecodeError } from './errors.ts'

const LEADING_WHITESPACE_PATTERN = /^[ \t]*/

// #region Scan state

export interface StreamingScanState {
  lineNumber: number
  blankLines: BlankLineInfo[]
}

export function createScanState(): StreamingScanState {
  return {
    lineNumber: 0,
    blankLines: [],
  }
}

// #endregion

// #region Line parsing

export function parseLineIncremental(
  raw: string,
  state: StreamingScanState,
  indentSize: number,
  strict: boolean,
): ParsedLine | undefined {
  state.lineNumber++
  const lineNumber = state.lineNumber

  if (lineNumber === 1 && raw[0] === BYTE_ORDER_MARK) {
    raw = raw.slice(1)
  }

  // A trailing carriage return belongs to the CRLF terminator, not to the content.
  if (raw[raw.length - 1] === CARRIAGE_RETURN) {
    raw = raw.slice(0, -1)
  }

  const leadingWhitespace = LEADING_WHITESPACE_PATTERN.exec(raw)![0]
  const firstTabIndex = leadingWhitespace.indexOf(TAB)

  // Strict rejects tab indentation below, so only the spaces before the first tab are indentation there.
  const indent = strict && firstTabIndex !== -1 ? firstTabIndex : leadingWhitespace.length
  // Non-strict input may indent with tabs, and each tab counts as one depth level.
  const tabIndent = strict || firstTabIndex === -1 ? 0 : leadingWhitespace.split(TAB).length - 1

  // Without this, `- ` would be an item carrying an empty token instead of the bare list-item marker.
  const content = trimTrailingSpaces(raw.slice(indent))

  // Only spaces may precede the marker, so a tab in the indentation rules the line out.
  // Comment lines vanish before blank-line tracking and strict validation, so they
  // never count as rows, items, entries, or blank lines.
  if (firstTabIndex === -1 && content[0] === COMMENT_MARKER) {
    return undefined
  }

  const depth = computeDepthFromIndent(indent - tabIndent, indentSize) + tabIndent

  if (!content) {
    state.blankLines.push({ lineNumber, indent, depth })
    return undefined
  }

  if (strict) {
    if (firstTabIndex !== -1) {
      throw new ToonDecodeError(
        'Tabs are not allowed in indentation in strict mode',
        { line: lineNumber, source: raw },
      )
    }

    if (indent > 0 && indent % indentSize !== 0) {
      throw new ToonDecodeError(
        `Indentation must be exact multiple of ${indentSize}, but found ${indent} spaces`,
        { line: lineNumber, source: raw },
      )
    }
  }

  return { raw, indent, content, depth, lineNumber }
}

function computeDepthFromIndent(indentSpaces: number, indentSize: number): Depth {
  return Math.floor(indentSpaces / indentSize)
}

function trimTrailingSpaces(value: string): string {
  let end = value.length
  while (end > 0 && value[end - 1] === SPACE) {
    end--
  }
  return end === value.length ? value : value.slice(0, end)
}

// #endregion
