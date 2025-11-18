import type { CommandDef } from 'citty'
import type { DecodeOptions, Delimiter, EncodeOptions } from '../../toon/src'
import type { InputSource } from './types'
import * as path from 'node:path'
import process from 'node:process'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { DEFAULT_DELIMITER, DELIMITERS } from '../../toon/src'
import { name, version } from '../package.json' with { type: 'json' }
import { decodeBinaryToonToJson, decodeToJson, encodeToBinaryToon, encodeToToon } from './conversion'
import { detectMode } from './utils'

export const mainCommand: CommandDef<{
  input: {
    type: 'positional'
    description: string
    required: false
  }
  output: {
    type: 'string'
    description: string
    alias: string
  }
  encode: {
    type: 'boolean'
    description: string
    alias: string
  }
  decode: {
    type: 'boolean'
    description: string
    alias: string
  }
  delimiter: {
    type: 'string'
    description: string
    default: string
  }
  indent: {
    type: 'string'
    description: string
    default: string
  }
  strict: {
    type: 'boolean'
    description: string
    default: true
  }
  keyFolding: {
    type: 'string'
    description: string
    default: string
  }
  flattenDepth: {
    type: 'string'
    description: string
  }
  expandPaths: {
    type: 'string'
    description: string
    default: string
  }
  stats: {
    type: 'boolean'
    description: string
    default: false
  }
  binary: {
    type: 'boolean'
    description: 'Output binary TOON format (vs text TOON)'
    default: false
  }
}> = defineCommand({
  meta: {
    name,
    description: 'TOON CLI — Convert between JSON and TOON formats',
    version,
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
    binary: {
      type: 'boolean',
      description: 'Output binary TOON format (vs text TOON)',
      default: false,
    },
  },
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

    const mode = detectMode(inputSource, args.encode, args.decode, args.binary)

    try {
      if (mode === 'encode_binary') {
        await encodeToBinaryToon({
          input: inputSource,
          output: outputPath,
          delimiter: delimiter as Delimiter,
          keyFolding: keyFolding as NonNullable<import('../../toon/src/binary/binary-types').BinaryEncodeOptions['keyFolding']>,
          flattenDepth,
        })
      }
      else if (mode === 'encode') {
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
      else if (mode === 'decode_binary') {
        await decodeBinaryToonToJson({
          input: inputSource,
          output: outputPath,
          indent,
          strict: args.strict !== false,
          expandPaths: expandPaths as NonNullable<import('../../toon/src/binary/binary-types').BinaryDecodeOptions['expandPaths']>,
        })
      }
      else if (mode === 'decode') {
        await decodeToJson({
          input: inputSource,
          output: outputPath,
          indent,
          strict: args.strict !== false,
          expandPaths: expandPaths as NonNullable<DecodeOptions['expandPaths']>,
        })
      }
      else {
        throw new Error(`Unknown mode: ${mode}`)
      }
    }
    catch (error) {
      consola.error(error)
      process.exit(1)
    }
  },
})
