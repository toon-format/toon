import type { ArrayHeaderInfo, BlankLineInfo, Delimiter, Depth, ParsedLine } from '../types'
import { COLON, LIST_ITEM_PREFIX } from '../constants'

// #region Count and structure validation

/**
 * Asserts that the actual count matches the expected count in strict mode.
 */
export function assertExpectedCount(
  actual: number,
  expected: number,
  itemType: string,
  options: { strict: boolean },
): void {
  if (options.strict && actual !== expected) {
    throw new RangeError(`Expected ${expected} ${itemType}, but got ${actual}`)
  }
}

/**
 * Validates that there are no extra list items beyond the expected count.
 */
export function validateNoExtraListItems(
  nextLine: ParsedLine | undefined,
  itemDepth: Depth,
  expectedCount: number,
): void {
  if (nextLine?.depth === itemDepth && nextLine.content.startsWith(LIST_ITEM_PREFIX)) {
    throw new RangeError(`Expected ${expectedCount} list array items, but found more`)
  }
}

/**
 * Validates that there are no extra tabular rows beyond the expected count.
 */
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
    throw new RangeError(`Expected ${header.length} tabular rows, but found more`)
  }
}

/**
 * Validates that there are no blank lines within a specific line range in strict mode.
 */
export function validateNoBlankLinesInRange(
  startLine: number,
  endLine: number,
  blankLines: BlankLineInfo[],
  strict: boolean,
  context: string,
): void {
  if (!strict)
    return

  // Find blank lines within the range
  const firstBlank = blankLines.find(
    blank => blank.lineNumber > startLine && blank.lineNumber < endLine,
  )

  if (firstBlank) {
    throw new SyntaxError(
      `Line ${firstBlank.lineNumber}: Blank lines inside ${context} are not allowed in strict mode`,
    )
  }
}

// #endregion

// #region Row classification helpers

/**
 * Checks if a line is a data row (vs a key-value pair) in a tabular array.
 */
function isDataRow(content: string, delimiter: Delimiter): boolean {
  const colonPos = content.indexOf(COLON)
  const delimiterPos = content.indexOf(delimiter)

  // No colon = definitely a data row
  if (colonPos === -1) {
    return true
  }

  // Has delimiter and it comes before colon = data row
  if (delimiterPos !== -1 && delimiterPos < colonPos) {
    return true
  }

  // Colon before delimiter or no delimiter = key-value pair
  return false
}

// #endregion
