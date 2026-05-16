import type { ArgsDef, CommandDef } from 'citty'
import type { DecodeOptions, Delimiter, EncodeOptions } from '../../toon/src/index.ts'
import type { InputSource } from './types.ts'
import * as path from 'node:path'
import process from 'node:process'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { DEFAULT_DELIMITER, DELIMITERS } from '../../toon/src/index.ts'
import pkg from '../package.json' with { type: 'json' }
import { decodeToJson, encodeToToon } from './conversion.ts'
import { formatError } from './format-error.ts'
import { detectMode } from './utils.ts'

const { name, version } = pkg

const args: ArgsDef = {
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
  verbose: {
    type: 'boolean',
    description: 'Show full stack traces and cause chains for errors',
    default: false,
  },
} as const

export const mainCommand: CommandDef<ArgsDef> = defineCommand({
  meta: {
    name,
    description: 'TOON CLI – Convert between JSON and TOON formats',
    version,
  },
  args,
  async run({ args }) {
    const input = args.input

    const inputSource: InputSource = !input || input === '-'
      ? { type: 'stdin' }
      : { type: 'file', path: path.resolve(input) }
    const outputPath = args.output ? path.resolve(args.output) : undefined

    // Parse and validate indent
    const indent = Number.parseInt(args.indent || '2', 10)
    if (Number.isNaN(indent) || indent < 0) {
      throw new Error(`Invalid indent value: ${args.indent}`)
    }

    // Validate delimiter
    const delimiter = args.delimiter || DEFAULT_DELIMITER
    if (!(Object.values(DELIMITERS)).includes(delimiter as Delimiter)) {
      throw new Error(`Invalid delimiter "${delimiter}". Valid delimiters are: comma (,), tab (\\t), pipe (|)`)
    }

    // Validate `keyFolding`
    const keyFolding = args.keyFolding || 'off'
    if (keyFolding !== 'off' && keyFolding !== 'safe') {
      throw new Error(`Invalid keyFolding value "${keyFolding}". Valid values are: off, safe`)
    }

    // Parse and validate `flattenDepth`
    let flattenDepth: number | undefined
    if (args.flattenDepth !== undefined) {
      flattenDepth = Number.parseInt(args.flattenDepth, 10)
      if (Number.isNaN(flattenDepth) || flattenDepth < 0) {
        throw new Error(`Invalid flattenDepth value: ${args.flattenDepth}`)
      }
    }

    // Validate `expandPaths`
    const expandPaths = args.expandPaths || 'off'
    if (expandPaths !== 'off' && expandPaths !== 'safe') {
      throw new Error(`Invalid expandPaths value "${expandPaths}". Valid values are: off, safe`)
    }

    const mode = detectMode(inputSource, args.encode, args.decode)

    try {
      if (mode === 'encode') {
        await encodeToToon({
          input: inputSource,
          output: outputPath,
          delimiter: delimiter as Delimiter,
          indent,
          keyFolding: keyFolding as NonNullable<EncodeOptions['keyFolding']>,
          flattenDepth,
          printStats: args.stats === true,
        })
      }
      else {
        await decodeToJson({
          input: inputSource,
          output: outputPath,
          indent,
          strict: args.strict !== false,
          expandPaths: expandPaths as NonNullable<DecodeOptions['expandPaths']>,
        })
      }
    }
    catch (error) {
      consola.error(formatError(error, { isVerbose: args.verbose === true }))
      process.exit(1)
    }
  },
})
