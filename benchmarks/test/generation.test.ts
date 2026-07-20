import { describe, expect, it } from 'vitest'
import { canonicalizeGenerationValue, GENERATION_CASES } from '../src/generation/cases.ts'
import { extractToonPayload, stripJsonFence, stripModelReasoning } from '../src/generation/evaluate.ts'
import { flattenGenerationRun, generationCsvColumns } from '../src/generation/results.ts'

describe('generation benchmark', () => {
  it('canonicalizes case arrays before comparing with gold data', () => {
    const users = canonicalizeGenerationValue('users', {
      users: [
        { id: 3, name: 'Eve', role: 'guest' },
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'staff' },
      ],
    })

    expect(users).toEqual(GENERATION_CASES[0]?.gold)
  })

  it('accepts the wrapper emitted by some TOON generations', () => {
    const order = GENERATION_CASES.find(benchmarkCase => benchmarkCase.id === 'order')!
    expect(canonicalizeGenerationValue('order', { order: order.gold })).toEqual(order.gold)
  })

  it('rejects unknown and incorrectly typed fields', () => {
    expect(() => canonicalizeGenerationValue('order', {
      id: 101,
      customer: { id: '9', name: 'Ada' },
      items: [],
    })).toThrow('order.customer.id must be an integer')

    expect(() => canonicalizeGenerationValue('users', {
      users: [{ id: 1, name: 'Alice', role: 'admin', active: true }],
    })).toThrow('unexpected field')
  })

  it('extracts model output wrappers', () => {
    expect(stripModelReasoning('<think>hidden</think>\n```json\n{"ok":true}\n```')).toBe('```json\n{"ok":true}\n```')
    expect(stripJsonFence('```json\n{"ok":true}\n```')).toBe('{"ok":true}')
    expect(extractToonPayload('```TOON\nid: 1\n```')).toBe('id: 1')
  })

  it('flattens runs with the legacy CSV column names', () => {
    const track = { attemptsUsed: 1, finalOk: true, inputTokens: 10, oneShotOk: true, outputTokens: 5 }
    const cases = Object.fromEntries(GENERATION_CASES.map(benchmarkCase => [
      benchmarkCase.id,
      { 'json-object': track, 'json-plain': track, 'toon': track },
    ]))
    const row = flattenGenerationRun({ cases, model: 'test/model', run: 1 } as Parameters<typeof flattenGenerationRun>[0])

    expect(row.users_json_one_shot).toBe('True')
    expect(row.users_json_plain_completion_tokens).toBe(5)
    expect(row.toon_one_shot_accuracy).toBe(1)
    expect(row.overall_total_tokens).toBe(180)
    expect(generationCsvColumns()).toContain('invoice_toon_completion_tokens')
  })
})
