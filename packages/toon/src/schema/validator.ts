/**
 * Schema Validator
 *
 * @fileoverview Validation engine for schema-based data validation in TOON format.
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

import type { FieldDefinition, SchemaDefinition, ValidationError, ValidationResult } from './types'
import type { JsonObject, JsonPrimitive, JsonValue } from '../types'
import { SchemaRegistry } from './registry'

// #region Main validation function

/**
 * Validates a value against a schema definition.
 *
 * @param value - Value to validate
 * @param schema - Schema definition
 * @param path - Current path (for nested validation)
 * @returns Validation result
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
 * const result = validateWithSchema({ id: 1, name: 'Alice' }, schema)
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors)
 * }
 * ```
 */
export function validateWithSchema(
  value: unknown,
  schema: SchemaDefinition,
  path: string = '',
): ValidationResult {
  const errors: ValidationError[] = []

  // Validate object structure
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    errors.push({
      field: path || 'root',
      value,
      message: `Expected object, got ${Array.isArray(value) ? 'array' : typeof value}`,
      path,
    })
    return { valid: false, errors }
  }

  const obj = value as JsonObject

  // Validate each field in the schema
  for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
    const fieldPath = path ? `${path}.${fieldName}` : fieldName
    const fieldValue = obj[fieldName]

    // Check required fields
    if (fieldDef.required && fieldValue === undefined) {
      errors.push({
        field: fieldName,
        value: undefined,
        message: `Required field "${fieldName}" is missing`,
        path: fieldPath,
      })
      continue
    }

    // Skip optional/undefined fields
    if (fieldValue === undefined) {
      if (fieldDef.default !== undefined) {
        // Apply default value (note: this doesn't modify the original object)
        continue
      }
      if (fieldDef.optional) {
        continue
      }
    }

    // Validate field value
    if (fieldValue !== undefined) {
      const fieldErrors = validateField(fieldValue, fieldDef, fieldPath)
      errors.push(...fieldErrors)
    }
  }

  // Check for unknown fields (optional - could be configurable)
  // This is commented out by default to allow extra fields
  // for (const key in obj) {
  //   if (!(key in schema.fields)) {
  //     errors.push({
  //       field: key,
  //       value: obj[key],
  //       message: `Unknown field "${key}"`,
  //       path: path ? `${path}.${key}` : key,
  //     })
  //   }
  // }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// #endregion

// #region Field validation

/**
 * Validates a single field against its definition.
 *
 * @param value - Field value
 * @param fieldDef - Field definition
 * @param path - Field path
 * @returns Array of validation errors
 */
function validateField(
  value: unknown,
  fieldDef: FieldDefinition,
  path: string,
): ValidationError[] {
  const errors: ValidationError[] = []

  // Handle schema references
  if (typeof fieldDef.type === 'string' && fieldDef.type.startsWith('@')) {
    const schemaName = fieldDef.type.slice(1)
    const referencedSchema = SchemaRegistry.get(schemaName)
    if (referencedSchema) {
      const result = validateWithSchema(value, referencedSchema, path)
      if (!result.valid) {
        errors.push(...result.errors)
      }
    }
    return errors
  }

  // Handle array types
  if (typeof fieldDef.type === 'string' && fieldDef.type.endsWith('[]')) {
    if (!Array.isArray(value)) {
      errors.push({
        field: path,
        value,
        message: `Expected array, got ${typeof value}`,
        path,
      })
      return errors
    }

    const elementType = fieldDef.type.slice(0, -2) as string
    for (let i = 0; i < value.length; i++) {
      const elementErrors = validatePrimitive(value[i], elementType, `${path}[${i}]`)
      errors.push(...elementErrors)
    }
    return errors
  }

  // Validate primitive type
  const typeErrors = validatePrimitive(value, fieldDef.type as string, path)
  errors.push(...typeErrors)

  // Validate constraints
  if (fieldDef.min !== undefined) {
    if (typeof value === 'number' && value < (fieldDef.min as number)) {
      errors.push({
        field: path,
        value,
        message: `Value ${value} is less than minimum ${fieldDef.min}`,
        path,
      })
    }
    else if (typeof value === 'string' && value.length < (fieldDef.min as number)) {
      errors.push({
        field: path,
        value,
        message: `String length ${value.length} is less than minimum ${fieldDef.min}`,
        path,
      })
    }
  }

  if (fieldDef.max !== undefined) {
    if (typeof value === 'number' && value > (fieldDef.max as number)) {
      errors.push({
        field: path,
        value,
        message: `Value ${value} is greater than maximum ${fieldDef.max}`,
        path,
      })
    }
    else if (typeof value === 'string' && value.length > (fieldDef.max as number)) {
      errors.push({
        field: path,
        value,
        message: `String length ${value.length} is greater than maximum ${fieldDef.max}`,
        path,
      })
    }
  }

  if (fieldDef.pattern) {
    const pattern = typeof fieldDef.pattern === 'string' ? new RegExp(fieldDef.pattern) : fieldDef.pattern
    if (typeof value === 'string' && !pattern.test(value)) {
      errors.push({
        field: path,
        value,
        message: `Value does not match pattern ${pattern}`,
        path,
      })
    }
  }

  if (fieldDef.enum && !fieldDef.enum.includes(value)) {
    errors.push({
      field: path,
      value,
      message: `Value is not in enum ${JSON.stringify(fieldDef.enum)}`,
      path,
    })
  }

  return errors
}

// #endregion

// #region Primitive validation

/**
 * Validates a primitive value against a type.
 *
 * @param value - Value to validate
 * @param type - Expected type
 * @param path - Field path
 * @returns Array of validation errors
 */
function validatePrimitive(
  value: unknown,
  type: string,
  path: string,
): ValidationError[] {
  const errors: ValidationError[] = []

  switch (type) {
    case 'int':
      if (!Number.isInteger(value)) {
        errors.push({
          field: path,
          value,
          message: `Expected integer, got ${typeof value}`,
          path,
        })
      }
      break

    case 'float':
      if (typeof value !== 'number') {
        errors.push({
          field: path,
          value,
          message: `Expected number, got ${typeof value}`,
          path,
        })
      }
      break

    case 'string':
      if (typeof value !== 'string') {
        errors.push({
          field: path,
          value,
          message: `Expected string, got ${typeof value}`,
          path,
        })
      }
      break

    case 'bool':
      if (typeof value !== 'boolean') {
        errors.push({
          field: path,
          value,
          message: `Expected boolean, got ${typeof value}`,
          path,
        })
      }
      break

    case 'email':
      if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push({
          field: path,
          value,
          message: `Expected valid email address, got ${typeof value}`,
          path,
        })
      }
      break

    case 'url':
      if (typeof value !== 'string') {
        errors.push({
          field: path,
          value,
          message: `Expected string, got ${typeof value}`,
          path,
        })
      }
      else {
        try {
          new URL(value)
        }
        catch {
          errors.push({
            field: path,
            value,
            message: 'Expected valid URL, got invalid URL',
            path,
          })
        }
      }
      break

    case 'datetime':
      if (typeof value !== 'string') {
        errors.push({
          field: path,
          value,
          message: `Expected string, got ${typeof value}`,
          path,
        })
      }
      else {
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) {
          errors.push({
            field: path,
            value,
            message: 'Expected valid datetime string, got invalid date',
            path,
          })
        }
      }
      break

    default:
      // Unknown type - could be a schema reference
      // This will be handled by the caller
      break
  }

  return errors
}

// #endregion

