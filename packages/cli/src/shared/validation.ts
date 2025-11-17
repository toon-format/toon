import { DEFAULT_DELIMITER, DELIMITERS, type Delimiter } from '../../../toon/src'

// Validation helpers shared across all CLI commands
export function validateNumber(value: unknown, name: string, defaultValue?: number): number {
  const num = Number.parseInt(String(value || defaultValue || 0), 10)
  if (Number.isNaN(num) || num < 0) {
    throw new Error(`Invalid ${name} value: ${value}`)
  }
  return num
}

export function validateEnum<T extends string>(value: unknown, validValues: readonly T[], name: string, defaultValue: T): T {
  const val = String(value || defaultValue)
  if (!validValues.includes(val as T)) {
    throw new Error(`Invalid ${name} "${val}". Valid values: ${validValues.join(', ')}`)
  }
  return val as T
}

export function validateDelimiter(value: unknown, defaultValue: Delimiter = DEFAULT_DELIMITER): Delimiter {
  const val = String(value || defaultValue)
  if (!Object.values(DELIMITERS).includes(val as Delimiter)) {
    throw new Error(`Invalid delimiter "${val}". Valid delimiters: comma (,), tab (\\t), pipe (|)`)
  }
  return val as Delimiter
}