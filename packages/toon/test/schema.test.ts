/**
 * Schema Tests
 *
 * @fileoverview Comprehensive test suite for schema validation functionality in TOON format.
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

import { beforeEach, describe, expect, it } from 'vitest'
import { SchemaRegistry, validateWithSchema } from '../src/schema'
import { encode } from '../src/index'
import type { SchemaDefinition } from '../src/schema'

// #region SchemaRegistry tests

describe('SchemaRegistry', () => {
  beforeEach(() => {
    SchemaRegistry.clear()
  })

  describe('register', () => {
    it('should register a schema', () => {
      const schema: SchemaDefinition = {
        name: 'User',
        fields: {
          id: { type: 'int', required: true },
          name: { type: 'string', required: true },
        },
      }

      expect(() => SchemaRegistry.register(schema)).not.toThrow()
      expect(SchemaRegistry.has('User')).toBe(true)
    })

    it('should throw error when registering duplicate schema', () => {
      const schema: SchemaDefinition = {
        name: 'User',
        fields: {},
      }

      SchemaRegistry.register(schema)
      expect(() => SchemaRegistry.register(schema)).toThrow('already registered')
    })

    it('should register multiple different schemas', () => {
      const userSchema: SchemaDefinition = {
        name: 'User',
        fields: { id: { type: 'int' } },
      }
      const postSchema: SchemaDefinition = {
        name: 'Post',
        fields: { id: { type: 'int' } },
      }

      SchemaRegistry.register(userSchema)
      SchemaRegistry.register(postSchema)

      expect(SchemaRegistry.has('User')).toBe(true)
      expect(SchemaRegistry.has('Post')).toBe(true)
    })
  })

  describe('get', () => {
    it('should get registered schema', () => {
      const schema: SchemaDefinition = {
        name: 'User',
        fields: {
          id: { type: 'int', required: true },
          name: { type: 'string', required: true },
        },
      }

      SchemaRegistry.register(schema)
      const retrieved = SchemaRegistry.get('User')

      expect(retrieved).toEqual(schema)
    })

    it('should return undefined for non-existent schema', () => {
      const retrieved = SchemaRegistry.get('NonExistent')
      expect(retrieved).toBeUndefined()
    })
  })

  describe('has', () => {
    it('should return true for registered schema', () => {
      const schema: SchemaDefinition = {
        name: 'User',
        fields: {},
      }

      SchemaRegistry.register(schema)
      expect(SchemaRegistry.has('User')).toBe(true)
    })

    it('should return false for non-existent schema', () => {
      expect(SchemaRegistry.has('NonExistent')).toBe(false)
    })
  })

  describe('clear', () => {
    it('should clear all registered schemas', () => {
      const schema1: SchemaDefinition = {
        name: 'User',
        fields: {},
      }
      const schema2: SchemaDefinition = {
        name: 'Post',
        fields: {},
      }

      SchemaRegistry.register(schema1)
      SchemaRegistry.register(schema2)
      expect(SchemaRegistry.has('User')).toBe(true)
      expect(SchemaRegistry.has('Post')).toBe(true)

      SchemaRegistry.clear()

      expect(SchemaRegistry.has('User')).toBe(false)
      expect(SchemaRegistry.has('Post')).toBe(false)
      expect(SchemaRegistry.list()).toEqual([])
    })
  })

  describe('list', () => {
    it('should return empty array when no schemas registered', () => {
      expect(SchemaRegistry.list()).toEqual([])
    })

    it('should return all registered schema names', () => {
      const schema1: SchemaDefinition = {
        name: 'User',
        fields: {},
      }
      const schema2: SchemaDefinition = {
        name: 'Post',
        fields: {},
      }
      const schema3: SchemaDefinition = {
        name: 'Comment',
        fields: {},
      }

      SchemaRegistry.register(schema1)
      SchemaRegistry.register(schema2)
      SchemaRegistry.register(schema3)

      const names = SchemaRegistry.list()
      expect(names).toContain('User')
      expect(names).toContain('Post')
      expect(names).toContain('Comment')
      expect(names.length).toBe(3)
    })
  })
})

// #endregion

// #region validateWithSchema tests

describe('validateWithSchema', () => {
  beforeEach(() => {
    SchemaRegistry.clear()
  })

  describe('basic validation', () => {
    it('should validate valid data', () => {
      const schema: SchemaDefinition = {
        name: 'User',
        fields: {
          id: { type: 'int', required: true },
          name: { type: 'string', required: true },
          email: { type: 'email', required: true },
        },
      }

      const data = {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
      }

      const result = validateWithSchema(data, schema)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid data types', () => {
      const schema: SchemaDefinition = {
        name: 'User',
        fields: {
          id: { type: 'int', required: true },
          name: { type: 'string', required: true },
        },
      }

      const data = {
        id: 'not-a-number',
        name: 123,
      }

      const result = validateWithSchema(data, schema)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.message.includes('integer'))).toBe(true)
      expect(result.errors.some(e => e.message.includes('string'))).toBe(true)
    })

    it('should reject non-object values', () => {
      const schema: SchemaDefinition = {
        name: 'User',
        fields: {},
      }

      const result1 = validateWithSchema(null, schema)
      expect(result1.valid).toBe(false)
      expect(result1.errors[0]?.message).toContain('object')

      const result2 = validateWithSchema([], schema)
      expect(result2.valid).toBe(false)
      expect(result2.errors[0]?.message).toContain('array')

      const result3 = validateWithSchema('string', schema)
      expect(result3.valid).toBe(false)
      expect(result3.errors[0]?.message).toContain('object')
    })
  })

  describe('required fields', () => {
    it('should reject missing required fields', () => {
      const schema: SchemaDefinition = {
        name: 'User',
        fields: {
          id: { type: 'int', required: true },
          name: { type: 'string', required: true },
        },
      }

      const data = {
        id: 1,
        // name is missing
      }

      const result = validateWithSchema(data, schema)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Required field') && e.field === 'name')).toBe(true)
    })

    it('should accept undefined optional fields', () => {
      const schema: SchemaDefinition = {
        name: 'User',
        fields: {
          id: { type: 'int', required: true },
          name: { type: 'string', optional: true },
        },
      }

      const data = {
        id: 1,
        // name is optional, so it's OK to omit it
      }

      const result = validateWithSchema(data, schema)
      expect(result.valid).toBe(true)
    })

    it('should allow null for non-required fields', () => {
      const schema: SchemaDefinition = {
        name: 'User',
        fields: {
          id: { type: 'int', required: true },
          name: { type: 'string', optional: true },
        },
      }

      const data = {
        id: 1,
        name: null,
      }

      // Note: null values should still be validated if present
      // This test shows that optional fields can be omitted
      const result = validateWithSchema(data, schema)
      // null is not a string, so this should fail
      expect(result.valid).toBe(false)
    })
  })

  describe('primitive type validation', () => {
    describe('int', () => {
      it('should validate integer values', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'int', required: true },
          },
        }

        expect(validateWithSchema({ value: 0 }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 42 }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: -42 }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: Number.MAX_SAFE_INTEGER }, schema).valid).toBe(true)
      })

      it('should reject non-integer values', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'int', required: true },
          },
        }

        expect(validateWithSchema({ value: 3.14 }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: '42' }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: true }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: null }, schema).valid).toBe(false)
      })
    })

    describe('float', () => {
      it('should validate number values', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'float', required: true },
          },
        }

        expect(validateWithSchema({ value: 0 }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 42 }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 3.14 }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: -42.5 }, schema).valid).toBe(true)
      })

      it('should reject non-number values', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'float', required: true },
          },
        }

        expect(validateWithSchema({ value: '3.14' }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: true }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: null }, schema).valid).toBe(false)
      })
    })

    describe('string', () => {
      it('should validate string values', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'string', required: true },
          },
        }

        expect(validateWithSchema({ value: '' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 'hello' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: '123' }, schema).valid).toBe(true)
      })

      it('should reject non-string values', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'string', required: true },
          },
        }

        expect(validateWithSchema({ value: 123 }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: true }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: null }, schema).valid).toBe(false)
      })
    })

    describe('bool', () => {
      it('should validate boolean values', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'bool', required: true },
          },
        }

        expect(validateWithSchema({ value: true }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: false }, schema).valid).toBe(true)
      })

      it('should reject non-boolean values', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'bool', required: true },
          },
        }

        expect(validateWithSchema({ value: 'true' }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: 1 }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: 0 }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: null }, schema).valid).toBe(false)
      })
    })

    describe('email', () => {
      it('should validate valid email addresses', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'email', required: true },
          },
        }

        expect(validateWithSchema({ value: 'alice@example.com' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 'user.name+tag@example.co.uk' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 'test@subdomain.example.com' }, schema).valid).toBe(true)
      })

      it('should reject invalid email addresses', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'email', required: true },
          },
        }

        expect(validateWithSchema({ value: 'invalid-email' }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: '@example.com' }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: 'user@' }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: 'user @example.com' }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: 123 }, schema).valid).toBe(false)
      })
    })

    describe('url', () => {
      it('should validate valid URLs', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'url', required: true },
          },
        }

        expect(validateWithSchema({ value: 'https://example.com' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 'http://example.com/path' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 'https://example.com:8080/path?query=value' }, schema).valid).toBe(true)
      })

      it('should reject invalid URLs', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'url', required: true },
          },
        }

        expect(validateWithSchema({ value: 'not-a-url' }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: 'example.com' }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: 'ftp://example.com' }, schema).valid).toBe(true) // Valid URL
        expect(validateWithSchema({ value: 123 }, schema).valid).toBe(false)
      })
    })

    describe('datetime', () => {
      it('should validate valid datetime strings', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'datetime', required: true },
          },
        }

        expect(validateWithSchema({ value: '2025-01-01T00:00:00.000Z' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: '2025-11-05T12:34:56.789Z' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: '2025-01-01' }, schema).valid).toBe(true) // Date only
      })

      it('should reject invalid datetime strings', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'datetime', required: true },
          },
        }

        expect(validateWithSchema({ value: 'invalid-date' }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: '2025-13-01' }, schema).valid).toBe(false) // Invalid month
        expect(validateWithSchema({ value: 123 }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: null }, schema).valid).toBe(false)
      })
    })
  })

  describe('array validation', () => {
    it('should validate arrays of primitives', () => {
      const schema: SchemaDefinition = {
        name: 'Test',
        fields: {
          items: { type: 'int[]', required: true },
        },
      }

      expect(validateWithSchema({ items: [1, 2, 3] }, schema).valid).toBe(true)
      expect(validateWithSchema({ items: [] }, schema).valid).toBe(true)
    })

    it('should reject non-array values for array types', () => {
      const schema: SchemaDefinition = {
        name: 'Test',
        fields: {
          items: { type: 'int[]', required: true },
        },
      }

      expect(validateWithSchema({ items: 123 }, schema).valid).toBe(false)
      expect(validateWithSchema({ items: 'array' }, schema).valid).toBe(false)
      expect(validateWithSchema({ items: {} }, schema).valid).toBe(false)
    })

    it('should validate array elements', () => {
      const schema: SchemaDefinition = {
        name: 'Test',
        fields: {
          items: { type: 'string[]', required: true },
        },
      }

      expect(validateWithSchema({ items: ['a', 'b', 'c'] }, schema).valid).toBe(true)
      expect(validateWithSchema({ items: [1, 2, 3] }, schema).valid).toBe(false)
      expect(validateWithSchema({ items: ['a', 2, 'c'] }, schema).valid).toBe(false)
    })

    it('should provide path information for array element errors', () => {
      const schema: SchemaDefinition = {
        name: 'Test',
        fields: {
          items: { type: 'int[]', required: true },
        },
      }

      const result = validateWithSchema({ items: [1, 'invalid', 3] }, schema)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.path?.includes('[1]'))).toBe(true)
    })
  })

  describe('constraint validation', () => {
    describe('min constraint', () => {
      it('should validate min for numbers', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'int', required: true, min: 0 },
          },
        }

        expect(validateWithSchema({ value: 0 }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 10 }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: -1 }, schema).valid).toBe(false)
      })

      it('should validate min length for strings', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'string', required: true, min: 3 },
          },
        }

        expect(validateWithSchema({ value: 'abc' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 'abcd' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 'ab' }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: '' }, schema).valid).toBe(false)
      })
    })

    describe('max constraint', () => {
      it('should validate max for numbers', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'int', required: true, max: 100 },
          },
        }

        expect(validateWithSchema({ value: 100 }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 50 }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 101 }, schema).valid).toBe(false)
      })

      it('should validate max length for strings', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'string', required: true, max: 5 },
          },
        }

        expect(validateWithSchema({ value: 'abc' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 'abcde' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 'abcdef' }, schema).valid).toBe(false)
      })
    })

    describe('pattern constraint', () => {
      it('should validate string pattern', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'string', required: true, pattern: '^[A-Z]{3}$' },
          },
        }

        expect(validateWithSchema({ value: 'ABC' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 'XYZ' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: 'abc' }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: 'ABCD' }, schema).valid).toBe(false)
      })

      it('should validate with RegExp pattern', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}$/ },
          },
        }

        expect(validateWithSchema({ value: '2025-01-01' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: '2025-12-31' }, schema).valid).toBe(true)
        expect(validateWithSchema({ value: '25-01-01' }, schema).valid).toBe(false)
        expect(validateWithSchema({ value: 'invalid' }, schema).valid).toBe(false)
      })

      it('should only validate pattern for strings', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            value: { type: 'int', required: true, pattern: '^\\d+$' },
          },
        }

        // Pattern validation should not apply to non-strings
        expect(validateWithSchema({ value: 123 }, schema).valid).toBe(true)
      })
    })

    describe('enum constraint', () => {
      it('should validate enum values', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            status: { type: 'string', required: true, enum: ['active', 'inactive', 'pending'] },
          },
        }

        expect(validateWithSchema({ status: 'active' }, schema).valid).toBe(true)
        expect(validateWithSchema({ status: 'inactive' }, schema).valid).toBe(true)
        expect(validateWithSchema({ status: 'pending' }, schema).valid).toBe(true)
        expect(validateWithSchema({ status: 'unknown' }, schema).valid).toBe(false)
      })

      it('should validate enum with numbers', () => {
        const schema: SchemaDefinition = {
          name: 'Test',
          fields: {
            code: { type: 'int', required: true, enum: [200, 404, 500] },
          },
        }

        expect(validateWithSchema({ code: 200 }, schema).valid).toBe(true)
        expect(validateWithSchema({ code: 404 }, schema).valid).toBe(true)
        expect(validateWithSchema({ code: 300 }, schema).valid).toBe(false)
      })
    })
  })

  describe('schema references', () => {
    it('should validate with schema references', () => {
      const userSchema: SchemaDefinition = {
        name: 'User',
        fields: {
          id: { type: 'int', required: true },
          name: { type: 'string', required: true },
        },
      }

      const postSchema: SchemaDefinition = {
        name: 'Post',
        fields: {
          id: { type: 'int', required: true },
          author: { type: '@User', required: true },
        },
      }

      SchemaRegistry.register(userSchema)
      SchemaRegistry.register(postSchema)

      const data = {
        id: 1,
        author: {
          id: 1,
          name: 'Alice',
        },
      }

      const result = validateWithSchema(data, postSchema)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid schema reference data', () => {
      const userSchema: SchemaDefinition = {
        name: 'User',
        fields: {
          id: { type: 'int', required: true },
          name: { type: 'string', required: true },
        },
      }

      const postSchema: SchemaDefinition = {
        name: 'Post',
        fields: {
          id: { type: 'int', required: true },
          author: { type: '@User', required: true },
        },
      }

      SchemaRegistry.register(userSchema)
      SchemaRegistry.register(postSchema)

      const data = {
        id: 1,
        author: {
          id: 'not-a-number', // Invalid
          name: 'Alice',
        },
      }

      const result = validateWithSchema(data, postSchema)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.path?.includes('author'))).toBe(true)
    })
  })

  describe('default values', () => {
    it('should allow default values for optional fields', () => {
      const schema: SchemaDefinition = {
        name: 'Test',
        fields: {
          id: { type: 'int', required: true },
          count: { type: 'int', optional: true, default: 0 },
        },
      }

      const data = {
        id: 1,
        // count is omitted
      }

      const result = validateWithSchema(data, schema)
      expect(result.valid).toBe(true)
    })
  })

  describe('path tracking', () => {
    it('should track nested paths in errors', () => {
      const schema: SchemaDefinition = {
        name: 'Test',
        fields: {
          user: {
            type: '@User',
            required: true,
          },
        },
      }

      const userSchema: SchemaDefinition = {
        name: 'User',
        fields: {
          id: { type: 'int', required: true },
          name: { type: 'string', required: true },
        },
      }

      SchemaRegistry.register(userSchema)

      const data = {
        user: {
          id: 'invalid', // Should have path 'user.id'
          name: 'Alice',
        },
      }

      const result = validateWithSchema(data, schema)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.path === 'user.id')).toBe(true)
    })

    it('should track array element paths', () => {
      const schema: SchemaDefinition = {
        name: 'Test',
        fields: {
          items: { type: 'int[]', required: true },
        },
      }

      const data = {
        items: [1, 'invalid', 3],
      }

      const result = validateWithSchema(data, schema)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.path === 'items[1]')).toBe(true)
    })
  })

  describe('encode integration', () => {
    beforeEach(() => {
      SchemaRegistry.clear()
    })

    it('should encode with schema validation', () => {
      const schema: SchemaDefinition = {
        name: 'User',
        fields: {
          id: { type: 'int', required: true },
          name: { type: 'string', required: true },
          email: { type: 'email', required: true },
        },
      }

      SchemaRegistry.register(schema)

      const data = {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
      }

      const encoded = encode(data, {
        schema: 'User',
        validateOnEncode: true,
      })

      expect(encoded).toBeTruthy()
      expect(encoded).toContain('Alice')
      expect(encoded).toContain('alice@example.com')
    })

    it('should throw error on invalid data during encoding', () => {
      const schema: SchemaDefinition = {
        name: 'User',
        fields: {
          id: { type: 'int', required: true },
          email: { type: 'email', required: true },
        },
      }

      SchemaRegistry.register(schema)

      const invalidData = {
        id: 'not-a-number',
        email: 'invalid-email',
      }

      expect(() => {
        encode(invalidData, {
          schema: 'User',
          validateOnEncode: true,
        })
      }).toThrow('Schema validation failed')
    })

    it('should throw error when schema not found', () => {
      expect(() => {
        encode({ id: 1 }, {
          schema: 'NonExistent',
          validateOnEncode: true,
        })
      }).toThrow('Schema "NonExistent" not found in registry')
    })

    it('should encode without validation when validateOnEncode is false', () => {
      const schema: SchemaDefinition = {
        name: 'User',
        fields: {
          id: { type: 'int', required: true },
        },
      }

      SchemaRegistry.register(schema)

      const invalidData = { id: 'not-a-number' }

      // Should not throw - validation is disabled
      const encoded = encode(invalidData, {
        schema: 'User',
        validateOnEncode: false,
      })

      expect(encoded).toBeTruthy()
    })

    it('should encode normally when no schema is provided', () => {
      const data = { id: 1, name: 'Alice' }
      const encoded = encode(data)

      expect(encoded).toBeTruthy()
      expect(encoded).toContain('Alice')
    })

    it('should validate with inline schema definition', () => {
      const schema: SchemaDefinition = {
        name: 'Test',
        fields: {
          value: { type: 'int', required: true },
        },
      }

      const validData = { value: 42 }
      const invalidData = { value: 'not-a-number' }

      // Should work with valid data
      const encoded1 = encode(validData, {
        schema,
        validateOnEncode: true,
      })
      expect(encoded1).toBeTruthy()

      // Should throw with invalid data
      expect(() => {
        encode(invalidData, {
          schema,
          validateOnEncode: true,
        })
      }).toThrow('Schema validation failed')
    })
  })

  describe('edge cases', () => {
    it('should handle empty schema', () => {
      const schema: SchemaDefinition = {
        name: 'Empty',
        fields: {},
      }

      expect(validateWithSchema({}, schema).valid).toBe(true)
      expect(validateWithSchema({ extra: 'field' }, schema).valid).toBe(true)
    })

    it('should handle schema with all optional fields', () => {
      const schema: SchemaDefinition = {
        name: 'AllOptional',
        fields: {
          field1: { type: 'string', optional: true },
          field2: { type: 'int', optional: true },
        },
      }

      expect(validateWithSchema({}, schema).valid).toBe(true)
      expect(validateWithSchema({ field1: 'value' }, schema).valid).toBe(true)
      expect(validateWithSchema({ field1: 'value', field2: 42 }, schema).valid).toBe(true)
    })

    it('should handle schema with all required fields', () => {
      const schema: SchemaDefinition = {
        name: 'AllRequired',
        fields: {
          field1: { type: 'string', required: true },
          field2: { type: 'int', required: true },
          field3: { type: 'bool', required: true },
        },
      }

      expect(validateWithSchema({
        field1: 'value',
        field2: 42,
        field3: true,
      }, schema).valid).toBe(true)

      expect(validateWithSchema({
        field1: 'value',
        field2: 42,
        // field3 missing
      }, schema).valid).toBe(false)
    })

    it('should handle extra fields (not in schema)', () => {
      const schema: SchemaDefinition = {
        name: 'Test',
        fields: {
          id: { type: 'int', required: true },
        },
      }

      // By default, extra fields are allowed
      const data = {
        id: 1,
        extra: 'field',
        another: 123,
      }

      const result = validateWithSchema(data, schema)
      expect(result.valid).toBe(true)
    })

    it('should handle null values', () => {
      const schema: SchemaDefinition = {
        name: 'Test',
        fields: {
          value: { type: 'string', optional: true },
        },
      }

      // null is not a string, so this should fail
      const result = validateWithSchema({ value: null }, schema)
      expect(result.valid).toBe(false)
    })

    it('should handle undefined explicitly', () => {
      const schema: SchemaDefinition = {
        name: 'Test',
        fields: {
          required: { type: 'string', required: true },
          optional: { type: 'string', optional: true },
        },
      }

      const data = {
        required: 'value',
        optional: undefined, // Explicitly undefined
      }

      // undefined should be treated as omitted for optional fields
      const result = validateWithSchema(data, schema)
      expect(result.valid).toBe(true)
    })
  })

  describe('includeSchema option', () => {
    beforeEach(() => {
      SchemaRegistry.clear()
    })

    it('should include schema reference in array headers when includeSchema is true', () => {
      const schema: SchemaDefinition = {
        name: 'User',
        fields: {
          id: { type: 'int', required: true },
          name: { type: 'string', required: true },
        },
      }
      SchemaRegistry.register(schema)

      const data = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      }
      const encoded = encode(data, {
        schema: 'User',
        includeSchema: true,
      })

      expect(encoded).toContain('@User')
      expect(encoded).toContain('users[2]{id,name}@User:')
    })

    it('should not include schema reference when includeSchema is false', () => {
      const schema: SchemaDefinition = {
        name: 'User',
        fields: {
          id: { type: 'int', required: true },
        },
      }
      SchemaRegistry.register(schema)

      const data = { users: [{ id: 1 }, { id: 2 }] }
      const encoded = encode(data, {
        schema: 'User',
        includeSchema: false,
      })

      expect(encoded).not.toContain('@User')
      expect(encoded).toContain('users[2]{id}:')
    })

    it('should include schema reference in primitive array headers', () => {
      const schema: SchemaDefinition = {
        name: 'Tags',
        fields: {
          tags: { type: 'string[]', required: true },
        },
      }
      SchemaRegistry.register(schema)

      const data = { tags: ['js', 'ts', 'node'] }
      const encoded = encode(data, {
        schema: 'Tags',
        includeSchema: true,
      })

      expect(encoded).toContain('@Tags')
      expect(encoded).toMatch(/tags\[3\]@Tags:/)
    })

    it('should include schema reference in empty array headers', () => {
      const schema: SchemaDefinition = {
        name: 'Items',
        fields: {
          items: { type: 'string[]', required: true },
        },
      }
      SchemaRegistry.register(schema)

      const data = { items: [] }
      const encoded = encode(data, {
        schema: 'Items',
        includeSchema: true,
      })

      expect(encoded).toContain('@Items')
      expect(encoded).toMatch(/items\[0\]@Items:/)
    })

    it('should include schema reference with inline schema definition', () => {
      const schema: SchemaDefinition = {
        name: 'Product',
        fields: {
          id: { type: 'int', required: true },
          name: { type: 'string', required: true },
          price: { type: 'float', required: true },
        },
      }

      const data = {
        products: [
          { id: 1, name: 'Widget', price: 9.99 },
          { id: 2, name: 'Gadget', price: 19.99 },
        ],
      }
      const encoded = encode(data, {
        schema,
        includeSchema: true,
      })

      expect(encoded).toContain('@Product')
      expect(encoded).toContain('products[2]{id,name,price}@Product:')
    })

    it('should work with root-level arrays', () => {
      const schema: SchemaDefinition = {
        name: 'Numbers',
        fields: {},
      }
      SchemaRegistry.register(schema)

      const data = [1, 2, 3]
      const encoded = encode(data, {
        schema: 'Numbers',
        includeSchema: true,
      })

      expect(encoded).toContain('@Numbers')
      expect(encoded).toMatch(/\[3\]@Numbers:/)
    })

    it('should include schema reference in nested array headers', () => {
      const schema: SchemaDefinition = {
        name: 'Category',
        fields: {
          name: { type: 'string', required: true },
          items: { type: 'string[]', required: true },
        },
      }
      SchemaRegistry.register(schema)

      const data = {
        category: {
          name: 'Tech',
          items: ['laptop', 'phone', 'tablet'],
        },
      }
      const encoded = encode(data, {
        schema: 'Category',
        includeSchema: true,
      })

      expect(encoded).toContain('@Category')
      expect(encoded).toMatch(/items\[3\]@Category:/)
    })

    it('should not include schema reference when no schema is provided', () => {
      const data = { users: [{ id: 1 }, { id: 2 }] }
      const encoded = encode(data, {
        includeSchema: true,
      })

      expect(encoded).not.toContain('@')
      expect(encoded).toContain('users[2]{id}:')
    })
  })
})

// #endregion

