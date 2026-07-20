import type { JSONSchema7 } from '@ai-sdk/provider'
import type { GenerationCase, GenerationCaseId } from './types.ts'

const customerSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
  },
  required: ['id', 'name'],
} satisfies JSONSchema7

const employeeSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    title: { type: 'string', enum: ['engineer', 'manager', 'analyst'] },
  },
  required: ['id', 'name', 'title'],
} satisfies JSONSchema7

const schemas = {
  users: {
    type: 'object',
    additionalProperties: false,
    properties: {
      users: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', minLength: 1 },
            role: { type: 'string', enum: ['admin', 'staff', 'guest'] },
          },
          required: ['id', 'name', 'role'],
        },
      },
    },
    required: ['users'],
  },
  order: {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'integer' },
      customer: customerSchema,
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            sku: { type: 'string' },
            qty: { type: 'integer' },
            price: { type: 'number' },
          },
          required: ['sku', 'qty', 'price'],
        },
      },
    },
    required: ['id', 'customer', 'items'],
  },
  company: {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      departments: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            code: { type: 'string' },
            name: { type: 'string' },
            employees: { type: 'array', items: employeeSchema },
          },
          required: ['code', 'name', 'employees'],
        },
      },
    },
    required: ['id', 'name', 'departments'],
  },
  invoice: {
    type: 'object',
    additionalProperties: false,
    properties: {
      number: { type: 'string' },
      currency: { type: 'string', enum: ['USD', 'EUR', 'SAR'] },
      customer: customerSchema,
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            sku: { type: 'string' },
            qty: { type: 'integer' },
            unit_price: { type: 'number' },
            line_total: { type: 'number' },
          },
          required: ['sku', 'qty', 'unit_price', 'line_total'],
        },
      },
      totals: {
        type: 'object',
        additionalProperties: false,
        properties: {
          subtotal: { type: 'number' },
          tax: { type: 'number' },
          grand_total: { type: 'number' },
        },
        required: ['subtotal', 'tax', 'grand_total'],
      },
      notes: { type: ['string', 'null'] },
    },
    required: ['number', 'currency', 'customer', 'items', 'totals'],
  },
} satisfies Record<GenerationCaseId, JSONSchema7>

const gold = {
  users: {
    users: [
      { id: 1, name: 'Alice', role: 'admin' },
      { id: 2, name: 'Bob', role: 'staff' },
      { id: 3, name: 'Eve', role: 'guest' },
    ],
  },
  order: {
    id: 101,
    customer: { id: 9, name: 'Ada' },
    items: [
      { sku: 'A1', qty: 2, price: 9.99 },
      { sku: 'B2', qty: 1, price: 14.5 },
    ],
  },
  company: {
    id: 1,
    name: 'Acme',
    departments: [
      {
        code: 'ENG',
        name: 'Engineering',
        employees: [
          { id: 1, name: 'Alice', title: 'engineer' },
          { id: 2, name: 'Bob', title: 'manager' },
        ],
      },
      {
        code: 'OPS',
        name: 'Operations',
        employees: [
          { id: 3, name: 'Eve', title: 'analyst' },
        ],
      },
    ],
  },
  invoice: {
    number: 'INV-2025-001',
    currency: 'USD',
    customer: { id: 9, name: 'Ada' },
    items: [
      { sku: 'A1', qty: 2, unit_price: 9.99, line_total: 19.98 },
      { sku: 'B2', qty: 1, unit_price: 14.5, line_total: 14.5 },
    ],
    totals: { subtotal: 34.48, tax: 6.9, grand_total: 41.38 },
    notes: 'Thank you for your business.',
  },
} satisfies Record<GenerationCaseId, unknown>

const TOON_PRIMER = `You are to produce output STRICTLY in TOON format.

TOON RULES:
- Use 2-space indentation
- Scalars: fieldName: value
- Objects: fieldName: then nested fields indented
- Arrays of objects:
    arrayName[N]:
      - field1: value1
        field2: value2
- Tabular arrays (for simple data):
    arrayName[N]{field1,field2}:
      val1,val2
      val3,val4
- [N] MUST equal actual row/item count
- Output ONLY a \`\`\`toon code block

Reference example:
\`\`\`toon
id: 100
type: Sample
metadata:
  version: 1
  author: Alex
sections[2]:
  - code: A
    title: Introduction
    items[2]{id,value}:
      1,First
      2,Second
  - code: B
    title: Details
    items[1]{id,value}:
      3,Third
summary:
  total: 3
  status: complete
\`\`\``

