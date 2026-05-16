import { ToonDecodeError } from '../../toon/src/index.ts'

export interface FormatErrorOptions {
  isVerbose: boolean
}

// #region Public API

export function formatError(error: unknown, options: FormatErrorOptions): string {
  const sections: string[] = []

  if (error instanceof ToonDecodeError && error.line !== undefined) {
    sections.push(formatDecodeError(error))
  }
  else {
    sections.push(String(error))
  }

  if (options.isVerbose) {
    const causeChain = formatCauseChain(error)
    if (causeChain) {
      sections.push(causeChain)
    }

    if (error instanceof Error && error.stack) {
      sections.push(error.stack)
    }
  }

  return sections.join('\n\n')
}

// #endregion

// #region Internal renderers

function formatDecodeError(error: ToonDecodeError): string {
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

function formatCauseChain(error: unknown): string {
  const causeLines: string[] = []
  let current: unknown = error instanceof Error ? error.cause : undefined

  while (current instanceof Error) {
    const name = current.name || 'Error'
    causeLines.push(`Caused by: ${name}: ${current.message}`)
    current = current.cause
  }

  return causeLines.join('\n')
}

// #endregion
