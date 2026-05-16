import type { NestedConfig } from '../datasets.ts'
import type { Question } from '../types.ts'
import { QUESTION_LIMITS } from '../constants.ts'
import { QuestionBuilder } from './utils.ts'

/**
 * Generate nested configuration questions
 */
export function generateNestedConfigQuestions(config: NestedConfig | undefined, getId: () => string): Question[] {
  const questions: Question[] = []

  if (!config)
    return questions

  // Field retrieval: top-level config values
  const fieldRetrievalQuestions = [
    {
      prompt: 'What is the environment in the configuration?',
      groundTruth: config.environment,
      answerType: 'string' as const,
    },
    {
      prompt: 'What is the database host?',
      groundTruth: config.database.host,
      answerType: 'string' as const,
    },
    {
      prompt: 'What is the database port?',
      groundTruth: String(config.database.port),
      answerType: 'integer' as const,
    },
    {
      prompt: 'What is the maximum connection pool size?',
      groundTruth: String(config.database.pool.max),
      answerType: 'integer' as const,
    },
    {
      prompt: 'What is the session duration?',
      groundTruth: String(config.authentication.session.duration),
      answerType: 'integer' as const,
    },
    {
      prompt: 'What is the minimum connection pool size?',
      groundTruth: String(config.database.pool.min),
      answerType: 'integer' as const,
    },
    {
      prompt: 'What is the connection pool idle timeout?',
      groundTruth: String(config.database.pool.idleTimeout),
      answerType: 'integer' as const,
    },
    {
      prompt: 'What is the database name?',
      groundTruth: config.database.name,
      answerType: 'string' as const,
    },
    {
      prompt: 'What is the session refresh threshold?',
      groundTruth: String(config.authentication.session.refreshThreshold),
      answerType: 'integer' as const,
    },
    {
      prompt: 'What is the version in the configuration?',
      groundTruth: config.version,
      answerType: 'string' as const,
    },
  ]

  for (const q of fieldRetrievalQuestions.slice(0, QUESTION_LIMITS.nestedConfig.fieldRetrieval)) {
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(q.prompt)
        .groundTruth(q.groundTruth)
        .type('field-retrieval')
        .dataset('nested-config')
        .answerType(q.answerType)
        .build(),
    )
  }

  // Aggregation: counts of nested structures
  const roleCount = Object.keys(config.permissions.roles).length
  const groupCount = Object.keys(config.permissions.groups).length
  const providerCount = config.authentication.providers.length
  const featureCount = Object.keys(config.features).length
  const replicaCount = config.database.replicas.length

  questions.push(
    new QuestionBuilder()
      .id(getId())
      .prompt('How many roles are defined in permissions?')
      .groundTruth(String(roleCount))
      .type('aggregation')
      .dataset('nested-config')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('How many groups are defined in permissions?')
      .groundTruth(String(groupCount))
      .type('aggregation')
      .dataset('nested-config')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('How many authentication providers are configured?')
      .groundTruth(String(providerCount))
      .type('aggregation')
      .dataset('nested-config')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('How many feature flags are defined?')
      .groundTruth(String(featureCount))
      .type('aggregation')
      .dataset('nested-config')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('How many database replicas are configured?')
      .groundTruth(String(replicaCount))
      .type('aggregation')
      .dataset('nested-config')
      .answerType('integer')
      .build(),
  )

  // Aggregation: providers with admin scope
  const adminScopeProviderCount = config.authentication.providers.filter(p => p.scopes.includes('admin')).length
  questions.push(
    new QuestionBuilder()
      .id(getId())
      .prompt('How many authentication providers include the "admin" scope?')
      .groundTruth(String(adminScopeProviderCount))
      .type('aggregation')
      .dataset('nested-config')
      .answerType('integer')
      .build(),
  )

  // Aggregation: feature flag details
  const enabledFeatures = Object.entries(config.features).filter(([_, f]) => f.enabled).length
  questions.push(
    new QuestionBuilder()
      .id(getId())
      .prompt('How many feature flags are enabled?')
      .groundTruth(String(enabledFeatures))
      .type('aggregation')
      .dataset('nested-config')
      .answerType('integer')
      .build(),
  )

  // Aggregation: role permissions
  const adminPermissions = config.permissions.roles.admin?.permissions.length ?? 0
  questions.push(
    new QuestionBuilder()
      .id(getId())
      .prompt('How many permissions does the admin role have?')
      .groundTruth(String(adminPermissions))
      .type('aggregation')
      .dataset('nested-config')
      .answerType('integer')
      .build(),
  )

  // Aggregation: additional nested counts
  const totalPermissions = Object.values(config.permissions.roles).reduce((sum, role) => sum + role.permissions.length, 0)
  const distinctPermissions = new Set(Object.values(config.permissions.roles).flatMap(r => r.permissions)).size
  const totalVariants = Object.values(config.features).reduce((sum, f) => sum + f.variants.length, 0)
  const highPriorityReplicas = config.database.replicas.filter(r => r.priority > 2).length
  const featuresWithHighRollout = Object.values(config.features).filter(f => f.rollout > 50).length
  const groupsWithMultipleRoles = Object.values(config.permissions.groups).filter(g => g.roles.length > 1).length

  questions.push(
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the total number of permissions across all roles?')
      .groundTruth(String(totalPermissions))
      .type('aggregation')
      .dataset('nested-config')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('How many distinct permissions are defined across all roles?')
      .groundTruth(String(distinctPermissions))
      .type('aggregation')
      .dataset('nested-config')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('What is the total number of variants across all feature flags?')
      .groundTruth(String(totalVariants))
      .type('aggregation')
      .dataset('nested-config')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('How many database replicas have a priority greater than 2?')
      .groundTruth(String(highPriorityReplicas))
      .type('aggregation')
      .dataset('nested-config')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('How many feature flags have a rollout percentage greater than 50?')
      .groundTruth(String(featuresWithHighRollout))
      .type('aggregation')
      .dataset('nested-config')
      .answerType('integer')
      .build(),
    new QuestionBuilder()
      .id(getId())
      .prompt('How many groups have more than one role assigned?')
      .groundTruth(String(groupsWithMultipleRoles))
      .type('aggregation')
      .dataset('nested-config')
      .answerType('integer')
      .build(),
  )

  // Filtering: complex multi-condition queries
  const filteringQuestions = [
    {
      prompt: 'How many feature flags are enabled with rollout greater than 50%?',
      groundTruth: String(Object.entries(config.features)
        .filter(([_, f]) => f.enabled && f.rollout > 50).length),
    },
    {
      prompt: 'How many groups have the admin role?',
      groundTruth: String(Object.entries(config.permissions.groups)
        .filter(([_, g]) => g.roles.includes('admin')).length),
    },
    {
      prompt: 'How many database replicas have priority greater than 2 and port 5432?',
      groundTruth: String(config.database.replicas
        .filter(r => r.priority > 2 && r.port === 5432).length),
    },
    {
      prompt: 'How many authentication providers have more than 2 scopes?',
      groundTruth: String(config.authentication.providers
        .filter(p => p.scopes.length > 2).length),
    },
    {
      prompt: 'How many roles have at least 5 permissions?',
      groundTruth: String(Object.values(config.permissions.roles)
        .filter(r => r.permissions.length >= 5).length),
    },
    {
      prompt: 'How many feature flags are disabled with rollout less than 25%?',
      groundTruth: String(Object.values(config.features)
        .filter(f => !f.enabled && f.rollout < 25).length),
    },
    {
      prompt: 'How many enabled features have at least 2 variants?',
      groundTruth: String(Object.values(config.features)
        .filter(f => f.enabled && f.variants.length >= 2).length),
    },
  ]

  for (const q of filteringQuestions.slice(0, QUESTION_LIMITS.nestedConfig.filteringComplex)) {
    questions.push(
      new QuestionBuilder()
        .id(getId())
        .prompt(q.prompt)
        .groundTruth(q.groundTruth)
        .type('filtering')
        .dataset('nested-config')
        .answerType('integer')
        .build(),
    )
  }

  return questions
}
