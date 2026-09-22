import type { GenerationTrackId } from '../src/generation/types.ts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { encode } from '../../packages/toon/src/index.ts'
import { GENERATION_CASES } from '../src/generation/cases.ts'
import { createNebiusProvider, evaluateGenerationTrack } from '../src/generation/evaluate.ts'

const benchmarkCase = GENERATION_CASES.find(item => item.id === 'users')!

afterEach(() => vi.unstubAllGlobals())

function mockCompletions(texts: string[]): ReturnType<typeof vi.fn> {
  const fetch = vi.fn(async () => {
    const content = texts.shift()
    if (content === undefined)
      throw new Error('Unexpected extra model request')
    return Response.json({
      id: 'mock-completion',
      model: 'test-model',
      choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

describe('generation requests and repairs', () => {
  it.each(['json-object', 'json-plain', 'toon'] as const)('uses the intended request mode for %s', async (track) => {
    const output = track === 'toon' ? encode(benchmarkCase.gold) : JSON.stringify(benchmarkCase.gold)
    const fetch = mockCompletions([output])
    const result = await evaluateGenerationTrack({ benchmarkCase, model: createNebiusProvider('test-key')('test-model'), track })
    expect(result).toEqual({ attemptsUsed: 1, finalOk: true, oneShotOk: true, inputTokens: 10, outputTokens: 5 })
    const body = JSON.parse(fetch.mock.calls[0]![1].body as string)
    expect(body.response_format).toEqual(track === 'json-object' ? { type: 'json_object' } : undefined)
    expect(body.top_k).toBe(50)
    expect(body.temperature).toBe(0)
  })

  it.each(['json-object', 'json-plain', 'toon'] as const)('repairs invalid %s while retaining usage and task values', async (track: GenerationTrackId) => {
    const output = track === 'toon' ? encode(benchmarkCase.gold) : JSON.stringify(benchmarkCase.gold)
    const fetch = mockCompletions(['invalid output', output])
    const result = await evaluateGenerationTrack({ benchmarkCase, model: createNebiusProvider('test-key')('test-model'), track })
    expect(result).toEqual({ attemptsUsed: 2, finalOk: true, oneShotOk: false, inputTokens: 20, outputTokens: 10 })
    const body = JSON.parse(fetch.mock.calls[1]![1].body as string)
    const repair = JSON.stringify(body.messages)
    expect(repair).toContain('Alice')
    expect(repair).toContain('Eve')
    expect(repair).toContain('invalid output')
  })

  it('stops after two repairs and counts all three attempts', async () => {
    const fetch = mockCompletions(['{}', '{}', '{}'])
    const result = await evaluateGenerationTrack({ benchmarkCase, model: createNebiusProvider('test-key')('test-model'), track: 'json-object' })
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(result).toEqual({ attemptsUsed: 3, finalOk: false, oneShotOk: false, inputTokens: 30, outputTokens: 15 })
  })

  it('propagates authentication failures instead of recording inaccurate format scores', async () => {
    const fetch = vi.fn(async () => Response.json({ error: { message: 'Invalid API key' } }, { status: 401 }))
    vi.stubGlobal('fetch', fetch)
    await expect(evaluateGenerationTrack({ benchmarkCase, model: createNebiusProvider('test-key')('test-model'), track: 'json-object' })).rejects.toThrow('Invalid API key')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
