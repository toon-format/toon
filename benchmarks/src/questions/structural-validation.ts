import type { Question } from '../types.ts'
import { QuestionBuilder } from './utils.ts'

/**
 * Generate structural validation questions for all incompleteness fixtures
 *
 * These questions test the ability to detect incomplete, truncated, or corrupted
 * data from the encoded text alone. Each fixture carries the same valid 20-row
 * dataset; the corruption is applied to each format's rendered text after it is
 * emitted, so TOON's [N] length and {fields} width still declare the original shape
 * while metadata-less formats render the lossy-pipeline outcome.
 *
 * @remarks
 * - TOON's advantage: [N] and {fields} still declare the original shape, so the damage shows
 * - CSV disadvantage: No length metadata; only a narrower row can hint at width loss
 * - JSON/YAML/XML disadvantage: Truncation and extra rows stay valid and undetectable in principle
 */
export function generateStructuralValidationQuestions(
  getId: () => string,
): Question[] {
  const questions: Question[] = []

  // Dataset names and their expected validity
  const validationFixtures = [
    { dataset: 'structural-validation-control', isValid: true, description: 'Valid complete dataset, text passed through untouched (control)' },
    { dataset: 'structural-validation-truncated', isValid: false, description: 'Encoded text truncated: last 3 row lines removed' },
    { dataset: 'structural-validation-extra-rows', isValid: false, description: 'Encoded text gains 3 rows past the declared length' },
    { dataset: 'structural-validation-width-mismatch', isValid: false, description: 'One cell dropped from row 10 of the encoded text' },
    { dataset: 'structural-validation-missing-fields', isValid: false, description: 'Email value removed from every 5th record of the encoded text' },
  ] as const

  // Generate one validation question per fixture
  for (const fixture of validationFixtures) {
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt('Is this data complete and valid? Answer only YES or NO.')
        .groundTruth(fixture.isValid ? 'YES' : 'NO')
        .type('structural-validation')
        .dataset(fixture.dataset)
        .answerType('boolean')
        .build(),
    )
  }

  return questions
}
