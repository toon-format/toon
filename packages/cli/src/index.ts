import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { name, version } from '../package.json' with { type: 'json' }
import { convertCommand } from './commands/convert'
import { interactiveCommand } from './commands/interactive'
import { watchCommand } from './commands/watch'
import { batchCommand } from './commands/batch'

export const mainCommand: CommandDef = defineCommand({
  meta: {
    name,
    description: 'TOON CLI — Convert between JSON and TOON formats with enhanced features',
    version,
  },
  subCommands: {
    convert: convertCommand,
    interactive: interactiveCommand,
    watch: watchCommand,
    batch: batchCommand,
  },
  // Default command behavior (same as convert)
  async run(context) {
    if (convertCommand.run) {
      await convertCommand.run(context)
    }
  },
})
