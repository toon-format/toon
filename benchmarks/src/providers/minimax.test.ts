import type { OpenAIProviderSettings } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { describe, expect, it } from 'vitest'
import { createMiniMaxModels, MINIMAX_MODEL_IDS } from './minimax.ts'

type FetchFunction = NonNullable<OpenAIProviderSettings['fetch']>

describe('createMiniMaxModels', () => {
  it('registers both supported model IDs', () => {
    const models = createMiniMaxModels({
      MINIMAX_API_KEY: 'test',
      MINIMAX_API_PROTOCOL: 'openai',
      MINIMAX_API_REGION: 'global_en',
    })

    expect(models.map(model => model.modelId)).toEqual(MINIMAX_MODEL_IDS)
  })

  it.each([
    {
      protocol: 'openai',
      region: 'global_en',
      expectedURL: 'https://api.minimax.io/v1/chat/completions',
    },
    {
      protocol: 'openai',
      region: 'cn_zh',
      expectedURL: 'https://api.minimaxi.com/v1/chat/completions',
    },
    {
      protocol: 'anthropic',
      region: 'global_en',
      expectedURL: 'https://api.minimax.io/anthropic/v1/messages',
    },
    {
      protocol: 'anthropic',
      region: 'cn_zh',
      expectedURL: 'https://api.minimaxi.com/anthropic/v1/messages',
    },
  ])('sends $region $protocol requests to the configured endpoint', async ({ expectedURL, protocol, region }) => {
    const requestURLs: string[] = []
    const models = createMiniMaxModels({
      MINIMAX_API_KEY: 'test',
      MINIMAX_API_PROTOCOL: protocol,
      MINIMAX_API_REGION: region,
    }, createCaptureFetch(requestURLs))

    await generateText({
      model: models[0]!,
      prompt: 'Respond with OK.',
    })

    expect(requestURLs).toEqual([expectedURL])
  })
})

function createCaptureFetch(requestURLs: string[]): FetchFunction {
  return async (input) => {
    const url = input instanceof Request ? input.url : input.toString()
    requestURLs.push(url)

    const response = url.endsWith('/messages')
      ? {
          id: 'message-id',
          type: 'message',
          role: 'assistant',
          model: MINIMAX_MODEL_IDS[0],
          content: [{ type: 'text', text: 'OK' }],
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        }
      : {
          id: 'completion-id',
          object: 'chat.completion',
          created: 0,
          model: MINIMAX_MODEL_IDS[0],
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'OK' },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 1,
            completion_tokens: 1,
            total_tokens: 2,
          },
        }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
