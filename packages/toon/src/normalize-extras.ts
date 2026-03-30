export interface NormalizeExtrasOptions {
  threshold?: number
  maxFlattenDepth?: number
}

const DEFAULT_THRESHOLD = 0.2
const DEFAULT_MAX_FLATTEN_DEPTH = 3

// Token cost heuristics for net benefit calculation
const AVG_KEY_TOKENS = 2
const HEADER_OVERHEAD = 5
const IDX_OVERHEAD = 1

export function normalizeForToon(
  data: Record<string, unknown>,
  options?: NormalizeExtrasOptions,
): Record<string, unknown> {
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD
  const maxFlattenDepth = options?.maxFlattenDepth ?? DEFAULT_MAX_FLATTEN_DEPTH
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (!Array.isArray(value) || value.length === 0 || !isArrayOfObjects(value)) {
      result[key] = value
      continue
    }

    const objects = value as Record<string, unknown>[]

    // Compute field intersection (base) and difference (extras)
    const allFieldSets = objects.map(obj => new Set(Object.keys(obj)))
    const baseFields = intersect(allFieldSets)
    const extraFieldNames = union(allFieldSets.map(s => difference(s, baseFields)))

    if (extraFieldNames.size === 0) {
      // Already uniform — passthrough
      result[key] = value
      continue
    }

    // Group extras: each top-level extra field is its own group
    const groups = new Map<string, { indices: number[], rows: Record<string, unknown>[] }>()

    for (const fieldName of extraFieldNames) {
      const indices: number[] = []
      const rows: Record<string, unknown>[] = []

      for (let i = 0; i < objects.length; i++) {
        if (fieldName in objects[i]!) {
          indices.push(i)
          rows.push({ idx: i, value: objects[i]![fieldName] })
        }
      }

      groups.set(fieldName, { indices, rows })
    }

    // Build base table (strip all extra fields)
    const baseRows = objects.map((obj) => {
      const row: Record<string, unknown> = {}
      for (const f of baseFields) {
        row[f] = obj[f]
      }
      return row
    })

    result[key] = baseRows

    // Process each extras group
    for (const [fieldName, group] of groups) {
      const ratio = group.indices.length / objects.length

      if (ratio < threshold) {
        // Below threshold — skip splitting
        continue
      }

      // Flatten each extra value
      const flattenedRows = group.rows.map((row) => {
        const flat: Record<string, unknown> = { idx: row.idx }
        flattenValue(flat, '', row.value, 0, maxFlattenDepth)
        return flat
      })

      // Collect all keys across flattened rows for null-padding
      const allKeys = new Set<string>()
      for (const row of flattenedRows) {
        for (const k of Object.keys(row)) {
          allKeys.add(k)
        }
      }

      // Calculate net benefit
      const flatFieldCount = allKeys.size - 1 // exclude idx
      const benefit = group.indices.length * flatFieldCount * AVG_KEY_TOKENS
        - (HEADER_OVERHEAD + group.indices.length * IDX_OVERHEAD)

      if (benefit <= 0) continue

      // Null-pad missing keys
      const paddedRows = flattenedRows.map((row) => {
        const padded: Record<string, unknown> = {}
        for (const k of allKeys) {
          padded[k] = k in row ? row[k] : null
        }
        return padded
      })

      result[`${key}.${fieldName}`] = paddedRows
    }
  }

  return result
}

function flattenValue(
  target: Record<string, unknown>,
  prefix: string,
  value: unknown,
  currentDepth: number,
  maxDepth: number,
): void {
  if (value === null || value === undefined) {
    if (prefix) target[prefix] = null
    return
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    // Primitives go directly; arrays get JSON-serialized
    target[prefix] = Array.isArray(value) ? JSON.stringify(value) : value
    return
  }

  // It's an object — check depth
  if (currentDepth >= maxDepth) {
    target[prefix] = JSON.stringify(value)
    return
  }

  const obj = value as Record<string, unknown>
  for (const [k, v] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${k}` : k
    flattenValue(target, newKey, v, currentDepth + 1, maxDepth)
  }
}

function isArrayOfObjects(arr: unknown[]): boolean {
  return arr.every(item => item !== null && typeof item === 'object' && !Array.isArray(item))
}

function intersect(sets: Set<string>[]): Set<string> {
  if (sets.length === 0) return new Set()
  const result = new Set(sets[0])
  for (let i = 1; i < sets.length; i++) {
    for (const item of result) {
      if (!sets[i]!.has(item)) result.delete(item)
    }
  }
  return result
}

function union(sets: Set<string>[]): Set<string> {
  const result = new Set<string>()
  for (const s of sets) {
    for (const item of s) result.add(item)
  }
  return result
}

function difference(a: Set<string>, b: Set<string>): Set<string> {
  const result = new Set<string>()
  for (const item of a) {
    if (!b.has(item)) result.add(item)
  }
  return result
}
