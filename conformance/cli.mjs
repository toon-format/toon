#!/usr/bin/env node

/**
 * CLI entry point for TOON cross-language conformance testing
 */

import * as path from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { ConformanceRunner } from './dist/src/runner.js'

const main = async () => {
  const { values: options } = parseArgs({
    args: process.argv.slice(2),
    options: {
      impl: { type: 'string', multiple: true, short: 'i' },
      category: { type: 'string', multiple: true, short: 'c' },
      test: { type: 'string', multiple: true, short: 't' },
      report: { type: 'boolean', short: 'r' },
      output: { type: 'string', short: 'o' },
      'fail-fast': { type: 'boolean' },
      verbose: { type: 'boolean', short: 'v' },
      timeout: { type: 'string' },
      parallel: { type: 'string' },
      help: { type: 'boolean', short: 'h' }
    }
  })

  if (options.help) {
    console.log(`TOON Conformance Testing\n\nUsage: conformance [options]\n\nOptions:\n  -i, --impl <name>     Test implementation\n  -c, --category <cat>  Test category (basic|edge-cases|optimization)\n  -t, --test <id>       Test specific case\n  -r, --report          Generate reports\n  -o, --output <dir>    Output directory\n  --fail-fast           Stop on failure\n  -v, --verbose         Verbose output\n  --timeout <ms>        Timeout (default: 10000)\n  -h, --help            Show help`)
    return
  }

  try {
    const rootDir = path.dirname(fileURLToPath(import.meta.url))
    const [{ ImplementationRegistry }, { OutputComparator }, { ReportGenerator }] = await Promise.all([
      import('./dist/src/registry.js'),
      import('./dist/src/comparator.js'),
      import('./dist/src/reporter.js')
    ])
    
    const runner = new ConformanceRunner(
      new ImplementationRegistry(path.join(rootDir, 'implementations')),
      new OutputComparator(),
      new ReportGenerator(),
      path.join(rootDir, 'test-cases')
    )

    const report = await runner.run({
      implementations: options.impl,
      categories: options.category,
      testCases: options.test,
      generateReport: options.report,
      outputDir: options.output || './conformance-results',
      failFast: options['fail-fast'],
      verbose: options.verbose,
      timeout: options.timeout ? +options.timeout : 10000
    })

    const { summary, implementations, failures } = report
    
    console.log(`\n=== TOON Conformance Test Results ===`)
    console.log(`Total Tests: ${summary.testsRun}`)
    console.log(`Passed: ${summary.testsPassed}`)
    console.log(`Failed: ${summary.testsFailed}`)
    console.log(`Pass Rate: ${summary.passRate.toFixed(1)}%`)

    console.log('\nImplementation Results:')
    implementations.forEach(impl => 
      console.log(`  ${impl.displayName}: ${impl.passRate.toFixed(1)}% (${impl.testsPassed}/${impl.testsRun}) ${impl.isConformant ? 'CONFORMANT' : 'NON-CONFORMANT'}`)
    )

    failures.length && (
      console.log(`\nFailed Tests: ${failures.length}`),
      failures.slice(0, options.verbose ? failures.length : Math.min(5, failures.length)).forEach(f => 
        console.log(options.verbose 
          ? `\n--- ${f.testName} (${f.implementation}) ---\n${f.error ? `Error: ${f.error}` : `Expected:\n${f.expected}\n\nActual:\n${f.actual}`}`
          : `  - ${f.testName} (${f.implementation})`
        )
      ),
      !options.verbose && failures.length > 5 && console.log(`  ... and ${failures.length - 5} more (use --verbose for details)`)
    )

    process.exit(summary.testsFailed > 0 ? 1 : 0)

  } catch (error) {
    console.error('Error running conformance tests:', error)
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})