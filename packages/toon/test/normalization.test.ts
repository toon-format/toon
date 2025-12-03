/* eslint-disable test/prefer-lowercase-title */
import { describe, expect, it } from 'vitest'
import { decode, encode } from '../src/index'

describe('JavaScript-specific type normalization', () => {
  describe('BigInt normalization', () => {
    it('converts BigInt within safe integer range to number', () => {
      const result = encode(BigInt(123))
      expect(result).toBe('123')
    })

    it('converts BigInt at MAX_SAFE_INTEGER boundary to number', () => {
      const result = encode(BigInt(Number.MAX_SAFE_INTEGER))
      expect(result).toBe('9007199254740991')
    })

    it('converts BigInt beyond safe integer range to quoted string', () => {
      const result = encode(BigInt('9007199254740992'))
      expect(result).toBe('"9007199254740992"')
    })

    it('converts large BigInt to quoted decimal string', () => {
      const result = encode(BigInt('12345678901234567890'))
      expect(result).toBe('"12345678901234567890"')
    })
  })

  describe('Date normalization', () => {
    it('converts Date to ISO 8601 quoted string', () => {
      const result = encode(new Date('2025-01-01T00:00:00.000Z'))
      expect(result).toBe('"2025-01-01T00:00:00.000Z"')
    })

    it('converts Date with milliseconds to ISO quoted string', () => {
      const result = encode(new Date('2025-11-05T12:34:56.789Z'))
      expect(result).toBe('"2025-11-05T12:34:56.789Z"')
    })
  })

  describe('Set normalization', () => {
    it('converts Set to array', () => {
      const input = new Set(['a', 'b', 'c'])
      const encoded = encode(input)
      const decoded = decode(encoded)
      expect(decoded).toEqual(['a', 'b', 'c'])
    })

    it('converts empty Set to empty array', () => {
      const result = encode(new Set())
      expect(result).toBe('[0]:')
    })
  })

  describe('Map normalization', () => {
    it('converts Map to object', () => {
      const input = new Map([['key1', 'value1'], ['key2', 'value2']])
      const encoded = encode(input)
      const decoded = decode(encoded)
      expect(decoded).toEqual({ key1: 'value1', key2: 'value2' })
    })

    it('converts empty Map to empty object', () => {
      const input = new Map()
      const result = encode(input)
      expect(result).toBe('')
    })

    it('converts Map with numeric keys to object with quoted string keys', () => {
      const input = new Map([[1, 'one'], [2, 'two']])
      const result = encode(input)
      expect(result).toBe('"1": one\n"2": two')
    })
  })

  describe('undefined, function, and Symbol normalization', () => {
    it('converts undefined to null', () => {
      const result = encode(undefined)
      expect(result).toBe('null')
    })

    it('converts function to null', () => {
      const result = encode(() => {})
      expect(result).toBe('null')
    })

    it('converts Symbol to null', () => {
      const result = encode(Symbol('test'))
      expect(result).toBe('null')
    })
  })

  describe('NaN and Infinity normalization', () => {
    it('converts NaN to null', () => {
      const result = encode(Number.NaN)
      expect(result).toBe('null')
    })

    it('converts Infinity to null', () => {
      const result = encode(Number.POSITIVE_INFINITY)
      expect(result).toBe('null')
    })

    it('converts negative Infinity to null', () => {
      const result = encode(Number.NEGATIVE_INFINITY)
      expect(result).toBe('null')
    })
  })

  describe('negative zero normalization', () => {
    it('normalizes -0 to 0', () => {
      const result = encode(-0)
      expect(result).toBe('0')
    })
  })

  describe('toJSON method support', () => {
    it('calls toJSON method when object has it', () => {
      const obj = {
        data: 'example',
        toJSON() {
          return { info: this.data }
        },
      }
      const result = encode(obj)
      expect(result).toBe('info: example')
    })

    it('calls toJSON returning a primitive', () => {
      const obj = {
        value: 42,
        toJSON() {
          return 'custom-string'
        },
      }
      const result = encode(obj)
      expect(result).toBe('custom-string')
    })

    it('calls toJSON returning an array', () => {
      const obj = {
        items: [1, 2, 3],
        toJSON() {
          return ['a', 'b', 'c']
        },
      }
      const result = encode(obj)
      expect(result).toBe('[3]: a,b,c')
    })

    it('calls toJSON returning null', () => {
      const obj = {
        data: 'test',
        toJSON() {
          return null
        },
      }
      const result = encode(obj)
      expect(result).toBe('null')
    })

    it('calls toJSON in nested object properties', () => {
      const nestedObj = {
        secret: 'hidden',
        toJSON() {
          return { public: 'visible' }
        },
      }
      const obj = {
        nested: nestedObj,
        other: 'value',
      }
      const result = encode(obj)
      expect(result).toBe('nested:\n  public: visible\nother: value')
    })

    it('calls toJSON in array elements', () => {
      const obj1 = {
        data: 'first',
        toJSON() {
          return { transformed: 'first-transformed' }
        },
      }
      const obj2 = {
        data: 'second',
        toJSON() {
          return { transformed: 'second-transformed' }
        },
      }
      const arr = [obj1, obj2]
      const result = encode(arr)
      expect(result).toBe('[2]{transformed}:\n  first-transformed\n  second-transformed')
    })

    it('recursively calls toJSON when returned object also has toJSON', () => {
      const innerObj = {
        inner: 'data',
        toJSON() {
          return { innerTransformed: 'transformed-data' }
        },
      }
      const outerObj = {
        outer: 'data',
        toJSON() {
          return { nested: innerObj }
        },
      }
      const result = encode(outerObj)
      expect(result).toBe('nested:\n  innerTransformed: transformed-data')
    })

    it('toJSON takes precedence over Date normalization', () => {
      const customDate = {
        toJSON() {
          return { type: 'custom-date', value: '2025-01-01' }
        },
      }
      // Make it look like a Date but with toJSON
      Object.setPrototypeOf(customDate, Date.prototype)
      const result = encode(customDate)
      expect(result).toBe('type: custom-date\nvalue: 2025-01-01')
    })

    it('toJSON takes precedence over Array normalization', () => {
      const customArray = {
        toJSON() {
          return { type: 'was-array', items: 3 }
        },
      }
      // Make it look like an Array but with toJSON
      Object.setPrototypeOf(customArray, Array.prototype)
      const result = encode(customArray)
      expect(result).toBe('type: was-array\nitems: 3')
    })

    it('toJSON takes precedence over Set normalization', () => {
      const customSet = {
        toJSON() {
          return { type: 'was-set', count: 5 }
        },
      }
      Object.setPrototypeOf(customSet, Set.prototype)
      const result = encode(customSet)
      expect(result).toBe('type: was-set\ncount: 5')
    })

    it('toJSON takes precedence over Map normalization', () => {
      const customMap = {
        toJSON() {
          return { type: 'was-map', entries: 2 }
        },
      }
      Object.setPrototypeOf(customMap, Map.prototype)
      const result = encode(customMap)
      expect(result).toBe('type: was-map\nentries: 2')
    })

    it('works with toJSON inherited from prototype', () => {
      class CustomClass {
        constructor(private value: string) {}

        toJSON() {
          return { classValue: this.value }
        }
      }

      const instance = new CustomClass('test-value')
      const result = encode(instance)
      expect(result).toBe('classValue: test-value')
    })

    it('handles toJSON returning undefined (normalizes to null)', () => {
      const obj = {
        data: 'test',
        toJSON() {
          return undefined
        },
      }
      const result = encode(obj)
      expect(result).toBe('null')
    })

    it('round-trip encoding/decoding with toJSON', () => {
      const obj = {
        id: 1,
        name: 'Test',
        toJSON() {
          return { id: this.id, name: this.name.toUpperCase() }
        },
      }
      const encoded = encode(obj)
      const decoded = decode(encoded)
      expect(decoded).toEqual({ id: 1, name: 'TEST' })
    })

    it('works with toJSON in deeply nested structures', () => {
      const deepObj = {
        level: 3,
        toJSON() {
          return { depth: this.level, transformed: true }
        },
      }
      const obj = {
        nested: {
          deeper: {
            deepest: deepObj,
          },
        },
      }
      const result = encode(obj)
      expect(result).toBe('nested:\n  deeper:\n    deepest:\n      depth: 3\n      transformed: true')
    })

    it('works with replacer function - replacer sees toJSON result', () => {
      const obj = {
        id: 1,
        secret: 'hidden',
        toJSON() {
          return { id: this.id, public: 'visible' }
        },
      }
      const replacer = (key: string, value: unknown) => {
        // Replacer should see the toJSON result, not the original object
        if (typeof value === 'object' && value !== null && 'public' in value) {
          return { ...value, extra: 'added' }
        }
        return value
      }
      const result = encode(obj, { replacer })
      const decoded = decode(result)
      expect(decoded).toEqual({ id: 1, public: 'visible', extra: 'added' })
      expect(decoded).not.toHaveProperty('secret')
    })

    it('works with different encoding options', () => {
      const obj = {
        data: 'test',
        toJSON() {
          return { transformed: 'value', count: 42 }
        },
      }
      // Test with custom indent
      const result1 = encode(obj, { indent: 4 })
      expect(result1).toBe('transformed: value\ncount: 42')
      // Test with custom delimiter
      const result2 = encode(obj, { delimiter: '\t' })
      expect(result2).toBe('transformed: value\ncount: 42')
    })

    it('toJSON result is normalized before replacer is applied', () => {
      const dateObj = {
        date: new Date('2025-01-01T00:00:00.000Z'),
        toJSON() {
          return { date: this.date }
        },
      }
      const replacer = (key: string, value: unknown) => {
        // The date should already be normalized to ISO string by the time replacer sees it
        if (key === 'date' && typeof value === 'string') {
          return value.replace('2025', 'YEAR')
        }
        return value
      }
      const result = encode(dateObj, { replacer })
      const decoded = decode(result)
      expect(decoded).toEqual({ date: 'YEAR-01-01T00:00:00.000Z' })
    })
  })
})
