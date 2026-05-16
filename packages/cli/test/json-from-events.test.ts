import type { JsonStreamEvent } from '../../toon/src/types'
import { describe, expect, it } from 'vitest'
import { jsonStreamFromEvents } from '../src/json-from-events'

describe('jsonStreamFromEvents', () => {
  describe('primitives', () => {
    it('converts null event', async () => {
      const events = [
        { type: 'primitive' as const, value: null },
      ]
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 0))).toBe(JSON.stringify(null))
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 2))).toBe(JSON.stringify(null, null, 2))
    })

    it('converts boolean events', async () => {
      const eventsTrue = [{ type: 'primitive' as const, value: true }]
      const eventsFalse = [{ type: 'primitive' as const, value: false }]

      expect(await join(jsonStreamFromEvents(asyncEvents(eventsTrue), 0))).toBe(JSON.stringify(true))
      expect(await join(jsonStreamFromEvents(asyncEvents(eventsFalse), 0))).toBe(JSON.stringify(false))
      expect(await join(jsonStreamFromEvents(asyncEvents(eventsTrue), 2))).toBe(JSON.stringify(true, null, 2))
    })

    it('converts number events', async () => {
      const events0 = [{ type: 'primitive' as const, value: 0 }]
      const events42 = [{ type: 'primitive' as const, value: 42 }]
      const eventsNeg = [{ type: 'primitive' as const, value: -17 }]
      const eventsFloat = [{ type: 'primitive' as const, value: 3.14159 }]

      expect(await join(jsonStreamFromEvents(asyncEvents(events0), 0))).toBe(JSON.stringify(0))
      expect(await join(jsonStreamFromEvents(asyncEvents(events42), 0))).toBe(JSON.stringify(42))
      expect(await join(jsonStreamFromEvents(asyncEvents(eventsNeg), 0))).toBe(JSON.stringify(-17))
      expect(await join(jsonStreamFromEvents(asyncEvents(eventsFloat), 0))).toBe(JSON.stringify(3.14159))
      expect(await join(jsonStreamFromEvents(asyncEvents(events42), 2))).toBe(JSON.stringify(42, null, 2))
    })

    it('converts string events', async () => {
      const eventsEmpty = [{ type: 'primitive' as const, value: '' }]
      const eventsHello = [{ type: 'primitive' as const, value: 'hello' }]
      const eventsQuotes = [{ type: 'primitive' as const, value: 'with "quotes"' }]

      expect(await join(jsonStreamFromEvents(asyncEvents(eventsEmpty), 0))).toBe(JSON.stringify(''))
      expect(await join(jsonStreamFromEvents(asyncEvents(eventsHello), 0))).toBe(JSON.stringify('hello'))
      expect(await join(jsonStreamFromEvents(asyncEvents(eventsQuotes), 0))).toBe(JSON.stringify('with "quotes"'))
    })
  })

  describe('empty containers', () => {
    it('converts empty array events', async () => {
      const events = [
        { type: 'startArray' as const, length: 0 },
        { type: 'endArray' as const },
      ]
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 0))).toBe(JSON.stringify([], null, 0))
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 2))).toBe(JSON.stringify([], null, 2))
    })

    it('converts empty object events', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'endObject' as const },
      ]
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 0))).toBe(JSON.stringify({}, null, 0))
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 2))).toBe(JSON.stringify({}, null, 2))
    })
  })

  describe('arrays', () => {
    it('converts simple array events with compact formatting', async () => {
      const events = [
        { type: 'startArray' as const, length: 3 },
        { type: 'primitive' as const, value: 1 },
        { type: 'primitive' as const, value: 2 },
        { type: 'primitive' as const, value: 3 },
        { type: 'endArray' as const },
      ]
      const value = [1, 2, 3]
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 0))).toBe(JSON.stringify(value, null, 0))
    })

    it('converts simple array events with pretty formatting', async () => {
      const events = [
        { type: 'startArray' as const, length: 3 },
        { type: 'primitive' as const, value: 1 },
        { type: 'primitive' as const, value: 2 },
        { type: 'primitive' as const, value: 3 },
        { type: 'endArray' as const },
      ]
      const value = [1, 2, 3]
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('converts mixed-type array events', async () => {
      const events = [
        { type: 'startArray' as const, length: 5 },
        { type: 'primitive' as const, value: 1 },
        { type: 'primitive' as const, value: 'two' },
        { type: 'primitive' as const, value: true },
        { type: 'primitive' as const, value: null },
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'key' },
        { type: 'primitive' as const, value: 'value' },
        { type: 'endObject' as const },
        { type: 'endArray' as const },
      ]
      const value = [1, 'two', true, null, { key: 'value' }]
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 0))).toBe(JSON.stringify(value, null, 0))
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('converts nested array events', async () => {
      const events = [
        { type: 'startArray' as const, length: 3 },
        { type: 'startArray' as const, length: 2 },
        { type: 'primitive' as const, value: 1 },
        { type: 'primitive' as const, value: 2 },
        { type: 'endArray' as const },
        { type: 'startArray' as const, length: 2 },
        { type: 'primitive' as const, value: 3 },
        { type: 'primitive' as const, value: 4 },
        { type: 'endArray' as const },
        { type: 'startArray' as const, length: 2 },
        { type: 'primitive' as const, value: 5 },
        { type: 'primitive' as const, value: 6 },
        { type: 'endArray' as const },
        { type: 'endArray' as const },
      ]
      const value = [[1, 2], [3, 4], [5, 6]]
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 0))).toBe(JSON.stringify(value, null, 0))
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 2))).toBe(JSON.stringify(value, null, 2))
    })
  })

  describe('objects', () => {
    it('converts simple object events with compact formatting', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'a' },
        { type: 'primitive' as const, value: 1 },
        { type: 'key' as const, key: 'b' },
        { type: 'primitive' as const, value: 2 },
        { type: 'key' as const, key: 'c' },
        { type: 'primitive' as const, value: 3 },
        { type: 'endObject' as const },
      ]
      const value = { a: 1, b: 2, c: 3 }
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 0))).toBe(JSON.stringify(value, null, 0))
    })

    it('converts simple object events with pretty formatting', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'a' },
        { type: 'primitive' as const, value: 1 },
        { type: 'key' as const, key: 'b' },
        { type: 'primitive' as const, value: 2 },
        { type: 'key' as const, key: 'c' },
        { type: 'primitive' as const, value: 3 },
        { type: 'endObject' as const },
      ]
      const value = { a: 1, b: 2, c: 3 }
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('converts object events with mixed value types', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'num' },
        { type: 'primitive' as const, value: 42 },
        { type: 'key' as const, key: 'str' },
        { type: 'primitive' as const, value: 'hello' },
        { type: 'key' as const, key: 'bool' },
        { type: 'primitive' as const, value: true },
        { type: 'key' as const, key: 'nil' },
        { type: 'primitive' as const, value: null },
        { type: 'key' as const, key: 'arr' },
        { type: 'startArray' as const, length: 3 },
        { type: 'primitive' as const, value: 1 },
        { type: 'primitive' as const, value: 2 },
        { type: 'primitive' as const, value: 3 },
        { type: 'endArray' as const },
        { type: 'endObject' as const },
      ]
      const value = {
        num: 42,
        str: 'hello',
        bool: true,
        nil: null,
        arr: [1, 2, 3],
      }
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 0))).toBe(JSON.stringify(value, null, 0))
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('converts nested object events', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'level1' },
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'level2' },
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'level3' },
        { type: 'primitive' as const, value: 'deep' },
        { type: 'endObject' as const },
        { type: 'endObject' as const },
        { type: 'endObject' as const },
      ]
      const value = {
        level1: {
          level2: {
            level3: 'deep',
          },
        },
      }
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 0))).toBe(JSON.stringify(value, null, 0))
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('handles special characters in keys', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'normal-key' },
        { type: 'primitive' as const, value: 1 },
        { type: 'key' as const, key: 'key with spaces' },
        { type: 'primitive' as const, value: 2 },
        { type: 'key' as const, key: 'key:with:colons' },
        { type: 'primitive' as const, value: 3 },
        { type: 'key' as const, key: 'key"with"quotes' },
        { type: 'primitive' as const, value: 4 },
        { type: 'endObject' as const },
      ]
      const value = {
        'normal-key': 1,
        'key with spaces': 2,
        'key:with:colons': 3,
        'key"with"quotes': 4,
      }
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 0))).toBe(JSON.stringify(value, null, 0))
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 2))).toBe(JSON.stringify(value, null, 2))
    })
  })

  describe('complex nested structures', () => {
    it('converts object containing arrays', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'name' },
        { type: 'primitive' as const, value: 'Alice' },
        { type: 'key' as const, key: 'scores' },
        { type: 'startArray' as const, length: 3 },
        { type: 'primitive' as const, value: 95 },
        { type: 'primitive' as const, value: 87 },
        { type: 'primitive' as const, value: 92 },
        { type: 'endArray' as const },
        { type: 'key' as const, key: 'metadata' },
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'tags' },
        { type: 'startArray' as const, length: 2 },
        { type: 'primitive' as const, value: 'math' },
        { type: 'primitive' as const, value: 'science' },
        { type: 'endArray' as const },
        { type: 'endObject' as const },
        { type: 'endObject' as const },
      ]
      const value = {
        name: 'Alice',
        scores: [95, 87, 92],
        metadata: {
          tags: ['math', 'science'],
        },
      }
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 0))).toBe(JSON.stringify(value, null, 0))
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('converts array of objects', async () => {
      const events = [
        { type: 'startArray' as const, length: 3 },
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'id' },
        { type: 'primitive' as const, value: 1 },
        { type: 'key' as const, key: 'name' },
        { type: 'primitive' as const, value: 'Alice' },
        { type: 'endObject' as const },
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'id' },
        { type: 'primitive' as const, value: 2 },
        { type: 'key' as const, key: 'name' },
        { type: 'primitive' as const, value: 'Bob' },
        { type: 'endObject' as const },
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'id' },
        { type: 'primitive' as const, value: 3 },
        { type: 'key' as const, key: 'name' },
        { type: 'primitive' as const, value: 'Charlie' },
        { type: 'endObject' as const },
        { type: 'endArray' as const },
      ]
      const value = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 0))).toBe(JSON.stringify(value, null, 0))
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 2))).toBe(JSON.stringify(value, null, 2))
    })
  })

  describe('indentation levels', () => {
    const events = [
      { type: 'startObject' as const },
      { type: 'key' as const, key: 'a' },
      { type: 'startArray' as const, length: 2 },
      { type: 'primitive' as const, value: 1 },
      { type: 'primitive' as const, value: 2 },
      { type: 'endArray' as const },
      { type: 'key' as const, key: 'b' },
      { type: 'startObject' as const },
      { type: 'key' as const, key: 'c' },
      { type: 'primitive' as const, value: 3 },
      { type: 'endObject' as const },
      { type: 'endObject' as const },
    ]
    const value = { a: [1, 2], b: { c: 3 } }

    it('handles indent=0 (compact)', async () => {
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 0))).toBe(JSON.stringify(value, null, 0))
    })

    it('handles indent=2', async () => {
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('handles indent=4', async () => {
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 4))).toBe(JSON.stringify(value, null, 4))
    })

    it('handles indent=8', async () => {
      expect(await join(jsonStreamFromEvents(asyncEvents(events), 8))).toBe(JSON.stringify(value, null, 8))
    })
  })

  describe('error handling', () => {
    it('throws on mismatched endObject event', async () => {
      const events = [
        { type: 'startArray' as const, length: 0 },
        { type: 'endObject' as const }, // Wrong closing event
      ]

      await expect(async () => {
        await join(jsonStreamFromEvents(asyncEvents(events), 0))
      }).rejects.toThrow('Mismatched endObject event')
    })

    it('throws on mismatched endArray event', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'endArray' as const }, // Wrong closing event
      ]

      await expect(async () => {
        await join(jsonStreamFromEvents(asyncEvents(events), 0))
      }).rejects.toThrow('Mismatched endArray event')
    })

    it('throws on key event outside object context', async () => {
      const events = [
        { type: 'key' as const, key: 'invalid' },
        { type: 'primitive' as const, value: 1 },
      ]

      await expect(async () => {
        await join(jsonStreamFromEvents(asyncEvents(events), 0))
      }).rejects.toThrow('Key event outside of object context')
    })

    it('throws on primitive in object without preceding key', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'primitive' as const, value: 'invalid' }, // No key before primitive
        { type: 'endObject' as const },
      ]

      await expect(async () => {
        await join(jsonStreamFromEvents(asyncEvents(events), 0))
      }).rejects.toThrow('Primitive event in object without preceding key')
    })

    it('throws on incomplete event stream', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'name' },
        { type: 'primitive' as const, value: 'Alice' },
        // Missing `endObject`
      ]

      await expect(async () => {
        await join(jsonStreamFromEvents(asyncEvents(events), 0))
      }).rejects.toThrow('Incomplete event stream: unclosed objects or arrays')
    })
  })
})

/**
 * Converts array of events to async iterable.
 */
async function* asyncEvents(events: JsonStreamEvent[]): AsyncIterable<JsonStreamEvent> {
  for (const event of events) {
    await Promise.resolve()
    yield event
  }
}

/**
 * Joins chunks from an async iterable into a single string.
 */
async function join(iter: AsyncIterable<string>): Promise<string> {
  const chunks: string[] = []
  for await (const chunk of iter) {
    chunks.push(chunk)
  }
  return chunks.join('')
}
