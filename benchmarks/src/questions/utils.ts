import type { AnswerType, NormalizationOptions } from '../normalize.ts'
import type { Question } from '../types.ts'

// Constants for sampling strides
export const SAMPLE_STRIDES = {
  EMPLOYEE_FIELD: 2,
  ORDER_FIELD: 2,
  CUSTOMER_FIELD: 2,
  ANALYTICS_FIELD: 3,
  METRIC_FIELD: 3,
  REPO_FIELD: 7,
  EVENT_LOG_FIELD: 5,
} as const

/**
 * ID Generator
 */
export function* createIdGenerator(): Generator<string, never, never> {
  let id = 1
  while (true) {
    yield `q${id++}`
  }
}

/**
 * Question Builder class for fluent question creation
 */
export class QuestionBuilder {
  private question: Partial<Question> = {}

  id(id: string): this {
    this.question.id = id
    return this
  }

  prompt(prompt: string): this {
    this.question.prompt = prompt
    return this
  }

  groundTruth(groundTruth: string): this {
    this.question.groundTruth = groundTruth
    return this
  }

  type(type: Question['type']): this {
    this.question.type = type
    return this
  }

  dataset(dataset: Question['dataset']): this {
    this.question.dataset = dataset
    return this
  }

  answerType(kind: AnswerType): this {
    this.question.answerType = kind
    return this
  }

  normalize(options: Partial<NormalizationOptions>): this {
    this.question.normalizationOptions = options
    return this
  }

  build(): Question {
    if (!this.question.id || !this.question.prompt || !this.question.groundTruth || !this.question.type || !this.question.dataset) {
      throw new Error('Incomplete question')
    }

    return this.question as Question
  }
}

/**
 * Rotate through question generators
 */
export function rotateQuestions<T>(
  items: T[],
  generators: ((item: T, getId: () => string) => Question)[],
  limit: number,
  stride: number,
  getId: () => string,
): Question[] {
  const questions: Question[] = []

  for (let i = 0; i < Math.min(limit, items.length); i++) {
    const item = items[i * stride] || items[i]
    if (!item)
      continue

    const generatorIndex = i % generators.length
    const generator = generators[generatorIndex]
    if (generator) {
      questions.push(generator(item, getId))
    }
  }

  return questions
}
