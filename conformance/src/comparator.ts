/**
 * Output comparison logic for TOON conformance testing
 */

import type { ComparisonResult } from './types.js'

export class OutputComparator {
  /**
   * Compare expected and actual TOON outputs
   */
  compare = (expected: string, actual: string): ComparisonResult => {
    const normalizedExpected = this.normalize(expected)
    const normalizedActual = this.normalize(actual)
    const matches = normalizedExpected === normalizedActual

    if (matches) return { matches, normalizedExpected, normalizedActual }

    const notes = [
      this.hasWhitespaceOnlyDifferences(expected, actual) && 'Whitespace differences only',
      this.hasLineEndingDifferences(expected, actual) && 'Line ending differences',
      this.hasTrailingWhitespaceDifferences(expected, actual) && 'Trailing whitespace differences'
    ].filter(Boolean) as string[]

    return {
      matches,
      normalizedExpected,
      normalizedActual,
      diff: this.generateDiff(normalizedExpected, normalizedActual),
      notes: notes.length ? notes : undefined
    }
  }

  /**
   * Normalize TOON output for comparison
   */
  private normalize = (output: string): string =>
    output.replace(/\r\n?/g, '\n').split('\n').map(line => line.trimEnd()).join('\n').replace(/\n+$/, '')

  /**
   * Generate diff between strings
   */
  private generateDiff = (expected: string, actual: string): string => {
    const [expLines, actLines] = [expected.split('\n'), actual.split('\n')]
    const diffs = Array.from({ length: Math.max(expLines.length, actLines.length) }, (_, i) => {
      const [exp, act] = [expLines[i] ?? '', actLines[i] ?? '']
      return exp !== act ? `Line ${i + 1}:\n  Expected: ${JSON.stringify(exp)}\n  Actual:   ${JSON.stringify(act)}\n` : null
    }).filter(Boolean)
    
    return diffs.length ? diffs.join('') : `Expected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(actual)}`
  }

  /**
   * Check difference types
   */
  private hasWhitespaceOnlyDifferences = (exp: string, act: string): boolean =>
    exp.replace(/\s/g, '') === act.replace(/\s/g, '') && exp !== act
  private hasLineEndingDifferences = (exp: string, act: string): boolean =>
    exp.replace(/\r\n?/g, '\n') === act.replace(/\r\n?/g, '\n') && exp !== act
  private hasTrailingWhitespaceDifferences = (exp: string, act: string): boolean =>
    exp.split('\n').map(l => l.trimEnd()).join('\n') === act.split('\n').map(l => l.trimEnd()).join('\n') && exp !== act

  /**
   * Compare with tolerance for formatting differences
   */
  compareWithTolerance = (expected: string, actual: string): ComparisonResult => {
    const result = this.compare(expected, actual)
    
    return result.matches || !result.notes?.some(n => n.includes('differences'))
      ? result
      : { ...result, matches: true, notes: [...result.notes!, 'Within acceptable tolerance'] }
  }
}