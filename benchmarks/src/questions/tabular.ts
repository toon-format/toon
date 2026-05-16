import type { Employee } from '../datasets.ts'
import type { Question } from '../types.ts'
import { QUESTION_LIMITS, QUESTION_THRESHOLDS } from '../constants.ts'
import { QuestionBuilder, rotateQuestions, SAMPLE_STRIDES } from './utils.ts'

/**
 * Generate tabular (employee) questions
 */
export function generateTabularQuestions(employees: Employee[], getId: () => string): Question[] {
  const questions: Question[] = []

  // Field retrieval: specific employees
  const fieldGenerators: Array<(emp: Employee, getId: () => string) => Question> = [
    (emp, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the salary of ${emp.name}?`)
      .groundTruth(String(emp.salary))
      .type('field-retrieval')
      .dataset('tabular')
      .answerType('integer')
      .build(),
    (emp, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What department does ${emp.name} work in?`)
      .groundTruth(emp.department)
      .type('field-retrieval')
      .dataset('tabular')
      .answerType('string')
      .build(),
    (emp, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the email address of ${emp.name}?`)
      .groundTruth(emp.email)
      .type('field-retrieval')
      .dataset('tabular')
      .answerType('string')
      .build(),
    (emp, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`How many years of experience does ${emp.name} have?`)
      .groundTruth(String(emp.yearsExperience))
      .type('field-retrieval')
      .dataset('tabular')
      .answerType('integer')
      .build(),
    (emp, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`Is ${emp.name} an active employee?`)
      .groundTruth(emp.active ? 'yes' : 'no')
      .type('field-retrieval')
      .dataset('tabular')
      .answerType('boolean')
      .build(),
  ]

  questions.push(...rotateQuestions(
    employees,
    fieldGenerators,
    QUESTION_LIMITS.tabular.fieldRetrieval,
    SAMPLE_STRIDES.EMPLOYEE_FIELD,
    getId,
  ))

  // Aggregation: count by department
  const departments = [...new Set(employees.map(e => e.department))]
  for (const dept of departments.slice(0, QUESTION_LIMITS.tabular.aggregationDepartments)) {
    const count = employees.filter(e => e.department === dept).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many employees work in ${dept}?`)
        .groundTruth(String(count))
        .type('aggregation')
        .dataset('tabular')
        .answerType('integer')
        .build(),
    )
  }

  // Aggregation: salary ranges (single-condition filters)
  for (const threshold of QUESTION_THRESHOLDS.tabular.salaryRanges) {
    const count = employees.filter(e => e.salary > threshold).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many employees have a salary greater than ${threshold}?`)
        .groundTruth(String(count))
        .type('aggregation')
        .dataset('tabular')
        .answerType('integer')
        .build(),
    )
  }

  // Aggregation: totals and averages
  const totalEmployees = employees.length
  const avgSalary = Math.round(employees.reduce((sum, e) => sum + e.salary, 0) / totalEmployees)
  const activeCount = employees.filter(e => e.active).length
  const inactiveCount = employees.filter(e => !e.active).length

  questions.push(
    new QuestionBuilder()
      .id(getId())
      .prompt('How many employees are in the dataset?')
      .groundTruth(String(totalEmployees))
      .type('aggregation')
      .dataset('tabular')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the average salary across all employees?')
      .groundTruth(String(avgSalary))
      .type('aggregation')
      .dataset('tabular')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('How many employees are active?')
      .groundTruth(String(activeCount))
      .type('aggregation')
      .dataset('tabular')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('How many employees are inactive?')
      .groundTruth(String(inactiveCount))
      .type('aggregation')
      .dataset('tabular')
      .answerType('integer')
      .build(),
  )

  // Filtering: count by department with salary filter (multi-condition)
  for (const dept of departments.slice(0, QUESTION_LIMITS.tabular.filteringMultiConditionDepartments)) {
    const count = employees.filter(
      e => e.department === dept && e.salary > QUESTION_THRESHOLDS.tabular.departmentSalaryThreshold,
    ).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many employees in ${dept} have a salary greater than ${QUESTION_THRESHOLDS.tabular.departmentSalaryThreshold}?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('tabular')
        .answerType('integer')
        .build(),
    )
  }

  // Filtering: active employees by experience (multi-condition)
  for (const exp of QUESTION_THRESHOLDS.tabular.experienceYears.slice(0, QUESTION_LIMITS.tabular.filteringExperience)) {
    const count = employees.filter(e => e.yearsExperience > exp && e.active).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many active employees have more than ${exp} years of experience?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('tabular')
        .answerType('integer')
        .build(),
    )
  }

  // Filtering: department by experience (multi-condition)
  for (const dept of departments.slice(0, QUESTION_LIMITS.tabular.filteringDepartmentExp)) {
    const count = employees.filter(
      e => e.department === dept && e.yearsExperience > QUESTION_THRESHOLDS.tabular.departmentExperienceThreshold,
    ).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many employees in ${dept} have more than ${QUESTION_THRESHOLDS.tabular.departmentExperienceThreshold} years of experience?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('tabular')
        .answerType('integer')
        .build(),
    )
  }

  // Filtering: department by active status (multi-condition)
  for (const dept of departments.slice(0, QUESTION_LIMITS.tabular.filteringDepartmentActive)) {
    const count = employees.filter(e => e.department === dept && e.active).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many active employees work in ${dept}?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('tabular')
        .answerType('integer')
        .build(),
    )
  }

  return questions
}
