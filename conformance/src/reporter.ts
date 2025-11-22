/**
 * Report generation for TOON conformance testing results
 */

import type { 
  ConformanceReport, 
  TestResult, 
  ImplementationConfig, 
  ConformanceTestCase,
  ImplementationResult,
  CategoryResult,
  TestFailure 
} from './types.js'

export class ReportGenerator {
  /**
   * Generate comprehensive conformance report
   */
  generateReport = (
    results: TestResult[],
    implementations: ImplementationConfig[],
    testCases: ConformanceTestCase[],
    totalExecutionTime: number
  ): ConformanceReport => {
    const testsPassed = results.filter(r => r.passed).length
    const testsRun = results.length
    
    return {
      timestamp: new Date().toISOString(),
      specVersion: '2.0',
      totalTests: testCases.length,
      totalImplementations: implementations.length,
      summary: {
        testsRun,
        testsPassed,
        testsFailed: testsRun - testsPassed,
        passRate: testsRun ? (testsPassed / testsRun) * 100 : 0
      },
      implementations: this.generateImplementationResults(results, implementations),
      categories: this.generateCategoryResults(results, testCases),
      failures: this.generateFailureDetails(results, testCases)
    }
  }

  /**
   * Generate per-implementation results
   */
  private generateImplementationResults = (results: TestResult[], implementations: ImplementationConfig[]): ImplementationResult[] =>
    implementations.map(impl => {
      const implResults = results.filter(r => r.implementation === impl.name)
      const testsPassed = implResults.filter(r => r.passed).length
      const testsRun = implResults.length
      
      return {
        name: impl.name,
        displayName: impl.displayName,
        language: impl.language,
        version: impl.version,
        testsRun,
        testsPassed,
        testsFailed: testsRun - testsPassed,
        passRate: testsRun ? (testsPassed / testsRun) * 100 : 0,
        averageExecutionTime: testsRun ? implResults.reduce((sum, r) => sum + r.executionTime, 0) / testsRun : 0,
        isConformant: testsPassed === testsRun
      }
    })

  /**
   * Generate per-category results
   */
  private generateCategoryResults = (results: TestResult[], testCases: ConformanceTestCase[]): CategoryResult[] => {
    const categories = [...new Set(testCases.map(tc => tc.category))]
    
    return categories.map(category => {
      const testIds = new Set(testCases.filter(tc => tc.category === category).map(tc => tc.id))
      const catResults = results.filter(r => testIds.has(r.testId))
      const totalPassed = catResults.filter(r => r.passed).length
      
      return {
        category,
        totalTests: testIds.size,
        totalPassed,
        totalFailed: catResults.length - totalPassed,
        passRate: catResults.length ? (totalPassed / catResults.length) * 100 : 0
      }
    })
  }

  /**
   * Generate failure details
   */
  private generateFailureDetails = (results: TestResult[], testCases: ConformanceTestCase[]): TestFailure[] => {
    const testMap = new Map(testCases.map(tc => [tc.id, tc]))
    
    return results
      .filter(r => !r.passed)
      .map(r => ({
        testId: r.testId,
        testName: testMap.get(r.testId)?.name ?? 'Unknown',
        implementation: r.implementation,
        expected: r.expectedOutput,
        actual: r.actualOutput,
        diff: this.generateSimpleDiff(r.expectedOutput, r.actualOutput),
        error: r.error
      }))
  }

