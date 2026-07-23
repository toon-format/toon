import type { OpenAIProviderSettings } from '@ai-sdk/openai'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import process from 'node:process'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'

export const MINIMAX_MODEL_IDS = [
  'MiniMax-M3',
  'MiniMax-M2.7',
] as const

export const MINIMAX_ENDPOINTS = {
  global_en: {
    openai: 'https://api.minimax.io/v1',
    anthropic: 'https://api.minimax.io/anthropic',
  },
  cn_zh: {
    openai: 'https://api.minimaxi.com/v1',
    anthropic: 'https://api.minimaxi.com/anthropic',
  },
} as const

type MiniMaxRegion = keyof typeof MINIMAX_ENDPOINTS
type MiniMaxProtocol = keyof (typeof MINIMAX_ENDPOINTS)[MiniMaxRegion]

export function createMiniMaxModels(
  env: NodeJS.ProcessEnv = process.env,
  fetch?: OpenAIProviderSettings['fetch'],
): LanguageModelV3[] {
  const apiKey = env.MINIMAX_API_KEY
  if (!apiKey)
    return []

  const region = env.MINIMAX_API_REGION ?? 'global_en'
  if (!isMiniMaxRegion(region))
    throw new Error(`Unsupported MiniMax API region: ${region}`)

  const protocol = env.MINIMAX_API_PROTOCOL ?? 'anthropic'
  if (!isMiniMaxProtocol(protocol))
    throw new Error(`Unsupported MiniMax API protocol: ${protocol}`)

  const configuredBaseURL = env.MINIMAX_API_BASE_URL || MINIMAX_ENDPOINTS[region][protocol]
  const publicBaseURL = configuredBaseURL.replace(/\/$/, '')

  if (protocol === 'anthropic') {
    if (!publicBaseURL.endsWith('/anthropic'))
      throw new Error('MiniMax Anthropic-compatible base URLs must end in /anthropic')

    const provider = createAnthropic({
      name: 'minimax.messages',
      authToken: apiKey,
      baseURL: `${publicBaseURL}/v1`,
      fetch,
    })

    return MINIMAX_MODEL_IDS.map(modelId => provider(modelId))
  }

  if (!publicBaseURL.endsWith('/v1'))
    throw new Error('MiniMax OpenAI-compatible base URLs must end in /v1')

  const provider = createOpenAI({
    name: 'minimax',
    apiKey,
    baseURL: publicBaseURL,
    fetch,
  })

  return MINIMAX_MODEL_IDS.map(modelId => provider.chat(modelId))
}

function isMiniMaxRegion(value: string): value is MiniMaxRegion {
  return value in MINIMAX_ENDPOINTS
}

function isMiniMaxProtocol(value: string): value is MiniMaxProtocol {
  return value === 'openai' || value === 'anthropic'
}
