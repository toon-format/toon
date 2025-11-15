import type { DecodeOptions, EncodeOptions } from '../../toon/src'
import type { InputSource } from './types'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { consola } from 'consola'
import { estimateTokenCount } from 'tokenx'
import { decode, decodeJsonl, encode, encodeJsonl } from '../../toon/src'
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

export async function encodeJsonlToToon(config: {
  input: InputSource
  output?: string
  indent: NonNullable<EncodeOptions['indent']>
  delimiter: NonNullable<EncodeOptions['delimiter']>
  keyFolding?: NonNullable<EncodeOptions['keyFolding']>
  flattenDepth?: number
  printStats: boolean
}): Promise<void> {
  const jsonlContent = await readInput(config.input)

  let data: unknown[]
  try {
    // Parse standard JSONL (JSON objects separated by newlines)
    const lines = jsonlContent.trim().split('\n').filter(line => line.trim())
    data = lines.map(line => JSON.parse(line.trim()))
  }
  catch (error) {
    throw new Error(`Failed to parse JSONL: ${error instanceof Error ? error.message : String(error)}`)
  }

  const encodeOptions: EncodeOptions = {
    delimiter: config.delimiter,
    indent: config.indent,
    keyFolding: config.keyFolding,
    flattenDepth: config.flattenDepth,
  }

  // Convert each JSON object to TOON and join with --- separators
  const toonOutput = encodeJsonl(data, encodeOptions)

  if (config.output) {
    await fsp.writeFile(config.output, toonOutput, 'utf-8')
    const relativeInputPath = formatInputLabel(config.input)
    const relativeOutputPath = path.relative(process.cwd(), config.output)
    consola.success(`Encoded JSONL \`${relativeInputPath}\` → \`${relativeOutputPath}\` (TOON)`)
  }
  else {
    console.log(toonOutput)
  }

  if (config.printStats) {
    const jsonlTokens = estimateTokenCount(jsonlContent)
    const toonTokens = estimateTokenCount(toonOutput)
    const diff = jsonlTokens - toonTokens
    const percent = ((diff / jsonlTokens) * 100).toFixed(1)

    console.log()
    consola.info(`Token estimates: ~${jsonlTokens} (JSONL) → ~${toonTokens} (TOON)`)
    consola.success(`Saved ~${diff} tokens (-${percent}%)`)
  }
}

export async function decodeToonToJsonl(config: {
  input: InputSource
  output?: string
  indent: NonNullable<DecodeOptions['indent']>
  strict: NonNullable<DecodeOptions['strict']>
  expandPaths?: NonNullable<DecodeOptions['expandPaths']>
  encodeOptions?: EncodeOptions
}): Promise<void> {
  const toonContent = await readInput(config.input)

  let data: unknown[]
  try {
    const decodeOptions: DecodeOptions = {
      indent: config.indent,
      strict: config.strict,
      expandPaths: config.expandPaths,
    }
    data = decodeJsonl(toonContent, decodeOptions)
  }
  catch (error) {
    throw new Error(`Failed to decode TOON: ${error instanceof Error ? error.message : String(error)}`)
  }

  // Convert the array of objects to JSONL format
  const jsonlOutput = data.map(obj => JSON.stringify(obj)).join('\n')

  if (config.output) {
    await fsp.writeFile(config.output, jsonlOutput, 'utf-8')
    const relativeInputPath = formatInputLabel(config.input)
    const relativeOutputPath = path.relative(process.cwd(), config.output)
    consola.success(`Decoded TOON \`${relativeInputPath}\` → \`${relativeOutputPath}\` (JSONL)`)
  }
  else {
    console.log(jsonlOutput)
  }
}
