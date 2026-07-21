/**
 * Type definitions for TOON test fixtures
 *
 * @remarks
 * Matches the JSON schema at https://github.com/toon-format/spec/blob/main/tests/fixtures.schema.json.
 */

export interface TestCase {
  name: string
  input: unknown
  expected: unknown
  shouldError?: boolean
  options?: {
    delimiter?: ',' | '\t' | '|'
    indentSize?: number
    strict?: boolean
  }
  specSection?: string
  note?: string
  minSpecVersion?: string
}

export interface Fixtures {
  version: string
  category: 'encode' | 'decode'
  description: string
  tests: TestCase[]
}
