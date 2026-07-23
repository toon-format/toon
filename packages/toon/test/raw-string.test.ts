import type { EncodeReplacer } from '../src/types'
import { describe, expect, it } from 'vitest'
import { decode, encode, escapeString, rawString } from '../src/index'

describe('rawString', () => {
  describe('verbatim emission', () => {
    it('bypasses quoting, escaping, and number/keyword detection', () => {
      const replacer: EncodeReplacer = (key, value) => typeof value === 'string' ? rawString(value) : value

      expect(encode({ note: 'a, b, c' }, { replacer })).toBe('note: a, b, c')
      expect(encode({ flag: 'true' }, { replacer })).toBe('flag: true')
      expect(encode({ id: '007' }, { replacer })).toBe('id: 007')
    })

    it('emits a pre-quoted string as-is', () => {
      const replacer: EncodeReplacer = (key, value) => typeof value === 'string' ? rawString(`"${value}"`) : value

      expect(encode({ id: '123' }, { replacer })).toBe('id: "123"')
    })

    it('mixes raw and normal returns', () => {
      const replacer: EncodeReplacer = (key, value) => key === 'price' ? rawString(`$${value}`) : value

      expect(encode({ price: 9.99, qty: 2 }, { replacer })).toBe('price: $9.99\nqty: 2')
    })

    it('accepts raw values directly without a replacer', () => {
      expect(encode({ a: rawString('RAW') })).toBe('a: RAW')
      expect(encode(rawString('VERBATIM'))).toBe('VERBATIM')
    })
  })

  describe('emission positions', () => {
    it('encodes raw values in inline primitive arrays', () => {
      const replacer: EncodeReplacer = (key, value) => typeof value === 'string' ? rawString(`"${value}"`) : value

      expect(encode({ tags: ['x', 'y'] }, { replacer })).toBe('tags[2]: "x","y"')
    })

    it('encodes raw values in tabular rows', () => {
      const replacer: EncodeReplacer = (key, value) => key === 'qty' ? rawString(`"${value}"`) : value
      const input = { items: [{ sku: 'A1', qty: 2 }, { sku: 'B2', qty: 1 }] }

      expect(encode(input, { replacer })).toBe('items[2]{sku,qty}:\n  A1,"2"\n  B2,"1"')
    })

    it('encodes raw values in keyed tabular entry rows', () => {
      const replacer: EncodeReplacer = (key, value) => key === 'age' ? rawString(`"${value}"`) : value
      const input = { users: { alice: { age: 30, city: 'Berlin' }, bob: { age: 25, city: 'Oslo' } } }

      expect(encode(input, { replacer })).toBe('users[2:]{age,city}:\n  alice: "30",Berlin\n  bob: "25",Oslo')
    })

    it('encodes raw values in nested field group cells', () => {
      const replacer: EncodeReplacer = (key, value) => key === 'country' ? rawString(`"${value}"`) : value
      const input = {
        orders: [
          { id: 1, customer: { name: 'Alice', country: 'DK' }, total: 99 },
          { id: 2, customer: { name: 'Bob', country: 'UK' }, total: 149 },
        ],
      }

      expect(encode(input, { replacer })).toBe('orders[2]{id,customer{name,country},total}:\n  1,Alice,"DK",99\n  2,Bob,"UK",149')
    })
  })

  describe('container handling', () => {
    it('ignores raw values returned for containers and keeps traversing', () => {
      const replacer: EncodeReplacer = (key, value) => rawString(`"${escapeString(String(value))}"`)

      expect(encode({ name: 'Alice', age: 30 }, { replacer })).toBe('name: "Alice"\nage: "30"')
    })

    it('round-trips always-quote output with numbers decoded as strings', () => {
      const replacer: EncodeReplacer = (key, value) => rawString(`"${escapeString(String(value))}"`)
      const result = encode([{ id: 1, name: 'A' }], { replacer })

      expect(result).toBe('[1]{id,name}:\n  "1","A"')
      expect(decode(result)).toEqual([{ id: '1', name: 'A' }])
    })
  })

  describe('comment-line rejection', () => {
    it('throws when a line starts with the comment marker', () => {
      expect(() => rawString('#hi')).toThrowError(TypeError)
      expect(() => rawString('  # indented')).toThrowError(TypeError)
      expect(() => rawString('note\n# hidden')).toThrowError(TypeError)
    })

    it('allows the comment marker after other content on the same line', () => {
      expect(encode({ tag: rawString('a #tag') })).toBe('tag: a #tag')
    })
  })
})

describe('escapeString', () => {
  it('escapes quotes, backslashes, and control characters', () => {
    expect(escapeString('Alice')).toBe('Alice')
    expect(escapeString('a"b')).toBe('a\\"b')
    expect(escapeString('a\\b')).toBe('a\\\\b')
    expect(escapeString('a\nb')).toBe('a\\nb')
    expect(escapeString('a\tb')).toBe('a\\tb')
  })

  it('composes with rawString for custom quoting', () => {
    const replacer: EncodeReplacer = (key, value) => rawString(`"${escapeString(String(value))}"`)
    const result = encode({ q: 'a"b' }, { replacer })

    expect(result).toBe('q: "a\\"b"')
    expect(decode(result)).toEqual({ q: 'a"b' })
  })
})
