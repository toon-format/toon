import { describe, expect, it } from 'vitest'
import { decode } from '../src/index'

describe('decode error context', () => {
  describe('line numbers in errors', () => {
    it('includes line number for missing colon after key', () => {
      // Line 1 is valid, line 2 has no colon
      const toon = 'name: Alice\nbadkey'
      expect(() => decode(toon)).toThrow(/line 2/)
    })

    it('includes line number for unterminated quoted key', () => {
      const toon = 'name: Alice\n"unterminated: value'
      expect(() => decode(toon)).toThrow(/line 2/)
    })

    it('includes line number for key parse error in nested object', () => {
      // Line 3 has a key without a colon
      const toon = 'user:\n  name: Alice\n  badkey'
      expect(() => decode(toon)).toThrow(/line 3/)
    })

    it('includes line number for extra list items in strict mode', () => {
      const toon = 'items[1]:\n  - first\n  - extra'
      expect(() => decode(toon, { strict: true })).toThrow(/line 3/)
    })

    it('includes line number for extra tabular rows in strict mode', () => {
      const toon = 'items[1]{name,age}:\n  Alice,30\n  Bob,25'
      expect(() => decode(toon, { strict: true })).toThrow(/line 3/)
    })

    it('valid decode still works after changes', () => {
      const toon = 'name: Alice\nage: 30\nrole: admin'
      const result = decode(toon)
      expect(result).toEqual({ name: 'Alice', age: 30, role: 'admin' })
    })

    it('nested structures decode correctly', () => {
      const toon = 'user:\n  name: Alice\n  profile:\n    bio: hello'
      const result = decode(toon)
      expect(result).toEqual({ user: { name: 'Alice', profile: { bio: 'hello' } } })
    })

    it('arrays decode correctly', () => {
      const toon = 'items[3]:\n  - name: a\n  - name: b\n  - name: c'
      const result = decode(toon)
      expect(result).toEqual({ items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] })
    })
  })
})
