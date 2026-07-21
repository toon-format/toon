import type { DecodeOptions } from '../src/types'
import type { TestCase } from './types'
import { describe, expect, it } from 'vitest'
import { decode, encode } from '../src/index'
import { loadFixtures } from './utils'

// Loaded via JSON.parse: a Vite JSON-to-literal transform would turn the
// prototype-safety fixtures' `__proto__` keys into prototype assignments
const fixtureFiles = loadFixtures('decode', [
  'primitives',
  'numbers',
  'objects',
  'objects-keyed',
  'arrays-primitive',
  'arrays-tabular',
  'arrays-nested',
  'delimiters',
  'whitespace',
  'root-form',
  'validation-errors',
  'indentation-errors',
  'blank-lines',
  'comments',
])

for (const fixtures of fixtureFiles) {
  describe(fixtures.description, () => {
    for (const test of fixtures.tests) {
      it(test.name, () => {
        const resolvedOptions = resolveDecodeOptions(test.options)

        if (test.shouldError) {
          expect(() => decode(test.input as string, resolvedOptions))
            .toThrow()
        }
        else {
          const result = decode(test.input as string, resolvedOptions)
          expect(result).toEqual(test.expected)
        }
      })
    }
  })
}

function resolveDecodeOptions(options?: TestCase['options']): DecodeOptions {
  return {
    indent: options?.indentSize ?? 2,
    strict: options?.strict ?? true,
  }
}

describe('quoted content opacity (round-trip)', () => {
  const cases: [name: string, value: unknown][] = [
    ['bracket segment then colon in scalar', { a: '[2]: x' }],
    ['bracket segment then colon, count matches length', { a: '[1]: x' }],
    ['bracketed index with a later colon', { content: 'accept (process.argv[2]) and greet: name' }],
    ['brackets, braces, colons, commas and pipes in a scalar', { s: '{k: v}, [0]: a | b' }],
    ['structural characters in tabular cells', { rows: [{ id: 1, note: '[2]: x' }, { id: 2, note: 'a: b, c' }] }],
    ['structural characters in list items', { xs: ['[2]: x', 'a: b', 'p | q'] }],
    ['bracket-shaped text inside a quoted key', { 'k [2]: y': 1 }],
    ['quoted key opens an array header', { 'quoted key': [1, 2] }],
    ['embedded quoted bracket in a key that opens an array header', { 'has "[2]" in it': [3, 4, 5] }],
  ]

  for (const [name, value] of cases) {
    it(`round-trips ${name}`, () => {
      expect(decode(encode(value))).toEqual(value)
    })
  }

  it('round-trips the Nostr event with a bracketed index and later colon in content', () => {
    const event = {
      id: '68f5c016e5a3128d7af740e088fc5d94e56edda4205fffa56aa3d58fe6bb55ee',
      pubkey: '3cd318a74dbac2a29491ebf64db6ac66965c2ba907585d34705772f417aad6d5',
      kind: 1621,
      content: 'Currently index.js always prints "Hello, world!". It should accept an optional name as the first CLI argument (process.argv[2]) and greet that name instead, falling back to "world" when no argument is given. Example: `node index.js Ada` -> "Hello, Ada!".',
      tags: [
        ['a', '30617:3cd318a74dbac2a29491ebf64db6ac66965c2ba907585d34705772f417aad6d5:hello-compare-rig'],
        ['p', '3cd318a74dbac2a29491ebf64db6ac66965c2ba907585d34705772f417aad6d5'],
        ['subject', 'greeting should accept a name argument'],
        ['t', 'enhancement'],
      ],
      created_at: 1783027036,
      sig: '3220fa9dcb7af14b9a970f5d25f4ac13ebb4848c91a83bf496cdef17a839d4475773defb38a20d64b250227eb5aa457eb77358c5f32c4c7935397a3430b102db',
    }

    expect(decode(encode(event))).toEqual(event)
  })
})
