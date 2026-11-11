import { describe, expect, it } from 'vitest'
import { decode, decodeStreamSync, encode, encodeLines } from '../src/index'

describe('indentSize validation', () => {
  const data = { a: { b: 1 }, c: [1, 2] }

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects indentSize %s when encoding', (indentSize) => {
    expect(() => encode(data, { indentSize })).toThrow(/Invalid indentSize/)
    expect(() => [...encodeLines(data, { indentSize })]).toThrow(/Invalid indentSize/)
  })

  it.each([0, -1, 1.5, Number.NaN])('rejects indentSize %s when decoding', (indentSize) => {
    expect(() => decode('a: 1', { indentSize })).toThrow(/Invalid indentSize/)
    expect(() => [...decodeStreamSync(['a: 1'], { indentSize })]).toThrow(/Invalid indentSize/)
  })

  it('rejects the deprecated indent option the same way', () => {
    expect(() => encode(data, { indent: 0 })).toThrow(/Invalid indentSize/)
    expect(() => decode('a: 1', { indent: 0 })).toThrow(/Invalid indentSize/)
  })

  it('round-trips with the smallest valid indentSize', () => {
    expect(decode(encode(data, { indentSize: 1 }), { indentSize: 1 })).toEqual(data)
  })
})
