import { describe, expect, it } from 'vitest'
import { decodeJsonl, encodeJsonl } from '../src'

describe('jsonl encoding and decoding', () => {
  describe('encodeJsonl', () => {
    it('should encode array of objects to JSONL format', () => {
      const input = [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' },
      ]

      const result = encodeJsonl(input)

      expect(result).toBe(
        'id: 1\nname: Alice\nrole: admin\n---\n'
        + 'id: 2\nname: Bob\nrole: user',
      )
    })

    it('should encode array of primitives to JSONL format', () => {
      const input = ['hello', 'world', 42, true, null]

      const result = encodeJsonl(input)

      expect(result).toBe('hello\n---\nworld\n---\n42\n---\ntrue\n---\nnull')
    })

    it('should handle empty array', () => {
      const input: unknown[] = []

      const result = encodeJsonl(input)

      expect(result).toBe('')
    })

    it('should handle array with one element', () => {
      const input = [{ message: 'hello world' }]

      const result = encodeJsonl(input)

      expect(result).toBe('message: hello world')
    })

    it('should throw error for non-array input', () => {
      const input = { not: 'an array' }

      expect(() => encodeJsonl(input as any)).toThrow(
        'JSONL encoding requires an array as input',
      )
    })
  })

  describe('decodeJsonl', () => {
    it('should decode JSONL format to array of objects', () => {
      const input
        = 'id: 1\nname: Alice\nrole: admin\n---\n'
          + 'id: 2\nname: Bob\nrole: user'

      const result = decodeJsonl(input)

      expect(result).toEqual([
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' },
      ])
    })

    it('should decode JSONL with mixed types', () => {
      const input = 'hello\n---\n42\n---\ntrue\n---\nnull\n---\nkey: value'

      const result = decodeJsonl(input)

      expect(result).toEqual(['hello', 42, true, null, { key: 'value' }])
    })

    it('should handle empty string', () => {
      const result = decodeJsonl('')

      expect(result).toEqual([])
    })

    it('should handle whitespace-only string', () => {
      const result = decodeJsonl('   \n  \n  ')

      expect(result).toEqual([])
    })

    it('should ignore empty sections between separators', () => {
      const input
        = 'id: 1\n---\n'
          + '\n---\n'
          + 'id: 2\n---\n'
          + '   \n---\n'
          + 'id: 3'

      const result = decodeJsonl(input)

      expect(result).toEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ])
    })

    it('should throw error for invalid TOON in specific section', () => {
      const input
        = 'id: 1\n---\n'
          + 'key: value\n invalid indentation\n---\n'
          + 'id: 3'

      expect(() => decodeJsonl(input)).toThrow(
        /Failed to parse TOON on section 2/,
      )
    })

    it('should handle complex nested objects', () => {
      const input
        = 'user:\n  id: 1\n  profile:\n    name: Alice\n    tags[2]: admin,active\n---\n'
          + 'user:\n  id: 2\n  profile:\n    name: Bob\n    tags[1]: user'

      const result = decodeJsonl(input)

      expect(result).toEqual([
        { user: { id: 1, profile: { name: 'Alice', tags: ['admin', 'active'] } } },
        { user: { id: 2, profile: { name: 'Bob', tags: ['user'] } } },
      ])
    })
  })

  describe('round-trip encoding and decoding', () => {
    it('should preserve data through encode/decode cycle', () => {
      const original = [
        { id: 1, name: 'Alice', active: true, score: 95.5 },
        { id: 2, name: 'Bob', active: false, score: 88.2 },
        { id: 3, name: 'Charlie', active: true, score: null },
      ]

      const encoded = encodeJsonl(original)
      const decoded = decodeJsonl(encoded)

      expect(decoded).toEqual(original)
    })

    it('should handle edge cases in round-trip', () => {
      const original = [
        '',
        0,
        false,
        null,
        [],
        { empty: '', zero: 0, false: false, null: null, array: [], object: {} },
      ]

      const encoded = encodeJsonl(original)
      const decoded = decodeJsonl(encoded)

      expect(decoded).toEqual(original)
    })
  })
})
