import * as fsp from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import process from 'node:process'
import { Readable } from 'node:stream'
import { runMain } from 'citty'
import { mainCommand } from '../src/index'

interface FileRecord {
  [relativePath: string]: string
}

export function runCli(options?: Parameters<typeof runMain>[1]): Promise<void> {
  return runMain(mainCommand, options)
}

export interface CliTestContext {
  readonly dir: string
  run: (args?: string[]) => Promise<void>
  read: (relativePath: string) => Promise<string>
  write: (relativePath: string, contents: string) => Promise<void>
  resolve: (relativePath: string) => string
  cleanup: () => Promise<void>
}

const TEMP_PREFIX = path.join(os.tmpdir(), 'toon-cli-test-')

export async function createCliTestContext(initialFiles: FileRecord = {}): Promise<CliTestContext> {
  const dir = await fsp.mkdtemp(TEMP_PREFIX)
  await writeFiles(dir, initialFiles)

  async function run(args: string[] = []): Promise<void> {
    const previousCwd = process.cwd()
    process.chdir(dir)
    try {
      await runCli({ rawArgs: args })
    }
    finally {
      process.chdir(previousCwd)
    }
  }

  function resolvePath(relativePath: string): string {
    return path.join(dir, relativePath)
  }

  async function read(relativePath: string): Promise<string> {
    return fsp.readFile(resolvePath(relativePath), 'utf8')
  }

  async function write(relativePath: string, contents: string): Promise<void> {
    const targetPath = resolvePath(relativePath)
    await fsp.mkdir(path.dirname(targetPath), { recursive: true })
    await fsp.writeFile(targetPath, contents, 'utf8')
  }

  async function cleanup(): Promise<void> {
    await fsp.rm(dir, { recursive: true, force: true })
  }

  return {
    dir,
    run,
    read,
    write,
    resolve: resolvePath,
    cleanup,
  }
}

async function writeFiles(baseDir: string, files: FileRecord): Promise<void> {
  await Promise.all(
    Object.entries(files).map(async ([relativePath, contents]) => {
      const filePath = path.join(baseDir, relativePath)
      await fsp.mkdir(path.dirname(filePath), { recursive: true })
      await fsp.writeFile(filePath, contents, 'utf8')
    }),
  )
}

export function mockStdin(input: string): () => void {
  const mockStream = Readable.from([input])

  const originalStdin = process.stdin
  Object.defineProperty(process, 'stdin', {
    value: mockStream,
    writable: true,
  })

  return () => {
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true,
    })
  }
}
