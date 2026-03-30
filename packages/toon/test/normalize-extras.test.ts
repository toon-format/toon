import { describe, expect, it } from 'vitest'
import fixtures from '../../../docs/plans/normalization-fixtures.json'
import { normalizeForToon } from '../src/normalize-extras'

describe('normalizeForToon', () => {
  describe('case1: single extras 1-depth (EventLog pattern)', () => {
    it('should split error objects into logs.error extras table', () => {
      const result = normalizeForToon(fixtures.case1_single_extras_1depth.before)
      expect(result).toEqual(fixtures.case1_single_extras_1depth.after)
    })
  })

  describe('case2: multi extras 2-3 depth (Orders with discount + shipping)', () => {
    it('should split into base + discount extras + shipping extras with flatten', () => {
      const result = normalizeForToon(fixtures.case2_multi_extras_2to3_depth.before)
      expect(result).toEqual(fixtures.case2_multi_extras_2to3_depth.after)
    })
  })

  describe('case3: deep extras 4+ depth (Incidents with resolution)', () => {
    it('should recursively flatten and null-pad missing nested fields', () => {
      const result = normalizeForToon(fixtures.case3_deep_extras_4plus_depth.before)
      expect(result).toEqual(fixtures.case3_deep_extras_4plus_depth.after)
    })
  })

  describe('case4: maxFlattenDepth exceeded → JSON string fallback', () => {
    it('should serialize beyond-depth objects as JSON strings', () => {
      const result = normalizeForToon(fixtures.case4_beyond_max_depth.before)
      expect(result).toEqual(fixtures.case4_beyond_max_depth.after_maxDepth3)
    })
  })

  describe('case5: threshold skip — extras ratio < 20%', () => {
    it('should not split when extras ratio is below threshold', () => {
      const result = normalizeForToon(fixtures.case5_threshold_skip.before)
      expect(result).toEqual(fixtures.case5_threshold_skip.after)
    })
  })

  describe('case6: already uniform — passthrough', () => {
    it('should return data unchanged when all objects have same fields', () => {
      const result = normalizeForToon(fixtures.case6_already_uniform.before)
      expect(result).toEqual(fixtures.case6_already_uniform.after)
    })
  })

  describe('edge cases', () => {
    it('should return empty object unchanged', () => {
      expect(normalizeForToon({})).toEqual({})
    })

    it('should return data with empty arrays unchanged', () => {
      const data = { items: [] }
      expect(normalizeForToon(data)).toEqual({ items: [] })
    })

    it('should return data with primitive arrays unchanged', () => {
      const data = { tags: ['a', 'b', 'c'] }
      expect(normalizeForToon(data)).toEqual({ tags: ['a', 'b', 'c'] })
    })

    it('should return non-array top-level values unchanged', () => {
      const data = { name: 'test', count: 42 }
      expect(normalizeForToon(data)).toEqual({ name: 'test', count: 42 })
    })

    it('should respect custom threshold option', () => {
      // case1 has 50% extras — with threshold 0.6 it should skip splitting
      const result = normalizeForToon(fixtures.case1_single_extras_1depth.before, { threshold: 0.6 })
      // Should strip non-common fields but not create extras table
      expect(result['logs.error']).toBeUndefined()
    })

    it('should respect custom maxFlattenDepth option', () => {
      // With maxFlattenDepth=1, shipping.address should be JSON-serialized
      const result = normalizeForToon(fixtures.case2_multi_extras_2to3_depth.before, { maxFlattenDepth: 1 })
      const shippingExtras = result['orders.shipping'] as any[]
      if (shippingExtras) {
        // address should be a JSON string at depth 1
        expect(typeof shippingExtras[0].address).toBe('string')
      }
    })
  })
})
