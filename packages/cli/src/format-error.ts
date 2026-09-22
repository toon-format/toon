import type { ToonDecodeError } from '../../toon/src/index.ts'

/**
 * Renders a decode failure as a header, the offending source line, and a caret
 * under the first character that could have caused it.
 */
export function formatDecodeError(error: ToonDecodeError): string {
  const linePrefix = `Line ${error.line}: `
  const messageWithoutPrefix = error.message.startsWith(linePrefix)
    ? error.message.slice(linePrefix.length)
    : error.message

  const header = `Failed to decode TOON at line ${error.line}: ${messageWithoutPrefix}`

  if (error.source === undefined) {
    return header
  }

  const visibleSource = error.source.replace(/\t/g, '→')
  const firstNonWhitespaceIndex = visibleSource.search(/\S/)
  const gutter = `  ${error.line} | `
  const caretIndent = ' '.repeat(gutter.length + Math.max(firstNonWhitespaceIndex, 0))

  return `${header}\n\n${gutter}${visibleSource}\n${caretIndent}^`
}
