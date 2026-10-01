import type { ResolvedEncodeOptions } from '../src/types'
import type { TestCase } from './types'
import { describe, expect, it } from 'vitest'
import { DEFAULT_DELIMITER, encode } from '../src/index'
import { loadFixtures } from './utils'

const fixtureFiles = loadFixtures('encode')

for (const fixtures of fixtureFiles) {
  describe(fixtures.description, () => {
    for (const test of fixtures.tests) {
      it(test.name, () => {
        const resolvedOptions = resolveEncodeOptions(test.options)

        if (test.shouldError) {
          expect(() => encode(test.input, resolvedOptions))
            .toThrow()
        }
        else {
          const result = encode(test.input, resolvedOptions)
          expect(result).toBe(test.expected)
        }
      })
    }
  })
}

function resolveEncodeOptions(options?: TestCase['options']): ResolvedEncodeOptions {
  return {
    indentSize: options?.indentSize ?? 2,
    delimiter: options?.delimiter ?? DEFAULT_DELIMITER,
  }
}
