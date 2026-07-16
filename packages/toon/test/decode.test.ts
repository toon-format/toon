import type { Fixtures } from './types'
import arraysNested from '@toon-format/spec/tests/fixtures/decode/arrays-nested.json'
import arraysPrimitive from '@toon-format/spec/tests/fixtures/decode/arrays-primitive.json'
import arraysTabular from '@toon-format/spec/tests/fixtures/decode/arrays-tabular.json'
import blankLines from '@toon-format/spec/tests/fixtures/decode/blank-lines.json'
import delimiters from '@toon-format/spec/tests/fixtures/decode/delimiters.json'
import indentationErrors from '@toon-format/spec/tests/fixtures/decode/indentation-errors.json'
import numbers from '@toon-format/spec/tests/fixtures/decode/numbers.json'
import objects from '@toon-format/spec/tests/fixtures/decode/objects.json'
import pathExpansion from '@toon-format/spec/tests/fixtures/decode/path-expansion.json'
import primitives from '@toon-format/spec/tests/fixtures/decode/primitives.json'
import rootForm from '@toon-format/spec/tests/fixtures/decode/root-form.json'
import validationErrors from '@toon-format/spec/tests/fixtures/decode/validation-errors.json'
import whitespace from '@toon-format/spec/tests/fixtures/decode/whitespace.json'
import { describe, expect, it } from 'vitest'
import { decode, encode } from '../src/index'

const fixtureFiles = [
  primitives,
  numbers,
  objects,
  arraysPrimitive,
  arraysTabular,
  arraysNested,
  pathExpansion,
  delimiters,
  whitespace,
  rootForm,
  validationErrors,
  indentationErrors,
  blankLines,
] as Fixtures[]

for (const fixtures of fixtureFiles) {
  describe(fixtures.description, () => {
    for (const test of fixtures.tests) {
      it(test.name, () => {
        if (test.shouldError) {
          expect(() => decode(test.input as string, test.options))
            .toThrow()
        }
        else {
          const result = decode(test.input as string, test.options)
          expect(result).toEqual(test.expected)
        }
      })
    }
  })
}

// Regression: a quoted string scalar must stay opaque to array-header scanning,
// even when it contains a bracketed-index-shaped substring followed by a colon.
// https://github.com/toon-format/toon/issues/324
describe('quoted scalar with bracket/colon shape (issue #324)', () => {
  const cases: Array<Record<string, unknown>> = [
    { a: '[2]: x' },
    { content: 'accept (process.argv[2]) and greet: name' },
    { a: '[1]: only one' }, // count-match path: must not silently corrupt
    {
      id: '68f5c016',
      content:
        'It should accept the first CLI argument (process.argv[2]) and greet: name instead.',
      kind: 1621,
    },
  ]

  for (const value of cases) {
    it(`round-trips ${JSON.stringify(value)}`, () => {
      expect(decode(encode(value))).toEqual(value)
    })
  }

  it('decodes the quoted value as a plain scalar, not an array header', () => {
    expect(decode('a: "[2]: x"')).toEqual({ a: '[2]: x' })
  })

  it('still parses a genuine array header with an unquoted key', () => {
    expect(decode('items[3]: 1,2,3')).toEqual({ items: [1, 2, 3] })
  })
})
