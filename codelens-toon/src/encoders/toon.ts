/**
 * TOON encoder integration
 * Converts CodeLens analysis results to TOON format
 */

import { encode } from '@toon-format/toon'
import type { CodeLensOutput, Level1Output, Level2Output, Level3Output } from '../types/index.js'

export class TOONEncoder {
  /**
   * Encode analysis results to TOON format
   */
  encode(output: CodeLensOutput): string {
    const { level, data } = output

    switch (level) {
      case 1:
        return this.encodeL1(data as Level1Output)
      case 2:
        return this.encodeL2(data as Level2Output)
      case 3:
        return this.encodeL3(data as Level3Output)
      default:
        throw new Error(`Unsupported level: ${level}`)
    }
  }

  private encodeL1(data: Level1Output): string {
    const sections: string[] = []

    // Project metadata
    sections.push('# Level 1: Project Overview\n')
    sections.push(encode({
      project: [data.project],
    }))

    sections.push('\n')

    // Modules overview
    sections.push(encode({
      modules: data.modules,
    }))

    sections.push('\n')

    // Summary
    sections.push(encode({
      summary: [data.summary],
    }))

    return sections.join('\n')
  }

  private encodeL2(data: Level2Output): string {
    const sections: string[] = []

    // Project metadata
    sections.push('# Level 2: Module/Class Signatures\n')
    sections.push(encode({
      project: [data.project],
    }))

    sections.push('\n')

    // Modules
    sections.push(encode({
      modules: data.modules,
    }))

    sections.push('\n')

    // Classes
    if (data.classes.length > 0) {
      sections.push(encode({
        classes: data.classes,
      }))
      sections.push('\n')
    }

    // Functions
    if (data.functions.length > 0) {
      sections.push(encode({
        functions: data.functions,
      }))
    }

    return sections.join('\n')
  }

  private encodeL3(data: Level3Output): string {
    const sections: string[] = []

    // Project metadata
    sections.push('# Level 3: Detailed Implementations\n')
    sections.push(encode({
      project: [data.project],
    }))

    sections.push('\n')

    // Modules
    sections.push(encode({
      modules: data.modules,
    }))

    sections.push('\n')

    // Classes with methods
    if (data.classes.length > 0) {
      sections.push('# Classes\n')
      for (const cls of data.classes) {
        sections.push(encode({
          class: [{
            module: cls.module,
            name: cls.name,
          }],
          methods: cls.methods,
        }))
        sections.push('\n')
      }
    }

    // Functions with bodies
    if (data.functions.length > 0) {
      sections.push('# Functions\n')
      sections.push(encode({
        functions: data.functions.map(fn => ({
          module: fn.module,
          name: fn.name,
          signature: fn.signature,
          loc: fn.loc,
          // Note: body would be included but truncated for token efficiency
        })),
      }))
    }

    return sections.join('\n')
  }

  /**
   * Estimate token count for the output
   * Simple estimation based on character count
   */
  estimateTokens(toonOutput: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(toonOutput.length / 4)
  }
}
