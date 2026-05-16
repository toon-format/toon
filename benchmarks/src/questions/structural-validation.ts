import type { Question } from '../types.ts'
import { QuestionBuilder } from './utils.ts'

/**
 * Generate structural validation questions for all incompleteness fixtures
 *
 * These questions test the ability to detect incomplete, truncated, or corrupted data
 * by validating structural metadata (TOON's [N] length declarations and {fields} headers).
 *
 * @remarks
 * - TOON's advantage: Explicit [N] and {fields} enable validation
 * - CSV disadvantage: No structural metadata to validate against
 * - JSON/YAML disadvantage: Require manual counting and schema inference
 */
export function generateStructuralValidationQuestions(
  getId: () => string,
): Question[] {
  const questions: Question[] = []

  // Dataset names and their expected validity
  const validationFixtures = [
    { dataset: 'structural-validation-control', isValid: true, description: 'Valid complete dataset (control)' },
    { dataset: 'structural-validation-truncated', isValid: false, description: 'Array truncated: 3 rows removed from end' },
    { dataset: 'structural-validation-extra-rows', isValid: false, description: 'Extra rows added beyond declared length' },
    { dataset: 'structural-validation-width-mismatch', isValid: false, description: 'Inconsistent field count (missing salary in row 10)' },
    { dataset: 'structural-validation-missing-fields', isValid: false, description: 'Missing required fields (no email in multiple rows)' },
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
