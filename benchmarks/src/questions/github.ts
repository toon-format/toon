import type { Repository } from '../datasets.ts'
import type { Question } from '../types.ts'
import { QUESTION_LIMITS, QUESTION_THRESHOLDS } from '../constants.ts'
import { QuestionBuilder, rotateQuestions, SAMPLE_STRIDES } from './utils.ts'

/**
 * Generate GitHub repository questions
 */
export function generateGithubQuestions(repos: Repository[], getId: () => string): Question[] {
  const questions: Question[] = []

  // Field retrieval: repository metadata
  const repoFieldGenerators: Array<(repo: Repository, getId: () => string) => Question> = [
    (repo, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`How many stars does ${repo.repo} have?`)
      .groundTruth(String(repo.stars))
      .type('field-retrieval')
      .dataset('github')
      .answerType('integer')
      .build(),
    (repo, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`How many forks does ${repo.repo} have?`)
      .groundTruth(String(repo.forks))
      .type('field-retrieval')
      .dataset('github')
      .answerType('integer')
      .build(),
    (repo, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`How many watchers does ${repo.repo} have?`)
      .groundTruth(String(repo.watchers))
      .type('field-retrieval')
      .dataset('github')
      .answerType('integer')
      .build(),
    (repo, getId) => new QuestionBuilder()
      .id(getId())
      .prompt(`What is the main branch of ${repo.repo}?`)
      .groundTruth(repo.defaultBranch)
      .type('field-retrieval')
      .dataset('github')
      .answerType('string')
      .normalize({ caseSensitive: true })
      .build(),
  ]

  questions.push(...rotateQuestions(
    repos,
    repoFieldGenerators,
    QUESTION_LIMITS.github.fieldRetrievalRepos,
    SAMPLE_STRIDES.REPO_FIELD,
    getId,
  ))

  // Aggregation: basic statistics
  const totalRepos = repos.length
  const totalStars = repos.reduce((sum, r) => sum + r.stars, 0)
  const totalForks = repos.reduce((sum, r) => sum + r.forks, 0)
  const avgStars = totalStars / totalRepos

  questions.push(
    new QuestionBuilder()
      .id(getId())
      .prompt('How many repositories are in the dataset?')
      .groundTruth(String(totalRepos))
      .type('aggregation')
      .dataset('github')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the total number of stars across all repositories?')
      .groundTruth(String(totalStars))
      .type('aggregation')
      .dataset('github')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the total number of forks across all repositories?')
      .groundTruth(String(totalForks))
      .type('aggregation')
      .dataset('github')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the average number of stars per repository?')
      .groundTruth(String(Math.round(avgStars)))
      .type('aggregation')
      .dataset('github')
      .answerType('integer')
      .build(),
  )

  // Aggregation: by default branch
  const branches = [...new Set(repos.map(r => r.defaultBranch))]
  for (const branch of branches.slice(0, QUESTION_LIMITS.github.aggregationBranches)) {
    const count = repos.filter(r => r.defaultBranch === branch).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many repositories use "${branch}" as their default branch?`)
        .groundTruth(String(count))
        .type('aggregation')
        .dataset('github')
        .answerType('integer')
        .build(),
    )
  }

  // Aggregation: high star counts
  for (const threshold of QUESTION_THRESHOLDS.github.stars) {
    const count = repos.filter(r => r.stars > threshold).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many repositories have more than ${threshold} stars?`)
        .groundTruth(String(count))
        .type('aggregation')
        .dataset('github')
        .answerType('integer')
        .build(),
    )
  }

  // Aggregation: high fork counts
  for (const threshold of QUESTION_THRESHOLDS.github.forks) {
    const count = repos.filter(r => r.forks > threshold).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many repositories have more than ${threshold} forks?`)
        .groundTruth(String(count))
        .type('aggregation')
        .dataset('github')
        .answerType('integer')
        .build(),
    )
  }

  // Aggregation: high watcher counts
  for (const threshold of QUESTION_THRESHOLDS.github.watchers) {
    const count = repos.filter(r => r.watchers > threshold).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many repositories have more than ${threshold} watchers?`)
        .groundTruth(String(count))
        .type('aggregation')
        .dataset('github')
        .answerType('integer')
        .build(),
    )
  }

  // Filtering: multi-condition (stars AND forks)
  for (const combo of QUESTION_THRESHOLDS.github.starForkCombinations.slice(0, QUESTION_LIMITS.github.filteringStarsAndForks)) {
    const count = repos.filter(
      r => r.stars > combo.stars && r.forks > combo.forks,
    ).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many repositories have more than ${combo.stars} stars and more than ${combo.forks} forks?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('github')
        .answerType('integer')
        .build(),
    )
  }

  // Filtering: stars AND watchers
  for (const combo of QUESTION_THRESHOLDS.github.starWatcherCombinations) {
    const count = repos.filter(
      r => r.stars > combo.stars && r.watchers > combo.watchers,
    ).length
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(`How many repositories have more than ${combo.stars} stars and more than ${combo.watchers} watchers?`)
        .groundTruth(String(count))
        .type('filtering')
        .dataset('github')
        .answerType('integer')
        .build(),
    )
  }

  return questions
}
