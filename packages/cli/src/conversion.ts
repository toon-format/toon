import type { FileHandle } from 'node:fs/promises'
import type { DecodeOptions, DecodeStreamOptions, EncodeOptions } from '../../toon/src/index.ts'
import type { InputSource } from './types.ts'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { estimateTokenCount } from 'tokenx'
import { CliError, log } from 'utilful/cli'
import { decodeStream, encode, encodeLines } from '../../toon/src/index.ts'
import { jsonStreamFromEvents } from './json-from-events.ts'
import { formatInputLabel, readInput, readLinesFromSource } from './utils.ts'

export async function encodeToToon(config: {
  input: InputSource
  output?: string
  indentSize: NonNullable<EncodeOptions['indentSize']>
  delimiter: NonNullable<EncodeOptions['delimiter']>
  shouldPrintStats: boolean
}): Promise<void> {
  const jsonContent = await readInput(config.input)

  let data: unknown
  try {
    data = JSON.parse(jsonContent)
  }
  catch (error) {
    throw new CliError(`Failed to parse JSON: ${Error.isError(error) ? error.message : String(error)}`, { cause: error })
  }

  const encodeOptions: EncodeOptions = {
    delimiter: config.delimiter,
    indentSize: config.indentSize,
  }

  // When printing stats, we need the full string for token counting.
  if (config.shouldPrintStats) {
    const toonOutput = encode(data, encodeOptions)

    if (config.output) {
      await fsp.writeFile(config.output, `${toonOutput}\n`, 'utf-8')
    }
    else {
      console.log(toonOutput)
    }

    const jsonTokens = estimateTokenCount(jsonContent)
    const toonTokens = estimateTokenCount(toonOutput)
    const diff = jsonTokens - toonTokens
    const percent = ((diff / jsonTokens) * 100).toFixed(1)

    if (config.output) {
      const relativeInputPath = formatInputLabel(config.input)
      const relativeOutputPath = path.relative(process.cwd(), config.output)
      log.success(`Encoded \`${relativeInputPath}\` → \`${relativeOutputPath}\``)
    }

    log.info(`Token estimates: ~${jsonTokens} (JSON) → ~${toonTokens} (TOON)`)
    log.success(`Saved ~${diff} tokens (-${percent}%)`)
  }
  else {
    await writeStream(encodeLines(data, encodeOptions), { outputPath: config.output, separator: '\n' })

    if (config.output) {
      const relativeInputPath = formatInputLabel(config.input)
      const relativeOutputPath = path.relative(process.cwd(), config.output)
      log.success(`Encoded \`${relativeInputPath}\` → \`${relativeOutputPath}\``)
    }
  }
}

export async function decodeToJson(config: {
  input: InputSource
  output?: string
  indentSize: NonNullable<DecodeOptions['indentSize']>
  strict: NonNullable<DecodeOptions['strict']>
}): Promise<void> {
  const lineSource = readLinesFromSource(config.input, config.strict)

  const decodeStreamOptions: DecodeStreamOptions = {
    indentSize: config.indentSize,
    strict: config.strict,
  }

  const events = decodeStream(lineSource, decodeStreamOptions)
  const jsonChunks = jsonStreamFromEvents(events, config.indentSize)

  await writeStream(jsonChunks, { outputPath: config.output, separator: '' })

  if (config.output) {
    const relativeInputPath = formatInputLabel(config.input)
    const relativeOutputPath = path.relative(process.cwd(), config.output)
    log.success(`Decoded \`${relativeInputPath}\` → \`${relativeOutputPath}\``)
  }
}

async function writeStream(
  pieces: AsyncIterable<string> | Iterable<string>,
  options: { outputPath?: string, separator: string },
): Promise<void> {
  const { outputPath, separator } = options
  let fileHandle: FileHandle | undefined

  try {
    if (outputPath)
      fileHandle = await fsp.open(outputPath, 'w')

    const handle = fileHandle
    const write = handle
      ? (text: string) => handle.write(text)
      : (text: string) => { process.stdout.write(text) }

    let isFirst = true
    for await (const piece of pieces) {
      if (!isFirst && separator)
        await write(separator)

      await write(piece)
      isFirst = false
    }

    await write('\n')
  }
  finally {
    await fileHandle?.close()
  }
}
