/**
 * Main conformance test runner
 */

import type { ConformanceTestCase, ImplementationConfig, TestResult, ConformanceRunnerOptions, ConformanceReport } from './types.js'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { ImplementationRegistry } from './registry.js'
import { OutputComparator } from './comparator.js'
import { ReportGenerator } from './reporter.js'

export class ConformanceRunner {
  private testCases = new Map<string, ConformanceTestCase>()

  constructor(
    private registry = new ImplementationRegistry(),
    private comparator = new OutputComparator(),
    private reporter = new ReportGenerator(),
    testCasesDir?: string
  ) {
    testCasesDir && this.loadTestCases(testCasesDir)
  }

  /**
   * Load test cases from directory
   */
  private loadTestCases = (dir: string): void => {
    const file = join(dir, 'conformance.json')
    if (!existsSync(file)) throw new Error(`Test file not found: ${file}`)
    
    const { testCases } = JSON.parse(readFileSync(file, 'utf-8'))
    if (!Array.isArray(testCases)) throw new Error('Invalid test file: missing testCases array')
    
    testCases.forEach((tc: ConformanceTestCase) => this.testCases.set(tc.id, tc))
    console.log(`Loaded ${this.testCases.size} test cases`)
  }

  /**
   * Run conformance tests
   */
  run = async (options: ConformanceRunnerOptions = {}): Promise<ConformanceReport> => {
    const startTime = Date.now()
    const implementations = options.implementations ? this.registry.getImplementations(options.implementations) : this.registry.getActiveImplementations()
    const testCases = this.getTestCasesToRun(options)
    
    if (!implementations.length) throw new Error('No implementations available')
    if (!testCases.length) throw new Error('No test cases available')
    
    console.log(`Running ${testCases.length} test cases against ${implementations.length} implementations`)

    const results: TestResult[] = []
    
    for (const impl of implementations) {
      console.log(`\nTesting: ${impl.displayName}`)
      
      for (const test of testCases) {
        options.verbose && console.log(`  Running: ${test.name}`)
        
        const result = await this.runSingleTest(impl, test, options).catch(error => ({
          testId: test.id,
          implementation: impl.name,
          passed: false,
          actualOutput: '',
          expectedOutput: test.expected,
          executionTime: 0,
          exitCode: -1,
          error: error instanceof Error ? error.message : String(error)
        }))
        
        results.push(result)
        if (!result.passed && options.failFast) break
      }
      
      if (options.failFast && results.some(r => !r.passed)) break
    }

    const report = this.reporter.generateReport(results, implementations, testCases, Date.now() - startTime)
    options.generateReport && options.outputDir && this.saveReport(report, options.outputDir)
    
    return report
  }

  /**
   * Run a single test case against an implementation
   */
  private async runSingleTest(
    implementation: ImplementationConfig,
    testCase: ConformanceTestCase,
    options: ConformanceRunnerOptions
  ): Promise<TestResult> {
    const startTime = Date.now()
    const baseResult = {
      testId: testCase.id,
      implementation: implementation.name,
      expectedOutput: testCase.expected,
      executionTime: 0
    }
    
    try {
      const actualOutput = await this.executeImplementation(implementation, testCase, options.timeout ?? 10000)
      const comparison = this.comparator.compare(testCase.expected, actualOutput)
      
      return {
        ...baseResult,
        passed: comparison.matches,
        actualOutput,
        executionTime: Date.now() - startTime,
        exitCode: 0
      }
    } catch (error) {
      return {
        ...baseResult,
        passed: false,
        actualOutput: '',
        executionTime: Date.now() - startTime,
        exitCode: 1,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Execute implementation with test case
   */
  private executeImplementation = (impl: ImplementationConfig, test: ConformanceTestCase, timeout: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const args = [...impl.args]
      const { options: opts } = test
      
      // Add TOON options using array push for efficiency
      opts?.delimiter !== ',' && opts?.delimiter && args.push('--delimiter', opts.delimiter)
      opts?.indent !== 2 && opts?.indent && args.push('--indent', String(opts.indent))
      opts?.keyFolding !== 'off' && opts?.keyFolding && args.push('--keyFolding', opts.keyFolding)

      const child = spawn(impl.command, args, {
        cwd: impl.workingDirectory,
        env: { ...process.env, ...impl.environment },
        timeout
      })

      let stdout = '', stderr = ''
      child.stdout?.on('data', d => stdout += d)
      child.stderr?.on('data', d => stderr += d)
      child.on('close', code => code === 0 ? resolve(stdout.trim()) : reject(new Error(`Exit ${code}: ${stderr}`)))
      child.on('error', reject)

      impl.options?.inputMethod === 'stdin' && child.stdin?.write(JSON.stringify(test.input)) && child.stdin?.end()
    })

  /**
   * Get test cases to run based on options
   */
  private getTestCasesToRun = (options: ConformanceRunnerOptions): ConformanceTestCase[] =>
    Array.from(this.testCases.values())
      .filter(tc => !options.testCases?.length || options.testCases.includes(tc.id))
      .filter(tc => !options.categories?.length || options.categories.includes(tc.category))

  /**
   * Save report to file
   */
  private saveReport = (report: ConformanceReport, outputDir: string): void => {
    !existsSync(outputDir) && mkdirSync(outputDir, { recursive: true })

    const jsonPath = join(outputDir, 'conformance-report.json')
    const mdPath = join(outputDir, 'conformance-report.md')
    
    writeFileSync(jsonPath, JSON.stringify(report, null, 2))
    writeFileSync(mdPath, this.reporter.generateMarkdownReport(report))

    console.log(`Reports saved:\n  JSON: ${jsonPath}\n  Markdown: ${mdPath}`)
  }

  /**
   * Get available test cases
   */
  getTestCases = (): ConformanceTestCase[] => Array.from(this.testCases.values())
  getImplementations = (): ImplementationConfig[] => this.registry.getAllImplementations()
}