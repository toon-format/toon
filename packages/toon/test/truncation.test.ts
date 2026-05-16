import { describe, expect, it } from 'vitest'
import { detectTruncation } from '../src/index'

describe('detectTruncation', () => {
  describe('complete inputs', () => {
    it('returns isTruncated: false for complete tabular array', () => {
      const input = 'employees[3]{id,name}:\n  1,Alice\n  2,Bob\n  3,Charlie'
      const report = detectTruncation(input)

      expect(report.isTruncated).toBe(false)
      expect(report.arrays[0]?.missingItems).toBe(0)
      expect(report.arrays[0]?.completionRate).toBe(1)
    })

    it('returns isTruncated: false for complete list array', () => {
      const input = 'items[3]:\n  - a\n  - b\n  - c'
      const report = detectTruncation(input)

      expect(report.isTruncated).toBe(false)
      expect(report.arrays[0]?.missingItems).toBe(0)
    })

    it('returns isTruncated: false for complete inline array', () => {
      const input = 'scores[5]: 10,20,30,40,50'
      const report = detectTruncation(input)

      expect(report.isTruncated).toBe(false)
      expect(report.arrays[0]?.actualCount).toBe(5)
    })
  })

  describe('truncated inputs', () => {
    it('detects truncated tabular array', () => {
      const input = 'employees[100]{id,name}:\n  1,Alice\n  2,Bob'
      const report = detectTruncation(input)

      expect(report.isTruncated).toBe(true)
      expect(report.arrays[0]?.key).toBe('employees')
      expect(report.arrays[0]?.declaredCount).toBe(100)
      expect(report.arrays[0]?.actualCount).toBe(2)
      expect(report.arrays[0]?.missingItems).toBe(98)
      expect(report.arrays[0]?.completionRate).toBe(0.02)
    })

    it('detects truncated list array', () => {
      const input = 'items[10]:\n  - first\n  - second'
      const report = detectTruncation(input)

      expect(report.isTruncated).toBe(true)
      expect(report.arrays[0]?.declaredCount).toBe(10)
      expect(report.arrays[0]?.actualCount).toBe(2)
      expect(report.arrays[0]?.missingItems).toBe(8)
    })

    it('detects multiple truncated arrays', () => {
      const input = 'users[50]{id,name}:\n  1,Alice\norders[20]{id,total}:\n  1,99.99'
      const report = detectTruncation(input)

      expect(report.isTruncated).toBe(true)
      expect(report.arrays).toHaveLength(2)
      expect(report.arrays[0]?.missingItems).toBe(49)
      expect(report.arrays[1]?.missingItems).toBe(19)
    })
  })

  describe('edge cases', () => {
    it('never throws on malformed input', () => {
      expect(() => detectTruncation('')).not.toThrow()
      expect(() => detectTruncation(':::invalid:::')).not.toThrow()
      expect(() => detectTruncation('users[100]{')).not.toThrow()
    })

    it('returns empty arrays for input with no arrays', () => {
      const input = 'name: Alice\nage: 30'
      const report = detectTruncation(input)

      expect(report.isTruncated).toBe(false)
      expect(report.arrays).toHaveLength(0)
    })

    it('handles completely empty input', () => {
      const report = detectTruncation('')

      expect(report.isTruncated).toBe(false)
      expect(report.arrays).toHaveLength(0)
    })
  })
})
