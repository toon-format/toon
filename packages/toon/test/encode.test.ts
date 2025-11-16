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

describe('auto delimiter selection', () => {
  it('prefers delimiter that avoids quoting for inline arrays', () => {
    const result = encode({
      tags: ['foo,bar', 'baz'],
    }, { delimiter: 'auto' })

    expect(result).toBe('tags[2	]: foo,bar	baz')
  })

  it('prefers delimiter that avoids quoting for tabular arrays', () => {
    const result = encode({
      rows: [
        { name: 'Alice, Bob', id: 1 },
        { name: 'Charlie', id: 2 },
      ],
    }, { delimiter: 'auto' })

    expect(result).toBe([
      'rows[2	]{name	id}:',
      '  Alice, Bob	1',
      '  Charlie	2',
    ].join('\n'))
  })
})

function resolveEncodeOptions(options?: TestCase['options']): ResolvedEncodeOptions {
  const indent = options?.indent ?? 2
  const keyFolding = options?.keyFolding ?? 'off'
  const flattenDepth = options?.flattenDepth ?? Number.POSITIVE_INFINITY
  const delimiterOption = options?.delimiter ?? DEFAULT_DELIMITER

  if (delimiterOption === 'auto') {
    return {
      indent,
      delimiter: DEFAULT_DELIMITER,
      delimiterStrategy: 'auto',
      keyFolding,
      flattenDepth,
    }
  }

  return {
    indent,
    delimiter: delimiterOption,
    delimiterStrategy: 'fixed',
    keyFolding,
    flattenDepth,
  }
}
