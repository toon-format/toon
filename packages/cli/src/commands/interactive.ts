import type { CommandDef } from 'citty'
import * as readline from 'node:readline'
import process from 'node:process'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { estimateTokenCount } from 'tokenx'
import { decode, encode, type Delimiter, DEFAULT_DELIMITER, DELIMITERS } from '../../../toon/src'
import { validateDelimiter, validateNumber } from '../shared/validation'

interface InteractiveOptions {
  delimiter: Delimiter
  indent: number
  keyFolding: 'off' | 'safe'
  strict: boolean
  stats: boolean
}

export const interactiveCommand: CommandDef = defineCommand({
  meta: {
    name: 'interactive',
    description: 'Start an interactive REPL session for quick conversions',
  },
  args: {
    delimiter: {
      type: 'string',
      description: 'Default delimiter for arrays: comma (,), tab (\\t), or pipe (|)',
      default: ',',
    },
    indent: {
      type: 'string',
      description: 'Default indentation size',
      default: '2',
    },
  },
  async run({ args }) {
    const options: InteractiveOptions = {
      delimiter: validateDelimiter(args.delimiter, DEFAULT_DELIMITER),
      indent: validateNumber(args.indent, 'indent', 2),
      keyFolding: 'off',
      strict: true,
      stats: false,
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> ',
    })

    // Welcome message
    console.log(`🎯 TOON Interactive Mode
Type JSON to convert to TOON, or TOON to convert to JSON
Commands: :help, :quit, :settings, :stats [on|off]
Use Ctrl+C or :quit to exit\n`)

    rl.prompt()

    rl.on('line', (input) => {
      const trimmed = input.trim()
      
      if (!trimmed) {
        rl.prompt()
        return
      }

      // Handle commands
      if (trimmed.startsWith(':')) {
        handleCommand(trimmed, options, rl)
        return
      }

      // Handle conversion
      try {
        const result = convertInput(trimmed, options)
        console.log(result.output)
        
        if (options.stats && result.stats) {
          console.log()
          consola.info(`Token estimates: ~${result.stats.input} → ~${result.stats.output}`)
          const saved = result.stats.input - result.stats.output
          const percent = ((saved / result.stats.input) * 100).toFixed(1)
          if (saved > 0) {
            consola.success(`Saved ~${saved} tokens (-${percent}%)`)
          } else if (saved < 0) {
            consola.info(`Used ~${Math.abs(saved)} more tokens (+${Math.abs(Number(percent))}%)`)
          }
        }
      } catch (error) {
        consola.error(error instanceof Error ? error.message : String(error))
      }
      
      console.log()
      rl.prompt()
    })

    rl.on('SIGINT', () => {
      process.exit(0)
    })

    rl.on('close', () => {
      console.log('\n👋 Goodbye!')
      process.exit(0)
    })
  },
})

function handleCommand(command: string, options: InteractiveOptions, rl: readline.Interface): void {
  const [cmd, ...args] = command.slice(1).split(' ')
  
  switch (cmd) {
    case 'help':
    case 'h':
      const commands = [
        '  :help, :h          Show this help',
        '  :quit, :q, :exit   Exit interactive mode',
        '  :settings, :s      Show current settings',
        '  :stats [on|off]    Toggle token statistics',
        '  :delimiter [,|\\t|\\|] Set array delimiter',
        '  :indent [number]   Set indentation size',
        '  :strict [on|off]   Toggle strict mode for TOON decoding',
        '  :folding [on|off]  Toggle key folding for encoding'
      ]
      console.log(`Available commands:\n${commands.join('\n')}`)
      break
      
    case 'quit':
    case 'q':
    case 'exit':
      process.exit(0)
      break
      
    case 'settings':
    case 's':
      const delimiterName = options.delimiter === '\\t' ? 'tab' : options.delimiter === '|' ? 'pipe' : 'comma'
      console.log(`Current settings:
  Delimiter: ${delimiterName}
  Indent: ${options.indent}
  Key folding: ${options.keyFolding}
  Strict mode: ${options.strict}
  Token stats: ${options.stats}`)
      break
      
    case 'stats':
      if (args[0] === 'on') {
        options.stats = true
        consola.success('Token statistics enabled')
      } else if (args[0] === 'off') {
        options.stats = false
        consola.success('Token statistics disabled')
      } else {
        options.stats = !options.stats
        consola.success(`Token statistics ${options.stats ? 'enabled' : 'disabled'}`)
      }
      break
      
    case 'delimiter':
      if (args[0] && Object.values(DELIMITERS).includes(args[0] as Delimiter)) {
        options.delimiter = args[0] as Delimiter
        consola.success(`Delimiter set to: ${args[0] === '\\t' ? 'tab' : args[0] === '|' ? 'pipe' : 'comma'}`)
      } else {
        consola.error('Invalid delimiter. Use: , (comma), \\t (tab), or | (pipe)')
      }
      break
      
    case 'indent':
      const indentValue = Number.parseInt(args[0], 10)
      if (!Number.isNaN(indentValue) && indentValue >= 0) {
        options.indent = indentValue
        consola.success(`Indent set to: ${indentValue}`)
      } else {
        consola.error('Invalid indent value. Use a non-negative integer.')
      }
      break
      
    case 'strict':
      if (args[0] === 'on') {
        options.strict = true
        consola.success('Strict mode enabled')
      } else if (args[0] === 'off') {
        options.strict = false
        consola.success('Strict mode disabled')
      } else {
        options.strict = !options.strict
        consola.success(`Strict mode ${options.strict ? 'enabled' : 'disabled'}`)
      }
      break
      
    case 'folding':
      if (args[0] === 'on') {
        options.keyFolding = 'safe'
        consola.success('Key folding enabled')
      } else if (args[0] === 'off') {
        options.keyFolding = 'off'
        consola.success('Key folding disabled')
      } else {
        options.keyFolding = options.keyFolding === 'off' ? 'safe' : 'off'
        consola.success(`Key folding ${options.keyFolding === 'safe' ? 'enabled' : 'disabled'}`)
      }
      break
      
    default:
      consola.error(`Unknown command: ${cmd}. Type :help for available commands.`)
  }
  
  console.log()
  rl.prompt()
}

function convertInput(input: string, options: InteractiveOptions): {
  output: string
  stats?: { input: number; output: number }
} {
  // Try to detect input format
  const trimmed = input.trim()
  
  // Check if it looks like JSON
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const data = JSON.parse(input)
      const toonOutput = encode(data, {
        delimiter: options.delimiter,
        indent: options.indent,
        keyFolding: options.keyFolding,
      })
      
      const stats = options.stats ? {
        input: estimateTokenCount(input),
        output: estimateTokenCount(toonOutput)
      } : undefined
      
      return { output: toonOutput, stats }
    } catch {
      // Fall through to try TOON decoding
    }
  }
  
  // Try to decode as TOON
  try {
    const data = decode(input, {
      strict: options.strict,
      indent: options.indent,
    })
    const jsonOutput = JSON.stringify(data, null, options.indent)
    
    const stats = options.stats ? {
      input: estimateTokenCount(input),
      output: estimateTokenCount(jsonOutput)
    } : undefined
    
    return { output: jsonOutput, stats }
  } catch (toonError) {
    throw new Error(`Could not parse as JSON or TOON. JSON error: Invalid JSON. TOON error: ${toonError instanceof Error ? toonError.message : String(toonError)}`)
  }
}