  /**
   * Generate simple diff
   */
  private generateSimpleDiff = (expected: string, actual: string): string => {
    const expLines = expected.split('\n')
    const actLines = actual.split('\n')
    const maxLines = Math.max(expLines.length, actLines.length)
    
    return Array.from({ length: maxLines }, (_, i) => {
      const exp = expLines[i] ?? ''
      const act = actLines[i] ?? ''
      return exp !== act ? [`@@ Line ${i + 1} @@`, `-${exp}`, `+${act}`] : null
    })
      .filter(Boolean)
      .flat()
      .join('\n')
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport = (report: ConformanceReport): string => {
    const lines: string[] = [
      '# TOON Cross-Language Conformance Report',
      '',
      `**Generated:** ${new Date(report.timestamp).toLocaleString()}`,
      `**TOON Spec Version:** ${report.specVersion}`,
      `**Total Test Cases:** ${report.totalTests}`,
      `**Total Implementations:** ${report.totalImplementations}`,
      '',
      '## Summary',
      '',
      `- **Tests Run:** ${report.summary.testsRun}`,
      `- **Tests Passed:** ${report.summary.testsPassed}`,
      `- **Tests Failed:** ${report.summary.testsFailed}`,
      `- **Overall Pass Rate:** ${report.summary.passRate.toFixed(1)}%`,
      '',
      '## Implementation Results',
      '',
      '| Implementation | Language | Version | Tests | Passed | Failed | Pass Rate | Avg Time (ms) | Conformant |',
      '|---|---|---|---|---|---|---|---|---|'
    ]
    
    for (const impl of report.implementations) {
      const conformantStatus = impl.isConformant ? 'YES' : 'NO'
      lines.push(
        `| ${impl.displayName} | ${impl.language} | ${impl.version} | ` +
        `${impl.testsRun} | ${impl.testsPassed} | ${impl.testsFailed} | ` +
        `${impl.passRate.toFixed(1)}% | ${impl.averageExecutionTime.toFixed(1)} | ${conformantStatus} |`
      )
    }
    lines.push('')

    // Category Results
    lines.push('## Results by Category')
    lines.push('')
    lines.push('| Category | Total Tests | Passed | Failed | Pass Rate |')
    lines.push('|---|---|---|---|---|')
    
    for (const category of report.categories) {
      lines.push(
        `| ${category.category} | ${category.totalTests} | ${category.totalPassed} | ` +
        `${category.totalFailed} | ${category.passRate.toFixed(1)}% |`
      )
    }
    lines.push('')

    // Failures (if any)
    if (report.failures.length > 0) {
      lines.push('## Failed Tests')
      lines.push('')
      
      for (const failure of report.failures) {
        lines.push(`### ${failure.testName} (${failure.implementation})`)
        lines.push('')
        
        if (failure.error) {
          lines.push(`**Error:** ${failure.error}`)
          lines.push('')
        }
        
        lines.push('**Expected:**')
        lines.push('```')
        lines.push(failure.expected)
        lines.push('```')
        lines.push('')
        
        lines.push('**Actual:**')
        lines.push('```')
        lines.push(failure.actual)
        lines.push('```')
        lines.push('')
        
        if (failure.diff) {
          lines.push('**Diff:**')
          lines.push('```diff')
          lines.push(failure.diff)
          lines.push('```')
          lines.push('')
        }
      }
    }

    // Recommendations
    lines.push('## Recommendations')
    lines.push('')
    
    const nonConformantImplementations = report.implementations.filter((impl: ImplementationResult) => !impl.isConformant)
    if (nonConformantImplementations.length > 0) {
      lines.push('**Non-conformant implementations that need attention:**')
      for (const impl of nonConformantImplementations) {
        lines.push(`- **${impl.displayName}** (${impl.language}): ${impl.testsFailed} failing tests`)
      }
      lines.push('')
    }
    
    const lowPassRateCategories = report.categories.filter((cat: CategoryResult) => cat.passRate < 90)
    if (lowPassRateCategories.length > 0) {
      lines.push('**Test categories with low pass rates:**')
      for (const category of lowPassRateCategories) {
        lines.push(`- **${category.category}**: ${category.passRate.toFixed(1)}% pass rate`)
      }
      lines.push('')
    }
    
    if (nonConformantImplementations.length === 0 && lowPassRateCategories.length === 0) {
      lines.push('**All implementations are fully conformant!**')
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * Generate console summary
   */
  generateConsoleSummary = (report: ConformanceReport): string => {
    const lines = [
      '\n=== TOON Conformance Test Results ===',
      `Total Tests: ${report.summary.testsRun}`,
      `Passed: ${report.summary.testsPassed}`,
      `Failed: ${report.summary.testsFailed}`,
      `Pass Rate: ${report.summary.passRate.toFixed(1)}%`,
      '',
      'Implementation Results:',
      ...report.implementations.map(impl => 
        `  ${impl.displayName}: ${impl.passRate.toFixed(1)}% (${impl.testsPassed}/${impl.testsRun}) ${impl.isConformant ? 'CONFORMANT' : 'NON-CONFORMANT'}`
      ),
      ...(report.failures.length ? [
        '',
        `Failed Tests: ${report.failures.length}`,
        ...report.failures.slice(0, 5).map(f => `  - ${f.testName} (${f.implementation})`),
        ...(report.failures.length > 5 ? [`  ... and ${report.failures.length - 5} more`] : [])
      ] : [])
    ]
    
    return lines.join('\n')
  }
}