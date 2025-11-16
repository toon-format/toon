/**
 * Basic tests for CodeLens-TOON
 */

import { describe, expect, it } from 'vitest'
import { TypeScriptParser } from '../src/parsers/typescript.js'
import { CodeLensGenerator } from '../src/generators/index.js'
import { TOONEncoder } from '../src/encoders/toon.js'

describe('TypeScriptParser', () => {
  it('should parse a simple class', () => {
    const parser = new TypeScriptParser()
    const code = `
      export class TestClass {
        method1() {}
        method2() {}
      }
    `

    const result = parser.parse(code, 'test.ts')

    expect(result.classes).toHaveLength(1)
    expect(result.classes[0].name).toBe('TestClass')
    expect(result.classes[0].methods).toBe(2)
    expect(result.classes[0].exported).toBe(true)
  })

  it('should parse functions', () => {
    const parser = new TypeScriptParser()
    const code = `
      export function test1(a: string, b: number): void {}
      async function test2(): Promise<void> {}
    `

    const result = parser.parse(code, 'test.ts')

    expect(result.functions).toHaveLength(2)
    expect(result.functions[0].name).toBe('test1')
    expect(result.functions[0].params).toBe(2)
    expect(result.functions[0].exported).toBe(true)
    expect(result.functions[1].async).toBe(true)
  })

  it('should count lines correctly', () => {
    const parser = new TypeScriptParser()
    const code = `line1
line2
line3`

    const result = parser.parse(code, 'test.ts')

    expect(result.loc).toBe(3)
  })
})

describe('CodeLensGenerator', () => {
  it('should generate L1 output', () => {
    const generator = new CodeLensGenerator()
    const mockFiles = [{
      path: 'test.ts',
      loc: 50,
      classes: [{ module: 'test.ts', name: 'Test', methods: 2, properties: 1, loc: 20, exported: true }],
      functions: [{ module: 'test.ts', name: 'fn1', params: 1, loc: 5, complexity: 2, async: false, exported: true }],
      imports: ['import1'],
      exports: ['Test', 'fn1'],
    }]

    const result = generator.generateL1(mockFiles, 'TestProject')

    expect(result.project.name).toBe('TestProject')
    expect(result.project.totalFiles).toBe(1)
    expect(result.project.totalLOC).toBe(50)
    expect(result.modules).toHaveLength(1)
    expect(result.summary.totalClasses).toBe(1)
    expect(result.summary.totalFunctions).toBe(1)
  })
})

describe('TOONEncoder', () => {
  it('should encode L1 output to TOON format', () => {
    const encoder = new TOONEncoder()
    const mockOutput = {
      level: 1 as const,
      data: {
        project: {
          name: 'Test',
          language: 'TypeScript',
          totalFiles: 1,
          totalLOC: 100,
          analyzedAt: '2025-01-01T00:00:00.000Z',
        },
        modules: [{
          name: 'test',
          path: 'test.ts',
          purpose: 'Testing',
          loc: 100,
          exports: 2,
          imports: 1,
        }],
        summary: {
          totalClasses: 1,
          totalFunctions: 3,
          totalDependencies: 1,
        },
      },
      metadata: {
        generatedAt: '2025-01-01T00:00:00.000Z',
        tokensEstimate: 0,
      },
    }

    const toon = encoder.encode(mockOutput)

    expect(toon).toContain('Level 1')
    expect(toon).toContain('project[')
    expect(toon).toContain('modules[')
    expect(toon).toContain('summary[')
  })

  it('should estimate tokens', () => {
    const encoder = new TOONEncoder()
    const text = 'a'.repeat(100)

    const tokens = encoder.estimateTokens(text)

    expect(tokens).toBe(25) // 100 / 4 = 25
  })
})
