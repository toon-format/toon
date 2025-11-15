/**
 * Schema Registry
 *
 * @fileoverview Registry for managing schema definitions in TOON format.
 *
 * Copyright (c) 2025 Hermann del Campo
 * Email: hermann.delcampo@raiva.io
 * License: MIT (same as TOON project)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import type { SchemaDefinition } from './types'

/**
 * Registry for managing schema definitions.
 *
 * @remarks
 * Provides a centralized registry for schema definitions.
 * Schemas can be registered and retrieved by name.
 * Useful for managing reusable schemas across an application.
 *
 * @example
 * ```ts
 * const schema: SchemaDefinition = {
 *   name: 'User',
 *   fields: {
 *     id: { type: 'int', required: true },
 *     name: { type: 'string', required: true },
 *   },
 * }
 *
 * SchemaRegistry.register(schema)
 * const retrieved = SchemaRegistry.get('User')
 * ```
 */
export class SchemaRegistry {
  private static schemas = new Map<string, SchemaDefinition>()

  /**
   * Register a schema definition.
   *
   * @param schema - Schema definition to register
   * @throws Error if schema with the same name already exists
   *
   * @example
   * ```ts
   * SchemaRegistry.register({
   *   name: 'User',
   *   fields: { id: { type: 'int', required: true } },
   * })
   * ```
   */
  static register(schema: SchemaDefinition): void {
    if (this.schemas.has(schema.name)) {
      throw new Error(`Schema "${schema.name}" is already registered`)
    }
    this.schemas.set(schema.name, schema)
  }

  /**
   * Get a schema by name.
   *
   * @param name - Schema name
   * @returns Schema definition or undefined if not found
   *
   * @example
   * ```ts
   * const schema = SchemaRegistry.get('User')
   * if (schema) {
   *   // Use schema
   * }
   * ```
   */
  static get(name: string): SchemaDefinition | undefined {
    return this.schemas.get(name)
  }

  /**
   * Check if a schema exists.
   *
   * @param name - Schema name
   * @returns True if schema exists
   *
   * @example
   * ```ts
   * if (SchemaRegistry.has('User')) {
   *   // Schema exists
   * }
   * ```
   */
  static has(name: string): boolean {
    return this.schemas.has(name)
  }

  /**
   * Clear all registered schemas.
   *
   * @remarks
   * Useful for testing or resetting the registry.
   * Removes all registered schemas from memory.
   *
   * @example
   * ```ts
   * // In test setup
   * beforeEach(() => {
   *   SchemaRegistry.clear()
   * })
   * ```
   */
  static clear(): void {
    this.schemas.clear()
  }

  /**
   * Get all registered schema names.
   *
   * @returns Array of schema names
   *
   * @example
   * ```ts
   * const schemaNames = SchemaRegistry.list()
   * console.log(`Registered schemas: ${schemaNames.join(', ')}`)
   * ```
   */
  static list(): string[] {
    return Array.from(this.schemas.keys())
  }
}

