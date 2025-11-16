#!/usr/bin/env node

/**
 * CodeLens-TOON CLI
 */

import { program } from 'commander'
import fs from 'node:fs'
import path from 'node:path'
import { CodeLens } from './index.js'
import type { AnalysisLevel } from './types/index.js'

const version = '0.1.0'

program
  .name('codelens')
  .description('Hierarchical codebase analysis with TOON output for efficient LLM context')
  .version(version)

program
  .argument('<input>', 'Input file or directory to analyze')
  .option('-l, --level <level>', 'Analysis level (1=overview, 2=signatures, 3=implementations)', '2')
  .option('-o, --output <file>', 'Output file (prints to stdout if omitted)')
  .option('--stats', 'Show token count statistics')
  .action(async (input: string, options) => {
    try {
      const level = Number.parseInt(options.level, 10) as AnalysisLevel

      if (![1, 2, 3].includes(level)) {
        console.error('Error: Level must be 1, 2, or 3')
        process.exit(1)
      }

      const inputPath = path.resolve(input)

      if (!fs.existsSync(inputPath)) {
        console.error(`Error: Input path does not exist: ${inputPath}`)
        process.exit(1)
      }

      const codelens = new CodeLens()

      if (options.stats) {
        console.error('Analyzing codebase...')
      }

      const toonOutput = codelens.analyzePath(inputPath, { level })

      if (options.stats) {
        const tokenEstimate = Math.ceil(toonOutput.length / 4)
        console.error(`\nStatistics:`)
        console.error(`  Characters: ${toonOutput.length}`)
        console.error(`  Estimated tokens: ${tokenEstimate}`)
        console.error(`  Analysis level: L${level}`)
        console.error('')
      }

      if (options.output) {
        const outputPath = path.resolve(options.output)
        fs.writeFileSync(outputPath, toonOutput, 'utf-8')

        if (options.stats) {
          console.error(`Output written to: ${outputPath}`)
        }
      }
      else {
        // Print to stdout
        console.log(toonOutput)
      }
    }
    catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  })

program.parse()
