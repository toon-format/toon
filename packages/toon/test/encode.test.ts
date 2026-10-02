import { describe, expect, it } from 'vitest'
import { encode } from '../src/index'
import { loadFixtures } from './utils'

const fixtureFiles = await loadFixtures('encode')

for (const fixtures of fixtureFiles) {
  describe(fixtures.description, () => {
    for (const test of fixtures.tests) {
      it(test.name, () => {
        if (test.shouldError) {
          expect(() => encode(test.input, test.options))
            .toThrow()
        }
        else {
          const result = encode(test.input, test.options)
          expect(result).toBe(test.expected)
        }
      })
    }
  })
}
