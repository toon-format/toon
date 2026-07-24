import type { LanguageModelV4, LanguageModelV4CallOptions } from '@ai-sdk/provider'
import type { Format } from './formats.ts'
import type { EvaluationResult, Question } from './types.ts'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { xai } from '@ai-sdk/xai'
import { generateText } from 'ai'
import { compareAnswers } from './normalize.ts'

/**
 * A model paired with its rate limit and lazy provider constructor.
 */
export interface ModelDescriptor {
  /** Provider model id; must equal the underlying LanguageModelV4.modelId */
  id: string
  /** Requests-per-minute cap, or undefined for no limit */
  rpm?: number
  /** Reasoning override for models that reject the default `none` (e.g. `grok-4.5` floors at `low`) */
  reasoning?: LanguageModelV4CallOptions['reasoning']
  /** Lazily construct the provider model */
  create: () => LanguageModelV4
}

/**
 * Models used for evaluation
 */
export const MODELS: ModelDescriptor[] = [
  { id: 'claude-haiku-4-5-20251001', rpm: 50, create: () => anthropic('claude-haiku-4-5-20251001') },
  { id: 'gemini-3.6-flash', rpm: 25, create: () => google('gemini-3.6-flash') },
  { id: 'gpt-5.4-nano', rpm: 50, create: () => openai('gpt-5.4-nano') },
  { id: 'grok-4.5', rpm: 25, reasoning: 'low', create: () => xai('grok-4.5') },
]

/**
 * Evaluate a single question with a specific format and model
 */
export async function evaluateQuestion(
  {
    question,
    format,
    formattedData,
    model,
    reasoning,
  }:
  {
    question: Question
    format: Format
    formattedData: string
    model: LanguageModelV4
    reasoning?: LanguageModelV4CallOptions['reasoning']
  },
): Promise<EvaluationResult> {
  const prompt = `
${format.primer}

Given the following data in ${format.name} format:

\`\`\`${format.fence}
${formattedData}
\`\`\`

Question: ${question.prompt}

Answer format requirements:
- Provide only the value itself, no explanation
- For numbers: output digits only (no commas, currency symbols, or units)
- For dates/field names: use the exact string from the data
- For lists: output comma-separated values with no spaces

Answer:
`.trim()

  const startTime = performance.now()
  const { text, usage } = await generateText({
    model,
    prompt,
    reasoning: reasoning ?? 'none',
  })

  const actual = text.trim()
  const latencyMs = performance.now() - startTime

  const comparisonResult = compareAnswers(
    actual,
    question.groundTruth,
    question.answerType ?? 'string',
    question.normalizationOptions,
  )
  const isCorrect = comparisonResult.match

  return {
    questionId: question.id,
    format: format.name,
    model: model.modelId,
    expected: question.groundTruth,
    actual,
    isCorrect,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    latencyMs,
  }
}
