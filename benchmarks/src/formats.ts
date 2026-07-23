import type { Dataset } from './types.ts'
import { stringify as stringifyCSV } from 'csv-stringify/sync'
import { XMLBuilder } from 'fast-xml-parser'
import { stringify as stringifyYAML } from 'yaml'
import { encode as encodeToon } from '../../packages/toon/src/index.ts'

/**
 * Everything a caller must know about one data format.
 *
 * @remarks
 * A single descriptor unifies the encoder, the neutral parse hint, the code
 * fence tag, and the human-readable label so a format is defined in one place.
 */
export interface Format {
  /** Stable id, also the `FORMATS` key and results/token-map key */
  name: string
  /** Dataset payload to textual representation */
  encode: (data: unknown) => string
  /** Neutral parse hint prepended to prompts */
  primer: string
  /** Code-fence language tag */
  fence: string
  /** Human-readable label for tables and charts */
  displayName: string
}

/**
 * Format descriptor registry.
 *
 * @remarks
 * All encoders attempt to preserve semantic equivalence with the source data,
 * meaning the converted data should represent the same information. However,
 * CSV has inherent limitations with nested structures (see `toCSV` docs).
 */
export const FORMATS: Record<string, Format> = {
  'json-pretty': {
    name: 'json-pretty',
    encode: data => JSON.stringify(data, undefined, 2),
    primer: 'JSON: Strict JSON objects/arrays with repeated keys per row.',
    fence: 'json',
    displayName: 'JSON',
  },
  'json-compact': {
    name: 'json-compact',
    encode: data => JSON.stringify(data),
    primer: 'JSON (compact): Strict JSON without extra whitespace.',
    fence: 'json',
    displayName: 'JSON compact',
  },
  'toon': {
    name: 'toon',
    encode: data => encodeToon(data),
    primer: 'TOON: Indentation-based. Arrays declare length and fields (e.g., items[N]{f1,f2}:). Rows use single delimiter. Values may be quoted. Keyed maps use key[N:]{fields}: with one `entrykey: values` row per entry. A tabular field may carry sub-fields, e.g. users[N]{name,address{city,country}}:.',
    fence: 'toon',
    displayName: 'TOON',
  },
  'csv': {
    name: 'csv',
    encode: data => toCSV(data),
    primer: 'CSV: Header row, comma-separated values. First row contains field names.',
    fence: 'csv',
    displayName: 'CSV',
  },
  'xml': {
    name: 'xml',
    encode: data => toXML(data),
    primer: 'XML: Tag-based tree structure with nested elements.',
    fence: 'xml',
    displayName: 'XML',
  },
  'yaml': {
    name: 'yaml',
    encode: data => stringifyYAML(data),
    primer: 'YAML: Indentation-based key/value and lists (- items).',
    fence: 'yaml',
    displayName: 'YAML',
  },
}

/**
 * Look up a format descriptor by name.
 *
 * @remarks
 * Throws on unknown names so a missing format fails loudly instead of degrading
 * silently.
 *
 * @param name - Format id, also the `FORMATS` key
 */
export function getFormat(name: string): Format {
  const format = FORMATS[name]
  if (!format)
    throw new Error(`Unknown format: ${name}`)

  return format
}

/**
 * Convert data to CSV format
 *
 * @remarks
 * Limitations: CSV is designed for flat tabular data only.
 *
 * This encoder:
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
