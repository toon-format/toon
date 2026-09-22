import { describe, expect, it } from 'vitest'
import { ToonDecodeError } from '../../toon/src/index'
import { formatDecodeError } from '../src/format-error'

describe('formatDecodeError', () => {
  it('renders a decode error with line and source as a header, source line, and caret', () => {
    const error = new ToonDecodeError(
      'Tabs are not allowed in indentation in strict mode',
      { line: 2, source: '\tb: 1' },
    )

    const output = formatDecodeError(error)

    expect(output).toBe(
      'Failed to decode TOON at line 2: Tabs are not allowed in indentation in strict mode\n'
      + '\n'
      + '  2 | →b: 1\n'
      + '      ^',
    )
  })

  it('renders a decode error without source as a header only', () => {
    const error = new ToonDecodeError('Something went wrong', { line: 5 })

    const output = formatDecodeError(error)

    expect(output).toBe('Failed to decode TOON at line 5: Something went wrong')
  })

  it('places the caret under the first non-whitespace character of the source line', () => {
    const error = new ToonDecodeError(
      'Indentation must be exact multiple of 2, but found 3 spaces',
      { line: 2, source: '   b: 1' },
    )

    const output = formatDecodeError(error)

    expect(output).toBe(
      'Failed to decode TOON at line 2: Indentation must be exact multiple of 2, but found 3 spaces\n'
      + '\n'
      + '  2 |    b: 1\n'
      + '         ^',
    )
  })
})
