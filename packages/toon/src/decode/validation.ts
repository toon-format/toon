import type { ArrayHeaderInfo, BlankLineInfo, Delimiter, Depth, ParsedLine } from '../types.ts'
import { COLON, LIST_ITEM_PREFIX } from '../constants.ts'
import { findUnquotedChar } from '../shared/string-utils.ts'
import { ToonDecodeError } from './errors.ts'

// #region Count and structure validation

export function assertExpectedCount(
  actual: number,
  expected: number,
  itemType: string,
  options: { strict: boolean },
  line: ParsedLine,
): void {
  if (options.strict && actual !== expected) {
    throw new ToonDecodeError(
      `Expected ${expected} ${itemType}, but got ${actual}`,
      { line: line.lineNumber, source: line.raw },
    )
  }
}

export function validateNoExtraListItems(
  nextLine: ParsedLine | undefined,
  itemDepth: Depth,
  expectedCount: number,
): void {
  if (nextLine?.depth === itemDepth && nextLine.content.startsWith(LIST_ITEM_PREFIX)) {
    throw new ToonDecodeError(
      `Expected ${expectedCount} list-form items, but found more`,
      { line: nextLine.lineNumber, source: nextLine.raw },
    )
  }
}

export function validateNoExtraTabularRows(
  nextLine: ParsedLine | undefined,
  rowDepth: Depth,
  header: ArrayHeaderInfo,
): void {
  if (
    nextLine?.depth === rowDepth
    && !nextLine.content.startsWith(LIST_ITEM_PREFIX)
    && isDataRow(nextLine.content, header.delimiter)
  ) {
    throw new ToonDecodeError(
      `Expected ${header.length} tabular rows, but found more`,
      { line: nextLine.lineNumber, source: nextLine.raw },
    )
  }
}

export function validateNoBlankLinesInRange(
  startLine: number,
  endLine: number,
  blankLines: BlankLineInfo[],
  strict: boolean,
  context: string,
): void {
  if (!strict)
    return

  const firstBlank = blankLines.find(
    blank => blank.lineNumber > startLine && blank.lineNumber < endLine,
  )

  if (firstBlank) {
    throw new ToonDecodeError(
      `Blank lines inside ${context} are not allowed in strict mode`,
      { line: firstBlank.lineNumber },
    )
  }
}

// #endregion

// #region Row classification helpers

/** Checks if a line is a data row (vs a key-value pair) in a tabular array. */
export function isDataRow(content: string, delimiter: Delimiter): boolean {
  const colonPos = findUnquotedChar(content, COLON)
  const delimiterPos = findUnquotedChar(content, delimiter)

  if (colonPos === -1) {
    return true
  }

  if (delimiterPos !== -1 && delimiterPos < colonPos) {
    return true
  }

  return false
}

// #endregion
