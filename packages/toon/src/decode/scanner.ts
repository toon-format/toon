import type { BlankLineInfo, Depth, ParsedLine } from '../types'
import { SPACE, TAB } from '../constants'

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

  // Count leading spaces
  let indent = 0
  while (indent < raw.length && raw[indent] === SPACE) {
    indent++
  }

  const content = raw.slice(indent)

  // Track blank lines
  if (!content.trim()) {
    const depth = computeDepthFromIndent(indent, indentSize)
    state.blankLines.push({ lineNumber, indent, depth })
    return undefined
  }

  const depth = computeDepthFromIndent(indent, indentSize)

  // Strict mode validation
  if (strict) {
    // Find the full leading whitespace region (spaces and tabs)
    let whitespaceEndIndex = 0
    while (
      whitespaceEndIndex < raw.length
      && (raw[whitespaceEndIndex] === SPACE || raw[whitespaceEndIndex] === TAB)
    ) {
      whitespaceEndIndex++
    }

    // Check for tabs in leading whitespace (before actual content)
    if (raw.slice(0, whitespaceEndIndex).includes(TAB)) {
      throw new SyntaxError(`Line ${lineNumber}: Tabs are not allowed in indentation in strict mode`)
    }

    // Check for exact multiples of indentSize
    if (indent > 0 && indent % indentSize !== 0) {
      throw new SyntaxError(
        `Line ${lineNumber}: Indentation must be exact multiple of ${indentSize}, but found ${indent} spaces`,
      )
    }
  }

  return { raw, indent, content, depth, lineNumber }
}

export function* parseLinesSync(
  source: Iterable<string>,
  indentSize: number,
  strict: boolean,
  state: StreamingScanState,
): Generator<ParsedLine> {
  for (const raw of source) {
    const parsedLine = parseLineIncremental(raw, state, indentSize, strict)

    if (parsedLine !== undefined) {
      yield parsedLine
    }
  }
}

export async function* parseLinesAsync(
  source: AsyncIterable<string>,
  indentSize: number,
  strict: boolean,
  state: StreamingScanState,
): AsyncGenerator<ParsedLine> {
  for await (const raw of source) {
    const parsedLine = parseLineIncremental(raw, state, indentSize, strict)

    if (parsedLine !== undefined) {
      yield parsedLine
    }
  }
}

function computeDepthFromIndent(indentSpaces: number, indentSize: number): Depth {
  return Math.floor(indentSpaces / indentSize)
}

// #endregion
