/**
 * Implementation registry for managing TOON language implementations
 */

import type { ImplementationConfig } from './types.js'
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export class ImplementationRegistry {
  private implementations = new Map<string, ImplementationConfig>()

  constructor(private configDir?: string) {
    configDir && this.loadImplementations()
  }

  /**
   * Load implementations from config directory
   */
  private loadImplementations = (): void => {
    if (!this.configDir || !existsSync(this.configDir)) {
      throw new Error(`Config directory not found: ${this.configDir}`)
    }

    const configs = readdirSync(this.configDir)
      .filter(f => f.endsWith('.json') && f !== 'template.json')
      .map(f => {
        try {
          const config = JSON.parse(readFileSync(join(this.configDir!, f), 'utf-8'))
          this.validateConfig(config)
          return config
        } catch (e) {
          console.warn(`Failed to load ${f}:`, e)
          return null
        }
      })
      .filter(Boolean) as ImplementationConfig[]

    if (!configs.length) throw new Error('No valid configurations found')
    configs.forEach(c => this.implementations.set(c.name, c))
  }

  /**
   * Validate implementation config
   */
  private validateConfig = (config: ImplementationConfig): void => {
    const missing = ['name', 'displayName', 'language', 'version', 'command', 'args']
      .find(f => !config[f as keyof ImplementationConfig])
    
    if (missing) throw new Error(`Missing required field: ${missing}`)
    if (!config.options?.inputMethod) throw new Error('Missing inputMethod')
    if (!config.options?.outputMethod) throw new Error('Missing outputMethod')
  }

  /**
   * Get implementations (all or filtered)
   */
  getAllImplementations = (): ImplementationConfig[] => [...this.implementations.values()]
  getActiveImplementations = (): ImplementationConfig[] => this.getAllImplementations().filter(i => i.active)
  getImplementation = (name: string): ImplementationConfig | undefined => this.implementations.get(name)
  getImplementations = (names: string[]): ImplementationConfig[] => names.map(n => this.implementations.get(n)).filter(Boolean) as ImplementationConfig[]
  isAvailable = (name: string): boolean => this.implementations.get(name)?.active ?? false
  addImplementation = (config: ImplementationConfig): void => {
    this.validateConfig(config)
    this.implementations.set(config.name, config)
  }
  generateTemplate = (name: string, language: string): ImplementationConfig => ({
    name,
    displayName: `${language} Implementation`,
    language,
    version: '1.0.0',
    command: 'toon',
    args: ['--encode'],
    active: true,
    options: { inputMethod: 'stdin', outputMethod: 'stdout' }
  })
  saveImplementation = (config: ImplementationConfig): void => {
    if (!this.configDir) throw new Error('No config directory set')
    this.validateConfig(config)
    writeFileSync(join(this.configDir, `${config.name}.json`), JSON.stringify(config, null, 2))
    this.implementations.set(config.name, config)
  }
}