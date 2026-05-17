import type { DecodeReviver, JsonObject } from '../src/types'
import { describe, expect, it } from 'vitest'
import { decode, encode } from '../src/index'

describe('reviver function', () => {
  describe('basic filtering', () => {
    it('removes properties by returning undefined', () => {
      const input = { name: 'Alice', password: 'secret', email: 'alice@example.com' }
      const toon = encode(input)
      const reviver: DecodeReviver = (key, value) => {
        if (key === 'password')
          return undefined
        return value
      }

      const result = decode(toon, { reviver })
      expect(result).toEqual({ name: 'Alice', email: 'alice@example.com' })
      expect(result).not.toHaveProperty('password')
    })

    it('removes array elements by returning undefined', () => {
      const input = { items: [1, 2, 3, 4, 5] }
      const toon = encode(input)
      const reviver: DecodeReviver = (key, value) => {
        if (typeof value === 'number' && value % 2 === 0)
          return undefined
        return value
      }

      const result = decode(toon, { reviver }) as JsonObject
      expect(result.items).toEqual([1, 3, 5])
    })

    it('handles deeply nested filtering', () => {
      const input = {
        users: [
          { name: 'Alice', password: 'secret1', role: 'admin' },
          { name: 'Bob', password: 'secret2', role: 'user' },
        ],
      }
      const toon = encode(input)
      const reviver: DecodeReviver = (key, value) => {
        if (key === 'password')
          return undefined
        return value
      }

      const result = decode(toon, { reviver })
      expect(result).toEqual({
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
      const toon = encode(input)
      const reviver: DecodeReviver = (key, value) => {
        if (key === 'name' && typeof value === 'string')
          return value.toUpperCase()
        return value
      }

      const result = decode(toon, { reviver }) as JsonObject
      expect(result.name).toBe('ALICE')
      expect(result.age).toBe(30)
    })

    it('transforms objects by adding properties', () => {
      const input = { user: { name: 'Alice' } }
      const toon = encode(input)
      const reviver: DecodeReviver = (key, value) => {
        if (key === 'user' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return { ...value as object, _processed: true }
        }
        return value
      }

      const result = decode(toon, { reviver }) as JsonObject
      expect(result.user).toEqual({ name: 'Alice', _processed: true })
    })

    it('transforms number values', () => {
      const input = { numbers: [1, 2, 3] }
      const toon = encode(input)
      const reviver: DecodeReviver = (key, value) => {
        if (typeof value === 'number')
          return value * 2
        return value
      }

      const result = decode(toon, { reviver }) as JsonObject
      expect(result.numbers).toEqual([2, 4, 6])
    })
  })

  describe('root value handling', () => {
    it('calls reviver on root value with empty string key', () => {
      const input = { value: 42 }
      const toon = encode(input)
      let rootKeySeen = false
      let rootPathSeen = false

      const reviver: DecodeReviver = (key, value, path) => {
        if (key === '' && path.length === 0) {
          rootKeySeen = true
          rootPathSeen = true
        }
        return value
      }

      decode(toon, { reviver })

      expect(rootKeySeen).toBe(true)
      expect(rootPathSeen).toBe(true)
    })

    it('transforms root object', () => {
      const input = { name: 'Alice' }
      const toon = encode(input)
      const reviver: DecodeReviver = (key, value, path) => {
        if (path.length === 0 && typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return { ...value as object, _decoded: true }
        }
        return value
      }

      const result = decode(toon, { reviver })
      expect(result).toEqual({ name: 'Alice', _decoded: true })
    })

    it('does not omit root when reviver returns undefined', () => {
      const input = { name: 'Alice' }
      const toon = encode(input)
      const reviver: DecodeReviver = (key, value, path) => {
        if (path.length === 0)
          return undefined
        return value
      }

      const result = decode(toon, { reviver })
      expect(result).toEqual({ name: 'Alice' })
    })
  })

  describe('bottom-up traversal', () => {
    it('visits leaves before parents', () => {
      const input = { parent: { child: 'leaf' } }
      const toon = encode(input)
      const visitOrder: string[] = []

      const reviver: DecodeReviver = (key, value) => {
        if (key !== '')
          visitOrder.push(key)
        return value
      }

      decode(toon, { reviver })

      // child should be visited before parent
      expect(visitOrder.indexOf('child')).toBeLessThan(visitOrder.indexOf('parent'))
    })

    it('visits array elements before the array container key', () => {
      const input = { items: ['a', 'b'] }
      const toon = encode(input)
      const visitOrder: string[] = []

      const reviver: DecodeReviver = (key, value) => {
        if (key !== '')
          visitOrder.push(key)
        return value
      }

      decode(toon, { reviver })

      // array elements (0, 1) should be visited before 'items'
      expect(visitOrder.indexOf('0')).toBeLessThan(visitOrder.indexOf('items'))
      expect(visitOrder.indexOf('1')).toBeLessThan(visitOrder.indexOf('items'))
    })
  })

  describe('path tracking', () => {
    it('provides correct paths for nested objects', () => {
      const input = { user: { profile: { name: 'Alice' } } }
      const toon = encode(input)
      const paths: string[] = []

      const reviver: DecodeReviver = (key, value, path) => {
        paths.push(path.join('.'))
        return value
      }

      decode(toon, { reviver })

      expect(paths).toContain('')
      expect(paths).toContain('user')
      expect(paths).toContain('user.profile')
      expect(paths).toContain('user.profile.name')
    })

    it('provides correct paths for arrays with numeric indices', () => {
      const input = { items: ['a', 'b', 'c'] }
      const toon = encode(input)
      const seenKeys: string[] = []

      const reviver: DecodeReviver = (key, value) => {
        if (typeof value === 'string')
          seenKeys.push(key)
        return value
      }

      decode(toon, { reviver })
      expect(seenKeys).toEqual(['0', '1', '2'])
    })
  })

  describe('edge cases', () => {
    it('handles null values', () => {
      const input = { value: null }
      const toon = encode(input)
      const reviver: DecodeReviver = (key, value) => {
        if (value === null)
          return 'WAS_NULL'
        return value
      }

      const result = decode(toon, { reviver }) as JsonObject
      expect(result.value).toBe('WAS_NULL')
    })

    it('handles empty objects', () => {
      const input = { data: {} }
      const toon = encode(input)
      const reviver: DecodeReviver = (key, value) => value

      const result = decode(toon, { reviver })
      expect(result).toEqual({ data: {} })
    })

    it('normalizes non-JsonValue returns', () => {
      const input = { date: '2025-01-01T00:00:00.000Z' }
      const toon = encode(input)
      const reviver: DecodeReviver = (key, value) => {
        if (key === 'date' && typeof value === 'string')
          return new Date(value)
        return value
      }

      const result = decode(toon, { reviver }) as JsonObject
      expect(typeof result.date).toBe('string')
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('handles all properties being filtered out', () => {
      const input = { a: 1, b: 2, c: 3 }
      const toon = encode(input)
      const reviver: DecodeReviver = (_key, value, path) => {
        if (path.length > 0)
          return undefined
        return value
      }

      const result = decode(toon, { reviver })
      expect(result).toEqual({})
    })
  })

  describe('roundtrip with replacer', () => {
    it('replacer and reviver compose correctly', () => {
      const input = { name: 'Alice', age: 30, role: 'admin' }

      // Encode with replacer that uppercases strings
      const toon = encode(input, {
        replacer: (key, value) => {
          if (typeof value === 'string')
            return value.toUpperCase()
          return value
        },
      })

      // Decode with reviver that lowercases strings
      const result = decode(toon, {
        reviver: (key, value) => {
          if (typeof value === 'string')
            return value.toLowerCase()
          return value
        },
      })

      expect(result).toEqual({ name: 'alice', age: 30, role: 'admin' })
    })
  })

  describe('comparison with JSON.parse reviver', () => {
    it('behaves similarly to JSON.parse for filtering', () => {
      const input = { name: 'Alice', password: 'secret' }
      const toon = encode(input)

      const toonReviver: DecodeReviver = (key, value) => {
        if (key === 'password')
          return undefined
        return value
      }

      const jsonReviver = (key: string, value: unknown) => {
        if (key === 'password')
          return undefined
        return value
      }

      const toonResult = decode(toon, { reviver: toonReviver })
      const jsonResult = JSON.parse(JSON.stringify(input), jsonReviver)

      expect(toonResult).toEqual(jsonResult)
    })

    it('uses string indices for arrays like JSON.parse', () => {
      const input = { items: ['a', 'b', 'c'] }
      const toon = encode(input)
      const keys: string[] = []

      const reviver: DecodeReviver = (key, value) => {
        if (typeof value === 'string')
          keys.push(key)
        return value
      }

      decode(toon, { reviver })
      expect(keys).toEqual(['0', '1', '2'])
    })
  })

  describe('integration with other decode options', () => {
    it('works with expandPaths', () => {
      const input = { 'user.name': 'Alice', 'user.age': 30 }
      const toon = encode(input)
      const reviver: DecodeReviver = (key, value) => {
        if (key === 'name' && typeof value === 'string')
          return value.toUpperCase()
        return value
      }

      const result = decode(toon, { expandPaths: 'safe', reviver }) as JsonObject
      const user = result.user as JsonObject
      expect(user.name).toBe('ALICE')
      expect(user.age).toBe(30)
    })

    it('works with strict mode disabled', () => {
      const input = { items: [1, 2, 3] }
      const toon = encode(input)
      const reviver: DecodeReviver = (key, value) => {
        if (typeof value === 'number')
          return value * 10
        return value
      }

      const result = decode(toon, { strict: false, reviver }) as JsonObject
      expect(result.items).toEqual([10, 20, 30])
    })
  })
})
