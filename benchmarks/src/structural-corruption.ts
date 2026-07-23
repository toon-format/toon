import type { Format } from './formats.ts'
import type { Dataset, StructuralCorruption } from './types.ts'
import { FORMATS } from './formats.ts'

/**
 * A format's encoded text split into fixed head/tail framing and per-record blocks.
 *
 * @remarks
 * A record block is the group of physical lines that render one array element, so
 * editing whole records means adding, dropping, or rewriting these blocks while the
 * surrounding framing (TOON's `[N]{fields}:` header, a CSV column row, JSON brackets)
 * is preserved verbatim.
 */
interface RecordSplit {
  headLines: string[]
  recordBlocks: string[][]
  tailLines: string[]
}

// Peel trailing blank lines (e.g. YAML/XML end with a newline) off the record
// region so they travel as tail framing instead of contaminating the last block
function peelTrailingBlankLines(lines: string[]): { body: string[], tailLines: string[] } {
  const body = [...lines]
  const tailLines: string[] = []

  while (body.length > 0 && body[body.length - 1]!.trim() === '') {
    tailLines.unshift(body.pop()!)
  }

  return { body, tailLines }
}

// Group YAML sequence items: each record starts at a `  - ` line and runs until
// the next one
function groupYamlRecords(lines: string[]): string[][] {
  const blocks: string[][] = []

  for (const line of lines) {
    if (line.startsWith('  - '))
      blocks.push([line])
    else if (blocks.length > 0)
      blocks[blocks.length - 1]!.push(line)
  }

  return blocks
}

// Group XML records by `<employees>` .. `</employees>` open/close pairs, inclusive
function groupXmlRecords(lines: string[]): string[][] {
  const blocks: string[][] = []
  let current: string[] | undefined

  for (const line of lines) {
    if (line.trim().startsWith('<employees>')) {
      current = [line]
      blocks.push(current)
    }
    else if (current) {
      current.push(line)
      if (line.trim().startsWith('</employees>'))
        current = undefined
    }
  }

  return blocks
}

// Group pretty-printed JSON object literals: each record runs from a `    {` line
// to its matching `    }` line, with any trailing comma stripped
function groupJsonPrettyRecords(lines: string[]): string[][] {
  const blocks: string[][] = []
  let current: string[] | undefined

  for (const line of lines) {
    if (line === '    {') {
      current = [line]
      blocks.push(current)
    }
    else if (current) {
      if (line === '    }' || line === '    },') {
        current.push('    }')
        current = undefined
      }
      else {
        current.push(line)
      }
    }
  }

  return blocks
}

function splitRecords(formatName: string, text: string): RecordSplit {
  const lines = text.split('\n')

  if (formatName === 'toon') {
    return {
      headLines: [lines[0]!],
      recordBlocks: lines.slice(1).map(line => [line]),
      tailLines: [],
    }
  }

  if (formatName === 'csv') {
    return {
      headLines: [lines[0]!, lines[1]!],
      recordBlocks: lines.slice(2).map(line => [line]),
      tailLines: [],
    }
  }

  if (formatName === 'yaml') {
    const { body, tailLines } = peelTrailingBlankLines(lines.slice(1))
    return {
      headLines: [lines[0]!],
      recordBlocks: groupYamlRecords(body),
      tailLines,
    }
  }

  if (formatName === 'xml') {
    const { body, tailLines } = peelTrailingBlankLines(lines)
    return {
      headLines: [],
      recordBlocks: groupXmlRecords(body),
      tailLines,
    }
  }

  if (formatName === 'json-pretty') {
    // Structure is `{` / `  "employees": [` / object literals / `  ]` / `}`
    return {
      headLines: [lines[0]!, lines[1]!],
      recordBlocks: groupJsonPrettyRecords(lines.slice(2, -2)),
      tailLines: ['  ]', '}'],
    }
  }

  throw new Error(`Cannot split records for format: ${formatName}`)
}

function joinRecords(formatName: string, split: RecordSplit): string {
  const { headLines, recordBlocks, tailLines } = split

  if (formatName === 'json-pretty') {
    // Object literals are comma-separated, so join each block then insert the
    // separators the surrounding array needs
    const body = recordBlocks.map(block => block.join('\n')).join(',\n')
    return [...headLines, body, ...tailLines].join('\n')
  }

  const recordStrings = recordBlocks.map(block => block.join('\n'))

  return [...headLines, ...recordStrings, ...tailLines].join('\n')
}

// Drop the last `count` records – TOON keeps its declared `[N]`, so the header
// now overstates the rows, while metadata-less formats become shorter yet valid
function dropTrailingRecordBlocks(formatName: string, text: string, count: number): string {
  const split = splitRecords(formatName, text)
  split.recordBlocks = split.recordBlocks.slice(0, split.recordBlocks.length - count)

  return joinRecords(formatName, split)
}

