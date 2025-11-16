/**
 * Generators for different analysis levels
 */

import type { ParsedFile } from '../parsers/typescript.js'
import type {
  ClassInfo,
  FunctionInfo,
  Level1Output,
  Level2Output,
  Level3Output,
  ModuleInfo,
  ProjectMetadata,
} from '../types/index.js'

export class CodeLensGenerator {
  /**
   * Generate Level 1: Project Overview
   */
  generateL1(files: ParsedFile[], projectName: string): Level1Output {
    const modules = this.aggregateModules(files)
    const totalClasses = files.reduce((sum, f) => sum + f.classes.length, 0)
    const totalFunctions = files.reduce((sum, f) => sum + f.functions.length, 0)

    return {
      project: {
        name: projectName,
        language: 'TypeScript',
        totalFiles: files.length,
        totalLOC: files.reduce((sum, f) => sum + f.loc, 0),
        analyzedAt: new Date().toISOString(),
      },
      modules,
      summary: {
        totalClasses,
        totalFunctions,
        totalDependencies: files.reduce((sum, f) => sum + f.imports.length, 0),
      },
    }
  }

  /**
   * Generate Level 2: Module/Class Signatures
   */
  generateL2(files: ParsedFile[], projectName: string): Level2Output {
    const modules = this.aggregateModules(files)
    const classes: ClassInfo[] = []
    const functions: FunctionInfo[] = []

    for (const file of files) {
      classes.push(...file.classes)
      functions.push(...file.functions)
    }

    return {
      project: {
        name: projectName,
        language: 'TypeScript',
        totalFiles: files.length,
        totalLOC: files.reduce((sum, f) => sum + f.loc, 0),
        analyzedAt: new Date().toISOString(),
      },
      modules,
      classes,
      functions,
    }
  }

  /**
   * Generate Level 3: Detailed Implementations (stub - would include code bodies)
   */
  generateL3(files: ParsedFile[], projectName: string): Level3Output {
    const modules = this.aggregateModules(files)

    // For L3, we would include actual code bodies
    // This is a simplified version
    return {
      project: {
        name: projectName,
        language: 'TypeScript',
        totalFiles: files.length,
        totalLOC: files.reduce((sum, f) => sum + f.loc, 0),
        analyzedAt: new Date().toISOString(),
      },
      modules,
      classes: files.flatMap(file =>
        file.classes.map(cls => ({
          module: file.path,
          name: cls.name,
          methods: [
            // This would be populated with actual method bodies
            {
              name: 'placeholder',
              signature: 'placeholder(): void',
              loc: 0,
              body: '// Method body would be included here',
            },
          ],
        })),
      ),
      functions: files.flatMap(file =>
        file.functions.map(fn => ({
          module: file.path,
          name: fn.name,
          signature: `${fn.name}(${Array.from({ length: fn.params }).map((_, i) => `param${i}`).join(', ')}): unknown`,
          loc: fn.loc,
          body: '// Function body would be included here',
        })),
      ),
    }
  }

  private aggregateModules(files: ParsedFile[]): ModuleInfo[] {
    return files.map(file => ({
      name: this.getModuleName(file.path),
      path: file.path,
      purpose: this.inferPurpose(file),
      loc: file.loc,
      exports: file.exports.length,
      imports: file.imports.length,
    }))
  }

  private getModuleName(path: string): string {
    const parts = path.split('/')
    const fileName = parts[parts.length - 1]
    return fileName.replace(/\.(ts|js|tsx|jsx)$/, '')
  }

  private inferPurpose(file: ParsedFile): string {
    // Simple heuristic-based purpose inference
    const name = this.getModuleName(file.path).toLowerCase()

    if (name.includes('test'))
      return 'Testing'
    if (name.includes('util') || name.includes('helper'))
      return 'Utilities'
    if (name.includes('type') || name.includes('interface'))
      return 'Type definitions'
    if (name.includes('config'))
      return 'Configuration'
    if (name.includes('api') || name.includes('service'))
      return 'API/Service layer'
    if (name.includes('component'))
      return 'UI Component'
    if (name.includes('model') || name.includes('schema'))
      return 'Data model'
    if (file.classes.length > 0)
      return 'Class definitions'
    if (file.functions.length > 0)
      return 'Functions and logic'

    return 'General module'
  }
}
