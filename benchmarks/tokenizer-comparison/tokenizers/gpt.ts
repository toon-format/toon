import type { TokenizerAdapter } from '../types.ts'
import { encode } from 'gpt-tokenizer'

export const gptTokenizer: TokenizerAdapter = {
  name: 'gpt-o200k',
  async count(text: string): Promise<number> {
    return encode(text).length
  },
}
