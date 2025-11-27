/**
 * Streaming JSON stringifier.
 *
 * Yields JSON tokens one at a time, allowing streaming output without holding
 * the entire JSON string in memory.
 *
 * @param value - The value to stringify (must be JSON-serializable)
 * @param indent - Number of spaces for indentation (0 = compact, >0 = pretty)
 * @returns Generator that yields JSON string chunks
 *
 * @example
 * ```ts
 * const data = { name: "Alice", scores: [95, 87, 92] }
 * for (const chunk of jsonStringifyLines(data, 2)) {
 *   process.stdout.write(chunk)
 * }
 * ```
 */
export function* jsonStringifyLines(
  value: unknown,
  indent: number = 2,
): Iterable<string> {
  yield* stringifyValue(value, 0, indent)
}

/**
 * Internal generator for recursive stringification.
 */
function* stringifyValue(
  value: unknown,
  depth: number,
  indent: number,
): Iterable<string> {
  // Handle null
  if (value === null) {
    yield 'null'
    return
  }

  const type = typeof value

  // Handle primitives
  if (type === 'boolean' || type === 'number') {
    yield JSON.stringify(value)
    return
  }

  if (type === 'string') {
    yield JSON.stringify(value)
    return
  }

  // Handle arrays
  if (Array.isArray(value)) {
    yield* stringifyArray(value, depth, indent)
    return
  }

  // Handle objects
  if (type === 'object') {
    yield* stringifyObject(value as Record<string, unknown>, depth, indent)
    return
  }

  // Undefined, functions, symbols become null in JSON
  yield 'null'
}

/**
 * Stringify an array with proper formatting.
 */
function* stringifyArray(
  arr: unknown[],
  depth: number,
  indent: number,
): Iterable<string> {
  if (arr.length === 0) {
    yield '[]'
    return
  }

  yield '['

  if (indent > 0) {
    // Pretty-printed format
    for (let i = 0; i < arr.length; i++) {
      yield '\n'
      yield ' '.repeat((depth + 1) * indent)
      yield* stringifyValue(arr[i], depth + 1, indent)
      if (i < arr.length - 1) {
        yield ','
      }
    }
    yield '\n'
    yield ' '.repeat(depth * indent)
    yield ']'
  }
  else {
    // Compact format
    for (let i = 0; i < arr.length; i++) {
      yield* stringifyValue(arr[i], depth + 1, indent)
      if (i < arr.length - 1) {
        yield ','
      }
    }
    yield ']'
  }
}

/**
 * Stringify an object with proper formatting.
 */
function* stringifyObject(
  obj: Record<string, unknown>,
  depth: number,
  indent: number,
): Iterable<string> {
  const keys = Object.keys(obj)

  if (keys.length === 0) {
    yield '{}'
    return
  }

  yield '{'

  if (indent > 0) {
    // Pretty-printed format
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!
      const value = obj[key]

      yield '\n'
      yield ' '.repeat((depth + 1) * indent)
      yield JSON.stringify(key)
      yield ': '
      yield* stringifyValue(value, depth + 1, indent)
      if (i < keys.length - 1) {
        yield ','
      }
    }
    yield '\n'
    yield ' '.repeat(depth * indent)
    yield '}'
  }
  else {
    // Compact format
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!
      const value = obj[key]

      yield JSON.stringify(key)
      yield ':'
      yield* stringifyValue(value, depth + 1, indent)
      if (i < keys.length - 1) {
        yield ','
      }
    }
    yield '}'
  }
}
