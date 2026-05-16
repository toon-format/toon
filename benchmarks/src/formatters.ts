import type { Dataset } from './types.ts'
import { stringify as stringifyCSV } from 'csv-stringify/sync'
import { XMLBuilder } from 'fast-xml-parser'
import { stringify as stringifyYAML } from 'yaml'
import { encode as encodeToon } from '../../packages/toon/src/index.ts'

/**
 * Format converters registry
 *
 * @remarks
 * All formatters attempt to preserve semantic equivalence with the source data,
 * meaning the converted data should represent the same information. However,
 * CSV has inherent limitations with nested structures (see `toCSV` docs).
 */
export const formatters: Record<string, (data: unknown) => string> = {
  'json-pretty': data => JSON.stringify(data, undefined, 2),
  'json-compact': data => JSON.stringify(data),
  'toon': data => encodeToon(data),
  'csv': data => toCSV(data),
  'xml': data => toXML(data),
  'yaml': data => stringifyYAML(data),
}

/**
 * Convert data to CSV format
 *
 * @remarks
 * Limitations: CSV is designed for flat tabular data only.
 *
 * This formatter:
 *   - Only handles top-level objects with arrays of flat objects
 *   - Cannot properly represent deeply nested structures (nested arrays/objects within rows)
 *   - Loses nested structure information during conversion
 *   - May produce misleading results for datasets with complex nesting (e.g., e-commerce orders with nested items)
 *
 * For datasets with nested structures, CSV comparisons may not be fair or representative
 * of how CSV would typically be used in practice.
 */
function toCSV(data: unknown): string {
  const sections: string[] = []

  // Handle top-level object with arrays
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) {
        sections.push(`# ${key}`)
        sections.push(stringifyCSV(value, { header: true }))
      }
    }
    return sections.join('\n').trim()
  }

  // Root-level array
  if (Array.isArray(data) && data.length > 0) {
    return stringifyCSV(data, { header: true }).trim()
  }

  return ''
}

/**
 * Convert data to XML format
 *
 * @remarks
 * Uses `fast-xml-parser` to generate well-formatted XML with:
 * - 2-space indentation for readability
 * - Empty nodes suppressed
 * - Proper escaping of special characters
 */
function toXML(data: unknown): string {
  const builder = new XMLBuilder({
    format: true,
    indentBy: '  ',
    suppressEmptyNode: true,
  })

  return builder.build(data)
}

/**
 * Check if a dataset supports CSV format
 *
 * @remarks
 * CSV is only suitable for flat tabular data. Datasets with nested structures
 * should not be compared using CSV as it cannot properly represent the data.
 */
export function supportsCSV(dataset: Dataset): boolean {
  return dataset.metadata.supportsCSV
}
