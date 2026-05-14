import { describe, expect, it } from 'vitest'
import { encode } from '../../../../packages/toon/src/index.ts'
import { parsePlaygroundInput, stringifyPlaygroundYaml } from './parse-input.ts'

describe('parsePlaygroundInput', () => {
  it('parses JSON objects', () => {
    expect(parsePlaygroundInput('{"a":1}', 'json')).toEqual({ a: 1 })
  })

  it('parses YAML mappings to the same structure as equivalent JSON', () => {
    const yaml = 'a: 1\nb:\n  c: hello'
    const json = '{"a":1,"b":{"c":"hello"}}'
    expect(parsePlaygroundInput(yaml, 'yaml')).toEqual(parsePlaygroundInput(json, 'json'))
  })

  it('stringify + parse round-trips for preset-shaped data', () => {
    const value = { users: [{ id: 1, name: 'Ada' }] }
    const yaml = stringifyPlaygroundYaml(value)
    expect(parsePlaygroundInput(yaml, 'yaml')).toEqual(value)
  })

  it('produces the same TOON output for YAML as for equivalent JSON', () => {
    const yaml = `items:
  - x: 1
    y: 2
  - x: 3
    y: 4`
    const json = '{"items":[{"x":1,"y":2},{"x":3,"y":4}]}'
    const fromYaml = parsePlaygroundInput(yaml, 'yaml')
    const fromJson = parsePlaygroundInput(json, 'json')
    expect(encode(fromYaml)).toBe(encode(fromJson))
  })

  it('throws on invalid JSON', () => {
    expect(() => parsePlaygroundInput('{', 'json')).toThrow()
  })

  it('throws on invalid YAML', () => {
    expect(() => parsePlaygroundInput('[\n', 'yaml')).toThrow()
  })

  it('throws on duplicate mapping keys', () => {
    expect(() => parsePlaygroundInput('a: 1\na: 2', 'yaml')).toThrow()
  })
})
