import type { FieldNode, JsonObject, JsonValue } from '../types.ts'
import type { EncodablePrimitive } from './raw-string.ts'
import { isEmptyObject, isEncodablePrimitive, isJsonObject } from './normalize.ts'

/** Classifies rows into a tabular header, or undefined when they are not uniformly tabular. */
export function extractTabularHeader(rows: readonly JsonObject[]): FieldNode[] | undefined {
  if (rows.length === 0)
    return

  const firstKeys = Object.keys(rows[0]!)
  if (firstKeys.length === 0)
    return

  // All objects must have the same set of keys (order per object may vary)
  for (const row of rows) {
    if (Object.keys(row).length !== firstKeys.length) {
      return
    }

    for (const key of firstKeys) {
      if (!Object.hasOwn(row, key)) {
        return
      }
    }
  }

  const fieldNodes: FieldNode[] = []
  for (const key of firstKeys) {
    const fieldNode = classifyColumn(key, rows.map(row => row[key]!))
    if (!fieldNode) {
      return
    }
    fieldNodes.push(fieldNode)
  }

  return fieldNodes
}

/** Classifies an object's values as a keyed tabular header (>=2 uniform non-empty object entries), or undefined. */
export function extractKeyedFields(value: JsonObject): FieldNode[] | undefined {
  const entryValues = Object.values(value)

  // At least two entries whose values are uniform non-empty objects
  if (entryValues.length < 2) {
    return
  }

  if (!entryValues.every(entryValue => isJsonObject(entryValue) && !isEmptyObject(entryValue))) {
    return
  }

  return extractTabularHeader(entryValues as JsonObject[])
}

/** Reads one row's leaf cells in the field order extractTabularHeader produced. */
export function collectRowLeaves(row: JsonObject, fields: readonly FieldNode[]): EncodablePrimitive[] {
  const leaves: EncodablePrimitive[] = []
  collectLeafValues(row, fields, leaves)
  return leaves
}

function classifyColumn(name: string, values: readonly JsonValue[]): FieldNode | undefined {
  // Uniform-primitive column: a bare leaf field
  if (values.every(value => isEncodablePrimitive(value))) {
    return { name }
  }

  // Nested-uniform column: every value a non-empty object sharing one key
  // set whose sub-columns classify recursively
  if (!values.every(value => isJsonObject(value) && !isEmptyObject(value))) {
    return
  }

  const children = extractTabularHeader(values as JsonObject[])
  if (!children) {
    return
  }

  return { name, children }
}

function collectLeafValues(row: JsonObject, fields: readonly FieldNode[], leaves: EncodablePrimitive[]): void {
  for (const field of fields) {
    const value = row[field.name]
    if (field.children) {
      collectLeafValues(value as JsonObject, field.children, leaves)
    }
    else {
      leaves.push(value as EncodablePrimitive)
    }
  }
}
