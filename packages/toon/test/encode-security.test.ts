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

  it('preserves own __proto__ properties when applying a replacer', () => {
    const marker = '__toonReplacerPolluted'
    const input = JSON.parse(`{"__proto__":{"${marker}":true},"b":2}`)
    const identityReplacer: EncodeReplacer = (_key, value) => value

    try {
      const decoded = decode(encode(input, { replacer: identityReplacer })) as Record<string, any>

      expect(Object.hasOwn(decoded, prototypeKey)).toBe(true)
      expect(decoded[prototypeKey][marker]).toBe(true)
      expect(decoded.b).toBe(2)
      expect(({} as Record<string, unknown>)[marker]).toBeUndefined()
    }
    finally {
      delete (Object.prototype as Record<string, unknown>)[marker]
    }
  })
})
