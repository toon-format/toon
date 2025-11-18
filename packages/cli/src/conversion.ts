import type { DecodeOptions, EncodeOptions } from '../../toon/src'
import type { InputSource } from './types'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { consola } from 'consola'
import { estimateTokenCount } from 'tokenx'
import { decode, encode } from '../../toon/src'
import { formatInputLabel, readInput } from './utils'

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

  const toonOutput = encode(data, encodeOptions)

  if (config.output) {
    await fsp.writeFile(config.output, toonOutput, 'utf-8')
    const relativeInputPath = formatInputLabel(config.input)
    const relativeOutputPath = path.relative(process.cwd(), config.output)
    consola.success(`Encoded \`${relativeInputPath}\` → \`${relativeOutputPath}\``)
  }
  else {
    console.log(toonOutput)
  }

  if (config.printStats) {
    const jsonTokens = estimateTokenCount(jsonContent)
    const toonTokens = estimateTokenCount(toonOutput)
    const diff = jsonTokens - toonTokens
    const percent = ((diff / jsonTokens) * 100).toFixed(1)

    console.log()
    consola.info(`Token estimates: ~${jsonTokens} (JSON) → ~${toonTokens} (TOON)`)
    consola.success(`Saved ~${diff} tokens (-${percent}%)`)
  }
}

export async function decodeToJson(config: {
  input: InputSource
  output?: string
  indent: NonNullable<DecodeOptions['indent']>
  strict: NonNullable<DecodeOptions['strict']>
  expandPaths?: NonNullable<DecodeOptions['expandPaths']>
}): Promise<void> {
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

  const jsonOutput = JSON.stringify(data, undefined, config.indent)

  if (config.output) {
    await fsp.writeFile(config.output, jsonOutput, 'utf-8')
    const relativeInputPath = formatInputLabel(config.input)
    const relativeOutputPath = path.relative(process.cwd(), config.output)
    consola.success(`Decoded \`${relativeInputPath}\` → \`${relativeOutputPath}\``)
  }
  else {
    console.log(jsonOutput)
  }
}

/**
 * Read binary input from file or stdin
 */
export async function readBinaryInput(source: InputSource): Promise<Uint8Array> {
  if (source.type === 'stdin') {
    // For binary stdin, we need to read raw bytes
    const { stdin } = process

    if (stdin.readableEnded) {
      return new Uint8Array(0)
    }

    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = []

      const onData = (chunk: any) => {
        chunks.push(new Uint8Array(chunk))
      }

      function cleanup() {
        stdin.off('data', onData)
        stdin.off('error', onError)
        stdin.off('end', onEnd)
      }

      function onError(error: Error) {
        cleanup()
        reject(error)
      }

      function onEnd() {
        cleanup()
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
        const result = new Uint8Array(totalLength)
        let offset = 0
        for (const chunk of chunks) {
          result.set(chunk, offset)
          offset += chunk.length
        }
        resolve(result)
      }

      // Read in binary mode (no encoding)
      stdin.setRawMode?.(true)
      stdin.on('data', onData)
      stdin.once('error', onError)
      stdin.once('end', onEnd)
      stdin.resume()
    })
  }
  else {
    return fsp.readFile(source.path)
  }
}

/**
 * Encode JSON to binary TOON format
 */
export async function encodeToBinaryToon(config: {
  input: InputSource
  output?: string
  delimiter: NonNullable<import('../../toon/src/binary/binary-types').BinaryEncodeOptions['delimiter']>
  keyFolding?: NonNullable<import('../../toon/src/binary/binary-types').BinaryEncodeOptions['keyFolding']>
  flattenDepth?: number
}): Promise<void> {
  const jsonContent = await readInput(config.input)

  let data: unknown
  try {
    data = JSON.parse(jsonContent)
  }
  catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`)
  }

  const { encodeBinary } = await import('../../toon/src')

  const binaryOutput = encodeBinary(data, {
    delimiter: config.delimiter,
    keyFolding: config.keyFolding,
    flattenDepth: config.flattenDepth,
  })

  if (config.output) {
    await fsp.writeFile(config.output, binaryOutput)
    const relativeInputPath = formatInputLabel(config.input)
    const relativeOutputPath = path.relative(process.cwd(), config.output)
    consola.success(`Encoded \`${relativeInputPath}\` → \`${relativeOutputPath}\` (binary)`)
  }
  else {
    // For binary output to stdout, we can't just console.log
    // Instead, write directly to stdout as binary
    process.stdout.write(binaryOutput)
  }
}

/**
 * Decode binary TOON format to JSON
 */
export async function decodeBinaryToonToJson(config: {
  input: InputSource
  output?: string
  indent: NonNullable<DecodeOptions['indent']>
  strict: NonNullable<import('../../toon/src/binary/binary-types').BinaryDecodeOptions['strict']>
  expandPaths?: NonNullable<import('../../toon/src/binary/binary-types').BinaryDecodeOptions['expandPaths']>
}): Promise<void> {
  const binaryContent = await readBinaryInput(config.input)

  let data: unknown
  try {
    const { decodeBinary } = await import('../../toon/src')
    data = decodeBinary(binaryContent, {
      strict: config.strict,
      expandPaths: config.expandPaths,
    })
  }
  catch (error) {
    throw new Error(`Failed to decode binary TOON: ${error instanceof Error ? error.message : String(error)}`)
  }

  const jsonOutput = JSON.stringify(data, undefined, config.indent)

  if (config.output) {
    await fsp.writeFile(config.output, jsonOutput, 'utf-8')
    const relativeInputPath = formatInputLabel(config.input)
    const relativeOutputPath = path.relative(process.cwd(), config.output)
    consola.success(`Decoded \`${relativeInputPath}\` → \`${relativeOutputPath}\` (from binary)`)
  }
  else {
    console.log(jsonOutput)
  }
}
