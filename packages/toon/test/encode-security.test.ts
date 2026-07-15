import type { EncodeReplacer } from '../src/index'
import { describe, expect, it } from 'vitest'
import { decode, encode } from '../src/index'

describe('encode security hardening', () => {
  const prototypeKey = '__proto__'

  it('preserves own __proto__ properties through an encode/decode round trip', () => {
    const marker = '__toonEncodedPolluted'
    const input = JSON.parse(`{"__proto__":{"${marker}":true},"b":2}`)

    try {
      const decoded = decode(encode(input)) as Record<string, any>

      expect(Object.hasOwn(decoded, prototypeKey)).toBe(true)
      expect(decoded[prototypeKey][marker]).toBe(true)
      expect(decoded.b).toBe(2)
      expect(({} as Record<string, unknown>)[marker]).toBeUndefined()
    }
    finally {
      delete (Object.prototype as Record<string, unknown>)[marker]
    }
  })

  it('preserves nested own __proto__ properties introduced by a replacer', () => {
    const marker = '__toonNestedReplacerPolluted'
    const replacement = JSON.parse(`{"__proto__":{"${marker}":true},"safe":1}`)
    const replacer: EncodeReplacer = (key, value) => key === 'payload' ? replacement : value

    try {
      const decoded = decode(encode({ payload: null }, { replacer })) as Record<string, any>

      expect(Object.hasOwn(decoded.payload, prototypeKey)).toBe(true)
      expect(decoded.payload[prototypeKey][marker]).toBe(true)
      expect(decoded.payload.safe).toBe(1)
      expect(({} as Record<string, unknown>)[marker]).toBeUndefined()
    }
    finally {
      delete (Object.prototype as Record<string, unknown>)[marker]
    }
  })

  it('preserves own __proto__ properties through key folding and expansion', () => {
    const input = JSON.parse('{"__proto__":{"inner":{"folded":true}}}')
    const encoded = encode(input, { keyFolding: 'safe' })
    const decoded = decode(encoded, { expandPaths: 'safe' }) as Record<string, any>

    expect(Object.hasOwn(decoded, prototypeKey)).toBe(true)
    expect(decoded[prototypeKey].inner.folded).toBe(true)
  })

  it('does not use inherited properties to classify tabular rows', () => {
    const inheritedKey = '__toonInheritedTabularField'
    const input = [{ [inheritedKey]: 'user' }, { other: 'kept' }]

    // eslint-disable-next-line no-extend-native -- Simulate a pre-polluted environment
    Object.defineProperty(Object.prototype, inheritedKey, {
      value: 'admin',
      enumerable: true,
      writable: true,
      configurable: true,
    })

    try {
      expect(decode(encode(input))).toEqual(input)
    }
    finally {
      delete (Object.prototype as Record<string, unknown>)[inheritedKey]
    }
  })
})
