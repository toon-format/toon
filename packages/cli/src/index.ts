import type { ArgsDef, CommandDef, RunMainOptions } from 'utilful/cli'
import type { Delimiter } from '../../toon/src/index.ts'
import type { InputSource } from './types.ts'
import * as path from 'node:path'
import { CliError, commonArgs, defineCommand } from 'utilful/cli'
import { DEFAULT_DELIMITER, ToonDecodeError } from '../../toon/src/index.ts'
import { assertValidDelimiter } from '../../toon/src/shared/validation.ts'
import pkg from '../package.json' with { type: 'json' }
import { decodeToJson, encodeToToon } from './conversion.ts'
import { formatDecodeError } from './format-error.ts'
import { detectMode } from './utils.ts'

const { name, version } = pkg

interface ConvertArgs extends ArgsDef {
  input: { type: 'positional', description: string, required: false }
  output: { type: 'string', description: string, alias: string }
  encode: { type: 'boolean', description: string, alias: string }
  decode: { type: 'boolean', description: string, alias: string }
  delimiter: { type: 'string', description: string, default: string }
  indent: { type: 'string', description: string, default: string }
  strict: { type: 'boolean', description: string, default: true }
  stats: { type: 'boolean', description: string }
}

const args: ConvertArgs = {
  ...commonArgs,
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
    description: 'Delimiter for rows and inline arrays: comma (,), tab (\\t), or pipe (|)',
    default: ',',
  },
  indent: {
    type: 'string',
    description: 'Indentation size',
    default: '2',
  },
  strict: {
    type: 'boolean',
    description: 'Strict decode validation (disable with --no-strict)',
    default: true,
  },
  stats: {
    type: 'boolean',
    description: 'Show token statistics',
  },
}

export const cliOptions: RunMainOptions = {
  expectedErrors: [ToonDecodeError],
  describe: error => error instanceof ToonDecodeError && error.line !== undefined
    ? formatDecodeError(error)
    : undefined,
}

export const mainCommand: CommandDef<ConvertArgs> = defineCommand({
  meta: {
    name,
    description: 'TOON CLI – Convert between JSON and TOON',
    version,
  },
  args,
  async run({ args }) {
    const input = args.input

    const inputSource: InputSource = !input || input === '-'
      ? { type: 'stdin' }
      : { type: 'file', path: path.resolve(input) }
    const outputPath = args.output ? path.resolve(args.output) : undefined

    const indentSize = Number.parseInt(args.indent || '2', 10)
    if (Number.isNaN(indentSize) || indentSize < 0) {
      throw new CliError(`Invalid indent value: ${args.indent}`)
    }

    const delimiter = args.delimiter || DEFAULT_DELIMITER
    assertDelimiter(delimiter)

    const mode = detectMode(inputSource, args.encode, args.decode)

    if (mode === 'encode') {
      await encodeToToon({
        input: inputSource,
        output: outputPath,
        delimiter,
        indentSize,
        shouldPrintStats: args.stats,
      })
    }
    else {
      await decodeToJson({
        input: inputSource,
        output: outputPath,
        indentSize,
        strict: args.strict,
      })
    }
  },
})

/**
 * The library reports a bad delimiter as a `TypeError`, which the boundary would
 * read as a defect rather than as the flag value the user chose.
 */
function assertDelimiter(delimiter: string): asserts delimiter is Delimiter {
  try {
    assertValidDelimiter(delimiter)
  }
  catch (error) {
    throw new CliError(Error.isError(error) ? error.message : String(error), { cause: error })
  }
}
