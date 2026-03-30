import process from 'node:process'
import * as url from 'node:url'

export const ROOT_DIR: string = url.fileURLToPath(new URL('../../', import.meta.url))
export const BENCHMARKS_DIR: string = url.fileURLToPath(new URL('../', import.meta.url))

/**
 * Default concurrency for parallel evaluations to prevent bursting
 */
export const DEFAULT_CONCURRENCY = 10

/**
 * Enable dry run mode for quick testing with limited AI requests
 *
 * @remarks
 * Set via environment variable: `DRY_RUN=true`.
 */
export const DRY_RUN: boolean = process.env.DRY_RUN === 'true'

/**
 * Limits applied during dry run mode
 */
export const DRY_RUN_LIMITS = {
  /** Maximum number of questions to evaluate */
  maxQuestions: 10,
}

/**
 * Model-specific RPM (requests per minute) limits to handle API quotas
 *
 * @remarks
 * Set `undefined` for models without specific limits.
 */
/// keep-sorted
export const MODEL_RPM_LIMITS: Record<string, number | undefined> = {
  'claude-haiku-4-5-20251001': 50,
  'gemini-3-flash-preview': 25,
  'gpt-5-nano': 50,
  'grok-4-1-fast-non-reasoning': 25,
}

/**
 * Display names for data format types
 */
export const FORMATTER_DISPLAY_NAMES: Record<string, string> = {
  'json-pretty': 'JSON',
  'json-compact': 'JSON compact',
  'toon': 'TOON',
  'toon-normalized': 'TOON (normalized)',
  'csv': 'CSV',
  'xml': 'XML',
  'yaml': 'YAML',
} as const

/**
 * Question type identifiers
 */
export const QUESTION_TYPES = [
  'field-retrieval',
  'retrieval',
  'aggregation',
  'filtering',
  'structure-awareness',
  'structural-validation',
] as const

/**
 * Display names for question types
 */
export const QUESTION_TYPE_LABELS = {
  'field-retrieval': 'Field Retrieval',
  'retrieval': 'Retrieval',
  'aggregation': 'Aggregation',
  'filtering': 'Filtering',
  'structure-awareness': 'Structure Awareness',
  'structural-validation': 'Structural Validation',
} as const

/**
 * Dataset identifiers
 */
export const DATASET_NAMES = [
  'tabular',
  'nested',
  'analytics',
  'github',
  'event-logs',
  'nested-config',
  'large-uniform',
  'semi-uniform-orders',
  'deep-incidents',
  'grafana-logs',
  'structural-validation-control',
  'structural-validation-truncated',
  'structural-validation-extra-rows',
  'structural-validation-width-mismatch',
  'structural-validation-missing-fields',
] as const

/**
 * Structure class identifiers
 */
export const STRUCTURE_CLASSES = [
  'uniform',
  'semi-uniform',
  'nested',
  'deep',
] as const

/**
 * Threshold values for filtering and aggregation questions
 */
export const QUESTION_THRESHOLDS = {
  tabular: {
    salaryRanges: [60000, 80000, 100000],
    experienceYears: [5, 10, 15, 20],
    departmentSalaryThreshold: 80000,
    departmentExperienceThreshold: 10,
  },
  nested: {
    highValueOrders: [200, 400, 600],
    statusValueThreshold: 300,
    itemCountThreshold: 3,
    totalThresholdsForItems: [300, 500],
  },
  analytics: {
    views: [6000],
    conversions: [20],
    viewsForFiltering: [6000, 7000],
    conversionsForFiltering: 15,
    revenueThresholds: [1000, 1500, 2000],
    viewsThresholdForRevenue: 6000,
    clicksForFiltering: [250, 400],
    conversionsForClickFiltering: 15,
    revenueForBounceRate: [1000, 1500],
    bounceRateThreshold: 0.5,
  },
  github: {
    stars: [100000, 150000, 200000],
    forks: [20000, 35000],
    watchers: [8000],
    starForkCombinations: [
      { stars: 75000, forks: 15000 },
      { stars: 100000, forks: 20000 },
      { stars: 150000, forks: 30000 },
      { stars: 200000, forks: 45000 },
    ],
    starWatcherCombinations: [
      { stars: 100000, watchers: 7000 },
      { stars: 150000, watchers: 9000 },
    ],
  },
} as const

/**
 * Question generation configuration
 */
export const QUESTION_LIMITS = {
  tabular: {
    fieldRetrieval: 12,
    aggregationDepartments: 3,
    filteringMultiConditionDepartments: 5,
    filteringExperience: 3,
    filteringDepartmentExp: 3,
    filteringDepartmentActive: 2,
  },
  nested: {
    fieldRetrievalOrders: 8,
    fieldRetrievalCustomers: 8,
    aggregationStatuses: 3,
    filteringStatusAndValue: 4,
    filteringStatusAndItems: 3,
  },
  analytics: {
    fieldRetrievalDates: 9,
  },
  github: {
    fieldRetrievalRepos: 11,
    aggregationBranches: 2,
    filteringStarsAndForks: 3,
  },
  eventLogs: {
    fieldRetrieval: 10,
    aggregationEndpoints: 2,
    filteringLevelAndStatus: 3,
    filteringEndpointAndStatus: 3,
    filteringEndpointRetryable: 2,
  },
  nestedConfig: {
    fieldRetrieval: 10,
    filteringComplex: 5,
  },
} as const
