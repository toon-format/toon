import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_DELIMITER, encode } from '../../toon/src/index.ts'
import { mockStdin, runCli, useTemporaryDirectories } from './utils.ts'

const createDirectory = useTemporaryDirectories()

function readOutput(directory: string, relativePath: string): Promise<string> {
  return fsp.readFile(path.join(directory, relativePath), 'utf-8')
}

describe('toon CLI', () => {
  describe('encode', () => {
    it('encodes JSON from stdin', async () => {
      const data = {
        title: 'TOON test',
        count: 3,
        nested: { ok: true },
      }
      mockStdin(JSON.stringify(data))

      const { stdout } = await runCli([])

      expect(stdout).toBe(`${encode(data)}\n`)
    })

    it('encodes a JSON file into a TOON file', async () => {
      const data = {
        title: 'TOON test',
        count: 3,
        nested: { ok: true },
      }
      const directory = createDirectory({
        'input.json': JSON.stringify(data, undefined, 2),
      })

      const { stderr } = await runCli(['input.json', '--output', 'output.toon'], { cwd: directory })

      const output = await readOutput(directory, 'output.toon')
      const expected = encode(data, {
        delimiter: DEFAULT_DELIMITER,
        indent: 2,
      })

      expect(output).toBe(`${expected}\n`)
      expect(stderr).toMatch(/Encoded .* → .*/)
    })

    it('prints to stdout when --output is not given', async () => {
      const data = { ok: true }
      const directory = createDirectory({
        'input.json': JSON.stringify(data),
      })

      const { stdout } = await runCli(['input.json'], { cwd: directory })

      expect(stdout).toBe(`${encode(data)}\n`)
    })

    it('encodes JSON from stdin into a file', async () => {
      const data = { key: 'value' }
      const directory = createDirectory()
      mockStdin(JSON.stringify(data))

      const { stderr } = await runCli(['--output', 'output.toon'], { cwd: directory })

      expect(await readOutput(directory, 'output.toon')).toBe(`${encode(data)}\n`)
      expect(stderr).toMatch(/Encoded.*stdin[^\n\r\u2028\u2029\u2192]*\u2192.*output\.toon/)
    })

    it('encodes an empty object', async () => {
      const data = {}
      const directory = createDirectory({
        'empty.json': JSON.stringify(data),
      })

      await runCli(['empty.json', '--output', 'output.toon'], { cwd: directory })

      expect(await readOutput(directory, 'output.toon')).toBe(`${encode(data)}\n`)
    })

    it('writes a large JSON input identically to one-shot encoding', async () => {
      const data = {
        items: Array.from({ length: 1000 }, (_, index) => ({
          id: index,
          name: `Item ${index}`,
          value: index / 7,
        })),
      }
      const directory = createDirectory({
        'large-input.json': JSON.stringify(data, undefined, 2),
      })

      const { stderr } = await runCli(['large-input.json', '--output', 'output.toon'], { cwd: directory })

      const expected = encode(data, {
        delimiter: DEFAULT_DELIMITER,
        indent: 2,
      })

      expect(await readOutput(directory, 'output.toon')).toBe(`${expected}\n`)
      expect(stderr).toMatch(/Encoded .* → .*/)
    })
  })

  describe('decode', () => {
    it('decodes a TOON file into a JSON file', async () => {
      const data = {
        items: ['alpha', 'beta'],
        meta: { done: false },
      }
      const directory = createDirectory({
        'input.toon': encode(data),
      })

      const { stderr } = await runCli(['input.toon', '--output', 'output.json'], { cwd: directory })

      expect(JSON.parse(await readOutput(directory, 'output.json'))).toEqual(data)
      expect(stderr).toMatch(/Decoded .* → .*/)
    })

    it('decodes TOON from stdin', async () => {
      const data = { items: ['a', 'b'], count: 2 }
      mockStdin(encode(data))

      const { stdout } = await runCli(['--decode'])

      expect(JSON.parse(stdout)).toEqual(data)
    })

    it('decodes TOON from stdin into a file', async () => {
      const data = { name: 'test', values: [1, 2, 3] }
      const directory = createDirectory()
      mockStdin(encode(data))

      const { stderr } = await runCli(['--decode', '--output', 'output.json'], { cwd: directory })

      expect(JSON.parse(await readOutput(directory, 'output.json'))).toEqual(data)
      expect(stderr).toMatch(/Decoded.*stdin[^\n\r\u2028\u2029\u2192]*\u2192.*output\.json/)
    })

    it('decodes a root number, string and boolean', async () => {
      const cases = [
        ['42', 42],
        ['"Hello World"', 'Hello World'],
        ['true', true],
      ] as const

      for (const [input, expected] of cases) {
        mockStdin(input)

        const { stdout } = await runCli(['--decode'])

        expect(JSON.parse(stdout)).toBe(expected)
      }
    })

    it('writes a large TOON input back to the original JSON', async () => {
      const data = {
        records: Array.from({ length: 1000 }, (_, index) => ({
          id: index,
          title: `Record ${index}`,
          score: index / 3,
        })),
      }
      const directory = createDirectory({
        'large-input.toon': encode(data, {
          delimiter: DEFAULT_DELIMITER,
          indent: 2,
        }),
      })

      const { stderr } = await runCli(['large-input.toon', '--decode', '--output', 'output.json'], { cwd: directory })

      expect(JSON.parse(await readOutput(directory, 'output.json'))).toEqual(data)
      expect(stderr).toMatch(/Decoded .* → .*/)
    })
  })

  describe('options', () => {
    it('encodes with a custom --delimiter', async () => {
      const data = { items: [1, 2, 3] }
      mockStdin(JSON.stringify(data))

      const { stdout } = await runCli(['--delimiter', '|'])

      expect(stdout).toBe(`${encode(data, { delimiter: '|' })}\n`)
    })

    it('encodes with a custom --indent', async () => {
      const data = {
        nested: {
          deep: { value: 1 },
        },
      }
      mockStdin(JSON.stringify(data))

      const { stdout } = await runCli(['--indent', '4'])

      expect(stdout).toBe(`${encode(data, { indent: 4 })}\n`)
    })

    it('indents decoded JSON by --indent', async () => {
      const data = {
        a: 1,
        b: [2, 3],
        c: { nested: true },
      }
      const directory = createDirectory({
        'input.toon': encode(data, { indent: 4 }),
      })

      await runCli(['input.toon', '--decode', '--indent', '4', '--output', 'output.json'], { cwd: directory })

      const output = await readOutput(directory, 'output.json')

      expect(JSON.parse(output)).toEqual(data)
      expect(output).toContain('    ')
    })

    it('accepts tab indentation with --no-strict', async () => {
      // Strict decoding rejects this input, so the flag has to be what admits it.
      mockStdin('a:\n\tb: 1\n')

      const { stdout, exitCode } = await runCli(['--decode', '--no-strict'])

      expect(exitCode).toBe(0)
      expect(JSON.parse(stdout)).toEqual({ a: { b: 1 } })
    })

    it('keeps the last duplicate key with --no-strict', async () => {
      const restoreStdin = mockStdin('name: Ada\nname: Bob\n')

      try {
        const { stdout } = await runCli(['--decode', '--no-strict'])

        // `JSON.parse` would hide a duplicate key, so compare the raw output.
        expect(stdout).toBe('{\n  "name": "Bob"\n}\n')
      }
      finally {
        restoreStdin()
      }
    })

    it('keeps --stats diagnostics off stdout', async () => {
      const data = {
        items: [
          { id: 1, value: 'test' },
          { id: 2, value: 'data' },
        ],
      }
      const directory = createDirectory({
        'input.json': JSON.stringify(data),
      })

      const { stdout, stderr } = await runCli(['input.json', '--stats'], { cwd: directory })

      // Diagnostics stay off stdout so `toon input.json --stats | …` pipes clean data.
      expect(stdout).toBe('items[2]{id,value}:\n  1,test\n  2,data\n')
      expect(stderr).toMatch(/Token estimates:/)
      expect(stderr).toMatch(/Saved.*tokens/)
    })
  })

  describe('error reporting', () => {
    it('rejects invalid JSON from stdin', async () => {
      mockStdin('{ invalid json }')

      const { stderr, exitCode } = await runCli([])

      expect(exitCode).toBe(1)
      expect(stderr).toContain('Failed to parse JSON')
    })

    it('renders a TOON decode error with line context, source, and caret', async () => {
      mockStdin('a:\n\tb: 1\n')

      const { stderr, exitCode } = await runCli(['--decode'])

      expect(exitCode).toBe(1)
      expect(stderr).toContain('Failed to decode TOON at line 2:')
      expect(stderr).toContain('  2 | →b: 1')
      expect(stderr).toContain('      ^')
      expect(stderr).not.toMatch(/^\s+at \S+/m)
    })

    it('prints the stack trace with --verbose', async () => {
      mockStdin('a:\n\tb: 1\n')

      const { stderr } = await runCli(['--decode', '--verbose'])

      expect(stderr).toContain('Failed to decode TOON at line 2:')
      expect(stderr).toMatch(/at \S+/)
    })

    it('rejects an invalid --delimiter', async () => {
      const directory = createDirectory({
        'input.json': JSON.stringify({ value: 1 }),
      })

      const { stderr, exitCode } = await runCli(['input.json', '--delimiter', ';'], { cwd: directory })

      expect(exitCode).toBe(1)
      expect(stderr).toContain('Invalid delimiter')
    })

    it('rejects a non-numeric --indent', async () => {
      const directory = createDirectory({
        'input.json': JSON.stringify({ value: 1 }),
      })

      const { stderr, exitCode } = await runCli(['input.json', '--indent', 'abc'], { cwd: directory })

      expect(exitCode).toBe(1)
      expect(stderr).toContain('Invalid indent value')
    })

    it('reports a missing input file', async () => {
      const directory = createDirectory()

      const { stderr, exitCode } = await runCli(['nonexistent.json'], { cwd: directory })

      expect(exitCode).toBe(1)
      expect(stderr).toContain('nonexistent.json')
    })
  })
})
