import { describe, expect, it } from 'vitest'
import { decode } from '../src/index'

describe('decode security hardening', () => {
  const prototypeKey = '__proto__'

  it('keeps direct __proto__ keys as own data properties', () => {
    const marker = '__toonDirectPolluted'

    try {
      const decoded = decode(`__proto__:\n  ${marker}: true\n`) as Record<string, any>

      expect(Object.hasOwn(decoded, prototypeKey)).toBe(true)
      expect(decoded[prototypeKey][marker]).toBe(true)
      expect(({} as Record<string, unknown>)[marker]).toBeUndefined()
    }
    finally {
      delete (Object.prototype as Record<string, unknown>)[marker]
    }
  })

  it('does not follow Object.prototype during dotted path expansion', () => {
    const marker = '__toonExpandedPolluted'

    try {
      const decoded = decode(`payload.__proto__.${marker}: true\n`, {
        expandPaths: 'safe',
      }) as Record<string, any>

      expect(Object.hasOwn(decoded.payload, prototypeKey)).toBe(true)
      expect(decoded.payload[prototypeKey][marker]).toBe(true)
      expect(({} as Record<string, unknown>)[marker]).toBeUndefined()
    }
    finally {
      delete (Object.prototype as Record<string, unknown>)[marker]
    }
  })
})
