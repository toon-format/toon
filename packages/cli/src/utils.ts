import type { InputSource } from './types'
import { readFile } from 'node:fs/promises'
import { relative, basename } from 'node:path'
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
  return source.type === 'stdin' ? readFromStdin() : readFile(source.path, 'utf-8')
}

export function formatInputLabel(source: InputSource): string {
  if (source.type === 'stdin') return 'stdin'
  const relativePath = relative(process.cwd(), source.path)
  return relativePath || basename(source.path)
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
