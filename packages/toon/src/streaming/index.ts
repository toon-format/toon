import type { DecodeOptions, EncodeOptions, JsonValue } from '../types'
import { encode, decode } from '../index'

/**
 * Process JSON string chunks and convert them to TOON format
 */
export async function* streamEncodeGenerator(
  input: AsyncIterable<string>,
  options?: EncodeOptions
): AsyncGenerator<string> {
  let buffer = ''
  
  for await (const chunk of input) {
    buffer += chunk
    
    while (buffer) {
      const end = findJsonEnd(buffer)
      if (end === -1) break
      
      try {
        yield encode(JSON.parse(buffer.slice(0, end + 1)), options)
        buffer = buffer.slice(end + 1).trimStart()
      } catch {
        break
      }
    }
  }
  
  if (buffer.trim()) {
    yield encode(JSON.parse(buffer), options)
  }
}

// Find end of first complete JSON object
function findJsonEnd(str: string): number {
  let depth = 0, inStr = false, escape = false
  
  for (let i = 0; i < str.length; i++) {
    const c = str[i]
    
    if (escape) {
      escape = false
    } else if (c === '\\' && inStr) {
      escape = true
    } else if (c === '"') {
      inStr = !inStr
    } else if (!inStr) {
      if (c === '{') depth++
      else if (c === '}' && --depth === 0) return i
    }
  }
  return -1
}

/**
 * Process TOON string chunks and convert them to JSON format
 */
export async function* streamDecodeGenerator(
  input: AsyncIterable<string>,
  options?: DecodeOptions
): AsyncGenerator<JsonValue> {
  let buffer = ''
  
  for await (const chunk of input) {
    const parts = (buffer + chunk).split('---')
    
    for (const doc of parts.slice(0, -1)) {
      if (doc.trim()) yield decode(doc, options)
    }
    
    buffer = parts.at(-1) || ''
  }
  
  if (buffer.trim()) yield decode(buffer, options)
}

/**
 * Batch encode multiple JSON values to TOON format
 */
export const batchEncode = (values: JsonValue[], options?: EncodeOptions, sep = '---'): string =>
  values.map(v => encode(v, options)).join(`\n${sep}\n`)

/**
 * Batch decode multiple TOON documents to JSON values  
 */
export const batchDecode = (toon: string, options?: DecodeOptions, sep = '---'): JsonValue[] =>
  toon.split(sep).map(d => d.trim()).filter(Boolean).map(d => decode(d, options))
