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
  }
}

describe('null-prototype objects', () => {
  it('encodes Object.create(null) as a regular object', () => {
    const obj = Object.create(null)
    obj.a = true
    obj.b = 'hello'
    expect(encode(obj)).toBe('a: true\nb: hello')
  })

  it('encodes nested Object.create(null)', () => {
    const inner = Object.create(null)
    inner.x = 1
    const outer = Object.create(null)
    outer.nested = inner
    expect(encode(outer)).toBe('nested:\n  x: 1')
  })

  it('encodes array of Object.create(null) as tabular', () => {
    const a = Object.create(null)
    a.id = 1
    a.name = 'Alice'
    const b = Object.create(null)
    b.id = 2
    b.name = 'Bob'
    expect(encode([a, b])).toBe('[2]{id,name}:\n  1,Alice\n  2,Bob')
  })

  it('encodes object with null-prototype as its prototype (only own properties)', () => {
    const proto = Object.create(null)
    proto.inherited = 'should not appear'
    const obj = Object.create(proto)
    obj.own = 'visible'
    expect(encode(obj)).toBe('own: visible')
  })
})
