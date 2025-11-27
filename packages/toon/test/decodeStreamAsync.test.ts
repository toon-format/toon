import { describe, expect, it } from 'vitest'
import { buildValueFromEventsAsync } from '../src/decode/event-builder'
import { decodeStream } from '../src/index'

describe('async streaming decode', () => {
  describe('decodeStream (async)', () => {
    it('decodes simple object', async () => {
      const input = 'name: Alice\nage: 30'
      const lines = input.split('\n')
      const events = await collect(decodeStream(asyncLines(lines)))

      expect(events).toEqual([
        { type: 'startObject' },
        { type: 'key', key: 'name' },
        { type: 'primitive', value: 'Alice' },
        { type: 'key', key: 'age' },
        { type: 'primitive', value: 30 },
        { type: 'endObject' },
      ])
    })

    it('decodes nested object', async () => {
      const input = 'user:\n  name: Alice\n  age: 30'
      const lines = input.split('\n')
      const events = await collect(decodeStream(asyncLines(lines)))

      expect(events).toEqual([
        { type: 'startObject' },
        { type: 'key', key: 'user' },
        { type: 'startObject' },
        { type: 'key', key: 'name' },
        { type: 'primitive', value: 'Alice' },
        { type: 'key', key: 'age' },
        { type: 'primitive', value: 30 },
        { type: 'endObject' },
        { type: 'endObject' },
      ])
    })

    it('decodes inline primitive array', async () => {
      const input = 'scores[3]: 95, 87, 92'
      const lines = input.split('\n')
      const events = await collect(decodeStream(asyncLines(lines)))

      expect(events).toEqual([
        { type: 'startObject' },
        { type: 'key', key: 'scores' },
        { type: 'startArray', length: 3 },
        { type: 'primitive', value: 95 },
        { type: 'primitive', value: 87 },
        { type: 'primitive', value: 92 },
        { type: 'endArray' },
        { type: 'endObject' },
      ])
    })

    it('decodes list array', async () => {
      const input = 'items[2]:\n  - Apple\n  - Banana'
      const lines = input.split('\n')
      const events = await collect(decodeStream(asyncLines(lines)))

      expect(events).toEqual([
        { type: 'startObject' },
        { type: 'key', key: 'items' },
        { type: 'startArray', length: 2 },
        { type: 'primitive', value: 'Apple' },
        { type: 'primitive', value: 'Banana' },
        { type: 'endArray' },
        { type: 'endObject' },
      ])
    })

    it('decodes tabular array', async () => {
      const input = 'users[2]{name,age}:\n  Alice, 30\n  Bob, 25'
      const lines = input.split('\n')
      const events = await collect(decodeStream(asyncLines(lines)))

      expect(events).toEqual([
        { type: 'startObject' },
        { type: 'key', key: 'users' },
        { type: 'startArray', length: 2 },
        { type: 'startObject' },
        { type: 'key', key: 'name' },
        { type: 'primitive', value: 'Alice' },
        { type: 'key', key: 'age' },
        { type: 'primitive', value: 30 },
        { type: 'endObject' },
        { type: 'startObject' },
        { type: 'key', key: 'name' },
        { type: 'primitive', value: 'Bob' },
        { type: 'key', key: 'age' },
        { type: 'primitive', value: 25 },
        { type: 'endObject' },
        { type: 'endArray' },
        { type: 'endObject' },
      ])
    })

    it('decodes root primitive', async () => {
      const input = 'Hello World'
      const lines = input.split('\n')
      const events = await collect(decodeStream(asyncLines(lines)))

      expect(events).toEqual([
        { type: 'primitive', value: 'Hello World' },
      ])
    })

    it('decodes root array', async () => {
      const input = '[2]:\n  - Apple\n  - Banana'
      const lines = input.split('\n')
      const events = await collect(decodeStream(asyncLines(lines)))

      expect(events).toEqual([
        { type: 'startArray', length: 2 },
        { type: 'primitive', value: 'Apple' },
        { type: 'primitive', value: 'Banana' },
        { type: 'endArray' },
      ])
    })

    it('decodes empty input as empty object', async () => {
      const lines: string[] = []
      const events = await collect(decodeStream(asyncLines(lines)))

      expect(events).toEqual([
        { type: 'startObject' },
        { type: 'endObject' },
      ])
    })

    it('throws on expandPaths option', async () => {
      const input = 'name: Alice'
      const lines = input.split('\n')

      await expect(async () => {
        await collect(decodeStream(asyncLines(lines), { expandPaths: 'safe' } as any))
      }).rejects.toThrow('expandPaths is not supported in streaming decode')
    })

    it('enforces strict mode validation', async () => {
      const input = 'items[2]:\n  - Apple'
      const lines = input.split('\n')

      await expect(async () => {
        await collect(decodeStream(asyncLines(lines), { strict: true }))
      }).rejects.toThrow()
    })

    it('allows count mismatch in non-strict mode', async () => {
      const input = 'items[2]:\n  - Apple'
      const lines = input.split('\n')

      // Should not throw in non-strict mode
      const events = await collect(decodeStream(asyncLines(lines), { strict: false }))

      expect(events).toBeDefined()
      expect(events[0]).toEqual({ type: 'startObject' })
    })
  })

  describe('buildValueFromEventsAsync', () => {
    it('builds object from events', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'name' },
        { type: 'primitive' as const, value: 'Alice' },
        { type: 'key' as const, key: 'age' },
        { type: 'primitive' as const, value: 30 },
        { type: 'endObject' as const },
      ]

      const result = await buildValueFromEventsAsync(asyncEvents(events))

      expect(result).toEqual({ name: 'Alice', age: 30 })
    })

    it('builds nested object from events', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'user' },
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'name' },
        { type: 'primitive' as const, value: 'Alice' },
        { type: 'endObject' as const },
        { type: 'endObject' as const },
      ]

      const result = await buildValueFromEventsAsync(asyncEvents(events))

      expect(result).toEqual({ user: { name: 'Alice' } })
    })

    it('builds array from events', async () => {
      const events = [
        { type: 'startArray' as const, length: 3 },
        { type: 'primitive' as const, value: 1 },
        { type: 'primitive' as const, value: 2 },
        { type: 'primitive' as const, value: 3 },
        { type: 'endArray' as const },
      ]

      const result = await buildValueFromEventsAsync(asyncEvents(events))

      expect(result).toEqual([1, 2, 3])
    })

    it('builds primitive from events', async () => {
      const events = [
        { type: 'primitive' as const, value: 'Hello' },
      ]

      const result = await buildValueFromEventsAsync(asyncEvents(events))

      expect(result).toEqual('Hello')
    })

    it('throws on incomplete event stream', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'name' },
        // Missing primitive and `endObject`
      ]

      await expect(async () => {
        await buildValueFromEventsAsync(asyncEvents(events))
      }).rejects.toThrow('Incomplete event stream')
    })
  })
})

/**
 * Collects all items from an async iterable into an array.
 */
async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = []
  for await (const item of iterable) {
    results.push(item)
  }
  return results
}

/**
 * Converts array of lines to async iterable.
 */
async function* asyncLines(lines: string[]): AsyncGenerator<string> {
  for (const line of lines) {
    await Promise.resolve()
    yield line
  }
}

/**
 * Converts array of events to async iterable.
 */
async function* asyncEvents<T>(events: T[]): AsyncGenerator<T> {
  for (const event of events) {
    await Promise.resolve()
    yield event
  }
}
