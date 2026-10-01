import type { LanguageModelV4 } from '@ai-sdk/provider'
import type { EvaluateGenerationTrackOptions, GenerationCompletion, GenerationTokenUsage, GenerationTrackId, GenerationTrackResult } from './types.ts'
import { isDeepStrictEqual } from 'node:util'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { generateText, NoObjectGeneratedError, Output } from 'ai'
import { decode } from '../../../packages/toon/src/index.ts'
import { canonicalizeGenerationValue } from './cases.ts'

export const GENERATION_SETTINGS = {
  maxAttempts: 3,
  maxOutputTokens: 5_000,
  maxRetries: 5,
  temperature: 0,
  topP: 1,
  topK: 50,
  requestTimeoutMs: 120_000,
} as const

export const GENERATION_SYSTEM_PROMPT: string = [
  'You are a data-formatting model.',
  'Follow instructions exactly. When asked for JSON, you must return JSON that conforms to the provided JSON Schema.',
  'No extra text. When asked for TOON, return only a ```toon fenced block.',
].join(' ')

export function createNebiusProvider(apiKey: string): ReturnType<typeof createOpenAICompatible> {
  return createOpenAICompatible({
    name: 'nebius',
    apiKey,
    baseURL: 'https://api.tokenfactory.nebius.com/v1/',
    supportsStructuredOutputs: true,
  })
}

export async function evaluateGenerationTrack({
  benchmarkCase,
  model,
  track,
}: EvaluateGenerationTrackOptions): Promise<GenerationTrackResult> {
  const originalPrompt = withJsonSchema(
    track === 'toon' ? benchmarkCase.toonPrompt : benchmarkCase.jsonPrompt,
    benchmarkCase.schema,
    track,
  )
  let prompt = originalPrompt
  let previousOutput = ''
  let errorMessage = ''
  let inputTokens = 0
  let outputTokens = 0

  for (let attempt = 1; attempt <= GENERATION_SETTINGS.maxAttempts; attempt++) {
    if (attempt > 1) {
      const repairPrompt = track === 'toon'
        ? makeToonRepairPrompt(previousOutput, errorMessage)
        : makeJsonRepairPrompt(previousOutput, errorMessage)
      prompt = `${originalPrompt}\n\n${repairPrompt}`
    }

    const completion = track === 'json-object'
      ? await callJsonObject(model, prompt)
      : await callPlain(model, prompt, track)

    inputTokens += completion.inputTokens
    outputTokens += completion.outputTokens
    previousOutput = completion.text

    try {
      const parsed = parseCompletion(completion, track)
      const canonical = canonicalizeGenerationValue(benchmarkCase.id, parsed)

      if (isDeepStrictEqual(canonical, benchmarkCase.gold)) {
        return {
          attemptsUsed: attempt,
          finalOk: true,
          inputTokens,
          oneShotOk: attempt === 1,
          outputTokens,
        }
      }

      errorMessage = 'Structure is valid but values differ from the expected gold data.'
    }
    catch (error) {
      errorMessage = getErrorMessage(error)
    }
  }

  return {
    attemptsUsed: GENERATION_SETTINGS.maxAttempts,
    finalOk: false,
    inputTokens,
    oneShotOk: false,
    outputTokens,
  }
}

export function extractToonPayload(input: string): string {
  const match = input.match(/```toon([\s\S]*?)```/i)
  return (match?.[1] ?? input).trim()
}

export function stripModelReasoning(input: string): string {
  return input.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

export function stripJsonFence(input: string): string {
  const match = input.match(/```(?:json)?([\s\S]*?)```/i)
  return (match?.[1] ?? input).trim()
}

async function callJsonObject(model: LanguageModelV4, prompt: string): Promise<GenerationCompletion> {
  try {
    const result = await generateText({
      model,
      system: GENERATION_SYSTEM_PROMPT,
      prompt,
      output: Output.json(),
      ...generationSettings(),
    })

    return {
      text: stripJsonFence(stripModelReasoning(result.text)),
      ...tokenUsage(result.usage),
    }
  }
  catch (error) {
    // Invalid model output belongs in the measured repair loop. API failures do not.
    if (!NoObjectGeneratedError.isInstance(error))
      throw error
    return {
      text: stripJsonFence(stripModelReasoning(error.text ?? '')),
      ...tokenUsage(error.usage),
    }
  }
}

async function callPlain(model: LanguageModelV4, prompt: string, track: GenerationTrackId): Promise<GenerationCompletion> {
  const result = await generateText({
    model,
    system: GENERATION_SYSTEM_PROMPT,
    prompt,
    ...generationSettings(),
  })
  const withoutReasoning = stripModelReasoning(result.text)
  const text = track === 'json-plain' ? stripJsonFence(withoutReasoning) : withoutReasoning

  return {
    text,
    ...tokenUsage(result.usage),
  }
}

function generationSettings(): {
  maxOutputTokens: number
  maxRetries: number
  providerOptions: { nebius: { top_k: number } }
  temperature: number
  timeout: { totalMs: number }
  topP: number
} {
  return {
    maxOutputTokens: GENERATION_SETTINGS.maxOutputTokens,
    maxRetries: GENERATION_SETTINGS.maxRetries,
    providerOptions: { nebius: { top_k: GENERATION_SETTINGS.topK } },
    temperature: GENERATION_SETTINGS.temperature,
    timeout: { totalMs: GENERATION_SETTINGS.requestTimeoutMs },
    topP: GENERATION_SETTINGS.topP,
  }
}

function tokenUsage(usage: { inputTokens?: number, outputTokens?: number } | undefined): GenerationTokenUsage {
  return {
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
  }
}

function parseCompletion(completion: GenerationCompletion, track: GenerationTrackId): unknown {
  if (track === 'json-object' || track === 'json-plain')
    return JSON.parse(completion.text) as unknown

  return decode(extractToonPayload(completion.text))
}

function withJsonSchema(prompt: string, schema: object, track: GenerationTrackId): string {
  const instruction = track === 'toon'
    ? 'Return TOON whose decoded value matches this JSON Schema. Use the exact property names and nesting shown; the schema describes the data, not the output format.'
    : 'Return valid JSON matching this JSON Schema.'
  return `${prompt}\n\n${instruction}\n${JSON.stringify(schema, undefined, 2)}`
}

function makeJsonRepairPrompt(previousOutput: string, errorMessage: string): string {
  return `Your previous JSON did not validate against the schema. Return ONLY valid JSON (no prose, no fences) that matches the schema and the target values.
Validation error:
${errorMessage}

Previous output:
${previousOutput}`
}

function makeToonRepairPrompt(previousOutput: string, errorMessage: string): string {
  return `Your previous TOON was invalid. Return ONLY a \`\`\`toon fenced block.
- Match the property names, nesting, and types in the JSON Schema above and retain the target values.
- Use 2-space indentation; no trailing spaces.
- Ensure headers/fieldsets and [N] match row counts.
Validation/decoding error:
${errorMessage}

Previous output:
${previousOutput}`
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
