import type { TokenizerAdapter } from '../types.ts'
import { get_encoding } from 'tiktoken'

const encoder = get_encoding('cl100k_base')

export const claudeTokenizer: TokenizerAdapter = {
  name: 'claude-cl100k',
  async count(text: string): Promise<number> {
    return encoder.encode(text).length
  },
}
