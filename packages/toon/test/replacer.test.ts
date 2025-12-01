import type { EncodeReplacer, JsonObject, JsonValue } from '../src/types'
import { describe, expect, it } from 'vitest'
import { decode, encode } from '../src/index'

describe('replacer function', () => {
  describe('basic filtering', () => {
    it('removes properties by returning undefined', () => {
      const input = { name: 'Alice', password: 'secret', email: 'alice@example.com' }
      const replacer: EncodeReplacer = (key, value) => {
        if (key === 'password')
          return undefined
        return value
      }

      const result = encode(input, { replacer })
      const decoded = decode(result)

      expect(decoded).toEqual({ name: 'Alice', email: 'alice@example.com' })
      expect(decoded).not.toHaveProperty('password')
    })

    it('removes array elements by returning undefined', () => {
      const input = [1, 2, 3, 4, 5]
      const replacer: EncodeReplacer = (key, value) => {
        // Remove even numbers (key is index as string)
        if (typeof value === 'number' && value % 2 === 0)
          return undefined
        return value
      }

      const result = encode(input, { replacer })
      const decoded = decode(result)

      expect(decoded).toEqual([1, 3, 5])
    })

    it('handles deeply nested filtering', () => {
      const input = {
        users: [
          { name: 'Alice', password: 'secret1', role: 'admin' },
          { name: 'Bob', password: 'secret2', role: 'user' },
        ],
      }
      const replacer: EncodeReplacer = (key, value) => {
        if (key === 'password')
          return undefined
        return value
      }

      const result = encode(input, { replacer })
      const decoded = decode(result)

      expect(decoded).toEqual({
        users: [
          { name: 'Alice', role: 'admin' },
          { name: 'Bob', role: 'user' },
        ],
      })
    })
  })

  describe('value transformation', () => {
    it('transforms primitive values', () => {
      const input = { name: 'alice', age: 30 }
      const replacer: EncodeReplacer = (key, value) => {
        // Uppercase all strings
        if (typeof value === 'string')
          return value.toUpperCase()
        return value
      }

      const result = encode(input, { replacer })
      const decoded = decode(result)

      expect(decoded).toEqual({ name: 'ALICE', age: 30 })
    })

    it('transforms objects', () => {
      const input = { user: { name: 'Alice' } }
      const replacer: EncodeReplacer = (key, value, path) => {
        // Add metadata to all objects at depth 1
        if (path.length === 1 && typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return { ...value as object, _id: `${key}_123` }
        }
        return value
      }

      const result = encode(input, { replacer })
      const decoded = decode(result)

      expect(decoded).toEqual({
        user: { name: 'Alice', _id: 'user_123' },
      })
    })

    it('transforms arrays', () => {
      const input = { numbers: [1, 2, 3] }
      const replacer: EncodeReplacer = (key, value) => {
        // Double all numbers
        if (typeof value === 'number')
          return value * 2
        return value
      }

      const result = encode(input, { replacer })
      const decoded = decode(result)

      expect(decoded).toEqual({ numbers: [2, 4, 6] })
    })
  })

  describe('root value handling', () => {
    it('calls replacer on root value with empty string key', () => {
      const input = { value: 42 }
      let rootKeySeen = false
      let rootPathSeen = false

      const replacer: EncodeReplacer = (key, value, path) => {
        if (key === '' && path.length === 0) {
          rootKeySeen = true
          rootPathSeen = true
        }
        return value
      }

      encode(input, { replacer })

      expect(rootKeySeen).toBe(true)
      expect(rootPathSeen).toBe(true)
    })

    it('transforms root object', () => {
      const input = { name: 'Alice' }
      const replacer: EncodeReplacer = (key, value, path) => {
        if (path.length === 0) {
          return { ...value as object, timestamp: 1234567890 }
        }
        return value
      }

      const result = encode(input, { replacer })
      const decoded = decode(result)

      expect(decoded).toEqual({ name: 'Alice', timestamp: 1234567890 })
    })

    it('does not omit root when replacer returns undefined', () => {
      const input = { name: 'Alice' }
      const replacer: EncodeReplacer = (key, value, path) => {
        // Try to omit root (should be ignored)
        if (path.length === 0)
          return undefined
        return value
      }

      const result = encode(input, { replacer })
      const decoded = decode(result)

      // Root should still be encoded
      expect(decoded).toEqual({ name: 'Alice' })
    })

    it('handles primitive root values', () => {
      const input = 'hello'
      const replacer: EncodeReplacer = (key, value) => {
        if (typeof value === 'string')
          return value.toUpperCase()
        return value
      }

      const result = encode(input, { replacer })
      expect(result).toBe('HELLO')
    })

    it('provides correct arguments to root call', () => {
      const input = { data: 'test' }
      const calls: { key: string, path: (string | number)[] }[] = []

      const replacer: EncodeReplacer = (key, value, path) => {
        calls.push({ key, path: [...path] })
        return value
      }

      encode(input, { replacer })

      // First call should be root
      expect(calls[0]).toEqual({ key: '', path: [] })
    })
  })

  describe('path tracking', () => {
    it('provides correct paths for nested objects', () => {
      const input = {
        user: {
          profile: {
            name: 'Alice',
          },
        },
      }
      const paths: string[] = []

      const replacer: EncodeReplacer = (key, value, path) => {
        paths.push(path.join('.'))
        return value
      }

      encode(input, { replacer })

      expect(paths).toContain('') // root
      expect(paths).toContain('user')
      expect(paths).toContain('user.profile')
      expect(paths).toContain('user.profile.name')
    })

    it('provides correct paths for arrays with string indices', () => {
      const input = { items: ['a', 'b', 'c'] }
      const seenKeys: string[] = []

      const replacer: EncodeReplacer = (key, value, path) => {
        if (path.length > 0 && path[path.length - 1] !== 'items') {
          seenKeys.push(key)
        }
        return value
      }

      encode(input, { replacer })

      // Array indices should be string '0', '1', '2'
      expect(seenKeys).toEqual(['0', '1', '2'])
    })

    it('provides correct paths for nested arrays', () => {
      const input = {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      }
      const paths: string[] = []

      const replacer: EncodeReplacer = (key, value, path) => {
        if (typeof value === 'number') {
          paths.push(`${path.join('.')} (key="${key}")`)
        }
        return value
      }

      encode(input, { replacer })

      expect(paths).toContain('matrix.0.0 (key="0")')
      expect(paths).toContain('matrix.0.1 (key="1")')
      expect(paths).toContain('matrix.1.0 (key="0")')
      expect(paths).toContain('matrix.1.1 (key="1")')
    })
  })

  describe('edge cases', () => {
    it('handles empty objects', () => {
      const input = {}
      const replacer: EncodeReplacer = (key, value) => value

      const result = encode(input, { replacer })
      expect(result).toBe('')
    })

    it('handles empty arrays', () => {
      const input: JsonValue[] = []
      const replacer: EncodeReplacer = (key, value) => value

      const result = encode(input, { replacer })
      const decoded = decode(result)
      expect(decoded).toEqual([])
    })

    it('handles null values', () => {
      const input = { value: null }
      const replacer: EncodeReplacer = (key, value) => {
        if (value === null)
          return 'NULL'
        return value
      }

      const result = encode(input, { replacer })
      const decoded = decode(result)
      expect(decoded).toEqual({ value: 'NULL' })
    })

    it('re-normalizes non-JsonValue returns', () => {
      const input = { date: '2025-01-01' }
      const replacer: EncodeReplacer = (key, value) => {
        // Return a Date object (will be normalized to ISO string)
        if (key === 'date')
          return new Date(value as string)
        return value
      }

      const result = encode(input, { replacer })
      const decoded = decode(result) as JsonObject

      // Date should be normalized to ISO string
      expect(typeof decoded.date).toBe('string')
      expect(decoded.date).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('handles all properties being filtered out', () => {
      const input = { a: 1, b: 2, c: 3 }
      const replacer: EncodeReplacer = (key, value, path) => {
        // Filter out all properties (but not root)
        if (path.length > 0)
          return undefined
        return value
      }

      const result = encode(input, { replacer })
      const decoded = decode(result)

      // Should result in empty object
      expect(decoded).toEqual({})
    })

    it('handles all array elements being filtered out', () => {
      const input = [1, 2, 3]
      const replacer: EncodeReplacer = (key, value, path) => {
        // Filter out all elements
        if (path.length > 0)
          return undefined
        return value
      }

      const result = encode(input, { replacer })
      const decoded = decode(result)

      // Should result in empty array
      expect(decoded).toEqual([])
    })

    it('handles nested objects with mixed omissions', () => {
      const input = {
        keep: 'this',
        remove: 'that',
        nested: {
          keep: 'nested keep',
          remove: 'nested remove',
        },
      }
      const replacer: EncodeReplacer = (key, value) => {
        if (key === 'remove')
          return undefined
        return value
      }

      const result = encode(input, { replacer })
      const decoded = decode(result)

      expect(decoded).toEqual({
        keep: 'this',
        nested: {
          keep: 'nested keep',
        },
      })
    })

    it('handles arrays with some elements removed', () => {
      const input = { items: [{ id: 1, keep: true }, { id: 2, keep: false }, { id: 3, keep: true }] }
      const replacer: EncodeReplacer = (key, value) => {
        // Remove objects where keep is false
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'keep' in value && value.keep === false) {
          return undefined
        }
        return value
      }

      const result = encode(input, { replacer })
      const decoded = decode(result)

      expect(decoded).toEqual({
        items: [{ id: 1, keep: true }, { id: 3, keep: true }],
      })
    })
  })

  describe('integration with other options', () => {
    it('works with keyFolding', () => {
      const input = {
        user: {
          profile: {
            name: 'Alice',
          },
        },
      }
      const replacer: EncodeReplacer = (key, value) => {
        if (typeof value === 'string')
          return value.toUpperCase()
        return value
      }

      const result = encode(input, { replacer, keyFolding: 'safe' })
      expect(result).toContain('user.profile.name: ALICE')
    })

    it('works with custom delimiters', () => {
      const input = { items: [1, 2, 3] }
      const replacer: EncodeReplacer = (key, value) => {
        if (typeof value === 'number')
          return value * 10
        return value
      }

      const result = encode(input, { replacer, delimiter: '\t' })
      expect(result).toContain('10\t20\t30')
    })

    it('works with custom indent', () => {
      const input = { user: { name: 'Alice' } }
      const replacer: EncodeReplacer = (key, value) => value

      const result = encode(input, { replacer, indent: 4 })
      // Should use 4-space indent
      expect(result).toContain('    name: Alice')
    })
  })

  describe('comparison with JSON.stringify replacer', () => {
    it('behaves similarly to JSON.stringify for filtering', () => {
      const input = { name: 'Alice', password: 'secret' }

      // TOON replacer
      const toonReplacer: EncodeReplacer = (key, value) => {
        if (key === 'password')
          return undefined
        return value
      }

      // JSON.stringify replacer
      const jsonReplacer = (key: string, value: unknown) => {
        if (key === 'password')
          return undefined
        return value
      }

      const toonResult = decode(encode(input, { replacer: toonReplacer }))
      const jsonResult = JSON.parse(JSON.stringify(input, jsonReplacer))

      expect(toonResult).toEqual(jsonResult)
    })

    it('uses string indices for arrays like JSON.stringify', () => {
      const input = ['a', 'b', 'c']
      const keys: string[] = []

      const replacer: EncodeReplacer = (key, value, path) => {
        if (path.length > 0)
          keys.push(key)
        return value
      }

      encode(input, { replacer })

      // Should match JSON.stringify behavior (string indices)
      expect(keys).toEqual(['0', '1', '2'])
    })
  })
})
