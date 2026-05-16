import { describe, expect, it } from 'vitest'
import { encodeLines } from '../src/index'

describe('encodeLines', () => {
  it('yields lines without newline characters', () => {
    const value = { name: 'Alice', age: 30, city: 'Paris' }
    const lines = Array.from(encodeLines(value))

    for (const line of lines) {
      expect(line).not.toContain('\n')
    }
  })

  it('yields zero lines for empty object', () => {
    const lines = Array.from(encodeLines({}))

    expect(lines.length).toBe(0)
  })

  it('yields lines without trailing spaces', () => {
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
})
