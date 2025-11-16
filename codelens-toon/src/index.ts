/**
 * CodeLens-TOON: Hierarchical codebase analysis with TOON output
 */

import fs from 'node:fs'
import path from 'node:path'
import { TypeScriptParser } from './parsers/typescript.js'
import { CodeLensGenerator } from './generators/index.js'
import { TOONEncoder } from './encoders/toon.js'
import type { AnalysisLevel, AnalysisOptions, CodeLensOutput } from './types/index.js'

export * from './types/index.js'
export { TypeScriptParser } from './parsers/typescript.js'
export { CodeLensGenerator } from './generators/index.js'
export { TOONEncoder } from './encoders/toon.js'

export class CodeLens {
  private parser: TypeScriptParser
  private generator: CodeLensGenerator
  private encoder: TOONEncoder

  constructor() {
    this.parser = new TypeScriptParser()
    this.generator = new CodeLensGenerator()
    this.encoder = new TOONEncoder()
  }

  /**
   * Analyze a single file
   */
  analyzeFile(filePath: string, options: AnalysisOptions): CodeLensOutput {
    const sourceCode = fs.readFileSync(filePath, 'utf-8')
    const parsed = this.parser.parse(sourceCode, filePath)

    const projectName = path.basename(path.dirname(filePath))

    let data
    switch (options.level) {
      case 1:
        data = this.generator.generateL1([parsed], projectName)
        break
      case 2:
        data = this.generator.generateL2([parsed], projectName)
        break
      case 3:
        data = this.generator.generateL3([parsed], projectName)
        break
      default:
        throw new Error(`Invalid level: ${options.level}`)
    }

    const output: CodeLensOutput = {
      level: options.level,
      data,
      metadata: {
        generatedAt: new Date().toISOString(),
        tokensEstimate: 0, // Will be calculated after encoding
      },
    }

    return output
  }

  /**
   * Analyze a directory of files
   */
  analyzeDirectory(dirPath: string, options: AnalysisOptions): CodeLensOutput {
    const files = this.findTypeScriptFiles(dirPath)
    const parsedFiles = files.map(file => {
      const sourceCode = fs.readFileSync(file, 'utf-8')
      return this.parser.parse(sourceCode, file)
    })

    const projectName = path.basename(dirPath)

    let data
    switch (options.level) {
      case 1:
        data = this.generator.generateL1(parsedFiles, projectName)
        break
      case 2:
        data = this.generator.generateL2(parsedFiles, projectName)
        break
      case 3:
        data = this.generator.generateL3(parsedFiles, projectName)
        break
      default:
        throw new Error(`Invalid level: ${options.level}`)
    }

    const output: CodeLensOutput = {
      level: options.level,
      data,
      metadata: {
        generatedAt: new Date().toISOString(),
        tokensEstimate: 0,
      },
    }

    return output
  }

  /**
   * Convert analysis output to TOON format
   */
  toTOON(output: CodeLensOutput): string {
    const toonOutput = this.encoder.encode(output)
    output.metadata.tokensEstimate = this.encoder.estimateTokens(toonOutput)
    return toonOutput
  }

  /**
   * Analyze and return TOON output in one step
   */
  analyzePath(inputPath: string, options: AnalysisOptions): string {
    const stats = fs.statSync(inputPath)

    let output: CodeLensOutput
    if (stats.isFile()) {
      output = this.analyzeFile(inputPath, options)
    }
    else if (stats.isDirectory()) {
      output = this.analyzeDirectory(inputPath, options)
    }
    else {
      throw new Error(`Invalid input: ${inputPath}`)
    }

    return this.toTOON(output)
  }

  private findTypeScriptFiles(dirPath: string): string[] {
    const files: string[] = []

    const traverse = (currentPath: string) => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name)

        // Skip node_modules, dist, build directories
        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
            traverse(fullPath)
          }
        }
        else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          // Skip test files for now
          if (!entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
            files.push(fullPath)
          }
        }
      }
    }

    traverse(dirPath)
    return files
  }
}
