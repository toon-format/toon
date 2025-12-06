import type { ResolvedEncodeOptions } from '../src/types'
import type { Fixtures, TestCase } from './types'
import arraysNested from '@toon-format/spec/tests/fixtures/encode/arrays-nested.json'
import arraysObjects from '@toon-format/spec/tests/fixtures/encode/arrays-objects.json'
import arraysPrimitive from '@toon-format/spec/tests/fixtures/encode/arrays-primitive.json'
import arraysTabular from '@toon-format/spec/tests/fixtures/encode/arrays-tabular.json'
import delimiters from '@toon-format/spec/tests/fixtures/encode/delimiters.json'
import keyFolding from '@toon-format/spec/tests/fixtures/encode/key-folding.json'
import objects from '@toon-format/spec/tests/fixtures/encode/objects.json'
import primitives from '@toon-format/spec/tests/fixtures/encode/primitives.json'
import whitespace from '@toon-format/spec/tests/fixtures/encode/whitespace.json'
import { describe, expect, it } from 'vitest'
import { DEFAULT_DELIMITER, encode } from '../src/index'

const fixtureFiles = [
  primitives,
  objects,
  arraysPrimitive,
  arraysTabular,
  arraysNested,
  arraysObjects,
  keyFolding,
  delimiters,
  whitespace,
] as Fixtures[]

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
    indent: options?.indent ?? 2,
    delimiter: options?.delimiter ?? DEFAULT_DELIMITER,
    keyFolding: options?.keyFolding ?? 'off',
    flattenDepth: options?.flattenDepth ?? Number.POSITIVE_INFINITY,
    quoteStrings: options?.quoteStrings ?? false,
  }
}

describe('encode (quoteStrings option)', () => {
  it('should quote all string values when quoteStrings is true', () => {
    const input = { a: 'foo', b: 'bar baz', c: 42, d: true }
    const expected = 'a: "foo"\nb: "bar baz"\nc: 42\nd: true'
    const result = encode(input, { quoteStrings: true })
    expect(result).toBe(expected)
  })

  it('should quote strings in arrays when quoteStrings is true', () => {
    const input = { arr: ['x', 'y z', 'w'] }
    const expected = 'arr[3]: "x","y z","w"'
    const result = encode(input, { quoteStrings: true })
    expect(result).toBe(expected)
  })

  it('should not quote strings when quoteStrings is false (default)', () => {
    const input = { a: 'foo', b: 'bar baz', c: 42 }
    // Only b should be quoted because it contains a space
    const expected = 'a: foo\nb: "bar baz"\nc: 42'
    const result = encode(input)
    expect(result).toBe(expected)
  })
})
