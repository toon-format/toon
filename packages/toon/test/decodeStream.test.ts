import type { JsonStreamEvent } from '../src/index'
import { describe, expect, it } from 'vitest'
import { buildValueFromEvents, buildValueFromEventsAsync } from '../src/decode/event-builder'
import { decode, decodeFromLines, decodeStream, decodeStreamSync } from '../src/index'

describe('streaming decode', () => {
  describe('decodeStreamSync', () => {
    it('decodes simple object', () => {
      const input = 'name: Alice\nage: 30'
      const lines = input.split('\n')
      const events = Array.from(decodeStreamSync(lines))

      expect(events).toEqual([
        { type: 'startObject' },
        { type: 'key', key: 'name' },
        { type: 'primitive', value: 'Alice' },
        { type: 'key', key: 'age' },
        { type: 'primitive', value: 30 },
        { type: 'endObject' },
      ])
    })

    it('decodes nested object', () => {
      const input = 'user:\n  name: Alice\n  age: 30'
      const lines = input.split('\n')
      const events = Array.from(decodeStreamSync(lines))

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

    it('decodes inline primitive array', () => {
      const input = 'scores[3]: 95, 87, 92'
      const lines = input.split('\n')
      const events = Array.from(decodeStreamSync(lines))

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

    it('decodes inline array with empty string key', () => {
      const input = '""[2]: 1,2'
      const lines = input.split('\n')
      const events = Array.from(decodeStreamSync(lines))

      expect(events).toEqual([
        { type: 'startObject' },
        { type: 'key', key: '' },
        { type: 'startArray', length: 2 },
        { type: 'primitive', value: 1 },
        { type: 'primitive', value: 2 },
        { type: 'endArray' },
        { type: 'endObject' },
      ])
    })

    it('decodes list array', () => {
      const input = 'items[2]:\n  - Apple\n  - Banana'
      const lines = input.split('\n')
      const events = Array.from(decodeStreamSync(lines))

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

    it('decodes tabular array', () => {
      const input = 'users[2]{name,age}:\n  Alice, 30\n  Bob, 25'
      const lines = input.split('\n')
      const events = Array.from(decodeStreamSync(lines))

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

    it('decodes root primitive', () => {
      const input = 'Hello World'
      const lines = input.split('\n')
      const events = Array.from(decodeStreamSync(lines))

      expect(events).toEqual([
        { type: 'primitive', value: 'Hello World' },
      ])
    })

    it('decodes root array', () => {
      const input = '[2]:\n  - Apple\n  - Banana'
      const lines = input.split('\n')
      const events = Array.from(decodeStreamSync(lines))

      expect(events).toEqual([
        { type: 'startArray', length: 2 },
        { type: 'primitive', value: 'Apple' },
        { type: 'primitive', value: 'Banana' },
        { type: 'endArray' },
      ])
    })

    it('decodes empty input as empty object', () => {
      const lines: string[] = []
      const events = Array.from(decodeStreamSync(lines))

      expect(events).toEqual([
        { type: 'startObject' },
        { type: 'endObject' },
      ])
    })

    it('throws on expandPaths option', () => {
      const input = 'name: Alice'
      const lines = input.split('\n')

      expect(() => Array.from(decodeStreamSync(lines, { expandPaths: 'safe' } as any)))
        .toThrow('expandPaths is not supported in streaming decode')
    })

    it('enforces strict mode validation', () => {
      const input = 'items[2]:\n  - Apple'
      const lines = input.split('\n')

      expect(() => Array.from(decodeStreamSync(lines, { strict: true })))
        .toThrow()
    })

    it('allows count mismatch in non-strict mode', () => {
      const input = 'items[2]:\n  - Apple'
      const lines = input.split('\n')

      const events = Array.from(decodeStreamSync(lines, { strict: false }))

      expect(events).toBeDefined()
      expect(events[0]).toEqual({ type: 'startObject' })
    })
  })

  describe('decodeStream (async)', () => {
    const equivalenceCases = [
      { name: 'simple object', input: 'name: Alice\nage: 30' },
      { name: 'nested object', input: 'user:\n  name: Alice\n  age: 30' },
      { name: 'tabular array', input: 'users[2]{name,age}:\n  Alice, 30\n  Bob, 25' },
      { name: 'list array', input: 'items[2]:\n  - Apple\n  - Banana' },
      { name: 'root primitive', input: 'Hello World' },
      { name: 'root array', input: '[2]:\n  - Apple\n  - Banana' },
      { name: 'empty input', input: '' },
    ]

    for (const { name, input } of equivalenceCases) {
      it(`emits the same events as decodeStreamSync for ${name}`, async () => {
        const lines = input === '' ? [] : input.split('\n')
        const syncResult = Array.from(decodeStreamSync(lines))
        const asyncResult = await collect(decodeStream(asyncLines(lines)))
        expect(asyncResult).toEqual(syncResult)
      })
    }

    it('accepts a sync iterable as source', async () => {
      const lines = ['name: Alice', 'age: 30']
      const events = await collect(decodeStream(lines))

      expect(events).toEqual(Array.from(decodeStreamSync(lines)))
    })

    it('rejects expandPaths option', async () => {
      const lines = ['name: Alice']

      await expect(async () => {
        await collect(decodeStream(asyncLines(lines), { expandPaths: 'safe' } as any))
      }).rejects.toThrow('expandPaths is not supported in streaming decode')
    })

    it('enforces strict mode validation', async () => {
      const lines = ['items[2]:', '  - Apple']

      await expect(async () => {
        await collect(decodeStream(asyncLines(lines), { strict: true }))
      }).rejects.toThrow()
    })

    it('allows count mismatch in non-strict mode', async () => {
      const lines = ['items[2]:', '  - Apple']
      const events = await collect(decodeStream(asyncLines(lines), { strict: false }))

      expect(events[0]).toEqual({ type: 'startObject' })
    })
  })

  describe('buildValueFromEvents', () => {
    it('builds object from events', () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'name' },
        { type: 'primitive' as const, value: 'Alice' },
        { type: 'key' as const, key: 'age' },
        { type: 'primitive' as const, value: 30 },
        { type: 'endObject' as const },
      ]

      const result = buildValueFromEvents(events)

      expect(result).toEqual({ name: 'Alice', age: 30 })
    })

    it('builds nested object from events', () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'user' },
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'name' },
        { type: 'primitive' as const, value: 'Alice' },
        { type: 'endObject' as const },
        { type: 'endObject' as const },
      ]

      const result = buildValueFromEvents(events)

      expect(result).toEqual({ user: { name: 'Alice' } })
    })

    it('builds array from events', () => {
      const events = [
        { type: 'startArray' as const, length: 3 },
        { type: 'primitive' as const, value: 1 },
        { type: 'primitive' as const, value: 2 },
        { type: 'primitive' as const, value: 3 },
        { type: 'endArray' as const },
      ]

      const result = buildValueFromEvents(events)

      expect(result).toEqual([1, 2, 3])
    })

    it('builds primitive from events', () => {
      const events = [
        { type: 'primitive' as const, value: 'Hello' },
      ]

      const result = buildValueFromEvents(events)

      expect(result).toEqual('Hello')
    })

    it('throws on incomplete event stream', () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'name' },
      ]

      expect(() => buildValueFromEvents(events))
        .toThrow('Incomplete event stream')
    })
  })

  describe('buildValueFromEventsAsync', () => {
    it('matches buildValueFromEvents for representative shapes', async () => {
      const cases: JsonStreamEvent[][] = [
        [
          { type: 'startObject' },
          { type: 'key', key: 'name' },
          { type: 'primitive', value: 'Alice' },
          { type: 'endObject' },
        ],
        [
          { type: 'startArray', length: 2 },
          { type: 'primitive', value: 1 },
          { type: 'primitive', value: 2 },
          { type: 'endArray' },
        ],
        [
          { type: 'primitive', value: 'Hello' },
        ],
      ]

      for (const events of cases) {
        const syncResult = buildValueFromEvents(events)
        const asyncResult = await buildValueFromEventsAsync(asyncEvents(events))
        expect(asyncResult).toEqual(syncResult)
      }
    })

    it('throws on incomplete event stream', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'name' },
      ]

      await expect(buildValueFromEventsAsync(asyncEvents(events)))
        .rejects
        .toThrow('Incomplete event stream')
    })
  })

  describe('decodeFromLines', () => {
    it('produces same result as decode', () => {
      const input = 'name: Alice\nage: 30\nscores[3]: 95, 87, 92'
      const lines = input.split('\n')

      expect(decodeFromLines(lines)).toEqual(decode(input))
    })

    it('supports expandPaths option', () => {
      const lines = ['user.name: Alice', 'user.age: 30']

      expect(decodeFromLines(lines, { expandPaths: 'safe' })).toEqual({
        user: { name: 'Alice', age: 30 },
      })
    })

    it('handles list item objects with empty string keyed tabular fields', () => {
      const input = [
        'items[1]:',
        '  - ""[2]{a}:',
        '      1',
        '      2',
      ].join('\n')

      expect(decodeFromLines(input.split('\n'))).toEqual({
        items: [{ '': [{ a: 1 }, { a: 2 }] }],
      })
    })
  })

  describe('streaming equivalence', () => {
    const testCases = [
      { name: 'simple object', input: 'name: Alice\nage: 30' },
      { name: 'nested objects', input: 'user:\n  profile:\n    name: Alice\n    age: 30' },
      { name: 'mixed structures', input: 'name: Alice\nscores[3]: 95, 87, 92\naddress:\n  city: NYC\n  zip: 10001' },
      { name: 'list array with objects', input: 'users[2]:\n  - name: Alice\n    age: 30\n  - name: Bob\n    age: 25' },
      { name: 'tabular array', input: 'users[3]{name,age,city}:\n  Alice, 30, NYC\n  Bob, 25, LA\n  Charlie, 35, SF' },
      { name: 'root primitive number', input: '42' },
      { name: 'root primitive string', input: 'Hello World' },
      { name: 'root primitive boolean', input: 'true' },
      { name: 'root primitive null', input: 'null' },
    ]

    for (const testCase of testCases) {
      it(`decodeFromLines matches decode() for: ${testCase.name}`, () => {
        const lines = testCase.input.split('\n')
        expect(decodeFromLines(lines)).toEqual(decode(testCase.input))
      })
    }
  })
})

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = []
  for await (const item of iterable) {
    results.push(item)
  }
  return results
}

async function* asyncLines(lines: string[]): AsyncGenerator<string> {
  for (const line of lines) {
    await Promise.resolve()
    yield line
  }
}

async function* asyncEvents<T>(events: T[]): AsyncGenerator<T> {
  for (const event of events) {
    await Promise.resolve()
    yield event
  }
}