const jsonPrompts: Record<GenerationCaseId, string> = {
  users: `Create a user directory with three users:
- User 1: Alice, who is an admin
- User 2: Bob, who is a staff member
- User 3: Eve, who is a guest

Return the data as JSON with a 'users' array containing objects with id, name, and role fields.`,
  order: `Create an order record:
- Order ID: 101
- Customer: Ada (ID: 9)
- Items:
  * Product A1: quantity 2, price $9.99 each
  * Product B2: quantity 1, price $14.50 each

Return as JSON with fields for id, customer (with id and name), and items array (with sku, qty, price).`,
  company: `Create a company organization structure:
- Company: Acme (ID: 1)
- Engineering Department (code: ENG):
  * Alice (ID: 1) - engineer
  * Bob (ID: 2) - manager
- Operations Department (code: OPS):
  * Eve (ID: 3) - analyst

Return as JSON with company info and nested departments array, each containing employees.`,
  invoice: `Create an invoice:
- Invoice number: INV-2025-001
- Currency: USD
- Customer: Ada (ID: 9)
- Line items:
  * A1: quantity 2 @ $9.99 each = $19.98
  * B2: quantity 1 @ $14.50 each = $14.50
- Subtotal: $34.48
- Tax: $6.90
- Grand total: $41.38
- Notes: Thank you for your business.

Return as JSON with all invoice details including items array and totals breakdown.`,
}

const toonTasks: Record<GenerationCaseId, string> = {
  users: `Create an array named users with fields id, name, and role.
User data:
- id=1, name=Alice, role=admin
- id=2, name=Bob, role=staff
- id=3, name=Eve, role=guest`,
  order: `Create an order record with fields: id, customer (with id and name), and items array (with sku, qty, price).
- Order ID: 101
- Customer: Ada (ID: 9)
- Items:
  * Product A1: quantity 2, price $9.99 each
  * Product B2: quantity 1, price $14.50 each`,
  company: `Create a company organization structure with company info and nested departments array, each containing employees:
- Company: Acme (ID: 1)
- Engineering Department (code: ENG):
  * Alice (ID: 1) - engineer
  * Bob (ID: 2) - manager
- Operations Department (code: OPS):
  * Eve (ID: 3) - analyst`,
  invoice: `Create an invoice with all invoice details including items array and totals breakdown:
- Invoice number: INV-2025-001
- Currency: USD
- Customer: Ada (ID: 9)
- Line items:
  * A1: quantity 2 @ $9.99 each = $19.98
  * B2: quantity 1 @ $14.50 each = $14.50
- Subtotal: $34.48
- Tax: $6.90
- Grand total: $41.38
- Notes: Thank you for your business.`,
}

export const GENERATION_CASES: GenerationCase[] = (Object.keys(gold) as GenerationCaseId[]).map(id => ({
  id,
  gold: gold[id],
  jsonPrompt: jsonPrompts[id],
  toonPrompt: `${TOON_PRIMER}\n\nTASK:\n${toonTasks[id]}\n\nOutput only the TOON code block.`,
  schema: schemas[id],
}))

export function canonicalizeGenerationValue(caseId: GenerationCaseId, input: unknown): unknown {
  const value = unwrapCase(input, caseId)
  validateCase(caseId, value)
  const canonical = structuredClone(value) as Record<string, unknown>

  if (caseId === 'users') {
    const users = canonical.users as Record<string, unknown>[]
    users.sort((left, right) => (left.id as number) - (right.id as number))
  }
  else if (caseId === 'company') {
    const departments = canonical.departments as Record<string, unknown>[]
    departments.sort((left, right) => String(left.code).localeCompare(String(right.code)))
    for (const department of departments) {
      const employees = department.employees as Record<string, unknown>[]
      employees.sort((left, right) => (left.id as number) - (right.id as number))
    }
  }
  else {
    const items = canonical.items as Record<string, unknown>[]
    items.sort((left, right) => String(left.sku).localeCompare(String(right.sku)))
  }

  return canonical
}

function unwrapCase(input: unknown, caseId: GenerationCaseId): unknown {
  if (caseId === 'users' || !isRecord(input))
    return input

  const wrapped = input[caseId]
  return isRecord(wrapped) ? wrapped : input
}

