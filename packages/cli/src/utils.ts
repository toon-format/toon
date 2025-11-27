import type { InputSource } from './types'
import { createReadStream } from 'node:fs'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'

export function detectMode(
  input: InputSource,
  encodeFlag?: boolean,
  decodeFlag?: boolean,
): 'encode' | 'decode' {
  // Explicit flags take precedence
  if (encodeFlag)
    return 'encode'
  if (decodeFlag)
    return 'decode'

  // Auto-detect based on file extension
  if (input.type === 'file') {
    if (input.path.endsWith('.json'))
      return 'encode'
    if (input.path.endsWith('.toon'))
      return 'decode'
  }

  // Default to encode
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

export async function* readLinesFromSource(source: InputSource): AsyncIterable<string> {
  const stream = source.type === 'stdin'
    ? process.stdin
    : createReadStream(source.path, { encoding: 'utf-8' })

  // Explicitly set encoding for stdin
  if (source.type === 'stdin') {
    stream.setEncoding('utf-8')
  }

  let buffer = ''

  for await (const chunk of stream) {
    buffer += chunk
    let index: number

    while ((index = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, index)
      buffer = buffer.slice(index + 1)
      yield line
    }
  }

  // Emit last line if buffer is not empty and doesn't end with newline
  if (buffer.length > 0) {
    yield buffer
  }
}
