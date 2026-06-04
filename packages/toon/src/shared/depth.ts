import { DEFAULT_MAX_DEPTH } from '../constants.ts'

export function resolveMaxDepth(maxDepth: number | undefined): number {
  const resolved = maxDepth ?? DEFAULT_MAX_DEPTH

  if (resolved === Number.POSITIVE_INFINITY) {
    return resolved
  }

  if (!Number.isInteger(resolved) || resolved < 0) {
    throw new RangeError('maxDepth must be a non-negative integer or Infinity')
  }

  return resolved
}

export function assertMaxDepth(depth: number, maxDepth: number, label: string): void {
  if (depth > maxDepth) {
    throw new RangeError(`${label} exceeds maxDepth of ${formatMaxDepth(maxDepth)}`)
  }
}

export function formatMaxDepth(maxDepth: number): string {
  return maxDepth === Number.POSITIVE_INFINITY ? 'Infinity' : String(maxDepth)
}
