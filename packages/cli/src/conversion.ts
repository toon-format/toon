import type { FileHandle } from 'node:fs/promises'
import type { DecodeOptions, DecodeStreamOptions, EncodeOptions } from '../../toon/src/index.ts'
import type { InputSource } from './types.ts'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { consola } from 'consola'
import { estimateTokenCount } from 'tokenx'
import { decodeStream, encode, encodeLines } from '../../toon/src/index.ts'
import { jsonStreamFromEvents } from './json-from-events.ts'
import { formatInputLabel, readInput, readLinesFromSource } from './utils.ts'

export async function encodeToToon(config: {
  input: InputSource
  output?: string
  indent: NonNullable<EncodeOptions['indent']>
  delimiter: NonNullable<EncodeOptions['delimiter']>
  printStats: boolean
}): Promise<void> {
  const jsonContent = await readInput(config.input)

  let data: unknown
  try {
    data = JSON.parse(jsonContent)
  }
  catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`)
  }

  const encodeOptions: EncodeOptions = {
    delimiter: config.delimiter,
    indent: config.indent,
  }

  // When printing stats, we need the full string for token counting
  if (config.printStats) {
    const toonOutput = encode(data, encodeOptions)

    if (config.output) {
      await fsp.writeFile(config.output, toonOutput, 'utf-8')
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
      consola.success(`Encoded \`${relativeInputPath}\` → \`${relativeOutputPath}\``)
    }

    console.log()
    consola.info(`Token estimates: ~${jsonTokens} (JSON) → ~${toonTokens} (TOON)`)
    consola.success(`Saved ~${diff} tokens (-${percent}%)`)
  }
  else {
    await writeStream(encodeLines(data, encodeOptions), { outputPath: config.output, separator: '\n' })

    if (config.output) {
      const relativeInputPath = formatInputLabel(config.input)
      const relativeOutputPath = path.relative(process.cwd(), config.output)
      consola.success(`Encoded \`${relativeInputPath}\` → \`${relativeOutputPath}\``)
    }
  }
}

export async function decodeToJson(config: {
  input: InputSource
  output?: string
  indent: NonNullable<DecodeOptions['indent']>
  strict: NonNullable<DecodeOptions['strict']>
}): Promise<void> {
  const lineSource = readLinesFromSource(config.input)

  const decodeStreamOptions: DecodeStreamOptions = {
    indent: config.indent,
    strict: config.strict,
  }

  const events = decodeStream(lineSource, decodeStreamOptions)
  const jsonChunks = jsonStreamFromEvents(events, config.indent)

  await writeStream(jsonChunks, { outputPath: config.output, separator: '' })

  if (config.output) {
    const relativeInputPath = formatInputLabel(config.input)
    const relativeOutputPath = path.relative(process.cwd(), config.output)
    consola.success(`Decoded \`${relativeInputPath}\` → \`${relativeOutputPath}\``)
  }
}

/**
 * Streams pieces to a file or stdout, one at a time without buffering the full string.
 */
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

    // Stdout gets a trailing newline so the shell prompt resumes on a fresh line; files end exactly at content
    if (!outputPath)
      process.stdout.write('\n')
  }
  finally {
    await fileHandle?.close()
  }
}
