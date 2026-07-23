import type { FeatureFlag } from '../datasets.ts'
import type { Question } from '../types.ts'
import { QUESTION_LIMITS } from '../constants.ts'
import { QuestionBuilder, rotateQuestions, SAMPLE_STRIDES } from './utils.ts'

/**
 * Generate keyed feature flag questions
 */
export function generateKeyedQuestions(flags: Record<string, FeatureFlag>, getId: () => string): Question[] {
  const questions: Question[] = []
  const entries = Object.entries(flags)

  if (entries.length === 0)
    return questions

  // Field retrieval: look up individual flags by their map key
  const flagFieldGenerators: Array<(entry: [string, FeatureFlag], getId: () => string) => Question> = [
    ([key, flag], getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the rollout percentage of flag \`${key}\`?`)
      .groundTruth(String(flag.rollout))
      .type('field-retrieval')
      .dataset('keyed')
      .answerType('integer')
      .build(),
    ([key, flag], getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`Who owns flag \`${key}\`?`)
      .groundTruth(flag.owner)
      .type('field-retrieval')
      .dataset('keyed')
      .answerType('string')
      .build(),
    ([key, flag], getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`Is flag \`${key}\` enabled?`)
      .groundTruth(flag.enabled ? 'yes' : 'no')
      .type('field-retrieval')
      .dataset('keyed')
      .answerType('boolean')
      .build(),
  ]

  questions.push(...rotateQuestions(
    entries,
    flagFieldGenerators,
    QUESTION_LIMITS.keyed.fieldRetrieval,
    SAMPLE_STRIDES.FLAG_FIELD,
    getId,
  ))

  // Structure awareness: entry count, field lists, and positional field names
  const [lastKey, lastFlag] = entries.at(-1)!

  questions.push(
    new QuestionBuilder()
      .id(getId())
      .prompt('How many flags are defined?')
      .groundTruth(String(entries.length))
      .type('structure-awareness')
      .dataset('keyed')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('List the field names for each flag (comma-separated, in order).')
      .groundTruth('enabled,rollout,owner,updatedAt')
      .type('structure-awareness')
      .dataset('keyed')
      .answerType('csv-list-ordered')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the 2nd field name for each flag?')
      .groundTruth('rollout')
      .type('structure-awareness')
      .dataset('keyed')
      .answerType('string')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt(`What is the owner of the last flag (\`${lastKey}\`) in the dataset?`)
      .groundTruth(lastFlag.owner)
      .type('structure-awareness')
      .dataset('keyed')
      .answerType('string')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('How many fields does each flag record have?')
      .groundTruth('4')
      .type('structure-awareness')
      .dataset('keyed')
      .answerType('integer')
      .build(),
  )

  return questions
}
