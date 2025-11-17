#!/usr/bin/env node

/**
 * Utility script to add new language implementations to the conformance testing framework
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { parseArgs } from 'node:util'

function main() {
  const { values: options } = parseArgs({
    args: process.argv.slice(2),
    options: {
      name: {
        type: 'string',
        short: 'n'
      },
      language: {
        type: 'string',
        short: 'l'
      },
      command: {
        type: 'string',
        short: 'c'
      },
      help: {
        type: 'boolean',
        short: 'h'
      }
    }
  })

  if (options.help || !options.name || !options.language) {
    console.log(`
Add New TOON Implementation

Usage:
  node scripts/add-implementation.mjs --name <name> --language <language> [--command <command>]

Options:
  -n, --name <name>         Implementation name (e.g., 'python', 'java', 'rust')
  -l, --language <language> Programming language (e.g., 'Python', 'Java', 'Rust')
  -c, --command <command>   Command to run the implementation (default: 'toon')
  -h, --help               Show this help

Examples:
  node scripts/add-implementation.mjs --name python --language Python --command "python toon.py"
  node scripts/add-implementation.mjs --name java --language Java --command "java -jar toon.jar"
  node scripts/add-implementation.mjs --name rust --language Rust --command "cargo run --bin toon"
`)
    return
  }

  const name = options.name
  const language = options.language
  const command = options.command || 'toon'

  // Generate implementation config
  const config = {
    name,
    displayName: `${language} Implementation`,
    language,
    version: '1.0.0',
    command: command.split(' ')[0],
    args: command.split(' ').slice(1).concat(['--encode']),
    active: false, // Start inactive until verified
    options: {
      inputMethod: 'stdin',
      outputMethod: 'stdout'
    }
  }

  // Save to implementations directory
  const rootDir = path.dirname(new URL(import.meta.url).pathname)
  const implementationsDir = path.join(rootDir, '..', 'implementations')
  const configPath = path.join(implementationsDir, `${name}.json`)

  if (fs.existsSync(configPath)) {
    console.error(`Implementation '${name}' already exists at ${configPath}`)
    process.exit(1)
  }

  // Ensure implementations directory exists
  if (!fs.existsSync(implementationsDir)) {
    fs.mkdirSync(implementationsDir, { recursive: true })
  }

  // Write config file
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

  console.log(`Created implementation config: ${configPath}`)
  console.log('')
  console.log('Next steps:')
  console.log(`1. Update ${configPath} with the correct command and options`)
  console.log(`2. Ensure your ${language} implementation accepts JSON via stdin and outputs TOON to stdout`)
  console.log(`3. Set "active": true in the config when ready`)
  console.log(`4. Run: node cli.mjs --impl ${name} --verbose`)
}

main()