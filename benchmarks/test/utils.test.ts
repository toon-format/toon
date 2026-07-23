import { describe, expect, it } from 'vitest'
import { wilsonInterval } from '../src/utils.ts'

describe('wilsonInterval', () => {
  it('matches the known 95% interval for 80/100', () => {
    const interval = wilsonInterval(80, 100)
    expect(interval.lower).toBeCloseTo(0.711, 3)
    expect(interval.upper).toBeCloseTo(0.867, 3)
  })

  it('reports halfWidth as half the interval span', () => {
    const interval = wilsonInterval(80, 100)
    expect(interval.halfWidth).toBeCloseTo((interval.upper - interval.lower) / 2, 12)
  })

  it('stays inside bounds for a zero-success sample', () => {
    const interval = wilsonInterval(0, 10)
    expect(interval.lower).toBe(0)
    expect(interval.upper).toBeCloseTo(0.278, 3)
  })

  it('returns zeros for an empty sample without dividing by zero', () => {
    expect(wilsonInterval(0, 0)).toEqual({ lower: 0, upper: 0, halfWidth: 0 })
  })
})
