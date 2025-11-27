import { describe, expect, it } from 'vitest'
import { encodeLines } from '../src/index'

describe('encodeLines', () => {
  it('yield lines without newline characters', () => {
    const value = { name: 'Alice', age: 30, city: 'Paris' }
    const lines = Array.from(encodeLines(value))

    for (const line of lines) {
      expect(line).not.toContain('\n')
    }
  })

  it('yield zero lines for empty object', () => {
    const lines = Array.from(encodeLines({}))

    expect(lines.length).toBe(0)
  })

  it('be iterable with for-of loop', () => {
    const value = { x: 10, y: 20 }
    const collectedLines: string[] = []

    for (const line of encodeLines(value)) {
      collectedLines.push(line)
    }

    expect(collectedLines.length).toBe(2)
    expect(collectedLines[0]).toBe('x: 10')
    expect(collectedLines[1]).toBe('y: 20')
  })

  it('not have trailing spaces in lines', () => {
    const value = {
      user: {
        name: 'Alice',
        tags: ['a', 'b'],
        nested: {
          deep: 'value',
        },
      },
    }
    const lines = Array.from(encodeLines(value))

    for (const line of lines) {
      expect(line).not.toMatch(/\s$/)
    }
  })

  it('yield correct number of lines', () => {
    const value = { a: 1, b: 2, c: 3 }
    const lines = Array.from(encodeLines(value))

    expect(lines.length).toBe(3)
  })
})
