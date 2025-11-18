import type { InputSource } from './types'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'

export function detectMode(
  input: InputSource,
  encodeFlag?: boolean,
  decodeFlag?: boolean,
  binaryFlag?: boolean,
): 'encode' | 'decode' | 'encode_binary' | 'decode_binary' {
  // Explicit flags take precedence
  if (encodeFlag && binaryFlag)
    return 'encode_binary'
  if (encodeFlag)
    return 'encode'
  if (decodeFlag && binaryFlag)
    return 'decode_binary'
  if (decodeFlag)
    return 'decode'

  // Auto-detect based on file extension
  if (input.type === 'file') {
    if (input.path.endsWith('.json'))
      return encodeFlag || binaryFlag ? (binaryFlag ? 'encode_binary' : 'encode') : 'encode'
    if (input.path.endsWith('.toon.bin') || binaryFlag)
      return 'decode_binary'
    if (input.path.endsWith('.toon'))
      return decodeFlag || binaryFlag ? (binaryFlag ? 'decode_binary' : 'decode') : 'decode'
  }

  // Default to encode
  return binaryFlag ? 'encode_binary' : 'encode'
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
