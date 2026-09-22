import { describe, expect, it } from 'vitest'
import { encode } from '../../toon/src/index.ts'
import { version } from '../package.json' with { type: 'json' }
import { runCliProcess, useTemporaryDirectories } from './utils.ts'

const createDirectory = useTemporaryDirectories()

describe('toon CLI as a child process', () => {
  it('prints its version', async () => {
    const { stdout, exitCode } = await runCliProcess(['--version'])

    expect(stdout).toBe(`${version}\n`)
    expect(exitCode).toBe(0)
  })

  it('encodes a file and exits successfully', async () => {
    const data = { items: ['alpha', 'beta'] }
    const directory = createDirectory({ 'input.json': JSON.stringify(data) })

    const { stdout, exitCode } = await runCliProcess(['input.json'], { cwd: directory })

    expect(exitCode).toBe(0)
    expect(stdout).toBe(`${encode(data)}\n`)
  })

  it('exits with a failure status for a missing input', async () => {
    const directory = createDirectory()

    const { stdout, stderr, exitCode } = await runCliProcess(['nonexistent.json'], { cwd: directory })

    expect(exitCode).toBe(1)
    expect(stdout).toBe('')
    expect(stderr).toContain('nonexistent.json')
  })
})
