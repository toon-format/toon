import type { AnalyticsMetric } from '../datasets.ts'
import type { Question } from '../types.ts'
import { QUESTION_LIMITS, QUESTION_THRESHOLDS } from '../constants.ts'
import { QuestionBuilder, rotateQuestions, SAMPLE_STRIDES } from './utils.ts'

/**
 * Generate analytics (website metrics) questions
 */
export function generateAnalyticsQuestions(metrics: AnalyticsMetric[], getId: () => string): Question[] {
  const questions: Question[] = []

  // Field retrieval: date-based metrics
  const metricFieldGenerators: Array<(metric: AnalyticsMetric, getId: () => string) => Question> = [
    (metric, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What are the views for ${metric.date}?`)
      .groundTruth(String(metric.views))
      .type('field-retrieval')
      .dataset('analytics')
      .answerType('integer')
      .build(),
    (metric, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the revenue for ${metric.date}?`)
      .groundTruth(String(metric.revenue))
      .type('field-retrieval')
      .dataset('analytics')
      .answerType('number')
      .normalize({ decimalPlaces: 2 })
      .build(),
    (metric, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the bounce rate for ${metric.date}?`)
      .groundTruth(String(metric.bounceRate))
      .type('field-retrieval')
      .dataset('analytics')
      .answerType('number')
      .normalize({ decimalPlaces: 2 })
      .build(),
    (metric, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`How many conversions were there on ${metric.date}?`)
      .groundTruth(String(metric.conversions))
      .type('field-retrieval')
      .dataset('analytics')
      .answerType('integer')
      .build(),
  ]

  questions.push(...rotateQuestions(
    metrics,
    metricFieldGenerators,
    QUESTION_LIMITS.analytics.fieldRetrievalDates,
    SAMPLE_STRIDES.ANALYTICS_FIELD,
    getId,
  ))

  // Aggregation: basic statistics
  const totalDays = metrics.length
  const totalViews = metrics.reduce((sum, m) => sum + m.views, 0)
  const totalConversions = metrics.reduce((sum, m) => sum + m.conversions, 0)
  const totalRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0)
  const avgBounceRate = metrics.reduce((sum, m) => sum + m.bounceRate, 0) / metrics.length

  questions.push(
    new QuestionBuilder()
      .id(getId())
      .prompt('How many days of data are in the dataset?')
      .groundTruth(String(totalDays))
      .type('aggregation')
      .dataset('analytics')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the total number of views across all dates?')
      .groundTruth(String(totalViews))
      .type('aggregation')
      .dataset('analytics')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the total number of conversions across all dates?')
      .groundTruth(String(totalConversions))
      .type('aggregation')
      .dataset('analytics')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the total revenue across all dates?')
      .groundTruth(String(totalRevenue.toFixed(2)))
      .type('aggregation')
      .dataset('analytics')
      .answerType('number')
      .normalize({ decimalPlaces: 2 })
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the average bounce rate?')
      .groundTruth(String(avgBounceRate.toFixed(2)))
      .type('aggregation')
      .dataset('analytics')
      .answerType('number')
      .normalize({ decimalPlaces: 2 })
      .build(),
  )

  // Aggregation: high views/conversions
  for (const threshold of QUESTION_THRESHOLDS.analytics.views) {
    const count = metrics.filter(m => m.views > threshold).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many days had more than ${threshold} views?`)
        .groundTruth(String(count))
        .type('aggregation')
        .dataset('analytics')
        .answerType('integer')
        .build(),
    )
  }

  for (const threshold of QUESTION_THRESHOLDS.analytics.conversions) {
    const count = metrics.filter(m => m.conversions > threshold).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many days had more than ${threshold} conversions?`)
        .groundTruth(String(count))
        .type('aggregation')
        .dataset('analytics')
        .answerType('integer')
        .build(),
    )
  }

  // Filtering: multi-condition (views AND revenue)
  for (const threshold of QUESTION_THRESHOLDS.analytics.viewsForFiltering) {
    const count = metrics.filter(
      m => m.views > threshold && m.conversions > QUESTION_THRESHOLDS.analytics.conversionsForFiltering,
    ).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many days had more than ${threshold} views and more than ${QUESTION_THRESHOLDS.analytics.conversionsForFiltering} conversions?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('analytics')
        .answerType('integer')
        .build(),
    )
  }

  // Filtering: revenue thresholds
  for (const threshold of QUESTION_THRESHOLDS.analytics.revenueThresholds) {
    const count = metrics.filter(
      m => m.revenue > threshold && m.views > QUESTION_THRESHOLDS.analytics.viewsThresholdForRevenue,
    ).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many days had revenue greater than ${threshold} with views above ${QUESTION_THRESHOLDS.analytics.viewsThresholdForRevenue}?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('analytics')
        .answerType('integer')
        .build(),
    )
  }

  // Filtering: clicks and conversions
  for (const threshold of QUESTION_THRESHOLDS.analytics.clicksForFiltering) {
    const count = metrics.filter(
      m => m.clicks > threshold && m.conversions > QUESTION_THRESHOLDS.analytics.conversionsForClickFiltering,
    ).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many days had more than ${threshold} clicks and more than ${QUESTION_THRESHOLDS.analytics.conversionsForClickFiltering} conversions?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('analytics')
        .answerType('integer')
        .build(),
    )
  }

  // Filtering: revenue and bounce rate
  for (const threshold of QUESTION_THRESHOLDS.analytics.revenueForBounceRate) {
    const count = metrics.filter(
      m => m.revenue > threshold && m.bounceRate < QUESTION_THRESHOLDS.analytics.bounceRateThreshold,
    ).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many days had revenue greater than ${threshold} with bounce rate below ${QUESTION_THRESHOLDS.analytics.bounceRateThreshold}?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('analytics')
        .answerType('integer')
        .build(),
    )
  }

  return questions
}
