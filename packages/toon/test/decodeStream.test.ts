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

    it('materializes __proto__ as an own property', () => {
      const prototypeKey = '__proto__'
      const lines = ['__proto__:', '  safe: true']
      const result = buildValueFromEvents(decodeStreamSync(lines)) as Record<string, unknown>

      expect(Object.hasOwn(result, prototypeKey)).toBe(true)
      expect(result[prototypeKey]).toEqual({ safe: true })
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
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

    it('decodes an array in list form', () => {
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
      { name: 'list-form array', input: 'items[2]:\n  - Apple\n  - Banana' },
      { name: 'root primitive', input: 'Hello World' },
      { name: 'root array', input: '[2]:\n  - Apple\n  - Banana' },
      { name: 'empty input', input: '' },
      { name: 'keyed tabular object', input: 'servers[2:]{host,port}:\n  alpha: a.example.com,8080\n  beta: b.example.com,9090' },
      { name: 'keyless keyed root', input: '[2:]{age,city}:\n  alice: 30,Berlin\n  bob: 25,Paris' },
      { name: 'nested field groups', input: 'orders[2]{id,customer{name,country},total}:\n  1,Ada,DE,9.99\n  2,Bob,FR,14.5' },
      { name: 'comment lines around fields', input: '# header\na: 1\n# note\nb: 2' },
      { name: 'comment lines between tabular rows', input: 'users[2]{name}:\n  Ada\n# note\n  Bob' },
      { name: 'keyed tabular header on a hyphen line', input: 'items[1]:\n  - users[2:]{v}:\n      a: 1\n      b: 2\n    status: active' },
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

    it('locates the value after an escaped quoted key containing a colon', async () => {
      const lines = ['"\\t:x": v']
      const events = await collect(decodeStream(asyncLines(lines)))

      expect(events).toEqual([
        { type: 'startObject' },
        { type: 'key', key: '\t:x' },
        { type: 'primitive', value: 'v' },
        { type: 'endObject' },
      ])
      expect(events).toEqual(Array.from(decodeStreamSync(lines)))
    })

    it('keeps a quoted bracket-then-colon scalar opaque, matching decodeStreamSync', async () => {
      const lines = ['a: "[1]: x"']
      const events = await collect(decodeStream(asyncLines(lines)))

      expect(events).toEqual([
        { type: 'startObject' },
        { type: 'key', key: 'a' },
        { type: 'primitive', value: '[1]: x' },
        { type: 'endObject' },
      ])
      expect(events).toEqual(Array.from(decodeStreamSync(lines)))
    })

    it('keeps an unquoted bracket-colon scalar whole, matching decodeStreamSync', async () => {
      const lines = ['key: foo [2]: bar']
      const events = await collect(decodeStream(asyncLines(lines)))

      expect(events).toEqual([
        { type: 'startObject' },
        { type: 'key', key: 'key' },
        { type: 'primitive', value: 'foo [2]: bar' },
        { type: 'endObject' },
      ])
      expect(events).toEqual(Array.from(decodeStreamSync(lines)))
    })

    it('keeps a colon-bearing value such as a URL intact', async () => {
      const lines = ['a: http://x']
      const events = await collect(decodeStream(asyncLines(lines)))

      expect(events).toEqual([
        { type: 'startObject' },
        { type: 'key', key: 'a' },
        { type: 'primitive', value: 'http://x' },
        { type: 'endObject' },
      ])
      expect(events).toEqual(Array.from(decodeStreamSync(lines)))
    })

    it('materializes __proto__ as an own property', async () => {
      const prototypeKey = '__proto__'
      const lines = ['__proto__:', '  safe: true']
      const events = await collect(decodeStream(asyncLines(lines)))
      const result = await buildValueFromEventsAsync(asyncEvents(events)) as Record<string, unknown>

      expect(Object.hasOwn(result, prototypeKey)).toBe(true)
      expect(result[prototypeKey]).toEqual({ safe: true })
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
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

    const strictErrorCases = [
      { name: 'an over-indented line under a primitive field', lines: ['a: 1', '    b: 2'], message: 'Over-indented line' },
      { name: 'trailing content after a root array', lines: ['[2]: 1,2', 'junk: 3'], message: 'Unexpected content after the document root' },
      { name: 'an over-indented line inside a keyed tabular object', lines: ['m[2:]{v}:', '  a: 1', '    x: 2', '  b: 2'], message: 'Unexpected indentation inside keyed tabular object' },
      { name: 'an entry row without a colon', lines: ['m[1:]{v}:', '  noentrycolon'], message: 'Expected entry row inside keyed tabular object' },
      { name: 'duplicate entry keys', lines: ['m[2:]{v}:', '  a: 1', '  a: 2'], message: 'Duplicate sibling key' },
      { name: 'a keyed entry count mismatch', lines: ['m[2:]{v}:', '  a: 1'], message: 'keyed entries' },
      { name: 'a keyed entry cell width mismatch', lines: ['m[1:]{v}:', '  a: 1,2'], message: 'keyed entry cells' },
    ]

    for (const { name, lines, message } of strictErrorCases) {
      it(`rejects ${name}, matching decodeStreamSync`, async () => {
        expect(() => Array.from(decodeStreamSync(lines))).toThrow(message)
        await expect(collect(decodeStream(asyncLines(lines)))).rejects.toThrow(message)
      })
    }
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

    it('strips trailing carriage returns from caller-split lines', () => {
      expect(decodeFromLines(['a: 1\r', 'b: 2\r'])).toEqual({ a: 1, b: 2 })
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
      { name: 'list form with objects', input: 'users[2]:\n  - name: Alice\n    age: 30\n  - name: Bob\n    age: 25' },
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
