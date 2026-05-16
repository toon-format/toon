import type { EventLog } from '../datasets.ts'
import type { Question } from '../types.ts'
import { QUESTION_LIMITS } from '../constants.ts'
import { QuestionBuilder, rotateQuestions, SAMPLE_STRIDES } from './utils.ts'

/**
 * Generate event log questions
 */
export function generateEventLogsQuestions(logs: EventLog[], getId: () => string): Question[] {
  const questions: Question[] = []

  // Field retrieval: log metadata
  const logFieldGenerators: Array<(log: EventLog, getId: () => string) => Question> = [
    (log, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the level of the log at ${log.timestamp}?`)
      .groundTruth(log.level)
      .type('field-retrieval')
      .dataset('event-logs')
      .answerType('string')
      .build(),
    (log, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the endpoint for the log at ${log.timestamp}?`)
      .groundTruth(log.endpoint)
      .type('field-retrieval')
      .dataset('event-logs')
      .answerType('string')
      .build(),
    (log, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the status code for the log at ${log.timestamp}?`)
      .groundTruth(String(log.statusCode))
      .type('field-retrieval')
      .dataset('event-logs')
      .answerType('integer')
      .build(),
    (log, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the response time for the log at ${log.timestamp}?`)
      .groundTruth(String(log.responseTime))
      .type('field-retrieval')
      .dataset('event-logs')
      .answerType('integer')
      .build(),
  ]

  questions.push(...rotateQuestions(
    logs,
    logFieldGenerators,
    QUESTION_LIMITS.eventLogs.fieldRetrieval,
    SAMPLE_STRIDES.EVENT_LOG_FIELD,
    getId,
  ))

  // Aggregation: basic statistics
  const totalLogs = logs.length
  const avgResponseTime = logs.reduce((sum, l) => sum + l.responseTime, 0) / logs.length

  questions.push(
    new QuestionBuilder()
      .id(getId())
      .prompt('How many log entries are in the dataset?')
      .groundTruth(String(totalLogs))
      .type('aggregation')
      .dataset('event-logs')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the average response time across all logs?')
      .groundTruth(String(avgResponseTime.toFixed(2)))
      .type('aggregation')
      .dataset('event-logs')
      .answerType('number')
      .normalize({ decimalPlaces: 2 })
      .build(),
  )

  // Aggregation: by level
  const levels = [...new Set(logs.map(l => l.level))]
  for (const level of levels) {
    const count = logs.filter(l => l.level === level).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many log entries have level "${level}"?`)
        .groundTruth(String(count))
        .type('aggregation')
        .dataset('event-logs')
        .answerType('integer')
        .build(),
    )
  }

  // Aggregation: by endpoint
  const endpoints = [...new Set(logs.map(l => l.endpoint))]
  for (const endpoint of endpoints.slice(0, QUESTION_LIMITS.eventLogs.aggregationEndpoints)) {
    const count = logs.filter(l => l.endpoint === endpoint).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many log entries are for endpoint "${endpoint}"?`)
        .groundTruth(String(count))
        .type('aggregation')
        .dataset('event-logs')
        .answerType('integer')
        .build(),
    )
  }

  // Aggregation: by status code range
  const errorCount = logs.filter(l => l.statusCode >= 400).length
  const successCount = logs.filter(l => l.statusCode >= 200 && l.statusCode < 300).length

  questions.push(
    new QuestionBuilder()
      .id(getId())
      .prompt('How many log entries have a status code indicating an error (>= 400)?')
      .groundTruth(String(errorCount))
      .type('aggregation')
      .dataset('event-logs')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('How many log entries have a successful status code (200-299)?')
      .groundTruth(String(successCount))
      .type('aggregation')
      .dataset('event-logs')
      .answerType('integer')
      .build(),
  )

  // Aggregation: retryable errors
  const retryableErrorCount = logs.filter(l => l.error?.retryable === true).length
  questions.push(
    new QuestionBuilder()
      .id(getId())
      .prompt('How many log entries have a retryable error?')
      .groundTruth(String(retryableErrorCount))
      .type('aggregation')
      .dataset('event-logs')
      .answerType('integer')
      .build(),
  )

  // Filtering: multi-condition (level AND status)
  for (const level of levels.slice(0, QUESTION_LIMITS.eventLogs.filteringLevelAndStatus)) {
    // Skip `info` level as it never has status >= 400 by design
    if (level === 'info')
      continue

    const count = logs.filter(l => l.level === level && l.statusCode >= 400).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many log entries have level "${level}" and status code >= 400?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('event-logs')
        .answerType('integer')
        .build(),
    )
  }

  // Filtering: endpoint AND status
  for (const endpoint of endpoints.slice(0, QUESTION_LIMITS.eventLogs.filteringEndpointAndStatus)) {
    const count = logs.filter(l => l.endpoint === endpoint && l.statusCode >= 500).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many log entries are for endpoint "${endpoint}" with status code >= 500?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('event-logs')
        .answerType('integer')
        .build(),
    )
  }

  // Filtering: endpoint AND retryable error
  for (const endpoint of endpoints.slice(0, QUESTION_LIMITS.eventLogs.filteringEndpointRetryable)) {
    const count = logs.filter(l => l.endpoint === endpoint && l.error?.retryable === true).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many log entries for endpoint "${endpoint}" have a retryable error?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('event-logs')
        .answerType('integer')
        .build(),
    )
  }

  return questions
}
