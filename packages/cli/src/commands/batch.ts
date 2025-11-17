import type { CommandDef } from 'citty'
import type { Delimiter } from '../../../toon/src'
import * as fs from 'node:fs'
import * as fsp from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import process from 'node:process'
import cliProgress from 'cli-progress'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { glob } from 'glob'
import pLimit from 'p-limit'
import { DEFAULT_DELIMITER, DELIMITERS } from '../../../toon/src'
import { encodeToToon, decodeToJson } from '../conversion'
import { validateDelimiter, validateEnum, validateNumber } from '../shared/validation'

interface BatchJobState {
  completed: string[]
  failed: Array<{ file: string; error: string }>
  skipped: string[]
}

export const batchCommand: CommandDef = defineCommand({
  meta: {
    name: 'batch',
    description: 'Process multiple files or directories recursively',
  },
  args: {
    input: {
      type: 'positional',
      description: 'Input glob pattern (e.g., "src/**/*.json")',
      required: true,
    },
    output: {
      type: 'string',
      description: 'Output directory or pattern',
      alias: 'o',
      required: true,
    },
    format: {
      type: 'string',
      description: 'Target format: toon or json',
      default: 'toon',
    },
    delimiter: {
      type: 'string',
      description: 'Delimiter for arrays: comma (,), tab (\\t), or pipe (|)',
      default: ',',
    },
    indent: {
      type: 'string',
      description: 'Indentation size',
      default: '2',
    },
    keyFolding: {
      type: 'string',
      description: 'Key folding mode: off, safe (default: off)',
      default: 'off',
    },
    strict: {
      type: 'boolean',
      description: 'Enable strict mode for decoding',
      default: true,
    },
    stats: {
      type: 'boolean',
      description: 'Show token statistics summary',
      default: false,
    },
    verbose: {
      type: 'boolean',
      description: 'Show detailed processing information',
      alias: 'v',
      default: false,
    },
    parallel: {
      type: 'string',
      description: 'Number of parallel processes (default: CPU cores)',
    },
    progress: {
      type: 'boolean',
      description: 'Show progress bar',
      default: true,
    },
    dryRun: {
      type: 'boolean',
      description: 'Preview changes without writing files',
      default: false,
    },
    resume: {
      type: 'string',
      description: 'Resume from state file',
    },
    saveState: {
      type: 'string',
      description: 'Save progress to state file for resuming',
    },
    overwrite: {
      type: 'boolean',
      description: 'Overwrite existing output files',
      default: false,
    },
  },
  async run({ args }) {
    // Consolidated validation with smart defaults
    const format = validateEnum(args.format, ['toon', 'json'], 'format', 'toon') as 'toon' | 'json'
    const delimiter = validateDelimiter(args.delimiter, DEFAULT_DELIMITER)
    const indent = validateNumber(args.indent, 'indent', 2)
    const keyFolding = validateEnum(args.keyFolding, ['off', 'safe'], 'keyFolding', 'off') as 'off' | 'safe'
    
    // Set up parallelism
    const cpuCount = os.cpus().length
    const parallelLimit = args.parallel ? 
      Math.max(1, Number.parseInt(args.parallel, 10)) : 
      Math.min(cpuCount, 4) // Reasonable default
    
    if (args.verbose) {
      consola.info(`Parallel limit: ${parallelLimit}`)
    }
    
    const limit = pLimit(parallelLimit)
    
    // Load or initialize state
    let state: BatchJobState = {
      completed: [],
      failed: [],
      skipped: [],
    }
    
    if (args.resume) {
      try {
        const stateContent = await fsp.readFile(args.resume, 'utf-8')
        state = JSON.parse(stateContent)
        consola.info(`📂 Resuming from state file: ${args.resume}`)
        consola.info(`Already completed: ${state.completed.length} files`)
        consola.info(`Previously failed: ${state.failed.length} files`)
      } catch (error) {
        consola.warn(`Could not load state file: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    
    // Find input files
    consola.info(`🔍 Finding files matching: ${args.input}`)
    const inputFiles = await glob(args.input, {
      ignore: ['node_modules/**', '.git/**', '**/*.min.js', '**/*.map'],
    })
    
    if (inputFiles.length === 0) {
      consola.error('No files found matching the input pattern')
      process.exit(1)
    }
    
    // Filter out already completed files if resuming
    const remainingFiles = args.resume ? 
      inputFiles.filter(file => !state.completed.includes(file)) :
      inputFiles
    
    consola.success(`Found ${inputFiles.length} files${args.resume ? ` (${remainingFiles.length} remaining)` : ''}`)
    
    if (args.dryRun) {
      consola.info('[DRY RUN] Would process the following files:')
      remainingFiles.slice(0, 10).forEach(file => {
        const relativePath = path.relative(process.cwd(), file)
        const outputPath = generateOutputPath(file, args.output, args.format === 'toon' ? '.toon' : '.json')
        const relativeOutput = path.relative(process.cwd(), outputPath)
        console.log(`  ${relativePath} → ${relativeOutput}`)
      })
      if (remainingFiles.length > 10) {
        console.log(`  ... and ${remainingFiles.length - 10} more files`)
      }
      process.exit(0)
    }
    
    // Set up progress bar
    let progressBar: cliProgress.SingleBar | null = null
    if (args.progress && remainingFiles.length > 1) {
      progressBar = new cliProgress.SingleBar({
        format: 'Progress |{bar}| {percentage}% | {value}/{total} | {filename}',
        barCompleteChar: '█',
        barIncompleteChar: '░',
        hideCursor: true,
      })
      progressBar.start(remainingFiles.length, 0)
    }
    
    // Process files
    const startTime = Date.now()
    let totalTokensSaved = 0
    let totalFilesProcessed = 0
    
    const tasks = remainingFiles.map(inputFile => 
      limit(async () => {
        try {
          const outputPath = generateOutputPath(inputFile, args.output, args.format === 'toon' ? '.toon' : '.json')
          
          // Check if output exists and overwrite is disabled
          if (!args.overwrite) {
            try {
              await fsp.access(outputPath)
              state.skipped.push(inputFile)
              if (args.verbose) {
                const relativePath = path.relative(process.cwd(), inputFile)
                consola.debug(`Skipped (exists): ${relativePath}`)
              }
              return
            } catch {
              // File doesn't exist, continue processing
            }
          }
          
          // Process the file
          if (args.format === 'toon') {
            await encodeToToon({
              input: { type: 'file', path: inputFile },
              output: outputPath,
              delimiter: delimiter as Delimiter,
              indent,
              keyFolding: keyFolding as 'off' | 'safe',
              flattenDepth: undefined,
              printStats: false, // We'll handle stats globally
              verbose: false, // Suppress individual file verbose output
            })
          } else {
            await decodeToJson({
              input: { type: 'file', path: inputFile },
              output: outputPath,
              indent,
              strict: args.strict,
              expandPaths: 'off',
              verbose: false,
            })
          }
          
          state.completed.push(inputFile)
          totalFilesProcessed++
          
          if (progressBar) {
            const filename = path.basename(inputFile)
            progressBar.increment({ filename })
          } else if (args.verbose) {
            const relativePath = path.relative(process.cwd(), inputFile)
            consola.success(`Processed: ${relativePath}`)
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          state.failed.push({ file: inputFile, error: errorMessage })
          
          if (args.verbose) {
            const relativePath = path.relative(process.cwd(), inputFile)
            consola.error(`Failed: ${relativePath} - ${errorMessage}`)
          }
          
          if (progressBar) {
            progressBar.increment({ filename: `ERROR: ${path.basename(inputFile)}` })
          }
        }
        
        // Save state periodically
        if (args.saveState && (state.completed.length + state.failed.length) % 10 === 0) {
          await saveState(args.saveState, state)
        }
      })
    )
    
    await Promise.all(tasks)
    
    if (progressBar) {
      progressBar.stop()
    }
    
    // Final state save
    if (args.saveState) {
      await saveState(args.saveState, state)
    }
    
    // Summary
    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000
    
    console.log()
    consola.success(`✅ Batch processing complete in ${duration.toFixed(1)}s`)
    consola.info(`📊 Processed: ${state.completed.length} files`)
    if (state.skipped.length > 0) {
      consola.info(`⏭️  Skipped: ${state.skipped.length} files (already exist)`)
    }
    if (state.failed.length > 0) {
      consola.warn(`❌ Failed: ${state.failed.length} files`)
      if (args.verbose) {
        state.failed.forEach(({ file, error }) => {
          const relativePath = path.relative(process.cwd(), file)
          consola.error(`  ${relativePath}: ${error}`)
        })
      }
    }
    
    if (state.failed.length > 0) {
      process.exit(1)
    }
    
    process.exit(0)
  },
})

function generateOutputPath(inputPath: string, outputPattern: string, outputExt: string): string {
  const inputName = path.basename(inputPath, path.extname(inputPath))
  
  // If output pattern contains wildcards or variables, replace them
  if (outputPattern.includes('*') || outputPattern.includes('{name}') || outputPattern.includes('{dir}')) {
    return outputPattern
      .replace(/\*+/g, inputName)
      .replace(/\{name\}/g, inputName)
      .replace(/\{dir\}/g, path.dirname(inputPath))
      .replace(/\{ext\}/g, outputExt.slice(1))
  }
  
  // Check if output pattern is an existing directory
  try {
    const stat = fs.statSync(outputPattern)
    if (stat.isDirectory()) {
      // Place file directly in the output directory with correct extension
      return path.join(outputPattern, inputName + outputExt)
    }
  } catch {
    // Output pattern doesn't exist - check if it looks like a file or directory
  }
  
  // If output pattern has an extension, treat it as a single file (only works with one input)
  if (path.extname(outputPattern)) {
    return outputPattern
  }
  
  // Otherwise, treat as directory pattern
  return path.join(outputPattern, inputName + outputExt)
}

async function saveState(stateFile: string, state: BatchJobState): Promise<void> {
  try {
    await fsp.mkdir(path.dirname(stateFile), { recursive: true })
    await fsp.writeFile(stateFile, JSON.stringify(state, null, 2), 'utf-8')
  } catch (error) {
    consola.warn(`Could not save state: ${error instanceof Error ? error.message : String(error)}`)
  }
}

