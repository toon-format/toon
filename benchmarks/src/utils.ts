import * as fsp from 'node:fs/promises'
import { encode } from 'gpt-tokenizer'

/**
 * Generate visual progress bar using ASCII characters
 *
 * @param value - Current value
 * @param max - Maximum value
 * @param width - Width of the bar in characters (default: 25)
 * @param chars - Characters to use for filled and empty sections
 * @param chars.filled - Character for filled portion (default: '█')
 * @param chars.empty - Character for empty portion (default: '░')
 * @returns ASCII progress bar string
 *
 * @example
 * createProgressBar(75, 100, 20) // "███████████████░░░░░"
 * createProgressBar(0.5, 1, 10)  // "█████░░░░░"
 * createProgressBar(0.75, 1, 20, { filled: '▓', empty: '░' }) // "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░"
 */
export function createProgressBar(
  value: number,
  max: number,
  width = 25,
  chars: { filled: string, empty: string } = { filled: '█', empty: '░' },
): string {
  const filled = Math.round((value / max) * width)
  const empty = width - filled
  return chars.filled.repeat(filled) + chars.empty.repeat(empty)
}

/**
 * Count tokens in text using gpt-tokenizer (o200k_base encoding)
 *
 * @param text - Text to tokenize
 * @returns Number of tokens
 *
 * @example
 * tokenize("Hello, world!") // 4
 */
export function tokenize(text: string): number {
  return encode(text).length
}

/**
 * Ensure a directory exists, creating it recursively if needed
 *
 * @param dirPath - Directory path to ensure exists
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fsp.mkdir(dirPath, { recursive: true })
}

/**
 * Bounds of a Wilson score confidence interval for a proportion.
 */
export interface WilsonInterval {
  /** Lower bound of the interval, in 0..1 */
  lower: number
  /** Upper bound of the interval, in 0..1 */
  upper: number
  /** Half-width of the interval, in 0..1, equal to (upper - lower) / 2 */
  halfWidth: number
}

/**
 * Wilson score confidence interval for a binomial proportion.
 *
 * @remarks
 * Unlike the normal approximation, the Wilson interval stays inside 0..1 and
 * behaves sensibly for small samples and proportions near the boundaries.
 *
 * @example
 * wilsonInterval(80, 100) // { lower: 0.711…, upper: 0.867…, halfWidth: 0.078… }
 */
export function wilsonInterval(
  correctCount: number,
  totalCount: number,
  confidenceZ = 1.959963984540054, // 95%
): WilsonInterval {
  // A zero sample has no proportion to bound – avoid dividing by totalCount
  if (totalCount === 0)
    return { lower: 0, upper: 0, halfWidth: 0 }

  const proportion = correctCount / totalCount
  const zSquared = confidenceZ * confidenceZ
  const denominator = 1 + zSquared / totalCount
  const center = (proportion + zSquared / (2 * totalCount)) / denominator
  const margin = (confidenceZ / denominator)
    * Math.sqrt(proportion * (1 - proportion) / totalCount + zSquared / (4 * totalCount * totalCount))

  const lower = center - margin
  const upper = center + margin

  return { lower, upper, halfWidth: (upper - lower) / 2 }
}
