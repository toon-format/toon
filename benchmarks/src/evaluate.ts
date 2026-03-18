import type { LanguageModelV3 } from '@ai-sdk/provider'
import type { EvaluationResult, Question } from './types.ts'
import process from 'node:process'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { createOpenAI, openai } from '@ai-sdk/openai'
import { xai } from '@ai-sdk/xai'
import { generateText } from 'ai'
import { compareAnswers } from './normalize.ts'

const minimax = createOpenAI({
  name: 'minimax',
  baseURL: 'https://api.minimax.io/v1',
  apiKey: process.env.MINIMAX_API_KEY,
})

/**
 * Models used for evaluation
 */
export const models: LanguageModelV3[] = [
  anthropic('claude-haiku-4-5-20251001'),
  google('gemini-3-flash-preview'),
  minimax('MiniMax-M2.7'),
  openai('gpt-5-nano'),
  xai('grok-4-1-fast-non-reasoning'),
]

/**
 * Format primers
 *
 * @remarks
 * Neutral descriptions to help models parse each format.
 */
export const PRIMERS: Record<string, string> = {
  'toon': 'TOON: Indentation-based. Arrays declare length and fields (e.g., items[N]{f1,f2}:). Rows use single delimiter. Values may be quoted.',
  'json-pretty': 'JSON: Strict JSON objects/arrays with repeated keys per row.',
  'json-compact': 'JSON (compact): Strict JSON without extra whitespace.',
  'yaml': 'YAML: Indentation-based key/value and lists (- items).',
  'xml': 'XML: Tag-based tree structure with nested elements.',
  'csv': 'CSV: Header row, comma-separated values. First row contains field names.',
}

/**
 * Code fence language tags for proper syntax highlighting
 */
export const FENCE: Record<string, string> = {
  'toon': 'toon',
  'json-pretty': 'json',
  'json-compact': 'json',
  'yaml': 'yaml',
  'xml': 'xml',
  'csv': 'csv',
}

/**
 * Evaluate a single question with a specific format and model
 */
export async function evaluateQuestion(
  {
    question,
    formatName,
    formattedData,
    model,
  }:
  {
    question: Question
    formatName: string
    formattedData: string
    model: LanguageModelV3
  },
): Promise<EvaluationResult> {
  const primer = PRIMERS[formatName] ?? ''
  const fence = FENCE[formatName] ?? ''

  const prompt = `
${primer}

Given the following data in ${formatName} format:

\`\`\`${fence}
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
  const { text, usage } = await generateText({ model, prompt })

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
    format: formatName,
    model: model.modelId,
    expected: question.groundTruth,
    actual,
    isCorrect,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    latencyMs,
  }
}
