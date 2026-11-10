import type { JsonStreamEvent } from '../../toon/src/types'
import { describe, expect, it } from 'vitest'
import { decodeStreamSync } from '../../toon/src/index'
import { loadFixtures } from '../../toon/test/utils'
import { jsonStreamFromEvents } from '../src/json-from-events'

const fixtureFiles = await loadFixtures('decode')

describe('jsonStreamFromEvents', () => {
  // The CLI streams only in strict mode, so non-strict cases go through `decode` instead.
  for (const fixtures of fixtureFiles) {
    const streamedTests = fixtures.tests.filter(test => !test.shouldError && test.options?.strict !== false)
    if (streamedTests.length === 0)
      continue

    describe(fixtures.description, () => {
      for (const test of streamedTests) {
        it(test.name, async () => {
          const events = [...decodeStreamSync((test.input as string).split('\n'), test.options)]
          for (const indent of [0, 2, 4]) {
            expect(await join(jsonStreamFromEvents(asyncEvents(events), indent))).toBe(JSON.stringify(test.expected, null, indent))
          }
        })
      }
    })
  }

  describe('error handling', () => {
    it('throws on mismatched endObject event', async () => {
      const events = [
        { type: 'startArray' as const, length: 0 },
        { type: 'endObject' as const },
      ]

      await expect(async () => {
        await join(jsonStreamFromEvents(asyncEvents(events), 0))
      }).rejects.toThrow('Mismatched endObject event')
    })

    it('throws on mismatched endArray event', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'endArray' as const },
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
        { type: 'primitive' as const, value: 'invalid' }, // No key before primitive.
        { type: 'endObject' as const },
      ]

      await expect(async () => {
        await join(jsonStreamFromEvents(asyncEvents(events), 0))
      }).rejects.toThrow('Primitive event without preceding key in object')
    })

    it('throws on incomplete event stream', async () => {
      const events = [
        { type: 'startObject' as const },
        { type: 'key' as const, key: 'name' },
        { type: 'primitive' as const, value: 'Alice' },
        // Missing `endObject`.
      ]

      await expect(async () => {
        await join(jsonStreamFromEvents(asyncEvents(events), 0))
      }).rejects.toThrow('Incomplete event stream: unclosed objects or arrays')
    })
  })
})

async function* asyncEvents(events: JsonStreamEvent[]): AsyncIterable<JsonStreamEvent> {
  for (const event of events) {
    await Promise.resolve()
    yield event
  }
}

async function join(iter: AsyncIterable<string>): Promise<string> {
  const chunks: string[] = []
  for await (const chunk of iter) {
    chunks.push(chunk)
  }
  return chunks.join('')
}
