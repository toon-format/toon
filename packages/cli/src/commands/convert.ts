import type { CommandDef } from 'citty'
import type { DecodeOptions, Delimiter, EncodeOptions } from '../../../toon/src'
import type { InputSource } from '../types'
import * as path from 'node:path'
import process from 'node:process'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { DEFAULT_DELIMITER, DELIMITERS } from '../../../toon/src'
import { decodeToJson, encodeToToon } from '../conversion'
import { detectMode } from '../utils'
import { validateDelimiter, validateEnum, validateNumber } from '../shared/validation'

export const convertCommand: CommandDef = defineCommand({
  meta: {
    name: 'convert',
    description: 'Convert between JSON and TOON formats (default command)',
  },
  args: {
    input: {
      type: 'positional',
      description: 'Input file path (omit or use "-" to read from stdin)',
      required: false,
    },
    output: {
      type: 'string',
      description: 'Output file path',
      alias: 'o',
    },
    encode: {
      type: 'boolean',
      description: 'Encode JSON to TOON (auto-detected by default)',
      alias: 'e',
    },
    decode: {
      type: 'boolean',
      description: 'Decode TOON to JSON (auto-detected by default)',
      alias: 'd',
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
    strict: {
      type: 'boolean',
      description: 'Enable strict mode for decoding',
      default: true,
    },
    keyFolding: {
      type: 'string',
      description: 'Enable key folding: off, safe (default: off)',
      default: 'off',
    },
    flattenDepth: {
      type: 'string',
      description: 'Maximum folded segment count when key folding is enabled (default: Infinity)',
    },
    expandPaths: {
      type: 'string',
      description: 'Enable path expansion: off, safe (default: off)',
      default: 'off',
    },
    stats: {
      type: 'boolean',
      description: 'Show token statistics',
      default: false,
    },
    dryRun: {
      type: 'boolean',
      description: 'Preview changes without writing files (use --dryRun=true)',
      default: false,
    },
    verbose: {
      type: 'boolean',
      description: 'Show detailed processing information',
      alias: 'v',
      default: false,
    },
  },
  async run({ args }) {
    const input = args.input

    const inputSource: InputSource = !input || input === '-'
      ? { type: 'stdin' }
      : { type: 'file', path: path.resolve(input as string) }
    const outputPath = args.output ? path.resolve(args.output as string) : undefined

    // Consolidated validation with smart defaults
    const indent = validateNumber(args.indent, 'indent', 2)
    const delimiter = validateDelimiter(args.delimiter, DEFAULT_DELIMITER)
    const keyFolding = validateEnum(args.keyFolding, ['off', 'safe'], 'keyFolding', 'off') as 'off' | 'safe'
    const expandPaths = validateEnum(args.expandPaths, ['off', 'safe'], 'expandPaths', 'off') as 'off' | 'safe'
    const flattenDepth = args.flattenDepth ? validateNumber(args.flattenDepth, 'flattenDepth') : undefined

    const mode = detectMode(inputSource, args.encode as boolean, args.decode as boolean)

    if (args.verbose) {
      consola.info(`Mode: ${mode}`)
      consola.info(`Input: ${inputSource.type === 'stdin' ? 'stdin' : inputSource.path}`)
      consola.info(`Output: ${outputPath || 'stdout'}`)
      consola.info(`Args dryRun: ${args.dryRun}`)
      if (args.dryRun) {
        consola.info('Dry run mode - no files will be written')
      }
    }

    try {
      if (mode === 'encode') {
        await encodeToToon({
          input: inputSource,
          output: outputPath,
          delimiter: delimiter as Delimiter,
          indent,
          keyFolding,
          flattenDepth,
          printStats: Boolean(args.stats),
          dryRun: Boolean(args.dryRun),
          verbose: Boolean(args.verbose),
        })
      }
      else {
        await decodeToJson({
          input: inputSource,
          output: outputPath,
          indent,
          strict: args.strict !== false,
          expandPaths,
          dryRun: Boolean(args.dryRun),
          verbose: Boolean(args.verbose),
        })
      }
    }
    catch (error) {
      consola.error(error)
      process.exit(1)
    }
    
    // Ensure process exits after successful completion
    process.exit(0)
  },
})

