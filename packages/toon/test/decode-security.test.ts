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

  it('keeps constructor.prototype expansion within own properties', () => {
    const marker = '__toonConstructorPolluted'

    try {
      const decoded = decode(`constructor.prototype.${marker}: true\n`, {
        expandPaths: 'safe',
      }) as Record<string, any>

      expect(Object.hasOwn(decoded, 'constructor')).toBe(true)
      expect(Object.hasOwn(decoded.constructor, 'prototype')).toBe(true)
      expect(decoded.constructor.prototype[marker]).toBe(true)
      expect(({} as Record<string, unknown>)[marker]).toBeUndefined()
    }
    finally {
      delete (Object.prototype as Record<string, unknown>)[marker]
    }
  })

  it('safely merges an expanded __proto__ path with a direct object', () => {
    const decoded = decode(`__proto__.first: true\n__proto__:\n  second: true\n`, {
      expandPaths: 'safe',
    }) as Record<string, any>

    expect(Object.hasOwn(decoded, prototypeKey)).toBe(true)
    expect(decoded[prototypeKey]).toEqual({ first: true, second: true })
  })

  it('safely overwrites a primitive __proto__ conflict in non-strict mode', () => {
    const decoded = decode(`__proto__: 1\n__proto__.second: true\n`, {
      expandPaths: 'safe',
      strict: false,
    }) as Record<string, any>

    expect(Object.hasOwn(decoded, prototypeKey)).toBe(true)
    expect(decoded[prototypeKey]).toEqual({ second: true })
  })
})
