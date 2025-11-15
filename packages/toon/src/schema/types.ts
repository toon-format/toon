/**
 * Schema Types
 *
 * @fileoverview TypeScript type definitions for schema validation in TOON format.
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

// #region Primitive types

/**
 * Primitive types supported by schema validation.
 */
export type PrimitiveType = 'int' | 'float' | 'string' | 'bool' | 'email' | 'url' | 'datetime'

// #endregion

// #region Field definition

/**
 * Field definition within a schema.
 *
 * @remarks
 * Defines the structure and validation rules for a single field in a schema.
 * Supports primitive types, arrays, and schema references.
 */
export interface FieldDefinition {
  /**
   * Type of the field (primitive, array, or schema reference).
   *
   * @remarks
   * - Primitive types: 'int', 'float', 'string', 'bool', 'email', 'url', 'datetime'
   * - Arrays: 'int[]', 'string[]', etc.
   * - Schema references: string name of another schema (e.g., 'User')
   */
  type: PrimitiveType | `${PrimitiveType}[]` | string

  /**
   * Field is required (default: false).
   *
   * @remarks
   * When true, the field must be present in the data.
   * Mutually exclusive with optional.
   */
  required?: boolean

  /**
   * Field is optional (default: false, opposite of required).
   *
   * @remarks
   * When true, the field may be omitted from the data.
   * Mutually exclusive with required.
   */
  optional?: boolean

  /**
   * Minimum value/length.
   *
   * @remarks
   * - For numbers: minimum numeric value
   * - For strings: minimum string length
   */
  min?: number | string

  /**
   * Maximum value/length.
   *
   * @remarks
   * - For numbers: maximum numeric value
   * - For strings: maximum string length
   */
  max?: number | string

  /**
   * Validation pattern (regex).
   *
   * @remarks
   * Regular expression pattern for string validation.
   * Can be provided as a string or RegExp object.
   */
  pattern?: string | RegExp

  /**
   * Enum of allowed values.
   *
   * @remarks
   * Array of allowed values for the field.
   * Value must match one of the enum values.
   */
  enum?: readonly unknown[]

  /**
   * Default value.
   *
   * @remarks
   * Default value to use when the field is omitted.
   * Applied before validation.
   */
  default?: unknown
}

// #endregion

// #region Schema definition

/**
 * Schema definition for data validation.
 *
 * @remarks
 * Defines a schema with a name, version, and field definitions.
 * Schemas can extend other schemas (future feature).
 */
export interface SchemaDefinition {
  /**
   * Schema name (must be unique).
   *
   * @remarks
   * Used to identify the schema in the registry.
   * Must be unique across all registered schemas.
   */
  name: string

  /**
   * Schema version (optional).
   *
   * @remarks
   * Version number for schema versioning.
   * Can be used for schema evolution and migration.
   */
  version?: number

  /**
   * Field definitions.
   *
   * @remarks
   * Record of field names to field definitions.
   * Defines the structure and validation rules for each field.
   */
  fields: Record<string, FieldDefinition>

  /**
   * Extends another schema (optional).
   *
   * @remarks
   * Name of another schema to extend.
   * Inherits fields from the extended schema.
   * Not yet implemented.
   */
  extends?: string
}

// #endregion

// #region Validation result

/**
 * Result of schema validation.
 *
 * @remarks
 * Contains the validation status and any errors found during validation.
 */
export interface ValidationResult {
  /**
   * Whether validation passed.
   *
   * @remarks
   * True if all validations passed, false otherwise.
   */
  valid: boolean

  /**
   * Array of validation errors (empty if valid).
   *
   * @remarks
   * Contains all validation errors found during validation.
   * Empty array if validation passed.
   */
  errors: ValidationError[]
}

// #endregion

// #region Validation error

/**
 * Individual validation error.
 *
 * @remarks
 * Represents a single validation error with field name, value, and error message.
 */
export interface ValidationError {
  /**
   * Field name that failed validation.
   *
   * @remarks
   * Name of the field that failed validation.
   * For nested structures, this is the field name at the current level.
   */
  field: string

  /**
   * Value that failed validation.
   *
   * @remarks
   * The actual value that failed validation.
   * Can be any type (primitive, object, array, etc.).
   */
  value: unknown

  /**
   * Error message.
   *
   * @remarks
   * Human-readable error message describing the validation failure.
   */
  message: string

  /**
   * Path to the field (for nested structures).
   *
   * @remarks
   * Dot-separated path to the field in nested structures.
   * Example: 'user.address.city' for nested fields.
   * Optional for top-level fields.
   */
  path?: string
}

// #endregion

