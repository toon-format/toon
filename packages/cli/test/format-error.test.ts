import { describe, expect, it } from 'vitest'
import { ToonDecodeError } from '../../toon/src/index'
import { formatError } from '../src/format-error'

describe('formatError', () => {
  it('renders a decode error with line and source as a header, source line, and caret', () => {
    const error = new ToonDecodeError(
      'Tabs are not allowed in indentation in strict mode',
      { line: 2, source: '\tb: 1' },
    )

    const output = formatError(error, { isVerbose: false })

    expect(output).toBe(
      'Failed to decode TOON at line 2: Tabs are not allowed in indentation in strict mode\n'
      + '\n'
      + '  2 | →b: 1\n'
      + '      ^',
    )
  })

  it('renders a decode error without source as a header only', () => {
    const error = new ToonDecodeError('Something went wrong', { line: 5 })

    const output = formatError(error, { isVerbose: false })

    expect(output).toBe('Failed to decode TOON at line 5: Something went wrong')
  })

  it('appends the cause chain under verbose mode', () => {
    const cause = new SyntaxError('Unterminated string: missing closing quote')
    const error = new ToonDecodeError(
      'Unterminated string: missing closing quote',
      { line: 2, source: 'greeting: "hello', cause },
    )

    const output = formatError(error, { isVerbose: true })

    expect(output).toContain('Failed to decode TOON at line 2:')
    expect(output).toContain('  2 | greeting: "hello')
    expect(output).toContain('Caused by: SyntaxError: Unterminated string: missing closing quote')
  })

  it('appends the stack trace under verbose mode and omits it otherwise', () => {
    const error = new ToonDecodeError('Boom', { line: 1, source: 'x' })
    error.stack = 'ToonDecodeError: Line 1: Boom\n    at fakeFrame (file.ts:1:1)'

    const verbose = formatError(error, { isVerbose: true })
    const quiet = formatError(error, { isVerbose: false })

    expect(verbose).toContain('at fakeFrame (file.ts:1:1)')
    expect(quiet).not.toContain('at fakeFrame')
  })

  it('renders a generic Error as its message only when not verbose', () => {
    const error = new Error('something went wrong')

    const output = formatError(error, { isVerbose: false })

    expect(output).toBe('Error: something went wrong')
  })

  it('places the caret under the first non-whitespace character of the source line', () => {
    const error = new ToonDecodeError(
      'Indentation must be exact multiple of 2, but found 3 spaces',
      { line: 2, source: '   b: 1' },
    )

    const output = formatError(error, { isVerbose: false })

    expect(output).toBe(
      'Failed to decode TOON at line 2: Indentation must be exact multiple of 2, but found 3 spaces\n'
      + '\n'
      + '  2 |    b: 1\n'
      + '         ^',
    )
  })
})
