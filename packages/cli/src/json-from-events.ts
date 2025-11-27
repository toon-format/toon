import type { JsonStreamEvent } from '../../toon/src/types'

/**
 * Context for tracking JSON structure state during event streaming.
 */
type JsonContext
  = | { type: 'object', needsComma: boolean, expectValue: boolean }
    | { type: 'array', needsComma: boolean }

/**
 * Converts a stream of `JsonStreamEvent` into formatted JSON string chunks.
 *
 * Similar to `jsonStringifyLines` but driven by events instead of a value tree.
 * Useful for streaming TOON decode directly to JSON output without building
 * the full data structure in memory.
 *
 * @param events - Async iterable of JSON stream events
 * @param indent - Number of spaces for indentation (0 = compact, >0 = pretty)
 * @returns Async iterable of JSON string chunks
 *
 * @example
 * ```ts
 * const lines = readLinesFromSource(input)
 * const events = decodeStream(lines)
 * for await (const chunk of jsonStreamFromEvents(events, 2)) {
 *   process.stdout.write(chunk)
 * }
 * ```
 */
export async function* jsonStreamFromEvents(
  events: AsyncIterable<JsonStreamEvent>,
  indent: number = 2,
): AsyncIterable<string> {
  const stack: JsonContext[] = []
  let depth = 0

  for await (const event of events) {
    const parent = stack.length > 0 ? stack[stack.length - 1] : undefined

    switch (event.type) {
      case 'startObject': {
        // Emit comma if needed (inside array or after previous object field value)
        if (parent) {
          if (parent.type === 'array' && parent.needsComma) {
            yield ','
          }
          else if (parent.type === 'object' && !parent.expectValue) {
            // Object field value already emitted, this is a nested object after a key
            // The comma is handled by the key event
          }
        }

        // Emit newline and indent for pretty printing
        if (indent > 0 && parent) {
          if (parent.type === 'array') {
            yield '\n'
            yield ' '.repeat(depth * indent)
          }
        }

        yield '{'
        stack.push({ type: 'object', needsComma: false, expectValue: false })
        depth++
        break
      }

      case 'endObject': {
        const context = stack.pop()
        if (!context || context.type !== 'object') {
          throw new Error('Mismatched endObject event')
        }

        depth--

        // Emit newline and indent for closing brace (pretty print)
        if (indent > 0 && context.needsComma) {
          yield '\n'
          yield ' '.repeat(depth * indent)
        }

        yield '}'

        // Mark parent as needing comma for next item
        const newParent = stack.length > 0 ? stack[stack.length - 1] : undefined
        if (newParent) {
          if (newParent.type === 'object') {
            newParent.expectValue = false
            newParent.needsComma = true
          }
          else if (newParent.type === 'array') {
            newParent.needsComma = true
          }
        }
        break
      }

      case 'startArray': {
        // Emit comma if needed
        if (parent) {
          if (parent.type === 'array' && parent.needsComma) {
            yield ','
          }
        }

        // Emit newline and indent for pretty printing
        if (indent > 0 && parent) {
          if (parent.type === 'array') {
            yield '\n'
            yield ' '.repeat(depth * indent)
          }
        }

        yield '['
        stack.push({
          type: 'array',
          needsComma: false,
        })
        depth++
        break
      }

      case 'endArray': {
        const context = stack.pop()
        if (!context || context.type !== 'array') {
          throw new Error('Mismatched endArray event')
        }

        depth--

        // Emit newline and indent for closing bracket (pretty print)
        if (indent > 0 && context.needsComma) {
          yield '\n'
          yield ' '.repeat(depth * indent)
        }

        yield ']'

        // Mark parent as needing comma for next item
        const newParent = stack.length > 0 ? stack[stack.length - 1] : undefined
        if (newParent) {
          if (newParent.type === 'object') {
            newParent.expectValue = false
            newParent.needsComma = true
          }
          else if (newParent.type === 'array') {
            newParent.needsComma = true
          }
        }
        break
      }

      case 'key': {
        if (!parent || parent.type !== 'object') {
          throw new Error('Key event outside of object context')
        }

        // Emit comma before this field if needed
        if (parent.needsComma) {
          yield ','
        }

        // Emit newline and indent (pretty print)
        if (indent > 0) {
          yield '\n'
          yield ' '.repeat(depth * indent)
        }

        // Emit key
        yield JSON.stringify(event.key)
        yield indent > 0 ? ': ' : ':'

        parent.expectValue = true
        parent.needsComma = true
        break
      }

      case 'primitive': {
        // Emit comma if needed
        if (parent) {
          if (parent.type === 'array' && parent.needsComma) {
            yield ','
          }
          else if (parent.type === 'object' && !parent.expectValue) {
            // This shouldn't happen in well-formed events
            throw new Error('Primitive event in object without preceding key')
          }
        }

        // Emit newline and indent for array items (pretty print)
        if (indent > 0 && parent && parent.type === 'array') {
          yield '\n'
          yield ' '.repeat(depth * indent)
        }

        // Emit primitive value
        yield JSON.stringify(event.value)

        // Update parent context
        if (parent) {
          if (parent.type === 'object') {
            parent.expectValue = false
            // needsComma already true from key event
          }
          else if (parent.type === 'array') {
            parent.needsComma = true
          }
        }
        break
      }
    }
  }

  // Ensure stack is empty
  if (stack.length !== 0) {
    throw new Error('Incomplete event stream: unclosed objects or arrays')
  }
}
