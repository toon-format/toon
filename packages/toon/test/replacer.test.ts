/* eslint-disable test/prefer-lowercase-title */
import { describe, expect, it } from 'vitest'
import { encode } from '../src/index'

describe('Replacer option', () => {
  describe('Function replacer', () => {
    it('omits properties when returning undefined', () => {
      const user = { id: 1, password: 'hunter2', name: 'Alice' }
      const result = encode(user, {
        replacer: (key, value) => {
          if (key === 'password') return undefined
          return value
        },
      })
      expect(result).toBe('id: 1\nname: Alice')
    })

    it('transforms values', () => {
      const data = { name: 'alice', city: 'boston' }
      const result = encode(data, {
        replacer: (key, value) => {
          if (typeof value === 'string' && key !== '') {
            return value.toUpperCase()
          }
          return value
        },
      })
      expect(result).toBe('name: ALICE\ncity: BOSTON')
    })

    it('receives empty string key for root value', () => {
      const keys: string[] = []
      encode({ a: 1, b: 2 }, {
        replacer: (key, value) => {
          keys.push(key)
          return value
        },
      })
      expect(keys[0]).toBe('')
    })

    it('works with nested objects', () => {
      const data = {
        user: {
          id: 1,
          secret: 'hidden',
          profile: {
            name: 'Alice',
            token: 'abc123',
          },
        },
      }
      const result = encode(data, {
        replacer: (key, value) => {
          if (key === 'secret' || key === 'token') return undefined
          return value
        },
      })
      expect(result).toBe('user:\n  id: 1\n  profile:\n    name: Alice')
    })

    it('works with arrays - omitted values become null', () => {
      const data = [1, 2, 3, 4, 5]
      const result = encode(data, {
        replacer: (key, value) => {
          // Omit values > 3 in arrays
          if (key !== '' && typeof value === 'number' && value > 3) {
            return undefined
          }
          return value
        },
      })
      // Arrays preserve indices, so omitted values become null
      expect(result).toBe('[5]: 1,2,3,null,null')
    })

    it('can replace entire root object', () => {
      const data = { original: true }
      const result = encode(data, {
        replacer: (key, value) => {
          if (key === '') return { replaced: true }
          return value
        },
      })
      expect(result).toBe('replaced: true')
    })

    it('omitting root returns empty output', () => {
      const data = { a: 1 }
      const result = encode(data, {
        replacer: (key) => {
          if (key === '') return undefined
          return undefined
        },
      })
      // When root is omitted, we get null (converted to empty by encode)
      expect(result).toBe('null')
    })

    it('works with tabular arrays', () => {
      const users = [
        { id: 1, name: 'Alice', password: 'secret1' },
        { id: 2, name: 'Bob', password: 'secret2' },
      ]
      const result = encode(users, {
        replacer: (key, value) => {
          if (key === 'password') return undefined
          return value
        },
      })
      expect(result).toBe('[2]{id,name}:\n  1,Alice\n  2,Bob')
    })
  })

  describe('Array replacer (allowlist)', () => {
    it('includes only allowed keys', () => {
      const user = { id: 1, name: 'Alice', email: 'alice@example.com', password: 'secret' }
      const result = encode(user, {
        replacer: ['id', 'name'],
      })
      expect(result).toBe('id: 1\nname: Alice')
    })

    it('works with nested objects', () => {
      const data = {
        user: {
          id: 1,
          name: 'Alice',
          secret: 'hidden',
        },
        meta: {
          created: '2025-01-01',
          internal: 'private',
        },
      }
      const result = encode(data, {
        replacer: ['user', 'meta', 'id', 'name', 'created'],
      })
      expect(result).toBe('user:\n  id: 1\n  name: Alice\nmeta:\n  created: 2025-01-01')
    })

    it('always includes array indices', () => {
      const data = { items: ['a', 'b', 'c'] }
      const result = encode(data, {
        replacer: ['items'],
      })
      expect(result).toBe('items[3]: a,b,c')
    })

    it('handles numeric keys in allowlist', () => {
      const data = { id: 1, name: 'Alice' }
      const result = encode(data, {
        replacer: ['id', 1], // 1 is converted to string '1'
      })
      expect(result).toBe('id: 1')
    })

    it('empty allowlist omits all object keys', () => {
      const data = { a: 1, b: 2, c: 3 }
      const result = encode(data, {
        replacer: [],
      })
      expect(result).toBe('')
    })

    it('works with tabular arrays and allowlist', () => {
      const users = [
        { id: 1, name: 'Alice', email: 'a@x.com', role: 'admin' },
        { id: 2, name: 'Bob', email: 'b@x.com', role: 'user' },
      ]
      const result = encode(users, {
        replacer: ['id', 'name'],
      })
      expect(result).toBe('[2]{id,name}:\n  1,Alice\n  2,Bob')
    })
  })

  describe('Edge cases', () => {
    it('works with primitives at root', () => {
      const result = encode('hello', {
        replacer: (key, value) => {
          if (typeof value === 'string') return value.toUpperCase()
          return value
        },
      })
      expect(result).toBe('HELLO')
    })

    it('works with null at root', () => {
      const result = encode(null, {
        replacer: (key, value) => value,
      })
      expect(result).toBe('null')
    })

    it('works with empty object', () => {
      const result = encode({}, {
        replacer: ['id'],
      })
      expect(result).toBe('')
    })

    it('works with empty array', () => {
      const result = encode([], {
        replacer: (key, value) => value,
      })
      expect(result).toBe('[0]:')
    })

    it('replacer can convert types', () => {
      const data = { date: new Date('2025-01-01T00:00:00.000Z') }
      const result = encode(data, {
        replacer: (key, value) => {
          if (value instanceof Date) {
            return value.getFullYear()
          }
          return value
        },
      })
      expect(result).toBe('date: 2025')
    })

    it('works with deeply nested structures', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              secret: 'hidden',
              visible: 'shown',
            },
          },
        },
      }
      const result = encode(data, {
        replacer: (key, value) => {
          if (key === 'secret') return undefined
          return value
        },
      })
      expect(result).toBe('level1:\n  level2:\n    level3:\n      visible: shown')
    })

    it('combines with other options like keyFolding', () => {
      const data = {
        wrapper: {
          inner: {
            id: 1,
            secret: 'hidden',
          },
        },
      }
      const result = encode(data, {
        keyFolding: 'safe',
        replacer: (key, value) => {
          if (key === 'secret') return undefined
          return value
        },
      })
      expect(result).toBe('wrapper.inner.id: 1')
    })
  })
})
