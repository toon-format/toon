import type { FieldDescriptor, JsonObject } from '../types.ts'
import { isJsonPrimitive } from './normalize.ts'

/**
 * Detect uniform nested objects in a tabular array and build descriptors.
 * Returns undefined if nested tables cannot be used (non-uniform structures).
 */
export function inferNestedFieldDescriptors(
  rows: readonly JsonObject[],
  header: readonly string[],
): FieldDescriptor[] | undefined {
  const descriptors: FieldDescriptor[] = []
  let hasNesting = false

  for (const fieldName of header) {
    const columnValues = rows.map(row => row[fieldName])

    // Check if all values are objects with identical keys (uniform nested)
    if (columnValues.every(v => v !== null && typeof v === 'object' && !Array.isArray(v))) {
      const objects = columnValues as JsonObject[]
      const firstKeys = Object.keys(objects[0]!)
      if (firstKeys.length === 0) {
        descriptors.push({ name: fieldName })
        continue
      }

      const allUniform = objects.every((obj) => {
        const keys = Object.keys(obj)
        return keys.length === firstKeys.length && firstKeys.every(k => k in obj && isJsonPrimitive(obj[k]))
      })

      if (allUniform) {
        hasNesting = true
        const subfields: FieldDescriptor[] = firstKeys.map(subKey => ({ name: subKey }))
        descriptors.push({ name: fieldName, subfields })
        continue
      }
    }

    // Simple field — must be all primitives for tabular encoding
    if (!columnValues.every(v => isJsonPrimitive(v))) {
      return undefined
    }
    descriptors.push({ name: fieldName })
  }

  return hasNesting ? descriptors : undefined
}
