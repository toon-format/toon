/**
 * Type definitions for cross-language TOON conformance testing
 */

export interface ConformanceTestCase {
  id: string
  name: string
  description: string
  category: 'basic' | 'edge-cases' | 'optimization'
  input: unknown
  expected: string
  options?: {
    delimiter?: ',' | '\t' | '|'
    indent?: number
    keyFolding?: 'off' | 'safe'
    flattenDepth?: number
  }
  minSpecVersion?: string
  note?: string
}

export interface ImplementationConfig {
  name: string
  displayName: string
  language: string
  version: string
  command: string
  args: string[]
  workingDirectory?: string
  environment?: Record<string, string>
  active: boolean
  options?: {
    inputMethod: 'stdin' | 'file' | 'argument'
    outputMethod: 'stdout' | 'file'
    tempFileExtensions?: { input?: string; output?: string }
  }
}

export interface TestResult {
  testId: string
  implementation: string
  passed: boolean
  actualOutput: string
  expectedOutput: string
  executionTime: number
  exitCode: number
  error?: string
  stderr?: string
}

export interface ConformanceReport {
  timestamp: string
  specVersion: string
  totalTests: number
  totalImplementations: number
  summary: {
    testsRun: number
    testsPassed: number
    testsFailed: number
    passRate: number
  }
  implementations: ImplementationResult[]
  categories: CategoryResult[]
  failures: TestFailure[]
}

export interface ImplementationResult {
  name: string
  displayName: string
  language: string
  version: string
  testsRun: number
  testsPassed: number
  testsFailed: number
  passRate: number
  averageExecutionTime: number
  isConformant: boolean
}

export interface CategoryResult {
  category: string
  totalTests: number
  totalPassed: number
  totalFailed: number
  passRate: number
}

export interface TestFailure {
  testId: string
  testName: string
  implementation: string
  expected: string
  actual: string
  diff: string
  error?: string
}

export interface ConformanceRunnerOptions {
  implementations?: string[]
  categories?: string[]
  testCases?: string[]
  generateReport?: boolean
  outputDir?: string
  failFast?: boolean
  verbose?: boolean
  timeout?: number
  parallelism?: number
}

export interface ComparisonResult {
  matches: boolean
  normalizedExpected: string
  normalizedActual: string
  diff?: string
  notes?: string[]
}