// Append the record blocks from a same-format encoding of the extra rows – TOON's
// `[N]` stays put, so the rows outnumber the declared length
function appendRecordBlocks(formatName: string, text: string, appendText: string): string {
  const split = splitRecords(formatName, text)
  const appendSplit = splitRecords(formatName, appendText)
  split.recordBlocks = [...split.recordBlocks, ...appendSplit.recordBlocks]

  return joinRecords(formatName, split)
}

// Field position for single-line records, read from the format's own header so it
// survives field reordering
function fieldIndexFromHeader(formatName: string, headLines: string[], fieldName: string): number {
  if (formatName === 'toon') {
    const fields = headLines[0]!.replace(/^[^{]*\{/, '').replace(/\}.*$/, '').split(',')
    return fields.indexOf(fieldName)
  }

  // CSV column header row
  return headLines[1]!.split(',').indexOf(fieldName)
}

// Detect whether one field line belongs to `fieldName` in a multi-line record
function isFieldLine(formatName: string, line: string, fieldName: string): boolean {
  const trimmed = line.trim()

  if (formatName === 'json-pretty')
    return trimmed.startsWith(`"${fieldName}":`)

  if (formatName === 'yaml')
    return trimmed.startsWith(`${fieldName}:`)

  // XML
  return trimmed.startsWith(`<${fieldName}>`)
}

// Remove one field from the targeted records – single-line formats lose a cell
// (TOON/CSV rows go narrower than the header), multi-line formats lose the property
function dropFieldFromRecords(
  formatName: string,
  text: string,
  recordIndices: number[],
  fieldName: string,
): string {
  const split = splitRecords(formatName, text)
  const isSingleLine = formatName === 'toon' || formatName === 'csv'
  const targets = new Set(recordIndices)

  split.recordBlocks = split.recordBlocks.map((block, index) => {
    if (!targets.has(index))
      return block

    if (isSingleLine) {
      const fieldIndex = fieldIndexFromHeader(formatName, split.headLines, fieldName)
      const cells = block[0]!.split(',')
      cells.splice(fieldIndex, 1)
      return [cells.join(',')]
    }

    return block.filter(line => !isFieldLine(formatName, line, fieldName))
  })

  return joinRecords(formatName, split)
}

// Compact JSON is a single line, so surgery runs on the parsed object and is
// re-serialized – the lossy-pipeline outcome is identical to editing the text
function corruptJsonCompactText(text: string, corruption: StructuralCorruption): string {
  const parsedDocument = JSON.parse(text) as { employees: Record<string, unknown>[] }

  switch (corruption.kind) {
    case 'truncated':
      parsedDocument.employees = parsedDocument.employees.slice(0, parsedDocument.employees.length - corruption.removeRecordCount)
      break

    case 'extra-rows':
      parsedDocument.employees = [...parsedDocument.employees, ...corruption.appendRecords]
      break

    case 'width-mismatch':
    case 'missing-fields':
      for (const index of corruption.targetRecordIndices) {
        delete parsedDocument.employees[index]![corruption.targetFieldName]
      }
      break
  }

  return JSON.stringify(parsedDocument)
}

/**
 * Corrupt a format's encoded text according to a structural corruption descriptor.
 *
 * @remarks
 * TOON's `[N]` length and `{fields}` width still declare the original shape, so
 * truncation, extra rows, and width drops are derivable from the text alone. JSON,
 * YAML, XML, and CSV carry no length metadata, so their truncated and extra-row
 * variants stay valid and undetectable by design – that contrast is the point.
 *
 * @param formatName - Format id, also the `FORMATS` key
 * @param encodedText - Text produced by `format.encode`
 * @param corruption - What to damage and how
 */
export function corruptEncodedText(
  formatName: string,
  encodedText: string,
  corruption: StructuralCorruption,
): string {
  if (corruption.kind === 'control')
    return encodedText

  if (formatName === 'json-compact')
    return corruptJsonCompactText(encodedText, corruption)

  switch (corruption.kind) {
    case 'truncated':
      return dropTrailingRecordBlocks(formatName, encodedText, corruption.removeRecordCount)

    case 'extra-rows': {
      const appendText = FORMATS[formatName]!.encode({ employees: corruption.appendRecords })
      return appendRecordBlocks(formatName, encodedText, appendText)
    }

    case 'width-mismatch':
    case 'missing-fields':
      return dropFieldFromRecords(formatName, encodedText, corruption.targetRecordIndices, corruption.targetFieldName)
  }
}

/**
 * Encode a dataset, applying post-encode text corruption when one is declared.
 *
 * @remarks
 * The single seam every benchmark call site flows through so token counts and
 * model prompts see the same corrupted text.
 *
 * @param format - Target format descriptor
 * @param dataset - Dataset to encode, optionally carrying a `corruption`
 */
export function encodeDataset(format: Format, dataset: Dataset): string {
  const text = format.encode(dataset.data)

  return dataset.corruption
    ? corruptEncodedText(format.name, text, dataset.corruption)
    : text
}
