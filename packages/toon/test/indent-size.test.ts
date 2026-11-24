import { describe, expect, it } from 'vitest'
import { decode, encode } from '../src/index'

describe('indentSize', () => {
  it.each([0, 1.5])('rejects %s', (indentSize) => {
    expect(() => encode({ a: 1 }, { indentSize })).toThrow(/Invalid indentSize/)
    expect(() => decode('a: 1', { indentSize })).toThrow(/Invalid indentSize/)
  })

  it('round-trips with indentSize 1', () => {
    const data = { a: { b: 1 } }
    expect(decode(encode(data, { indentSize: 1 }), { indentSize: 1 })).toEqual(data)
  })
})
