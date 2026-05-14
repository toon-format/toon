import type { TokenizerAdapter, TokenizerName } from '../types.ts'
import { spawn } from 'node:child_process'
import { join } from 'node:path'

export function createHFTokenizer(modelId: string, name: TokenizerName): TokenizerAdapter {
  return {
    name,
    async count(text: string): Promise<number> {
      return new Promise((resolve, reject) => {
        const python = spawn('python3', [
          join(import.meta.dirname, 'hf_tokenizer.py'),
          '--model',
          modelId,
        ])

        let output = ''

        python.stdout.on('data', (data) => {
          output += data.toString()
        })

        python.stderr.on('data', (data) => {
          const msg = data.toString()
          if (!msg.includes('Token indices sequence length')) {
            console.error(`[${name}] error:`, msg.trim())
          }
        })

        python.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Python process exited with code ${code}`))
            return
          }
          const result = JSON.parse(output)
          resolve(result.count)
        })

        python.stdin.write(JSON.stringify({ text }))
        python.stdin.end()
      })
    },
  }
}
