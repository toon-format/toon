import { describe, expect, it } from 'vitest'
import { buildValueFromEventsAsync } from '../src/decode/event-builder'
import { decode, decodeStream } from '../src/index'
import { loadFixtures } from './utils'

const fixtureFiles = await loadFixtures('decode')

for (const fixtures of fixtureFiles) {
  describe(fixtures.description, () => {
    for (const test of fixtures.tests) {
      it(test.name, async () => {
        const input = test.input as string
        const decodeAsync = () => buildValueFromEventsAsync(decodeStream(input.split('\n'), test.options))

        if (test.shouldError) {
          expect(() => decode(input, test.options)).toThrow()
          await expect(decodeAsync()).rejects.toThrow()
        }
        else {
          // toEqual ignores key order, and JSON.stringify drops the sign of -0.
          const result = decode(input, test.options)
          expect(result).toEqual(test.expected)
          expect(JSON.stringify(result)).toBe(JSON.stringify(test.expected))
          const asyncResult = await decodeAsync()
          expect(asyncResult).toEqual(test.expected)
          expect(JSON.stringify(asyncResult)).toBe(JSON.stringify(test.expected))
        }
      })
    }
  })
}
