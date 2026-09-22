import * as fsp from 'node:fs/promises'
import * as path from 'node:path'

/** Allocates a new directory so a smoke test cannot replace historical results. */
export async function createGenerationRunDirectory(parent: string): Promise<string> {
  await fsp.mkdir(parent, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return fsp.mkdtemp(path.join(parent, `${timestamp}-`))
}

/** Replaces a checkpoint only after the complete new file has been written. */
export async function writeGenerationCheckpoint(file: string, content: string): Promise<void> {
  const temporary = `${file}.tmp`
  await fsp.writeFile(temporary, content)
  await fsp.rename(temporary, file)
}
