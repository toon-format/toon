import type { InputSource } from './types.ts'
import { createReadStream } from 'node:fs'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { CliError } from 'utilful/cli'

export function detectMode(
  input: InputSource,
  encodeFlag?: boolean,
  decodeFlag?: boolean,
): 'encode' | 'decode' {
  if (encodeFlag)
    return 'encode'
  if (decodeFlag)
    return 'decode'

  if (input.type === 'file') {
    if (input.path.endsWith('.json'))
      return 'encode'
    if (input.path.endsWith('.toon'))
      return 'decode'
  }

  return 'encode'
}

export async function readInput(source: InputSource): Promise<string> {
  if (source.type === 'stdin')
    return readFromStdin()

  return fsp.readFile(source.path, 'utf-8')
}

export function formatInputLabel(source: InputSource): string {
  if (source.type === 'stdin')
    return 'stdin'

  const relativePath = path.relative(process.cwd(), source.path)
  return relativePath || path.basename(source.path)
}

function readFromStdin(): Promise<string> {
  const { stdin } = process

  if (stdin.readableEnded)
    return Promise.resolve('')

  return new Promise((resolve, reject) => {
    let data = ''

    const onData = (chunk: string) => {
      data += chunk
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
      resolve(data)
    }

    stdin.setEncoding('utf-8')
    stdin.on('data', onData)
    stdin.once('error', onError)
    stdin.once('end', onEnd)
    stdin.resume()
  })
}

export async function* readLinesFromSource(source: InputSource, strict: boolean): AsyncIterable<string> {
  const stream = source.type === 'stdin'
    ? process.stdin
    : createReadStream(source.path)

  // Node's own string decoding substitutes U+FFFD, which a strict decoder MUST NOT do.
  const decoder = new TextDecoder('utf-8', { fatal: strict })
  let buffer = ''

  for await (const chunk of stream) {
    buffer += decodeUtf8(decoder, chunk as Uint8Array)
    let index: number

    while ((index = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, index)
      buffer = buffer.slice(index + 1)
      yield line
    }
  }

  buffer += decodeUtf8(decoder)

  if (buffer.length > 0) {
    yield buffer
  }
}

function decodeUtf8(decoder: TextDecoder, chunk?: Uint8Array): string {
  try {
    return chunk === undefined ? decoder.decode() : decoder.decode(chunk, { stream: true })
  }
  catch {
    throw new CliError('Input is not valid UTF-8. Pass --no-strict to replace ill-formed bytes')
  }
}
