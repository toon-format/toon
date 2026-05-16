import type { Order } from '../datasets.ts'
import type { Question } from '../types.ts'
import { QUESTION_LIMITS, QUESTION_THRESHOLDS } from '../constants.ts'
import { QuestionBuilder, rotateQuestions, SAMPLE_STRIDES } from './utils.ts'

/**
 * Generate nested (orders) questions
 */
export function generateNestedQuestions(orders: Order[], getId: () => string): Question[] {
  const questions: Question[] = []

  // Field retrieval: order totals and statuses
  const orderFieldGenerators: Array<(order: Order, getId: () => string) => Question> = [
    (order, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the total for order ${order.orderId}?`)
      .groundTruth(String(order.total))
      .type('field-retrieval')
      .dataset('nested')
      .answerType('number')
      .normalize({ decimalPlaces: 2 })
      .build(),
    (order, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the status of order ${order.orderId}?`)
      .groundTruth(order.status)
      .type('field-retrieval')
      .dataset('nested')
      .answerType('string')
      .build(),
  ]

  questions.push(...rotateQuestions(
    orders,
    orderFieldGenerators,
    QUESTION_LIMITS.nested.fieldRetrievalOrders,
    SAMPLE_STRIDES.ORDER_FIELD,
    getId,
  ))

  // Field retrieval: customer info and order dates
  const customerFieldGenerators: Array<(order: Order, getId: () => string) => Question> = [
    (order, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the customer name for order ${order.orderId}?`)
      .groundTruth(order.customer.name)
      .type('field-retrieval')
      .dataset('nested')
      .answerType('string')
      .build(),
    (order, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the customer email for order ${order.orderId}?`)
      .groundTruth(order.customer.email)
      .type('field-retrieval')
      .dataset('nested')
      .answerType('string')
      .build(),
    (order, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the order date for order ${order.orderId}?`)
      .groundTruth(order.orderDate || '')
      .type('field-retrieval')
      .dataset('nested')
      .answerType('string')
      .build(),
    (order, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`How many items are in order ${order.orderId}?`)
      .groundTruth(String(order.items.length))
      .type('field-retrieval')
      .dataset('nested')
      .answerType('integer')
      .build(),
  ]

  // Use stride + 1 for customer fields to offset from order fields
  const customerOrders = orders.map((_, i) => orders[i * SAMPLE_STRIDES.CUSTOMER_FIELD + 1] || orders[i]).filter(Boolean) as Order[]
  questions.push(...rotateQuestions(
    customerOrders,
    customerFieldGenerators,
    QUESTION_LIMITS.nested.fieldRetrievalCustomers,
    1,
    getId,
  ))

  // Aggregation: totals and averages
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
  const avgOrderValue = totalRevenue / orders.length
  const totalOrders = orders.length
  const maxOrderValue = Math.max(...orders.map(o => o.total))

  // Count by status
  const statuses = [...new Set(orders.map(o => o.status))]
  for (const status of statuses.slice(0, QUESTION_LIMITS.nested.aggregationStatuses)) {
    const count = orders.filter(o => o.status === status).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many orders have status "${status}"?`)
        .groundTruth(String(count))
        .type('aggregation')
        .dataset('nested')
        .answerType('integer')
        .build(),
    )
  }

  questions.push(
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the total revenue across all orders?')
      .groundTruth(String(totalRevenue.toFixed(2)))
      .type('aggregation')
      .dataset('nested')
      .answerType('number')
      .normalize({ decimalPlaces: 2 })
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the average order value?')
      .groundTruth(String(avgOrderValue.toFixed(2)))
      .type('aggregation')
      .dataset('nested')
      .answerType('number')
      .normalize({ decimalPlaces: 2 })
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('How many orders are in the dataset?')
      .groundTruth(String(totalOrders))
      .type('aggregation')
      .dataset('nested')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the highest order total?')
      .groundTruth(String(maxOrderValue.toFixed(2)))
      .type('aggregation')
      .dataset('nested')
      .answerType('number')
      .normalize({ decimalPlaces: 2 })
      .build(),
  )

  // Aggregation: high-value orders (single-condition filter)
  for (const threshold of QUESTION_THRESHOLDS.nested.highValueOrders) {
    const count = orders.filter(o => o.total > threshold).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many orders have a total greater than ${threshold}?`)
        .groundTruth(String(count))
        .type('aggregation')
        .dataset('nested')
        .answerType('integer')
        .build(),
    )
  }

  // Filtering: multi-condition queries (status AND value)
  const orderStatuses = [...new Set(orders.map(o => o.status))]
  for (const status of orderStatuses.slice(0, QUESTION_LIMITS.nested.filteringStatusAndValue)) {
    const count = orders.filter(
      o => o.status === status && o.total > QUESTION_THRESHOLDS.nested.statusValueThreshold,
    ).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many orders have status "${status}" and total greater than ${QUESTION_THRESHOLDS.nested.statusValueThreshold}?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('nested')
        .answerType('integer')
        .build(),
    )
  }

  // Filtering: status AND items count (multi-condition)
  for (const status of orderStatuses.slice(0, QUESTION_LIMITS.nested.filteringStatusAndItems)) {
    const count = orders.filter(
      o => o.status === status && o.items.length >= QUESTION_THRESHOLDS.nested.itemCountThreshold,
    ).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many orders have status "${status}" and at least ${QUESTION_THRESHOLDS.nested.itemCountThreshold} items?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('nested')
        .answerType('integer')
        .build(),
    )
  }

  // Filtering: total AND items count (multi-condition)
  for (const threshold of QUESTION_THRESHOLDS.nested.totalThresholdsForItems) {
    const count = orders.filter(
      o => o.total > threshold && o.items.length >= QUESTION_THRESHOLDS.nested.itemCountThreshold,
    ).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many orders have a total greater than ${threshold} and at least ${QUESTION_THRESHOLDS.nested.itemCountThreshold} items?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('nested')
        .answerType('integer')
        .build(),
    )
  }

  return questions
}
