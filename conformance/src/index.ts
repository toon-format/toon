/**
 * TOON Cross-Language Conformance Testing Framework
 * 
 * Main exports for programmatic usage
 */

export { ConformanceRunner } from './runner.js'
export { ImplementationRegistry } from './registry.js'
export { OutputComparator } from './comparator.js'
export { ReportGenerator } from './reporter.js'

export type {
  ConformanceTestCase,
  ImplementationConfig,
  TestResult,
  ConformanceReport,
  ConformanceRunnerOptions,
  ComparisonResult,
  ImplementationResult,
  CategoryResult,
  TestFailure
} from './types.js'