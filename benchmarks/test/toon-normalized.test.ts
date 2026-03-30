import { describe, expect, it } from 'vitest'
import { TOKEN_EFFICIENCY_DATASETS } from '../src/datasets'
import { formatters } from '../src/formatters'
import { tokenize } from '../src/utils'

describe('toon-normalized formatter', () => {
  it('should exist in formatters registry', () => {
    expect(formatters['toon-normalized']).toBeDefined()
    expect(typeof formatters['toon-normalized']).toBe('function')
  })

  it('should produce fewer tokens than toon on event-logs dataset', () => {
    const eventLogs = TOKEN_EFFICIENCY_DATASETS.find(d => d.name === 'event-logs')!
    const toonTokens = tokenize(formatters.toon!(eventLogs.data))
    const normalizedTokens = tokenize(formatters['toon-normalized']!(eventLogs.data))
    expect(normalizedTokens).toBeLessThan(toonTokens)
  })

  it('should produce same or fewer tokens than toon on uniform dataset', () => {
    const tabular = TOKEN_EFFICIENCY_DATASETS.find(d => d.name === 'tabular')!
    const toonTokens = tokenize(formatters.toon!(tabular.data))
    const normalizedTokens = tokenize(formatters['toon-normalized']!(tabular.data))
    // Uniform data should pass through unchanged, so tokens should be equal
    expect(normalizedTokens).toBeLessThanOrEqual(toonTokens)
  })
})
