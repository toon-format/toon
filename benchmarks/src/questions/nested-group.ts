import type { Contact } from '../datasets.ts'
import type { Question } from '../types.ts'
import { QUESTION_LIMITS } from '../constants.ts'
import { QuestionBuilder, rotateQuestions, SAMPLE_STRIDES } from './utils.ts'

/**
 * Generate nested-group contact questions
 */
export function generateNestedGroupQuestions(contacts: Contact[], getId: () => string): Question[] {
  const questions: Question[] = []

  if (contacts.length === 0)
    return questions

  // Field retrieval: primitive and nested-object fields by contact name
  const contactFieldGenerators: Array<(contact: Contact, getId: () => string) => Question> = [
    (contact, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What city is ${contact.name}'s address in?`)
      .groundTruth(contact.address.city)
      .type('field-retrieval')
      .dataset('nested-group')
      .answerType('string')
      .build(),
    (contact, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What country does ${contact.name} live in?`)
      .groundTruth(contact.address.country)
      .type('field-retrieval')
      .dataset('nested-group')
      .answerType('string')
      .build(),
    (contact, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What plan is ${contact.name} on?`)
      .groundTruth(contact.plan.name)
      .type('field-retrieval')
      .dataset('nested-group')
      .answerType('string')
      .build(),
    (contact, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the price of ${contact.name}'s plan?`)
      .groundTruth(String(contact.plan.price))
      .type('field-retrieval')
      .dataset('nested-group')
      .answerType('integer')
      .build(),
    (contact, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`How old is ${contact.name}?`)
      .groundTruth(String(contact.age))
      .type('field-retrieval')
      .dataset('nested-group')
      .answerType('integer')
      .build(),
  ]

  questions.push(...rotateQuestions(
    contacts,
    contactFieldGenerators,
    QUESTION_LIMITS.nestedGroup.fieldRetrieval,
    SAMPLE_STRIDES.CONTACT_FIELD,
    getId,
  ))

  // Structure awareness: row count, top-level and nested field lists, positional field
  const lastContact = contacts.at(-1)!

  questions.push(
    new QuestionBuilder()
      .id(getId())
      .prompt('How many contacts are in the dataset?')
      .groundTruth(String(contacts.length))
      .type('structure-awareness')
      .dataset('nested-group')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('List the top-level field names for contacts (comma-separated, in order).')
      .groundTruth('name,age,email,address,plan')
      .type('structure-awareness')
      .dataset('nested-group')
      .answerType('csv-list-ordered')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What are the field names within a contact\'s address (comma-separated, in order)?')
      .groundTruth('city,country')
      .type('structure-awareness')
      .dataset('nested-group')
      .answerType('csv-list-ordered')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What are the field names within a contact\'s plan (comma-separated, in order)?')
      .groundTruth('name,price')
      .type('structure-awareness')
      .dataset('nested-group')
      .answerType('csv-list-ordered')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the 3rd top-level field name for contacts?')
      .groundTruth('email')
      .type('structure-awareness')
      .dataset('nested-group')
      .answerType('string')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What country does the last contact in the dataset live in?')
      .groundTruth(lastContact.address.country)
      .type('structure-awareness')
      .dataset('nested-group')
      .answerType('string')
      .build(),
  )

  return questions
}
