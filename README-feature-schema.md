# TOON Schema Validation Feature

This document provides comprehensive documentation for the schema validation feature in the TOON (Token-Oriented Object Notation) library. Schema validation allows you to define data structures, validate data against those structures, and include schema references in TOON-encoded output.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Schema Definition](#schema-definition)
4. [Schema Registry](#schema-registry)
5. [Validation](#validation)
6. [Encoding with Schemas](#encoding-with-schemas)
7. [Schema References in Output](#schema-references-in-output)
8. [API Reference](#api-reference)
9. [Examples](#examples)
10. [Best Practices](#best-practices)
11. [Error Handling](#error-handling)

## Overview

The schema validation feature provides:

- **Type Safety**: Define expected data types for each field
- **Validation**: Verify data conforms to schema definitions before encoding
- **Schema Registry**: Centralized storage and retrieval of reusable schemas
- **Schema References**: Include schema names in TOON output for documentation and tooling
- **Comprehensive Validation**: Support for required/optional fields, constraints (min/max, patterns, enums), and nested structures

## Getting Started

### Installation

The schema feature is included in the TOON package. Import the necessary types and functions:

```typescript
import {
  encode,
  SchemaRegistry,
  validateWithSchema,
  type SchemaDefinition,
  type FieldDefinition,
  type ValidationResult,
  type ValidationError,
} from '@toon-format/toon'
```

### Basic Example

```typescript
// Define a schema
const userSchema: SchemaDefinition = {
  name: 'User',
  fields: {
    id: { type: 'int', required: true },
    name: { type: 'string', required: true },
    email: { type: 'email', required: true },
  },
}

// Register the schema
SchemaRegistry.register(userSchema)

// Validate data
const data = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
}

const result = validateWithSchema(data, userSchema)
if (result.valid) {
  console.log('Validation passed')
} else {
  console.error('Validation errors:', result.errors)
}

// Encode with validation
const toonString = encode(data, {
  schema: 'User',
  validateOnEncode: true,
  includeSchema: true,
})
```

## Schema Definition

A schema definition describes the structure and validation rules for data objects.

### Schema Structure

```typescript
interface SchemaDefinition {
  name: string              // Unique schema identifier
  version?: number          // Optional version number
  fields: Record<string, FieldDefinition>  // Field definitions
  extends?: string          // Optional parent schema (not yet implemented)
}
```

### Field Definition

Each field in a schema can specify:

```typescript
interface FieldDefinition {
  type: PrimitiveType | `${PrimitiveType}[]` | string  // Field type
  required?: boolean         // Field is required
  optional?: boolean         // Field is optional (opposite of required)
  min?: number | string      // Minimum value/length
  max?: number | string      // Maximum value/length
  pattern?: string | RegExp  // Validation pattern (regex)
  enum?: readonly unknown[]  // Allowed values
  default?: unknown          // Default value
}
```

### Supported Types

The following primitive types are supported:

- `'int'` - Integer numbers
- `'float'` - Floating-point numbers
- `'string'` - Text strings
- `'bool'` - Boolean values
- `'email'` - Email addresses (validated format)
- `'url'` - URLs (validated format)
- `'datetime'` - ISO 8601 datetime strings

### Array Types

Arrays are specified using the `[]` suffix:

- `'int[]'` - Array of integers
- `'string[]'` - Array of strings
- `'email[]'` - Array of email addresses

### Schema References

Fields can reference other schemas by name:

```typescript
const addressSchema: SchemaDefinition = {
  name: 'Address',
  fields: {
    street: { type: 'string', required: true },
    city: { type: 'string', required: true },
    zip: { type: 'string', required: true },
  },
}

const userSchema: SchemaDefinition = {
  name: 'User',
  fields: {
    id: { type: 'int', required: true },
    address: { type: 'Address', required: true },  // Schema reference
  },
}
```

## Schema Registry

The `SchemaRegistry` provides a centralized way to store and retrieve schema definitions.

### Registering Schemas

```typescript
const schema: SchemaDefinition = {
  name: 'User',
  fields: {
    id: { type: 'int', required: true },
    name: { type: 'string', required: true },
  },
}

SchemaRegistry.register(schema)
```

**Note**: Attempting to register a schema with a name that already exists will throw an error.

### Retrieving Schemas

```typescript
const schema = SchemaRegistry.get('User')
if (schema) {
  // Use schema
}
```

Returns `undefined` if the schema is not found.

### Checking Schema Existence

```typescript
if (SchemaRegistry.has('User')) {
  // Schema exists
}
```

### Listing All Schemas

```typescript
const schemaNames = SchemaRegistry.list()
console.log('Registered schemas:', schemaNames)
// Output: ['User', 'Post', 'Comment']
```

### Clearing the Registry

```typescript
// Useful in tests or when resetting
SchemaRegistry.clear()
```

## Validation

The `validateWithSchema` function validates data against a schema definition.

### Basic Validation

```typescript
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

if (result.valid) {
  console.log('Validation passed')
} else {
  console.error('Validation failed:', result.errors)
}
```

### Validation Result

```typescript
interface ValidationResult {
  valid: boolean              // Whether validation passed
  errors: ValidationError[]   // Array of validation errors (empty if valid)
}

interface ValidationError {
  field: string               // Field name that failed validation
  value: unknown              // Value that failed validation
  message: string             // Error message
  path?: string              // Full path to the field (for nested structures)
}
```

### Required Fields

```typescript
const schema: SchemaDefinition = {
  name: 'User',
  fields: {
    id: { type: 'int', required: true },
    name: { type: 'string', required: true },
    email: { type: 'email' },  // Optional by default
  },
}

const result = validateWithSchema({ id: 1 }, schema)
// result.valid === false
// result.errors[0].message === 'Required field "name" is missing'
```

### Optional Fields

```typescript
const schema: SchemaDefinition = {
  name: 'User',
  fields: {
    id: { type: 'int', required: true },
    name: { type: 'string', optional: true },
    email: { type: 'email', optional: true },
  },
}

// Both of these are valid:
validateWithSchema({ id: 1 }, schema)  // Valid
validateWithSchema({ id: 1, name: 'Alice' }, schema)  // Valid
```

### Constraints

#### Minimum and Maximum Values

```typescript
const schema: SchemaDefinition = {
  name: 'Product',
  fields: {
    price: { type: 'float', min: 0, max: 1000, required: true },
    name: { type: 'string', min: 3, max: 100, required: true },
  },
}
```

#### Pattern Matching

```typescript
const schema: SchemaDefinition = {
  name: 'User',
  fields: {
    username: {
      type: 'string',
      pattern: /^[a-zA-Z0-9_]+$/,  // Alphanumeric and underscores only
      required: true,
    },
    phone: {
      type: 'string',
      pattern: /^\d{3}-\d{3}-\d{4}$/,  // Phone format: 123-456-7890
    },
  },
}
```

#### Enum Values

```typescript
const schema: SchemaDefinition = {
  name: 'Status',
  fields: {
    state: {
      type: 'string',
      enum: ['pending', 'active', 'inactive', 'archived'],
      required: true,
    },
  },
}
```

### Default Values

Default values are applied when a field is omitted (if the field is optional or has a default):

```typescript
const schema: SchemaDefinition = {
  name: 'Settings',
  fields: {
    theme: { type: 'string', default: 'light' },
    language: { type: 'string', default: 'en' },
  },
}

// Default values are used during validation
// Note: The original object is not modified
```

### Array Validation

```typescript
const schema: SchemaDefinition = {
  name: 'Post',
  fields: {
    title: { type: 'string', required: true },
    tags: { type: 'string[]', required: true },
    likes: { type: 'int[]', optional: true },
  },
}

const data = {
  title: 'My Post',
  tags: ['javascript', 'typescript'],
  likes: [1, 2, 3],
}

const result = validateWithSchema(data, schema)
```

### Nested Schema References

When a field references another schema, the validation will validate nested objects:

```typescript
const addressSchema: SchemaDefinition = {
  name: 'Address',
  fields: {
    street: { type: 'string', required: true },
    city: { type: 'string', required: true },
  },
}

const userSchema: SchemaDefinition = {
  name: 'User',
  fields: {
    id: { type: 'int', required: true },
    address: { type: 'Address', required: true },
  },
}

// Register both schemas
SchemaRegistry.register(addressSchema)
SchemaRegistry.register(userSchema)

const data = {
  id: 1,
  address: {
    street: '123 Main St',
    city: 'New York',
  },
}

const result = validateWithSchema(data, userSchema)
```

## Encoding with Schemas

The `encode` function supports schema validation and schema references in the output.

### Basic Usage

```typescript
const schema: SchemaDefinition = {
  name: 'User',
  fields: {
    id: { type: 'int', required: true },
    name: { type: 'string', required: true },
  },
}

SchemaRegistry.register(schema)

const data = {
  id: 1,
  name: 'Alice',
}

// Encode with validation
const toonString = encode(data, {
  schema: 'User',
  validateOnEncode: true,
})
```

### Encoding Options

```typescript
interface EncodeOptions {
  schema?: string | SchemaDefinition    // Schema name or definition
  validateOnEncode?: boolean            // Enable validation (default: false)
  includeSchema?: boolean               // Include schema reference in output (default: false)
  // ... other TOON encoding options
}
```

### Schema as String

When providing a schema name as a string, it must be registered in the `SchemaRegistry`:

```typescript
SchemaRegistry.register(userSchema)

const toonString = encode(data, {
  schema: 'User',  // Schema name
  validateOnEncode: true,
})
```

### Schema as Object

You can provide the schema definition directly without registering it:

```typescript
const toonString = encode(data, {
  schema: userSchema,  // Schema definition object
  validateOnEncode: true,
})
```

### Validation on Encode

When `validateOnEncode` is `true`, the data is validated before encoding. If validation fails, an error is thrown:

```typescript
const invalidData = {
  id: 'not-a-number',  // Should be int
  name: 'Alice',
}

try {
  encode(invalidData, {
    schema: 'User',
    validateOnEncode: true,
  })
} catch (error) {
  console.error(error.message)
  // Output: "Schema validation failed: id: Expected integer, got string"
}
```

### Disabling Validation

You can encode data with a schema without validating:

```typescript
const toonString = encode(data, {
  schema: 'User',
  validateOnEncode: false,  // No validation
  includeSchema: true,      // But include schema reference
})
```

## Schema References in Output

When `includeSchema` is `true`, the schema name is included in the TOON output as a reference annotation.

### Format

Schema references are added to array headers using the `@` symbol:

```
users[2]{id,name}@User:
  1,Alice
  2,Bob
```

The format is: `key[length]{fields}@SchemaName:`

### Examples

#### Tabular Arrays with Schema Reference

```typescript
const schema: SchemaDefinition = {
  name: 'User',
  fields: {
    id: { type: 'int', required: true },
    name: { type: 'string', required: true },
    email: { type: 'email', required: true },
  },
}

const data = {
  users: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ],
}

const toonString = encode(data, {
  schema: 'User',
  includeSchema: true,
})

// Output:
// users[2]{id,name,email}@User:
//   1,Alice,alice@example.com
//   2,Bob,bob@example.com
```

#### Primitive Arrays with Schema Reference

```typescript
const schema: SchemaDefinition = {
  name: 'Tags',
  fields: {
    tags: { type: 'string[]', required: true },
  },
}

const data = { tags: ['js', 'ts', 'node'] }

const toonString = encode(data, {
  schema: 'Tags',
  includeSchema: true,
})

// Output:
// tags[3]@Tags: js,ts,node
```

#### Empty Arrays with Schema Reference

```typescript
const schema: SchemaDefinition = {
  name: 'Items',
  fields: {
    items: { type: 'string[]', required: true },
  },
}

const data = { items: [] }

const toonString = encode(data, {
  schema: 'Items',
  includeSchema: true,
})

// Output:
// items[0]@Items:
```

#### Root-Level Arrays

```typescript
const schema: SchemaDefinition = {
  name: 'Numbers',
  fields: {},
}

const data = [1, 2, 3]

const toonString = encode(data, {
  schema: 'Numbers',
  includeSchema: true,
})

// Output:
// [3]@Numbers: 1,2,3
```

### Use Cases

Schema references in output are useful for:

- **Documentation**: Making the schema explicit in the TOON file
- **Tooling**: Enabling schema-aware TOON editors and validators
- **Type Safety**: Providing hints for downstream processing
- **Debugging**: Easily identifying which schema applies to data

## API Reference

### Types

#### `PrimitiveType`

```typescript
type PrimitiveType = 'int' | 'float' | 'string' | 'bool' | 'email' | 'url' | 'datetime'
```

Supported primitive types for schema fields.

#### `SchemaDefinition`

```typescript
interface SchemaDefinition {
  name: string
  version?: number
  fields: Record<string, FieldDefinition>
  extends?: string  // Not yet implemented
}
```

Complete schema definition structure.

#### `FieldDefinition`

```typescript
interface FieldDefinition {
  type: PrimitiveType | `${PrimitiveType}[]` | string
  required?: boolean
  optional?: boolean
  min?: number | string
  max?: number | string
  pattern?: string | RegExp
  enum?: readonly unknown[]
  default?: unknown
}
```

Field definition with validation rules.

#### `ValidationResult`

```typescript
interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}
```

Result of schema validation.

#### `ValidationError`

```typescript
interface ValidationError {
  field: string
  value: unknown
  message: string
  path?: string
}
```

Individual validation error information.

### Classes

#### `SchemaRegistry`

Static class for managing schema definitions.

**Methods:**

- `static register(schema: SchemaDefinition): void`
  - Register a schema definition
  - Throws error if schema name already exists

- `static get(name: string): SchemaDefinition | undefined`
  - Retrieve a schema by name
  - Returns `undefined` if not found

- `static has(name: string): boolean`
  - Check if a schema exists

- `static clear(): void`
  - Clear all registered schemas

- `static list(): string[]`
  - Get array of all registered schema names

### Functions

#### `validateWithSchema(value: unknown, schema: SchemaDefinition, path?: string): ValidationResult`

Validates a value against a schema definition.

**Parameters:**
- `value`: The value to validate
- `schema`: The schema definition to validate against
- `path`: Optional path prefix for nested validation (used internally)

**Returns:** `ValidationResult` with validation status and errors

#### `encode(input: unknown, options?: EncodeOptions): string`

Encodes a JavaScript value to TOON format with optional schema validation.

**Options:**
- `schema?: string | SchemaDefinition` - Schema name or definition
- `validateOnEncode?: boolean` - Enable validation (default: `false`)
- `includeSchema?: boolean` - Include schema reference in output (default: `false`)

## Examples

### Complete Example: User Management System

```typescript
import {
  encode,
  decode,
  SchemaRegistry,
  validateWithSchema,
  type SchemaDefinition,
} from '@toon-format/toon'

// Define schemas
const addressSchema: SchemaDefinition = {
  name: 'Address',
  fields: {
    street: { type: 'string', required: true },
    city: { type: 'string', required: true },
    zip: { type: 'string', pattern: /^\d{5}$/, required: true },
  },
}

const userSchema: SchemaDefinition = {
  name: 'User',
  fields: {
    id: { type: 'int', required: true },
    name: { type: 'string', min: 1, max: 100, required: true },
    email: { type: 'email', required: true },
    age: { type: 'int', min: 0, max: 150, optional: true },
    address: { type: 'Address', required: true },
    tags: { type: 'string[]', optional: true },
  },
}

// Register schemas
SchemaRegistry.register(addressSchema)
SchemaRegistry.register(userSchema)

// Validate data
const userData = {
  id: 1,
  name: 'Alice Johnson',
  email: 'alice@example.com',
  age: 30,
  address: {
    street: '123 Main St',
    city: 'New York',
    zip: '10001',
  },
  tags: ['developer', 'typescript'],
}

const validationResult = validateWithSchema(userData, userSchema)
if (!validationResult.valid) {
  console.error('Validation errors:')
  validationResult.errors.forEach(error => {
    console.error(`  ${error.path || error.field}: ${error.message}`)
  })
} else {
  console.log('Validation passed!')
}

// Encode with schema
const toonString = encode(
  { users: [userData] },
  {
    schema: 'User',
    validateOnEncode: true,
    includeSchema: true,
  }
)

console.log(toonString)
// Output:
// users[1]{id,name,email,age,address,tags}@User:
//   1,Alice Johnson,alice@example.com,30,{"street":"123 Main St","city":"New York","zip":"10001"},developer,typescript
```

### Example: Configuration Schema

```typescript
const configSchema: SchemaDefinition = {
  name: 'AppConfig',
  fields: {
    appName: { type: 'string', required: true },
    version: { type: 'string', pattern: /^\d+\.\d+\.\d+$/, required: true },
    debug: { type: 'bool', default: false },
    port: { type: 'int', min: 1, max: 65535, default: 3000 },
    allowedOrigins: {
      type: 'string[]',
      optional: true,
    },
    features: {
      type: 'string[]',
      enum: ['feature1', 'feature2', 'feature3'],
      optional: true,
    },
  },
}

SchemaRegistry.register(configSchema)

const config = {
  appName: 'My App',
  version: '1.0.0',
  debug: true,
  port: 8080,
  allowedOrigins: ['http://localhost:3000', 'https://example.com'],
  features: ['feature1', 'feature2'],
}

const result = validateWithSchema(config, configSchema)
if (result.valid) {
  const toonConfig = encode(config, {
    schema: 'AppConfig',
    validateOnEncode: true,
    includeSchema: true,
  })
  console.log(toonConfig)
}
```

### Example: Product Catalog

```typescript
const productSchema: SchemaDefinition = {
  name: 'Product',
  fields: {
    id: { type: 'int', required: true },
    name: { type: 'string', min: 3, max: 200, required: true },
    description: { type: 'string', optional: true },
    price: { type: 'float', min: 0, required: true },
    stock: { type: 'int', min: 0, default: 0 },
    category: {
      type: 'string',
      enum: ['electronics', 'clothing', 'books', 'food'],
      required: true,
    },
    tags: { type: 'string[]', optional: true },
    inStock: { type: 'bool', optional: true },
  },
}

SchemaRegistry.register(productSchema)

const products = [
  {
    id: 1,
    name: 'Laptop',
    description: 'High-performance laptop',
    price: 999.99,
    stock: 10,
    category: 'electronics',
    tags: ['computer', 'tech'],
    inStock: true,
  },
  {
    id: 2,
    name: 'T-Shirt',
    price: 19.99,
    stock: 50,
    category: 'clothing',
    inStock: true,
  },
]

// Validate each product
products.forEach(product => {
  const result = validateWithSchema(product, productSchema)
  if (!result.valid) {
    console.error(`Product ${product.id} validation failed:`, result.errors)
  }
})

// Encode with schema reference
const catalog = encode(
  { products },
  {
    schema: 'Product',
    validateOnEncode: true,
    includeSchema: true,
  }
)

console.log(catalog)
```

## Best Practices

### Schema Organization

1. **Use Descriptive Names**: Choose clear, meaningful schema names that reflect their purpose.

2. **Register Commonly Used Schemas**: Register schemas that are reused across your application in a centralized location.

3. **Version Your Schemas**: Use the `version` field to track schema evolution.

4. **Group Related Schemas**: Keep related schemas together (e.g., `User`, `UserProfile`, `UserSettings`).

### Validation Strategy

1. **Validate Early**: Validate data as soon as it enters your application boundary.

2. **Use Schema Registry**: Register schemas for reuse rather than defining them inline.

3. **Handle Validation Errors Gracefully**: Provide clear error messages to users when validation fails.

4. **Test Edge Cases**: Test your schemas with boundary values (min, max, empty arrays, etc.).

### Encoding Strategy

1. **Enable Validation in Production**: Use `validateOnEncode: true` to catch errors early.

2. **Include Schema References**: Use `includeSchema: true` for better tooling support and documentation.

3. **Use Schema Names for Registered Schemas**: Provide schema names as strings for better maintainability.

4. **Inline Schemas for One-Time Use**: Use schema objects directly for temporary or one-time validations.

### Performance Considerations

1. **Schema Registry is In-Memory**: The registry is stored in memory and cleared when the process restarts.

2. **Validation Adds Overhead**: Enable validation only when needed in performance-critical paths.

3. **Large Schemas**: Complex schemas with many fields and nested structures will take longer to validate.

## Error Handling

### Validation Errors

When validation fails, the `ValidationResult` contains an array of errors:

```typescript
const result = validateWithSchema(data, schema)

if (!result.valid) {
  result.errors.forEach(error => {
    console.error(`Field: ${error.field}`)
    console.error(`Path: ${error.path || 'root'}`)
    console.error(`Value: ${error.value}`)
    console.error(`Message: ${error.message}`)
  })
}
```

### Encoding Errors

When encoding with validation enabled, errors are thrown:

```typescript
try {
  encode(invalidData, {
    schema: 'User',
    validateOnEncode: true,
  })
} catch (error) {
  if (error instanceof Error) {
    if (error.message.startsWith('Schema validation failed')) {
      // Handle validation error
    } else if (error.message.includes('not found in registry')) {
      // Handle missing schema error
    }
  }
}
```

### Common Error Messages

- `"Required field \"fieldName\" is missing"` - A required field was not provided
- `"Expected integer, got string"` - Type mismatch
- `"Value must be at least X"` - Minimum constraint violation
- `"Value must be at most X"` - Maximum constraint violation
- `"Value does not match pattern"` - Pattern validation failed
- `"Value must be one of: [values]"` - Enum validation failed
- `"Schema \"schemaName\" is already registered"` - Duplicate schema registration
- `"Schema \"schemaName\" not found in registry"` - Schema not registered when referenced by name

---

## Contact

For questions, issues, or contributions related to the schema validation feature:

**Hermann del Campo**

- LinkedIn: [https://www.linkedin.com/in/theaiqueendc/](https://www.linkedin.com/in/theaiqueendc/)
- E-Mail: [hermann.delcampo@raiva.io](mailto:hermann.delcampo@raiva.io)

---

*Copyright (c) 2025 Hermann del Campo. Licensed under MIT (same as TOON project).*

