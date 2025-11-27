import { describe, expect, it } from 'vitest'
import { jsonStringifyLines } from '../src/json-stringify-stream'

describe('jsonStringifyLines', () => {
  describe('primitives', () => {
    it('stringifies null', () => {
      expect(join(jsonStringifyLines(null, 0))).toBe(JSON.stringify(null))
      expect(join(jsonStringifyLines(null, 2))).toBe(JSON.stringify(null, null, 2))
    })

    it('stringifies booleans', () => {
      expect(join(jsonStringifyLines(true, 0))).toBe(JSON.stringify(true))
      expect(join(jsonStringifyLines(false, 0))).toBe(JSON.stringify(false))
      expect(join(jsonStringifyLines(true, 2))).toBe(JSON.stringify(true, null, 2))
    })

    it('stringifies numbers', () => {
      expect(join(jsonStringifyLines(0, 0))).toBe(JSON.stringify(0))
      expect(join(jsonStringifyLines(42, 0))).toBe(JSON.stringify(42))
      expect(join(jsonStringifyLines(-17, 0))).toBe(JSON.stringify(-17))
      expect(join(jsonStringifyLines(3.14159, 0))).toBe(JSON.stringify(3.14159))
      expect(join(jsonStringifyLines(1e10, 2))).toBe(JSON.stringify(1e10, null, 2))
    })

    it('stringifies strings', () => {
      expect(join(jsonStringifyLines('', 0))).toBe(JSON.stringify(''))
      expect(join(jsonStringifyLines('hello', 0))).toBe(JSON.stringify('hello'))
      expect(join(jsonStringifyLines('with "quotes"', 0))).toBe(JSON.stringify('with "quotes"'))
      expect(join(jsonStringifyLines('with\nnewlines', 2))).toBe(JSON.stringify('with\nnewlines', null, 2))
      expect(join(jsonStringifyLines('with\ttabs', 0))).toBe(JSON.stringify('with\ttabs'))
    })

    it('converts undefined to null', () => {
      expect(join(jsonStringifyLines(undefined, 0))).toBe('null')
      expect(join(jsonStringifyLines(undefined, 2))).toBe('null')
    })
  })

  describe('empty containers', () => {
    it('stringifies empty arrays', () => {
      expect(join(jsonStringifyLines([], 0))).toBe(JSON.stringify([], null, 0))
      expect(join(jsonStringifyLines([], 2))).toBe(JSON.stringify([], null, 2))
    })

    it('stringifies empty objects', () => {
      expect(join(jsonStringifyLines({}, 0))).toBe(JSON.stringify({}, null, 0))
      expect(join(jsonStringifyLines({}, 2))).toBe(JSON.stringify({}, null, 2))
    })
  })

  describe('arrays', () => {
    it('stringifies arrays with compact formatting (indent=0)', () => {
      const value = [1, 2, 3]
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
    })

    it('stringifies arrays with pretty formatting (indent=2)', () => {
      const value = [1, 2, 3]
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('stringifies mixed-type arrays', () => {
      const value = [1, 'two', true, null, { key: 'value' }]
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('stringifies nested arrays', () => {
      const value = [[1, 2], [3, 4], [5, 6]]
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('stringifies deeply nested arrays', () => {
      const value = [[[1]], [[2]], [[3]]]
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
      expect(join(jsonStringifyLines(value, 4))).toBe(JSON.stringify(value, null, 4))
    })
  })

  describe('objects', () => {
    it('stringifies simple objects with compact formatting', () => {
      const value = { a: 1, b: 2, c: 3 }
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
    })

    it('stringifies simple objects with pretty formatting', () => {
      const value = { a: 1, b: 2, c: 3 }
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('stringifies objects with mixed value types', () => {
      const value = {
        num: 42,
        str: 'hello',
        bool: true,
        nil: null,
        arr: [1, 2, 3],
      }
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('stringifies nested objects', () => {
      const value = {
        level1: {
          level2: {
            level3: 'deep',
          },
        },
      }
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('preserves key order', () => {
      const value = { z: 1, a: 2, m: 3 }
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('handles special characters in keys', () => {
      const value = {
        'normal-key': 1,
        'key with spaces': 2,
        'key:with:colons': 3,
        'key"with"quotes': 4,
      }
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })
  })

  describe('complex nested structures', () => {
    it('stringifies objects containing arrays', () => {
      const value = {
        name: 'Alice',
        scores: [95, 87, 92],
        metadata: {
          tags: ['math', 'science'],
        },
      }
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('stringifies arrays of objects', () => {
      const value = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('stringifies deeply nested mixed structures', () => {
      const value = {
        users: [
          {
            name: 'Alice',
            roles: ['admin', 'user'],
            settings: {
              theme: 'dark',
              notifications: true,
            },
          },
          {
            name: 'Bob',
            roles: ['user'],
            settings: {
              theme: 'light',
              notifications: false,
            },
          },
        ],
        count: 2,
      }
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })
  })

  describe('indentation levels', () => {
    const value = { a: [1, 2], b: { c: 3 } }

    it('handles indent=0 (compact)', () => {
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
    })

    it('handles indent=2', () => {
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('handles indent=4', () => {
      expect(join(jsonStringifyLines(value, 4))).toBe(JSON.stringify(value, null, 4))
    })

    it('handles indent=8', () => {
      expect(join(jsonStringifyLines(value, 8))).toBe(JSON.stringify(value, null, 8))
    })
  })

  describe('edge cases', () => {
    it('handles arrays with undefined values (converted to null)', () => {
      const value = [1, undefined, 3]
      const expected = JSON.stringify(value, null, 2)
      expect(join(jsonStringifyLines(value, 2))).toBe(expected)
    })

    it('handles single-element arrays', () => {
      const value = [42]
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('handles single-property objects', () => {
      const value = { only: 'one' }
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('handles objects with many properties', () => {
      const value: Record<string, number> = {}
      for (let i = 0; i < 100; i++) {
        value[`key${i}`] = i
      }
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })

    it('handles large arrays', () => {
      const value = Array.from({ length: 1000 }, (_, i) => i)
      expect(join(jsonStringifyLines(value, 0))).toBe(JSON.stringify(value, null, 0))
      expect(join(jsonStringifyLines(value, 2))).toBe(JSON.stringify(value, null, 2))
    })
  })
})

/**
 * Joins chunks from an iterable into a single string.
 */
function join(iter: Iterable<string>): string {
  return Array.from(iter).join('')
}
