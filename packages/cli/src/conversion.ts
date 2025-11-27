import type { FileHandle } from 'node:fs/promises'
import type { DecodeOptions, DecodeStreamOptions, EncodeOptions } from '../../toon/src'
import type { InputSource } from './types'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { consola } from 'consola'
import { estimateTokenCount } from 'tokenx'
import { decode, decodeStream, encode, encodeLines } from '../../toon/src'
import { jsonStreamFromEvents } from './json-from-events'
import { jsonStringifyLines } from './json-stringify-stream'
import { formatInputLabel, readInput, readLinesFromSource } from './utils'

export async function encodeToToon(config: {
  input: InputSource
  output?: string
  indent: NonNullable<EncodeOptions['indent']>
  delimiter: NonNullable<EncodeOptions['delimiter']>
  keyFolding?: NonNullable<EncodeOptions['keyFolding']>
  flattenDepth?: number
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
    keyFolding: config.keyFolding,
    flattenDepth: config.flattenDepth,
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
    await writeStreamingToon(encodeLines(data, encodeOptions), config.output)

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
  expandPaths?: NonNullable<DecodeOptions['expandPaths']>
}): Promise<void> {
  // Path expansion requires full value in memory, so use non-streaming path
  if (config.expandPaths === 'safe') {
    const toonContent = await readInput(config.input)

    let data: unknown
    try {
      const decodeOptions: DecodeOptions = {
        indent: config.indent,
        strict: config.strict,
        expandPaths: config.expandPaths,
      }
      data = decode(toonContent, decodeOptions)
    }
    catch (error) {
      throw new Error(`Failed to decode TOON: ${error instanceof Error ? error.message : String(error)}`)
    }

    await writeStreamingJson(jsonStringifyLines(data, config.indent), config.output)
  }
  else {
    try {
      const lineSource = readLinesFromSource(config.input)

      const decodeStreamOptions: DecodeStreamOptions = {
        indent: config.indent,
        strict: config.strict,
      }

      const events = decodeStream(lineSource, decodeStreamOptions)
      const jsonChunks = jsonStreamFromEvents(events, config.indent)

      await writeStreamingJson(jsonChunks, config.output)
    }
    catch (error) {
      throw new Error(`Failed to decode TOON: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (config.output) {
    const relativeInputPath = formatInputLabel(config.input)
    const relativeOutputPath = path.relative(process.cwd(), config.output)
    consola.success(`Decoded \`${relativeInputPath}\` → \`${relativeOutputPath}\``)
  }
}

/**
 * Writes JSON chunks to a file or stdout using streaming approach.
 * Chunks are written one at a time without building the full string in memory.
 */
async function writeStreamingJson(
  chunks: AsyncIterable<string> | Iterable<string>,
  outputPath?: string,
): Promise<void> {
  // Stream to file using fs/promises API
  if (outputPath) {
    let fileHandle: FileHandle | undefined

    try {
      fileHandle = await fsp.open(outputPath, 'w')

      for await (const chunk of chunks) {
        await fileHandle.write(chunk)
      }
    }
    finally {
      await fileHandle?.close()
    }
  }
  // Stream to stdout
  else {
    for await (const chunk of chunks) {
      process.stdout.write(chunk)
    }

    // Add final newline for stdout
    process.stdout.write('\n')
  }
}

/**
 * Writes TOON lines to a file or stdout using streaming approach.
 * Lines are written one at a time without building the full string in memory.
 */
async function writeStreamingToon(
  lines: Iterable<string>,
  outputPath?: string,
): Promise<void> {
  let isFirst = true

  // Stream to file using fs/promises API
  if (outputPath) {
    let fileHandle: FileHandle | undefined

    try {
      fileHandle = await fsp.open(outputPath, 'w')

      for (const line of lines) {
        if (!isFirst)
          await fileHandle.write('\n')

        await fileHandle.write(line)
        isFirst = false
      }
    }
    finally {
      await fileHandle?.close()
    }
  }
  // Stream to stdout
  else {
    for (const line of lines) {
      if (!isFirst)
        process.stdout.write('\n')

      process.stdout.write(line)
      isFirst = false
    }

    // Add final newline for stdout
    process.stdout.write('\n')
  }
}
