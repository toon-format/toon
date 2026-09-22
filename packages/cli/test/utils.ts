import type { CliHarness } from 'utilful/cli/testing'
import * as path from 'node:path'
import { createCliHarness } from 'utilful/cli/testing'
import { cliOptions, mainCommand } from '../src/index.ts'

export { mockStdin, useTemporaryDirectories } from 'utilful/cli/testing'

const harness = createCliHarness(mainCommand, {
  entry: path.join(import.meta.dirname, '../src/entry.ts'),
  ...cliOptions,
})

export const runCli: CliHarness['runCli'] = harness.runCli
export const runCliProcess: CliHarness['runCliProcess'] = harness.runCliProcess
