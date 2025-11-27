import process from 'node:process'
import { consola } from 'consola'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_DELIMITER, encode } from '../../toon/src'
import { version } from '../package.json' with { type: 'json' }
import { createCliTestContext, mockStdin, runCli } from './utils'

describe('toon CLI', () => {
  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation(() => 0 as never)
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('version', () => {
    it('prints the version when using --version', async () => {
      const consolaLog = vi.spyOn(consola, 'log').mockImplementation(() => undefined)

      await runCli({ rawArgs: ['--version'] })

      expect(consolaLog).toHaveBeenCalledWith(version)
    })
  })

  describe('encode (JSON → TOON)', () => {
    it('encodes JSON from stdin', async () => {
      const data = {
        title: 'TOON test',
        count: 3,
        nested: { ok: true },
      }
      const cleanup = mockStdin(JSON.stringify(data))

      const writeChunks: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
        writeChunks.push(String(chunk))
        return true
      })

      try {
        await runCli()
        const fullOutput = writeChunks.join('')
        expect(fullOutput).toBe(`${encode(data)}\n`)
      }
      finally {
        cleanup()
      }
    })

    it('encodes a JSON file into a TOON file', async () => {
      const data = {
        title: 'TOON test',
        count: 3,
        nested: { ok: true },
      }
      const context = await createCliTestContext({
        'input.json': JSON.stringify(data, undefined, 2),
      })

      const consolaSuccess = vi.spyOn(consola, 'success').mockImplementation(() => undefined)

      try {
        await context.run(['input.json', '--output', 'output.toon'])

        const output = await context.read('output.toon')
        const expected = encode(data, {
          delimiter: DEFAULT_DELIMITER,
          indent: 2,
        })

        expect(output).toBe(expected)
        expect(consolaSuccess).toHaveBeenCalledWith(expect.stringMatching(/Encoded .* → .*/))
      }
      finally {
        await context.cleanup()
      }
    })

    it('writes to stdout when output not specified', async () => {
      const data = { ok: true }
      const context = await createCliTestContext({
        'input.json': JSON.stringify(data),
      })

      const writeChunks: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
        writeChunks.push(String(chunk))
        return true
      })

      try {
        await context.run(['input.json'])

        const fullOutput = writeChunks.join('')
        expect(fullOutput).toBe(`${encode(data)}\n`)
      }
      finally {
        await context.cleanup()
      }
    })

    it('encodes JSON from stdin to output file', async () => {
      const data = { key: 'value' }
      const context = await createCliTestContext({})
      const cleanup = mockStdin(JSON.stringify(data))

      const consolaSuccess = vi.spyOn(consola, 'success').mockImplementation(() => undefined)

      try {
        await context.run(['--output', 'output.toon'])

        const output = await context.read('output.toon')
        expect(output).toBe(encode(data))
        expect(consolaSuccess).toHaveBeenCalledWith(expect.stringMatching(/Encoded.*stdin[^\n\r\u2028\u2029\u2192]*\u2192.*output\.toon/))
      }
      finally {
        cleanup()
        await context.cleanup()
      }
    })
  })

  describe('decode (TOON → JSON)', () => {
    it('decodes a TOON file into a JSON file', async () => {
      const data = {
        items: ['alpha', 'beta'],
        meta: { done: false },
      }
      const toonInput = encode(data)
      const context = await createCliTestContext({
        'input.toon': toonInput,
      })

      const consolaSuccess = vi.spyOn(consola, 'success').mockImplementation(() => undefined)

      try {
        await context.run(['input.toon', '--output', 'output.json'])

        const output = await context.read('output.json')
        expect(JSON.parse(output)).toEqual(data)
        expect(consolaSuccess).toHaveBeenCalledWith(expect.stringMatching(/Decoded .* → .*/))
      }
      finally {
        await context.cleanup()
      }
    })

    it('decodes TOON from stdin', async () => {
      const data = { items: ['a', 'b'], count: 2 }
      const toonInput = encode(data)

      const cleanup = mockStdin(toonInput)

      const writeChunks: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
        writeChunks.push(String(chunk))
        return true
      })

      try {
        await runCli({ rawArgs: ['--decode'] })
        const fullOutput = writeChunks.join('')
        // Remove trailing newline before parsing
        const jsonOutput = fullOutput.endsWith('\n') ? fullOutput.slice(0, -1) : fullOutput
        const result = JSON.parse(jsonOutput)
        expect(result).toEqual(data)
      }
      finally {
        cleanup()
      }
    })

    it('decodes TOON from stdin to output file', async () => {
      const data = { name: 'test', values: [1, 2, 3] }
      const toonInput = encode(data)
      const context = await createCliTestContext({})
      const cleanup = mockStdin(toonInput)

      const consolaSuccess = vi.spyOn(consola, 'success').mockImplementation(() => undefined)

      try {
        await context.run(['--decode', '--output', 'output.json'])

        const output = await context.read('output.json')
        expect(JSON.parse(output)).toEqual(data)
        expect(consolaSuccess).toHaveBeenCalledWith(expect.stringMatching(/Decoded.*stdin[^\n\r\u2028\u2029\u2192]*\u2192.*output\.json/))
      }
      finally {
        cleanup()
        await context.cleanup()
      }
    })
  })

  describe('stdin edge cases', () => {
    it('handles invalid JSON from stdin', async () => {
      const cleanup = mockStdin('{ invalid json }')

      const consolaError = vi.spyOn(consola, 'error').mockImplementation(() => undefined)
      const exitSpy = vi.mocked(process.exit)

      try {
        await runCli({ rawArgs: [] })

        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(consolaError).toHaveBeenCalled()
      }
      finally {
        cleanup()
      }
    })

    it('handles invalid TOON from stdin', async () => {
      const cleanup = mockStdin('key: "unterminated string')

      const consolaError = vi.spyOn(consola, 'error').mockImplementation(() => undefined)
      const exitSpy = vi.mocked(process.exit)

      try {
        await runCli({ rawArgs: ['--decode'] })

        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(consolaError).toHaveBeenCalled()
      }
      finally {
        cleanup()
      }
    })
  })

  describe('stdin with options', () => {
    it('encodes JSON from stdin with custom delimiter', async () => {
      const data = { items: [1, 2, 3] }
      const cleanup = mockStdin(JSON.stringify(data))

      const writeChunks: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
        writeChunks.push(String(chunk))
        return true
      })

      try {
        await runCli({ rawArgs: ['--delimiter', '|'] })

        const fullOutput = writeChunks.join('')
        expect(fullOutput).toBe(`${encode(data, { delimiter: '|' })}\n`)
      }
      finally {
        cleanup()
      }
    })

    it('encodes JSON from stdin with custom indent', async () => {
      const data = {
        nested: {
          deep: { value: 1 },
        },
      }
      const cleanup = mockStdin(JSON.stringify(data))

      const writeChunks: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
        writeChunks.push(String(chunk))
        return true
      })

      try {
        await runCli({ rawArgs: ['--indent', '4'] })

        const fullOutput = writeChunks.join('')
        expect(fullOutput).toBe(`${encode(data, { indent: 4 })}\n`)
      }
      finally {
        cleanup()
      }
    })

    it('decodes TOON from stdin with --no-strict', async () => {
      const data = { test: true }
      const toonInput = encode(data)
      const cleanup = mockStdin(toonInput)

      const writeChunks: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
        writeChunks.push(String(chunk))
        return true
      })

      try {
        await runCli({ rawArgs: ['--decode', '--no-strict'] })

        const fullOutput = writeChunks.join('')
        // Remove trailing newline before parsing
        const jsonOutput = fullOutput.endsWith('\n') ? fullOutput.slice(0, -1) : fullOutput
        const result = JSON.parse(jsonOutput)
        expect(result).toEqual(data)
      }
      finally {
        cleanup()
      }
    })
  })

  describe('encode options', () => {
    it('encodes with --key-folding safe', async () => {
      const data = {
        data: {
          metadata: {
            items: ['a', 'b'],
          },
        },
      }

      const context = await createCliTestContext({
        'input.json': JSON.stringify(data),
      })

      try {
        await context.run(['input.json', '--keyFolding', 'safe', '--output', 'output.toon'])

        const output = await context.read('output.toon')
        const expected = encode(data, { keyFolding: 'safe' })

        expect(output).toBe(expected)
      }
      finally {
        await context.cleanup()
      }
    })

    it('encodes with --flatten-depth', async () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      }

      const context = await createCliTestContext({
        'input.json': JSON.stringify(data),
      })

      try {
        await context.run(['input.json', '--keyFolding', 'safe', '--flattenDepth', '2', '--output', 'output.toon'])

        const output = await context.read('output.toon')
        const expected = encode(data, { keyFolding: 'safe', flattenDepth: 2 })

        expect(output).toBe(expected)
      }
      finally {
        await context.cleanup()
      }
    })
  })

  describe('decode options', () => {
    it('decodes with --expand-paths safe', async () => {
      const data = {
        data: {
          metadata: {
            items: ['a', 'b'],
          },
        },
      }
      const toonInput = encode(data, { keyFolding: 'safe' })

      const context = await createCliTestContext({
        'input.toon': toonInput,
      })

      try {
        await context.run(['input.toon', '--decode', '--expandPaths', 'safe', '--output', 'output.json'])

        const output = await context.read('output.json')
        const result = JSON.parse(output)

        expect(result).toEqual(data)
      }
      finally {
        await context.cleanup()
      }
    })

    it('decodes with --indent for JSON formatting', async () => {
      const data = {
        a: 1,
        b: [2, 3],
        c: { nested: true },
      }
      const toonInput = encode(data, { indent: 4 })

      const context = await createCliTestContext({
        'input.toon': toonInput,
      })

      try {
        await context.run(['input.toon', '--decode', '--indent', '4', '--output', 'output.json'])

        const output = await context.read('output.json')
        const result = JSON.parse(output)

        expect(result).toEqual(data)
        expect(output).toContain('    ') // Should have 4-space indentation
      }
      finally {
        await context.cleanup()
      }
    })

    it('decodes root primitive number', async () => {
      const toonInput = '42'

      const cleanup = mockStdin(toonInput)

      const writeChunks: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
        writeChunks.push(String(chunk))
        return true
      })

      try {
        await runCli({ rawArgs: ['--decode'] })

        const fullOutput = writeChunks.join('')
        expect(fullOutput).toBe('42\n')
      }
      finally {
        cleanup()
      }
    })

    it('decodes root primitive string', async () => {
      const toonInput = '"Hello World"'

      const cleanup = mockStdin(toonInput)

      const writeChunks: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
        writeChunks.push(String(chunk))
        return true
      })

      try {
        await runCli({ rawArgs: ['--decode'] })

        const fullOutput = writeChunks.join('')
        const jsonOutput = fullOutput.endsWith('\n') ? fullOutput.slice(0, -1) : fullOutput
        expect(JSON.parse(jsonOutput)).toBe('Hello World')
      }
      finally {
        cleanup()
      }
    })

    it('decodes root primitive boolean', async () => {
      const toonInput = 'true'

      const cleanup = mockStdin(toonInput)

      const writeChunks: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
        writeChunks.push(String(chunk))
        return true
      })

      try {
        await runCli({ rawArgs: ['--decode'] })

        const fullOutput = writeChunks.join('')
        expect(fullOutput).toBe('true\n')
      }
      finally {
        cleanup()
      }
    })
  })

  describe('streaming output', () => {
    it('streams large JSON to TOON file with identical output', async () => {
      const data = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          value: Math.random(),
        })),
      }

      const context = await createCliTestContext({
        'large-input.json': JSON.stringify(data, undefined, 2),
      })

      const consolaSuccess = vi.spyOn(consola, 'success').mockImplementation(() => undefined)

      try {
        await context.run(['large-input.json', '--output', 'output.toon'])

        const output = await context.read('output.toon')
        // Verify streaming produces identical output to `encode()`
        const expected = encode(data, {
          delimiter: DEFAULT_DELIMITER,
          indent: 2,
        })

        expect(output).toBe(expected)
        expect(consolaSuccess).toHaveBeenCalledWith(expect.stringMatching(/Encoded .* → .*/))
      }
      finally {
        await context.cleanup()
      }
    })

    it('streams large TOON to JSON file with streaming decode', async () => {
      const data = {
        records: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          title: `Record ${i}`,
          score: Math.random() * 100,
        })),
      }

      const toonContent = encode(data, {
        delimiter: DEFAULT_DELIMITER,
        indent: 2,
      })

      const context = await createCliTestContext({
        'large-input.toon': toonContent,
      })

      const consolaSuccess = vi.spyOn(consola, 'success').mockImplementation(() => undefined)

      try {
        await context.run(['large-input.toon', '--decode', '--output', 'output.json'])

        const output = await context.read('output.json')
        const result = JSON.parse(output)

        expect(result).toEqual(data)
        expect(consolaSuccess).toHaveBeenCalledWith(expect.stringMatching(/Decoded .* → .*/))
      }
      finally {
        await context.cleanup()
      }
    })

    it('streams to stdout using process.stdout.write', async () => {
      const data = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      }

      const context = await createCliTestContext({
        'input.json': JSON.stringify(data),
      })

      const writeChunks: string[] = []
      const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
        writeChunks.push(String(chunk))
        return true
      })

      try {
        await context.run(['input.json'])

        expect(writeSpy).toHaveBeenCalled()

        // Verify complete output matches `encode()`
        const fullOutput = writeChunks.join('')
        const expected = `${encode(data)}\n`
        expect(fullOutput).toBe(expected)
      }
      finally {
        await context.cleanup()
      }
    })

    it('handles empty object streaming correctly', async () => {
      const data = {}

      const context = await createCliTestContext({
        'empty.json': JSON.stringify(data),
      })

      try {
        await context.run(['empty.json', '--output', 'output.toon'])

        const output = await context.read('output.toon')
        expect(output).toBe(encode(data))
      }
      finally {
        await context.cleanup()
      }
    })

    it('handles single-line output streaming correctly', async () => {
      const data = { key: 'value' }

      const context = await createCliTestContext({
        'single.json': JSON.stringify(data),
      })

      try {
        await context.run(['single.json', '--output', 'output.toon'])

        const output = await context.read('output.toon')
        expect(output).toBe(encode(data))
      }
      finally {
        await context.cleanup()
      }
    })

    it('uses non-streaming path when stats are enabled', async () => {
      const data = {
        items: [
          { id: 1, value: 'test' },
          { id: 2, value: 'data' },
        ],
      }

      const context = await createCliTestContext({
        'input.json': JSON.stringify(data),
      })

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
      const consolaInfo = vi.spyOn(consola, 'info').mockImplementation(() => undefined)
      const consolaSuccess = vi.spyOn(consola, 'success').mockImplementation(() => undefined)

      try {
        await context.run(['input.json', '--stats'])

        expect(consolaInfo).toHaveBeenCalledWith(expect.stringMatching(/Token estimates:/))
        expect(consolaSuccess).toHaveBeenCalledWith(expect.stringMatching(/Saved.*tokens/))
        expect(consoleLogSpy).toHaveBeenCalledWith(encode(data))
      }
      finally {
        await context.cleanup()
      }
    })
  })

  describe('error handling', () => {
    it('rejects invalid delimiter', async () => {
      const context = await createCliTestContext({
        'input.json': JSON.stringify({ value: 1 }),
      })

      const consolaError = vi.spyOn(consola, 'error').mockImplementation(() => undefined)
      const exitSpy = vi.mocked(process.exit)

      try {
        await context.run(['input.json', '--delimiter', ';'])

        expect(exitSpy).toHaveBeenCalledWith(1)

        const errorCall = consolaError.mock.calls.at(0)
        expect(errorCall).toBeDefined()
        const [error] = errorCall!
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toContain('Invalid delimiter')
      }
      finally {
        await context.cleanup()
      }
    })

    it('rejects invalid indent value', async () => {
      const context = await createCliTestContext({
        'input.json': JSON.stringify({ value: 1 }),
      })

      const consolaError = vi.spyOn(consola, 'error').mockImplementation(() => undefined)
      const exitSpy = vi.mocked(process.exit)

      try {
        await context.run(['input.json', '--indent', 'abc'])

        expect(exitSpy).toHaveBeenCalledWith(1)

        const errorCall = consolaError.mock.calls.at(0)
        expect(errorCall).toBeDefined()
        const [error] = errorCall!
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toContain('Invalid indent value')
      }
      finally {
        await context.cleanup()
      }
    })

    it('handles missing input file', async () => {
      const context = await createCliTestContext({})

      const consolaError = vi.spyOn(consola, 'error').mockImplementation(() => undefined)
      const exitSpy = vi.mocked(process.exit)

      try {
        await context.run(['nonexistent.json'])

        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(consolaError).toHaveBeenCalled()
      }
      finally {
        await context.cleanup()
      }
    })

    it('rejects invalid --key-folding value', async () => {
      const context = await createCliTestContext({
        'input.json': JSON.stringify({ value: 1 }),
      })

      const consolaError = vi.spyOn(consola, 'error').mockImplementation(() => undefined)
      const exitSpy = vi.mocked(process.exit)

      try {
        await context.run(['input.json', '--keyFolding', 'invalid'])

        expect(exitSpy).toHaveBeenCalledWith(1)

        const errorCall = consolaError.mock.calls.at(0)
        expect(errorCall).toBeDefined()
        const [error] = errorCall!
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toContain('Invalid keyFolding value')
      }
      finally {
        await context.cleanup()
      }
    })

    it('rejects invalid --expandPaths value', async () => {
      const context = await createCliTestContext({
        'input.toon': 'key: value',
      })

      const consolaError = vi.spyOn(consola, 'error').mockImplementation(() => undefined)
      const exitSpy = vi.mocked(process.exit)

      try {
        await context.run(['input.toon', '--decode', '--expandPaths', 'invalid'])

        expect(exitSpy).toHaveBeenCalledWith(1)

        const errorCall = consolaError.mock.calls.at(0)
        expect(errorCall).toBeDefined()
        const [error] = errorCall!
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toContain('Invalid expandPaths value')
      }
      finally {
        await context.cleanup()
      }
    })

    it('rejects invalid --flattenDepth value', async () => {
      const context = await createCliTestContext({
        'input.json': JSON.stringify({ value: 1 }),
      })

      const consolaError = vi.spyOn(consola, 'error').mockImplementation(() => undefined)
      const exitSpy = vi.mocked(process.exit)

      try {
        await context.run(['input.json', '--flattenDepth', '-1'])

        expect(exitSpy).toHaveBeenCalledWith(1)

        const errorCall = consolaError.mock.calls.at(0)
        expect(errorCall).toBeDefined()
        const [error] = errorCall!
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toContain('Invalid flattenDepth value')
      }
      finally {
        await context.cleanup()
      }
    })
  })
})
