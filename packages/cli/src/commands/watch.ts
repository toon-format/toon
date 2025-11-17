import type { CommandDef } from 'citty'
import * as path from 'node:path'
import process from 'node:process'
import chokidar from 'chokidar'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { DEFAULT_DELIMITER, DELIMITERS, type Delimiter } from '../../../toon/src'
import { encodeToToon, decodeToJson } from '../conversion'
import { validateDelimiter, validateEnum, validateNumber } from '../shared/validation'

export const watchCommand: CommandDef = defineCommand({
  meta: {
    name: 'watch',
    description: 'Watch files or directories for changes and auto-convert',
  },
  args: {
    input: {
      type: 'positional',
      description: 'Input file or directory pattern to watch',
      required: true,
    },
    output: {
      type: 'string',
      description: 'Output directory or file pattern',
      alias: 'o',
      required: true,
    },
    format: {
      type: 'string',
      description: 'Target format: toon or json (default: toon)',
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
      description: 'Show token statistics for each conversion',
      default: false,
    },
    verbose: {
      type: 'boolean',
      description: 'Show detailed processing information',
      alias: 'v',
      default: false,
    },
    ignore: {
      type: 'string',
      description: 'Glob patterns to ignore (comma-separated)',
    },
  },
  async run({ args }) {
    const inputPattern = path.resolve(args.input as string)
    const outputPattern = path.resolve(args.output as string)
    
    // Consolidated validation with smart defaults
    const format = validateEnum(args.format, ['toon', 'json'], 'format', 'toon') as 'toon' | 'json'
    const delimiter = validateDelimiter(args.delimiter, DEFAULT_DELIMITER)
    const indent = validateNumber(args.indent, 'indent', 2)
    const keyFolding = validateEnum(args.keyFolding, ['off', 'safe'], 'keyFolding', 'off') as 'off' | 'safe'
    
    const ignorePatterns = args.ignore ? 
      (args.ignore as string).split(',').map(p => p.trim()).filter(Boolean) :
      ['node_modules/**', '.git/**', '**/*.min.js', '**/*.map']
    
    if (args.verbose) {
      consola.info(`Watching: ${inputPattern}`)
      consola.info(`Output: ${outputPattern}`)
      consola.info(`Format: ${format}`)
      consola.info(`Ignoring: ${ignorePatterns.join(', ')}`)
    }
    
    // Start watching
    const watcher = chokidar.watch(inputPattern, {
      ignored: ignorePatterns,
      persistent: true,
      ignoreInitial: false,
    })
    
    consola.info(`📁 Watching for ${format === 'toon' ? 'JSON' : 'TOON'} files...`)
    consola.info('Press Ctrl+C to stop watching')
    
    let processing = false
    
    watcher.on('add', async (filePath) => {
      await handleFileChange(filePath, 'added', {
        format: format as 'toon' | 'json',
        outputPattern,
        delimiter: delimiter as any,
        indent,
        keyFolding: keyFolding as 'off' | 'safe',
        strict: args.strict as boolean,
        stats: args.stats as boolean,
        verbose: args.verbose as boolean,
      })
    })
    
    watcher.on('change', async (filePath) => {
      if (processing) return
      processing = true
      
      try {
        await handleFileChange(filePath, 'changed', {
          format: format as 'toon' | 'json',
          outputPattern,
          delimiter: delimiter as any,
          indent,
          keyFolding: keyFolding as 'off' | 'safe',
          strict: args.strict as boolean,
          stats: args.stats as boolean,
          verbose: args.verbose as boolean,
        })
      } finally {
        processing = false
      }
    })
    
    watcher.on('unlink', (filePath) => {
      if (args.verbose) {
        consola.info(`🗑️  File removed: ${path.relative(process.cwd(), filePath)}`)
      }
    })
    
    watcher.on('error', (error) => {
      consola.error(`Watch error: ${error}`)
    })
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      consola.info('\\n⏹️  Stopping file watcher...')
      watcher.close().then(() => {
        consola.success('👋 File watcher stopped')
        process.exit(0)
      })
    })
    
    // Keep the process alive
    return new Promise(() => {})
  },
})

async function handleFileChange(
  filePath: string,
  action: 'added' | 'changed',
  options: {
    format: 'toon' | 'json'
    outputPattern: string
    delimiter: any
    indent: number
    keyFolding: 'off' | 'safe'
    strict: boolean
    stats: boolean
    verbose: boolean
  }
): Promise<void> {
  try {
    // Determine if this file should be processed
    const fileExt = path.extname(filePath).toLowerCase()
    const expectedExt = options.format === 'toon' ? '.json' : '.toon'
    
    if (fileExt !== expectedExt) {
      if (options.verbose) {
        consola.debug(`Skipping ${filePath} (expected ${expectedExt} files)`)
      }
      return
    }
    
    // Generate output path
    const relativePath = path.relative(process.cwd(), filePath)
    const outputExt = options.format === 'toon' ? '.toon' : '.json'
    const outputPath = generateOutputPath(filePath, options.outputPattern, outputExt)
    
    const actionIcon = action === 'added' ? '📄' : '🔄'
    const formatIcon = options.format === 'toon' ? '→' : '←'
    
    if (options.verbose) {
      consola.info(`${actionIcon} Processing: ${relativePath} ${formatIcon} ${options.format.toUpperCase()}`)
    }
    
    // Convert the file
    if (options.format === 'toon') {
      await encodeToToon({
        input: { type: 'file', path: filePath },
        output: outputPath,
        delimiter: options.delimiter,
        indent: options.indent,
        keyFolding: options.keyFolding,
        flattenDepth: undefined,
        printStats: options.stats,
        verbose: options.verbose,
      })
    } else {
      await decodeToJson({
        input: { type: 'file', path: filePath },
        output: outputPath,
        indent: options.indent,
        strict: options.strict,
        expandPaths: 'off',
        verbose: options.verbose,
      })
    }
    
  } catch (error) {
    const relativePath = path.relative(process.cwd(), filePath)
    consola.error(`Failed to process ${relativePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function generateOutputPath(inputPath: string, outputPattern: string, outputExt: string): string {
  const inputName = path.basename(inputPath, path.extname(inputPath))
  
  // If output pattern is a directory, place the file there with the same name
  if (outputPattern.endsWith('/') || outputPattern.endsWith('\\\\')) {
    return path.join(outputPattern, inputName + outputExt)
  }
  
  // If output pattern contains wildcards or variables, replace them
  if (outputPattern.includes('*') || outputPattern.includes('{name}')) {
    return outputPattern
      .replace(/\*+/g, inputName)
      .replace(/\{name\}/g, inputName)
      .replace(/\{ext\}/g, outputExt.slice(1))
  }
  
  // Otherwise, use it as a direct path or treat as directory
  try {
    const fs = require('node:fs')
    const stat = fs.statSync(outputPattern)
    if (stat.isDirectory()) {
      return path.join(outputPattern, inputName + outputExt)
    }
  } catch {
    // Output pattern is not an existing directory, treat as file pattern
  }
  
  return path.join(path.dirname(outputPattern), inputName + outputExt)
}

