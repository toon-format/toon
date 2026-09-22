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

  it.each([
    ['primitive', '__proto__: true', true],
    ['array', '__proto__[2]: 1,2', [1, 2]],
  ])('keeps direct __proto__ %s values as own data properties', (_name, input, expected) => {
    const decoded = decode(input) as Record<string, any>

    expect(Object.hasOwn(decoded, prototypeKey)).toBe(true)
    expect(decoded[prototypeKey]).toEqual(expected)
  })

  it('keeps a dotted __proto__ path as a single literal key', () => {
    const marker = '__toonDottedPolluted'
    const decoded = decode(`payload.__proto__.${marker}: true\n`) as Record<string, any>

    expect(Object.hasOwn(decoded, `payload.__proto__.${marker}`)).toBe(true)
    expect(({} as Record<string, unknown>)[marker]).toBeUndefined()
  })
})
