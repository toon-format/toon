import { describe, expect, it } from 'vitest'
import { decode, encode } from '../src/index'

describe('nested table syntax', () => {
  describe('encoder', () => {
    it('flattens uniform nested objects into inline syntax', () => {
      const data = {
        orders: [
          { id: 1, customer: { name: 'Alice', country: 'DK' }, total: 99.00 },
          { id: 2, customer: { name: 'Bob', country: 'UK' }, total: 149.00 },
        ],
      }

      const result = encode(data, { nestedTables: true })
      expect(result).toContain('orders[2]{id,customer{name,country},total}:')
      expect(result).toContain('1,Alice,DK,99')
      expect(result).toContain('2,Bob,UK,149')
    })

    it('falls back for non-uniform nested objects', () => {
      const data = {
        orders: [
          { id: 1, customer: { name: 'Alice', country: 'DK' }, total: 99.00 },
          { id: 2, customer: { name: 'Bob', age: 30 }, total: 149.00 },
        ],
      }

      const result = encode(data, { nestedTables: true })
      // Non-uniform nested objects should fall back to list format
      expect(result).not.toContain('customer{')
      expect(result).toContain('- id: 1')
    })

    it('does not use nested tables when option is disabled', () => {
      const data = {
        orders: [
          { id: 1, customer: { name: 'Alice', country: 'DK' }, total: 99.00 },
          { id: 2, customer: { name: 'Bob', country: 'UK' }, total: 149.00 },
        ],
      }

      const withoutNested = encode(data)
      const withNestedFalse = encode(data, { nestedTables: false })
      expect(withoutNested).toBe(withNestedFalse)
      expect(withoutNested).not.toContain('customer{')
    })

    it('handles multiple nested fields', () => {
      const data = {
        records: [
          { addr: { city: 'Copenhagen', zip: '2100' }, contact: { email: 'a@b.com', phone: '123' } },
          { addr: { city: 'London', zip: 'SW1A' }, contact: { email: 'c@d.com', phone: '456' } },
        ],
      }

      const result = encode(data, { nestedTables: true })
      expect(result).toContain('addr{city,zip}')
      expect(result).toContain('contact{email,phone}')
    })
  })

  describe('decoder', () => {
    it('reconstructs nested objects from flattened rows', () => {
      const toon = 'orders[2]{id,customer{name,country},total}:\n  1,Alice,DK,99\n  2,Bob,UK,149'
      const result = decode(toon)
      expect(result).toEqual({
        orders: [
          { id: 1, customer: { name: 'Alice', country: 'DK' }, total: 99 },
          { id: 2, customer: { name: 'Bob', country: 'UK' }, total: 149 },
        ],
      })
    })

    it('strips type hints in nested headers (forward compat)', () => {
      const toon = 'orders[2]{id:int,customer{name:str,country:str},total:float}:\n  1,Alice,DK,99.5\n  2,Bob,UK,149.0'
      const result = decode(toon)
      expect(result).toEqual({
        orders: [
          { id: 1, customer: { name: 'Alice', country: 'DK' }, total: 99.5 },
          { id: 2, customer: { name: 'Bob', country: 'UK' }, total: 149 },
        ],
      })
    })

    it('handles multiple nested fields', () => {
      const toon = 'data[1]{a{x,y},b{m,n}}:\n  1,2,3,4'
      const result = decode(toon)
      expect(result).toEqual({
        data: [
          { a: { x: 1, y: 2 }, b: { m: 3, n: 4 } },
        ],
      })
    })
  })

  describe('round-trip', () => {
    it('jSON → TOON (nested) → JSON is lossless', () => {
      const original = {
        orders: [
          { id: 1, customer: { name: 'Alice', country: 'DK' }, total: 99 },
          { id: 2, customer: { name: 'Bob', country: 'UK' }, total: 149 },
        ],
      }

      const toon = encode(original, { nestedTables: true })
      const decoded = decode(toon)
      expect(decoded).toEqual(original)
    })

    it('falls back gracefully for non-uniform nested objects', () => {
      const original = {
        items: [
          { id: 1, meta: { tag: 'a' } },
          { id: 2, meta: { tag: 'b', extra: 'x' } },
        ],
      }

      // With nestedTables on, non-uniform should fall back
      const toon = encode(original, { nestedTables: true })
      const decoded = decode(toon)
      expect(decoded).toEqual(original)
    })
  })
})
