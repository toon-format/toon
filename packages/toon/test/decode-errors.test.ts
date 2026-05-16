import { describe, expect, it } from 'vitest'
import { decode, ToonDecodeError } from '../src/index'

describe('toonDecodeError line context', () => {
  it('reports line number when a parent key is missing its colon', () => {
    const error = captureDecodeError('_meta\n  version: "1.0"\n  name: test\n')

    expect(error).toBeInstanceOf(SyntaxError)
    expect(error.line).toBe(1)
    expect(error.source).toBe('_meta')
    expect(error.message).toMatch(/^Line 1: /)
    expect(error.message).toMatch(/missing colon/i)
  })

  it('reports the line of the missing-colon error in nested context', () => {
    const error = captureDecodeError('wrapper:\n  inner\n    version: "1.0"\n')

    expect(error.line).toBe(2)
  })

  it('includes line number when a list array has too few items', () => {
    const error = captureDecodeError('_meta:\n  version: "1.0"\n\nrules[3]:\n  - first\n')

    expect(error.line).toBeDefined()
    expect(error.message).toMatch(/^Line \d+: /)
    expect(error.message).toMatch(/3.*1/)
    expect(error.message).toMatch(/list/i)
  })

  it('includes line number when a tabular row count is wrong', () => {
    const error = captureDecodeError('rules[3]{id,rule}:\n  R1,first\n  R2,second\n')

    expect(error.line).toBeDefined()
    expect(error.message).toMatch(/^Line \d+: /)
    expect(error.message).toMatch(/3.*2/)
    expect(error.message).toMatch(/tabular|rows?/i)
  })

  it('reports indentation errors with line and source', () => {
    const error = captureDecodeError('a:\n   b: 1\n')

    expect(error.line).toBe(2)
    expect(error.source).toBe('   b: 1')
  })

  it('attaches line context to errors raised during value parsing', () => {
    const error = captureDecodeError('name: alice\ngreeting: "hello\n')

    expect(error.line).toBe(2)
    expect(error.source).toBe('greeting: "hello')
    expect(error.message).toMatch(/^Line 2: /)
    expect(error.message).toMatch(/unterminated|closing quote/i)
  })

  it('reports tabs in indentation with line and source', () => {
    const error = captureDecodeError('a:\n\tb: 1\n')

    expect(error.line).toBe(2)
    expect(error.source).toBe('\tb: 1')
    expect(error.message).toMatch(/^Line 2: /)
    expect(error.message).toMatch(/tabs?/i)
  })

  it('reports blank lines inside an array with the line number of the blank', () => {
    const error = captureDecodeError('rules[3]{id,rule}:\n  R1,first\n\n  R2,second\n  R3,third\n')

    expect(error.line).toBe(3)
    expect(error.message).toMatch(/^Line 3: /)
    expect(error.message).toMatch(/blank lines?/i)
  })

  it('points to the first extra item when an array exceeds its declared count', () => {
    const error = captureDecodeError('items[2]:\n  - a\n  - b\n  - c\n')

    expect(error.line).toBe(4)
    expect(error.source).toBe('  - c')
    expect(error.message).toMatch(/^Line 4: /)
    expect(error.message).toMatch(/list/i)
    expect(error.message).toMatch(/2|more/i)
  })

  it('points to the offending row when a tabular row width does not match the field count', () => {
    const error = captureDecodeError('rules[2]{id,rule,priority}:\n  R1,first\n  R2,second,high\n')

    expect(error.line).toBe(2)
    expect(error.source).toBe('  R1,first')
    expect(error.message).toMatch(/^Line 2: /)
    expect(error.message).toMatch(/3.*2/)
    expect(error.message).toMatch(/row|tabular/i)
  })
})

function captureDecodeError(input: string): ToonDecodeError {
  try {
    decode(input)
  }
  catch (error) {
    if (error instanceof ToonDecodeError)
      return error
    throw error
  }
  throw new Error('Expected decode to throw ToonDecodeError, but it returned normally')
}
