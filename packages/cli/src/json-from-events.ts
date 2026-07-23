import type { JsonStreamEvent } from '../../toon/src/types.ts'

/**
 * Context for tracking JSON structure state during event streaming.
 */
type JsonContext
  = | { type: 'object', needsComma: boolean, expectValue: boolean }
    | { type: 'array', needsComma: boolean }

// Array elements own their separator because no key event precedes them, unlike object values positioned by the preceding key
function* emitValuePrefix(
  parent: JsonContext | undefined,
  depth: number,
  indent: number,
): Generator<string> {
  if (parent?.type === 'array') {
    if (parent.needsComma) {
      yield ','
    }

    if (indent > 0) {
      yield '\n'
      yield ' '.repeat(depth * indent)
    }
  }
}

// Records that a value finished, so the parent expects a comma before the next entry
function markValueComplete(parent: JsonContext | undefined): void {
  if (parent?.type === 'object') {
    parent.expectValue = false
    parent.needsComma = true
  }
  else if (parent?.type === 'array') {
    parent.needsComma = true
  }
}

/**
 * Converts a stream of `JsonStreamEvent` into formatted JSON string chunks,
 * streaming decode output without building the full value in memory.
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
        yield* emitValuePrefix(parent, depth, indent)

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

        if (indent > 0 && context.needsComma) {
          yield '\n'
          yield ' '.repeat(depth * indent)
        }

        yield '}'

        const newParent = stack.length > 0 ? stack[stack.length - 1] : undefined
        markValueComplete(newParent)
        break
      }

      case 'startArray': {
        yield* emitValuePrefix(parent, depth, indent)

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

        if (indent > 0 && context.needsComma) {
          yield '\n'
          yield ' '.repeat(depth * indent)
        }

        yield ']'

        const newParent = stack.length > 0 ? stack[stack.length - 1] : undefined
        markValueComplete(newParent)
        break
      }

      case 'key': {
        if (!parent || parent.type !== 'object') {
          throw new Error('Key event outside of object context')
        }

        if (parent.needsComma) {
          yield ','
        }

        if (indent > 0) {
          yield '\n'
          yield ' '.repeat(depth * indent)
        }

        yield JSON.stringify(event.key)
        yield indent > 0 ? ': ' : ':'

        parent.expectValue = true
        parent.needsComma = true
        break
      }

      case 'primitive': {
        if (parent?.type === 'object' && !parent.expectValue) {
          throw new Error('Primitive event in object without preceding key')
        }

        yield* emitValuePrefix(parent, depth, indent)

        yield JSON.stringify(event.value)

        markValueComplete(parent)
        break
      }
    }
  }

  if (stack.length !== 0) {
    throw new Error('Incomplete event stream: unclosed objects or arrays')
  }
}
