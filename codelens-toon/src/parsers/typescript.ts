/**
 * TypeScript/JavaScript parser using Tree-sitter
 */

import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'
import type { ClassInfo, FunctionInfo } from '../types/index.js'

export interface ParsedFile {
  path: string
  loc: number
  classes: ClassInfo[]
  functions: FunctionInfo[]
  imports: string[]
  exports: string[]
}

export class TypeScriptParser {
  private parser: Parser

  constructor() {
    this.parser = new Parser()
    // Use the typescript language for TypeScript/JavaScript files
    this.parser.setLanguage(TypeScript.typescript)
  }

  /**
   * Parse a TypeScript/JavaScript file and extract structure
   */
  parse(sourceCode: string, filePath: string): ParsedFile {
    const tree = this.parser.parse(sourceCode)
    const rootNode = tree.rootNode

    const result: ParsedFile = {
      path: filePath,
      loc: this.countLines(sourceCode),
      classes: [],
      functions: [],
      imports: [],
      exports: [],
    }

    this.extractStructure(rootNode, result, filePath)

    return result
  }

  private extractStructure(node: Parser.SyntaxNode, result: ParsedFile, modulePath: string): void {
    const traverse = (n: Parser.SyntaxNode) => {
      switch (n.type) {
        case 'class_declaration':
          result.classes.push(this.extractClass(n, modulePath))
          break

        case 'function_declaration':
          result.functions.push(this.extractFunction(n, modulePath))
          break

        case 'arrow_function':
        case 'function_expression':
          // Only extract if it's assigned to a variable/export
          if (n.parent?.type === 'variable_declarator' || n.parent?.type === 'export_statement') {
            result.functions.push(this.extractFunction(n, modulePath))
          }
          break

        case 'import_statement':
          this.extractImports(n, result)
          break

        case 'export_statement':
          this.extractExports(n, result)
          break
      }

      // Recursively traverse children
      for (const child of n.children) {
        traverse(child)
      }
    }

    traverse(node)
  }

  private extractClass(node: Parser.SyntaxNode, modulePath: string): ClassInfo {
    const nameNode = node.childForFieldName('name')
    const bodyNode = node.childForFieldName('body')

    const methods = this.countMethods(bodyNode)
    const properties = this.countProperties(bodyNode)

    return {
      module: modulePath,
      name: nameNode?.text || 'Anonymous',
      methods,
      properties,
      loc: node.endPosition.row - node.startPosition.row + 1,
      exported: this.isExported(node),
    }
  }

  private extractFunction(node: Parser.SyntaxNode, modulePath: string): FunctionInfo {
    let nameNode = node.childForFieldName('name')

    // For arrow functions, get the name from parent variable declarator
    if (!nameNode && node.parent?.type === 'variable_declarator') {
      nameNode = node.parent.childForFieldName('name')
    }

    const paramsNode = node.childForFieldName('parameters')
    const params = paramsNode?.namedChildCount || 0

    return {
      module: modulePath,
      name: nameNode?.text || 'anonymous',
      params,
      loc: node.endPosition.row - node.startPosition.row + 1,
      complexity: this.estimateComplexity(node),
      async: this.isAsync(node),
      exported: this.isExported(node),
    }
  }

  private countMethods(bodyNode: Parser.SyntaxNode | null): number {
    if (!bodyNode)
      return 0

    let count = 0
    for (const child of bodyNode.children) {
      if (child.type === 'method_definition' || child.type === 'public_field_definition') {
        const value = child.childForFieldName('value')
        if (value?.type.includes('function') || value?.type.includes('arrow')) {
          count++
        }
      }
    }
    return count
  }

  private countProperties(bodyNode: Parser.SyntaxNode | null): number {
    if (!bodyNode)
      return 0

    let count = 0
    for (const child of bodyNode.children) {
      if (child.type === 'public_field_definition' || child.type === 'property_definition') {
        const value = child.childForFieldName('value')
        // Only count non-function properties
        if (!value || (!value.type.includes('function') && !value.type.includes('arrow'))) {
          count++
        }
      }
    }
    return count
  }

  private estimateComplexity(node: Parser.SyntaxNode): number {
    // Simple cyclomatic complexity estimation
    let complexity = 1

    const traverse = (n: Parser.SyntaxNode) => {
      if (['if_statement', 'switch_statement', 'for_statement', 'while_statement', 'do_statement', 'conditional_expression'].includes(n.type)) {
        complexity++
      }
      for (const child of n.children) {
        traverse(child)
      }
    }

    traverse(node)
    return complexity
  }

  private isAsync(node: Parser.SyntaxNode): boolean {
    // Check if node has async modifier
    for (const child of node.children) {
      if (child.type === 'async' || child.text === 'async') {
        return true
      }
    }
    return false
  }

  private isExported(node: Parser.SyntaxNode): boolean {
    // Check if node or its parent is an export
    let current: Parser.SyntaxNode | null = node
    while (current) {
      if (current.type === 'export_statement' || current.text?.startsWith('export')) {
        return true
      }
      current = current.parent
    }
    return false
  }

  private extractImports(node: Parser.SyntaxNode, result: ParsedFile): void {
    const sourceNode = node.childForFieldName('source')
    if (sourceNode) {
      const importPath = sourceNode.text.replace(/['"]/g, '')
      result.imports.push(importPath)
    }
  }

  private extractExports(node: Parser.SyntaxNode, result: ParsedFile): void {
    const declarationNode = node.childForFieldName('declaration')
    if (declarationNode) {
      const nameNode = declarationNode.childForFieldName('name')
      if (nameNode) {
        result.exports.push(nameNode.text)
      }
    }
  }

  private countLines(code: string): number {
    return code.split('\n').length
  }
}