function validateCase(caseId: GenerationCaseId, input: unknown): void {
  if (caseId === 'users') {
    const root = assertObject(input, 'users payload', ['users'])
    const users = assertArray(root.users, 'users')
    for (const [index, user] of users.entries()) {
      const row = assertObject(user, `users[${index}]`, ['id', 'name', 'role'])
      assertInteger(row.id, `users[${index}].id`)
      assertString(row.name, `users[${index}].name`, true)
      assertEnum(row.role, `users[${index}].role`, ['admin', 'staff', 'guest'])
    }
    return
  }

  if (caseId === 'order') {
    const order = assertObject(input, 'order', ['id', 'customer', 'items'])
    assertInteger(order.id, 'order.id')
    validateCustomer(order.customer, 'order.customer')
    const items = assertArray(order.items, 'order.items')
    for (const [index, item] of items.entries()) {
      const row = assertObject(item, `order.items[${index}]`, ['sku', 'qty', 'price'])
      assertString(row.sku, `order.items[${index}].sku`)
      assertInteger(row.qty, `order.items[${index}].qty`)
      assertNumber(row.price, `order.items[${index}].price`)
    }
    return
  }

  if (caseId === 'company') {
    const company = assertObject(input, 'company', ['id', 'name', 'departments'])
    assertInteger(company.id, 'company.id')
    assertString(company.name, 'company.name')
    const departments = assertArray(company.departments, 'company.departments')
    for (const [departmentIndex, department] of departments.entries()) {
      const path = `company.departments[${departmentIndex}]`
      const row = assertObject(department, path, ['code', 'name', 'employees'])
      assertString(row.code, `${path}.code`)
      assertString(row.name, `${path}.name`)
      const employees = assertArray(row.employees, `${path}.employees`)
      for (const [employeeIndex, employee] of employees.entries()) {
        const employeePath = `${path}.employees[${employeeIndex}]`
        const employeeRow = assertObject(employee, employeePath, ['id', 'name', 'title'])
        assertInteger(employeeRow.id, `${employeePath}.id`)
        assertString(employeeRow.name, `${employeePath}.name`)
        assertEnum(employeeRow.title, `${employeePath}.title`, ['engineer', 'manager', 'analyst'])
      }
    }
    return
  }

  const invoice = assertObject(input, 'invoice', ['number', 'currency', 'customer', 'items', 'totals'], ['notes'])
  assertString(invoice.number, 'invoice.number')
  assertEnum(invoice.currency, 'invoice.currency', ['USD', 'EUR', 'SAR'])
  validateCustomer(invoice.customer, 'invoice.customer')
  const items = assertArray(invoice.items, 'invoice.items')
  for (const [index, item] of items.entries()) {
    const path = `invoice.items[${index}]`
    const row = assertObject(item, path, ['sku', 'qty', 'unit_price', 'line_total'])
    assertString(row.sku, `${path}.sku`)
    assertInteger(row.qty, `${path}.qty`)
    assertNumber(row.unit_price, `${path}.unit_price`)
    assertNumber(row.line_total, `${path}.line_total`)
  }
  const totals = assertObject(invoice.totals, 'invoice.totals', ['subtotal', 'tax', 'grand_total'])
  assertNumber(totals.subtotal, 'invoice.totals.subtotal')
  assertNumber(totals.tax, 'invoice.totals.tax')
  assertNumber(totals.grand_total, 'invoice.totals.grand_total')
  if (invoice.notes !== undefined && invoice.notes !== null)
    assertString(invoice.notes, 'invoice.notes')
}

function validateCustomer(input: unknown, path: string): void {
  const customer = assertObject(input, path, ['id', 'name'])
  assertInteger(customer.id, `${path}.id`)
  assertString(customer.name, `${path}.name`)
}

function assertObject(input: unknown, path: string, required: string[], optional: string[] = []): Record<string, unknown> {
  if (!isRecord(input))
    throw new TypeError(`${path} must be an object`)

  const allowed = new Set([...required, ...optional])
  const extra = Object.keys(input).filter(key => !allowed.has(key))
  if (extra.length > 0)
    throw new TypeError(`${path} contains unexpected field(s): ${extra.join(', ')}`)

  const missing = required.filter(key => !(key in input))
  if (missing.length > 0)
    throw new TypeError(`${path} is missing required field(s): ${missing.join(', ')}`)

  return input
}

function assertArray(input: unknown, path: string): unknown[] {
  if (!Array.isArray(input))
    throw new TypeError(`${path} must be an array`)
  return input
}

function assertString(input: unknown, path: string, requireNonEmpty = false): asserts input is string {
  if (typeof input !== 'string' || (requireNonEmpty && input.length === 0))
    throw new TypeError(`${path} must be ${requireNonEmpty ? 'a non-empty string' : 'a string'}`)
}

function assertNumber(input: unknown, path: string): asserts input is number {
  if (typeof input !== 'number' || !Number.isFinite(input))
    throw new TypeError(`${path} must be a finite number`)
}

function assertInteger(input: unknown, path: string): asserts input is number {
  if (!Number.isInteger(input))
    throw new TypeError(`${path} must be an integer`)
}

function assertEnum(input: unknown, path: string, values: readonly string[]): asserts input is string {
  if (typeof input !== 'string' || !values.includes(input))
    throw new TypeError(`${path} must be one of: ${values.join(', ')}`)
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input)
}
