// tokenizer-comparison/types.ts

export type TokenizerName
  = | 'gpt-o200k'
    | 'claude-cl100k'
    | 'llama-3.1'
    | 'mistral-7b'
    | 'qwen-2.5'
    | 'gemma-2'
    | 'phi-3'

export type FormatName = 'json-pretty' | 'json-compact' | 'toon' | 'yaml' | 'xml'

export interface TokenizerAdapter {
  name: TokenizerName
  count: (text: string) => Promise<number>
}

export interface TokenizerFormatResult {
  tokenizer: TokenizerName
  format: FormatName
  dataset: string
  tokenCount: number
}

export interface BootstrapResult {
  tokenizer: TokenizerName
  format: FormatName
  dataset: string
  mean: number
  std: number
  ci95Low: number
  ci95High: number
  runs: number
}

export interface DatasetComparisonResult {
  dataset: string
  results: TokenizerFormatResult[]
  bootstrap?: BootstrapResult[]
}
