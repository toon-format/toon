import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

/**
 * Input language for the Playground editor. TOON encodes the JSON data model
 * (SPEC); the encoder normalizes parsed values (e.g. dates, bigint) accordingly.
 */
export type PlaygroundInputFormat = 'json' | 'yaml'

const YAML_PARSE_OPTIONS = {
  merge: false,
  version: '1.2',
} as const

const YAML_STRINGIFY_OPTIONS = {
  indent: 2,
  lineWidth: 120,
  version: '1.2',
} as const

export function parsePlaygroundInput(text: string, format: PlaygroundInputFormat): unknown {
  if (format === 'json')
    return JSON.parse(text)
  return parseYaml(text, YAML_PARSE_OPTIONS)
}

/** Serialize a value as YAML for editor display (YAML 1.2, merge keys off). */
export function stringifyPlaygroundYaml(value: unknown): string {
  return stringifyYaml(value, YAML_STRINGIFY_OPTIONS)
}
