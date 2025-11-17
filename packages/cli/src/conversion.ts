import type { DecodeOptions, EncodeOptions } from '../../toon/src'
import type { InputSource } from './types'
import { writeFile } from 'node:fs/promises'
import { relative } from 'node:path'
import process from 'node:process'
import { consola } from 'consola'
import { estimateTokenCount } from 'tokenx'
import { decode, encode } from '../../toon/src'
import { formatInputLabel, readInput } from './utils'

export async function encodeToToon(config: {
  input: InputSource
  output?: string
  indent: number
  delimiter: EncodeOptions['delimiter']
  keyFolding?: EncodeOptions['keyFolding']
  flattenDepth?: number
  printStats: boolean
  dryRun?: boolean
  verbose?: boolean
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

  if (config.verbose) {
    consola.info(`Generated TOON output (${toonOutput.length} characters)`)
    consola.info(`Dry run mode: ${config.dryRun}`)
  }

  if (config.output) {
    const relativeInputPath = formatInputLabel(config.input)
    const relativeOutputPath = relative(process.cwd(), config.output)
    
    if (config.dryRun) {
      consola.info(`[DRY RUN] Would encode \`${relativeInputPath}\` → \`${relativeOutputPath}\``)
      if (config.verbose) {
        showPreview(toonOutput)
      }
    } else {
      await writeFile(config.output, toonOutput, 'utf-8')
      consola.success(`Encoded \`${relativeInputPath}\` → \`${relativeOutputPath}\``)
    }
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
  indent: number
  strict: boolean
  expandPaths?: DecodeOptions['expandPaths']
  dryRun?: boolean
  verbose?: boolean
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

  if (config.verbose) {
    consola.info(`Generated JSON output (${jsonOutput.length} characters)`)
  }

  if (config.output) {
    const relativeInputPath = formatInputLabel(config.input)
    const relativeOutputPath = relative(process.cwd(), config.output)
    
    if (config.dryRun) {
      consola.info(`[DRY RUN] Would decode \`${relativeInputPath}\` → \`${relativeOutputPath}\``)
      if (config.verbose) {
        showPreview(jsonOutput)
      }
    } else {
      await writeFile(config.output, jsonOutput, 'utf-8')
      consola.success(`Decoded \`${relativeInputPath}\` → \`${relativeOutputPath}\``)
    }
  }
  else {
    console.log(jsonOutput)
  }
}

// Helper functions for output formatting
function showPreview(content: string): void {
  console.log('\n--- Preview of output ---')
  console.log(content.slice(0, 500) + (content.length > 500 ? '\n...(truncated)' : ''))
}
