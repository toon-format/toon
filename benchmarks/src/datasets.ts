import type { Dataset } from './types.ts'
import { faker } from '@faker-js/faker'
import githubRepos from '../data/github-repos.json' with { type: 'json' }

// Seed for reproducibility
faker.seed(12345)

/**
 * Employee record structure for tabular dataset
 */
export interface Employee {
  id: number
  name: string
  email: string
  department: string
  salary: number
  yearsExperience: number
  active: boolean
}

/**
 * E-commerce order structure for nested dataset
 */
export interface Order {
  orderId: string
  customer: {
    id: number
    name: string
    email: string
    phone: string
  }
  items: {
    sku: string
    name: string
    quantity: number
    price: number
  }[]
  subtotal: number
  tax: number
  total: number
  status: string
  orderDate?: string
  createdAt?: string
}

/**
 * Analytics metric structure for time-series dataset
 */
export interface AnalyticsMetric {
  date: string
  views: number
  clicks: number
  conversions: number
  revenue: number
  bounceRate: number
}

/**
 * GitHub repository structure for real-world dataset
 */
export interface Repository {
  id: number
  name: string
  repo: string
  description: string
  stars: number
  watchers: number
  forks: number
  defaultBranch: string
  createdAt: string
  updatedAt: string
  pushedAt: string
}

/**
 * Semi-uniform order structure with optional discount and shipping
 */
export interface SemiUniformOrder {
  orderId: string
  total: number
  status: string
  orderDate: string
  discount?: { code: string, amount: number }
  shipping?: { carrier: string, tracking: string, address: { city: string, zip: string, country: string } }
}

/**
 * Incident structure with deep optional resolution
 */
export interface Incident {
  id: string
  title: string
  severity: string
  createdAt: string
  resolution?: {
    assignee: string
    timeline: {
      startedAt: string
      resolvedAt: string
      escalation?: { level: number, approvedBy: string, notes: string }
    }
  }
}

/**
 * Event log structure for semi-uniform dataset
 */
export interface EventLog {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  endpoint: string
  statusCode: number
  responseTime: number
  userId: number
  error?: {
    message: string
    stack: string
    retryable: boolean
  }
}

/**
 * Nested configuration structure for deeply nested dataset
 */
export interface NestedConfig {
  environment: string
  version: string
  database: {
    host: string
    port: number
    name: string
    pool: {
      min: number
      max: number
      idleTimeout: number
    }
    replicas: {
      host: string
      port: number
      priority: number
    }[]
  }
  features: Record<string, {
    enabled: boolean
    rollout: number
    variants: {
      name: string
      weight: number
      config: Record<string, any>
    }[]
  }>
  authentication: {
    providers: {
      name: string
      clientId: string
      scopes: string[]
      config: Record<string, any>
    }[]
    session: {
      secret: string
      duration: number
      refreshThreshold: number
    }
  }
  permissions: {
    roles: Record<string, {
      permissions: string[]
      inherits: string[]
    }>
    groups: Record<string, {
      members: string[]
      roles: string[]
    }>
  }
}

/**
 * Product structure for large uniform arrays
 */
export interface Product {
  sku: string
  name: string
  category: string
  price: number
  qty: number
  lastUpdated: string
}

/**
 * Internal types for structural validation pattern generation
 */
type StructuralValidationType = 'truncated' | 'extra-rows' | 'width-mismatch' | 'missing-fields'

interface StructuralValidationFixture {
  type: StructuralValidationType
  description: string
  data: Record<string, unknown>
  isValid: boolean
}

/**
 * Generate analytics time-series data
 */
export function generateAnalyticsData(days: number, startDate = '2025-01-01'): {
  metrics: AnalyticsMetric[]
} {
  const date = new Date(startDate)

  return {
    metrics: Array.from({ length: days }, (_, i) => {
      const currentDate = new Date(date)
      currentDate.setDate(currentDate.getDate() + i)

      // Simulate realistic web traffic with some variation
      const baseViews = 5000
      const weekendMultiplier = currentDate.getDay() === 0 || currentDate.getDay() === 6 ? 0.7 : 1.0
      const views = Math.round(baseViews * weekendMultiplier + faker.number.int({ min: -1000, max: 3000 }))
      const clicks = Math.round(views * faker.number.float({ min: 0.02, max: 0.08 }))
      const conversions = Math.round(clicks * faker.number.float({ min: 0.05, max: 0.15 }))
      const avgOrderValue = faker.number.float({ min: 49.99, max: 299.99 })
      const revenue = Number((conversions * avgOrderValue).toFixed(2))

      return {
        date: currentDate.toISOString().split('T')[0]!,
        views,
        clicks,
        conversions,
        revenue,
        bounceRate: faker.number.float({ min: 0.3, max: 0.7, fractionDigits: 2 }),
      }
    }),
  }
}

/**
 * Generate employee data (uniform tabular structure)
 */
const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Operations', 'Finance'] as const

function generateEmployees(count: number): { employees: Employee[] } {
  return {
    employees: Array.from({ length: count }, (_, i): Employee => {
      const yearsExp = faker.number.int({ min: 1, max: 25 })
      return {
        id: i + 1,
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        department: departments[i % departments.length]!,
        salary: faker.number.int({ min: 45000, max: 150000 }),
        yearsExperience: yearsExp,
        active: faker.datatype.boolean(0.8), // 80% active
      }
    }),
  }
}

/**
 * Tabular dataset: Uniform employee records
 *
 * @remarks
 * Tests TOON's tabular array format.
 */
const tabularDataset: Dataset = {
  name: 'tabular',
  description: 'Uniform employee records',
  data: generateEmployees(100),
  metadata: {
    supportsCSV: true,
    structureClass: 'uniform',
    tabularEligibility: 100, // All arrays contain uniform objects with primitive values only
  },
}

/**
 * Generate e-commerce orders (nested structure)
 */
const PRODUCT_NAMES = ['Wireless Mouse', 'USB Cable', 'Laptop Stand', 'Keyboard', 'Webcam', 'Headphones', 'Monitor', 'Desk Lamp'] as const
const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const

function generateOrders(count: number): { orders: Order[] } {
  return {
    orders: Array.from({ length: count }, (_, i) => {
      const customerId = (i % 20) + 1 // Rotate through 20 customers
      const itemCount = faker.number.int({ min: 1, max: 4 }) // 1-4 items per order

      const items = Array.from({ length: itemCount }, (_, j) => {
        const price = faker.number.float({
          min: 9.99,
          max: 199.99,
          fractionDigits: 2,
        })
        const quantity = faker.number.int({ min: 1, max: 5 })
        return {
          sku: `SKU-${faker.string.alphanumeric({ length: 6 }).toUpperCase()}`,
          name: PRODUCT_NAMES[j % PRODUCT_NAMES.length]!,
          quantity,
          price,
        }
      })

      const subtotal = Number(items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2))
      const tax = Number((subtotal * 0.08).toFixed(2)) // 8% tax rate
      const total = Number((subtotal + tax).toFixed(2))

      return {
        orderId: `ORD-${String(i + 1).padStart(4, '0')}`,
        customer: {
          id: customerId,
          name: faker.person.fullName(),
          email: faker.internet.email().toLowerCase(),
          phone: faker.phone.number(),
        },
        items,
        subtotal,
        tax,
        total,
        status: ORDER_STATUSES[i % ORDER_STATUSES.length]!,
        orderDate: faker.date.recent({ days: 90 }).toISOString().split('T')[0],
      }
    }),
  }
}

/**
 * Nested dataset: E-commerce orders with nested structures
 *
 * @remarks
 * Tests TOON's handling of complex nested objects.
 */
const nestedDataset: Dataset = {
  name: 'nested',
  description: 'E-commerce orders with nested structures',
  data: generateOrders(50),
  metadata: {
    supportsCSV: false,
    structureClass: 'nested',
    tabularEligibility: 33, // Top-level orders array has nested objects (not tabular), but nested items arrays are tabular
  },
}

/**
 * Analytics dataset: Time-series metrics
 *
 * @remarks
 * Tests TOON's handling of numeric data and date fields.
 */
const analyticsDataset: Dataset = {
  name: 'analytics',
  description: 'Time-series analytics data',
  data: generateAnalyticsData(60),
  metadata: {
    supportsCSV: true,
    structureClass: 'uniform',
    tabularEligibility: 100, // Uniform time-series records with consistent primitive fields
  },
}

/**
 * Real-world dataset: Top 100 starred GitHub repositories
 *
 * @remarks
 * Tests TOON's tabular format with real data.
 */
const githubDataset: Dataset = {
  name: 'github',
  description: 'Top 100 GitHub repositories',
  data: {
    repositories: githubRepos,
  },
  metadata: {
    supportsCSV: true,
    structureClass: 'uniform',
    tabularEligibility: 100, // Repository array contains uniform objects with primitive values
  },
}

/**
 * Generate a single e-commerce order with nested structure
 *
 * @remarks
 * Used for token efficiency benchmarks.
 */
export function generateOrderData(): Order {
  return {
    orderId: faker.string.alphanumeric({ length: 12, casing: 'upper' }),
    customer: {
      id: faker.number.int({ min: 1000, max: 9999 }),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
    },
    items: Array.from({ length: faker.number.int({ min: 2, max: 5 }) }, () => ({
      sku: faker.string.alphanumeric({ length: 8, casing: 'upper' }),
      name: faker.commerce.productName(),
      quantity: faker.number.int({ min: 1, max: 5 }),
      price: Number(faker.commerce.price({ min: 10, max: 200 })),
    })),
    subtotal: Number(faker.commerce.price({ min: 100, max: 500 })),
    tax: Number(faker.commerce.price({ min: 10, max: 50 })),
    total: Number(faker.commerce.price({ min: 110, max: 550 })),
    status: faker.helpers.arrayElement(['pending', 'processing', 'shipped', 'delivered']),
    createdAt: faker.date.recent({ days: 7 }).toISOString(),
  }
}

/**
 * Generate event logs (semi-uniform structure)
 *
 * @remarks
 * Approximately 50% of logs include nested error objects, 50% are flat.
 * This creates ~45% tabular eligibility.
 */
export function generateEventLogs(count: number): { logs: EventLog[] } {
  const endpoints = ['/api/users', '/api/orders', '/api/products', '/api/auth', '/api/payments']
  const levels = ['info', 'warn', 'error'] as const

  return {
    logs: Array.from({ length: count }, () => {
      const level = faker.helpers.arrayElement(levels)
      const hasError = level === 'error' || (level === 'warn' && faker.datatype.boolean(0.3))

      const log: EventLog = {
        timestamp: faker.date.recent({ days: 7 }).toISOString(),
        level,
        endpoint: faker.helpers.arrayElement(endpoints),
        statusCode: hasError
          ? faker.number.int({ min: 400, max: 599 })
          : faker.number.int({ min: 200, max: 299 }),
        responseTime: faker.number.int({ min: 10, max: 5000 }),
        userId: faker.number.int({ min: 1000, max: 9999 }),
      }

      if (hasError) {
        log.error = {
          message: faker.helpers.arrayElement([
            'Database connection timeout',
            'Invalid authentication token',
            'Resource not found',
            'Internal server error',
            'Rate limit exceeded',
          ]),
          stack: `Error: ${faker.lorem.sentence()}\n  at ${faker.lorem.word()}\n  at ${faker.lorem.word()}`,
          retryable: faker.datatype.boolean(0.6),
        }
      }

      return log
    }),
  }
}

/**
 * Generate deeply nested configuration
 *
 * @remarks
 * Creates a complex nested structure with minimal tabular eligibility (~0%).
 */
export function generateNestedConfig(): NestedConfig {
  return {
    environment: faker.helpers.arrayElement(['production', 'staging', 'development']),
    version: faker.system.semver(),
    database: {
      host: faker.internet.domainName(),
      port: 5432,
      name: faker.database.type(),
      pool: {
        min: 2,
        max: faker.number.int({ min: 10, max: 50 }),
        idleTimeout: 30000,
      },
      replicas: Array.from({ length: 3 }, (_, i) => ({
        host: `replica-${i + 1}.${faker.internet.domainName()}`,
        port: 5432,
        priority: i + 1,
      })),
    },
    features: {
      darkMode: {
        enabled: faker.datatype.boolean(),
        rollout: faker.number.int({ min: 0, max: 100 }),
        variants: [
          {
            name: 'default',
            weight: 70,
            config: { theme: 'dark', animations: true },
          },
          {
            name: 'minimal',
            weight: 30,
            config: { theme: 'dark', animations: false },
          },
        ],
      },
      analytics: {
        enabled: faker.datatype.boolean(),
        rollout: faker.number.int({ min: 0, max: 100 }),
        variants: [
          {
            name: 'full',
            weight: 100,
            config: { tracking: 'all', sampling: 1.0 },
          },
        ],
      },
    },
    authentication: {
      providers: [
        {
          name: 'oauth2',
          clientId: faker.string.uuid(),
          scopes: ['read', 'write', 'admin'],
          config: {
            authUrl: faker.internet.url(),
            tokenUrl: faker.internet.url(),
          },
        },
        {
          name: 'saml',
          clientId: faker.string.uuid(),
          scopes: ['read'],
          config: {
            entryPoint: faker.internet.url(),
            cert: faker.string.alphanumeric({ length: 64 }),
          },
        },
      ],
      session: {
        secret: faker.string.alphanumeric({ length: 32 }),
        duration: 86400,
        refreshThreshold: 3600,
      },
    },
    permissions: {
      roles: {
        admin: {
          permissions: ['read', 'write', 'delete', 'manage_users', 'manage_roles'],
          inherits: [],
        },
        editor: {
          permissions: ['read', 'write'],
          inherits: ['viewer'],
        },
        viewer: {
          permissions: ['read'],
          inherits: [],
        },
      },
      groups: {
        engineering: {
          members: Array.from({ length: 5 }, () => faker.internet.email()),
          roles: ['admin', 'editor'],
        },
        support: {
          members: Array.from({ length: 3 }, () => faker.internet.email()),
          roles: ['viewer'],
        },
      },
    },
  }
}

/**
 * Generate large uniform product array (5000+ rows)
 *
 * @remarks
 * Tests TOON's token efficiency and structural reliability at scale.
 */
export function generateProducts(count: number): { products: Product[] } {
  const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys'] as const

  return {
    products: Array.from({ length: count }, (_, i): Product => ({
      sku: `SKU-${String(i + 1).padStart(6, '0')}`,
      name: faker.commerce.productName(),
      category: categories[i % categories.length]!,
      price: Number(faker.commerce.price({ min: 5, max: 500 })),
      qty: faker.number.int({ min: 0, max: 1000 }),
      lastUpdated: faker.date.recent({ days: 30 }).toISOString().split('T')[0]!,
    })),
  }
}

/**
 * Generate structural validation fixtures from employee data
 *
 * @remarks
 * Creates deliberately corrupted datasets to test TOON's structural validation
 * capabilities via [N] length declarations and {fields} headers.
 * Internal function used to generate structural validation datasets.
 */
function generateStructuralValidationFixtures(): StructuralValidationFixture[] {
  const baseData = generateEmployees(20)

  return [
    // Valid baseline
    {
      type: 'truncated' as const,
      description: 'Valid complete dataset (control)',
      data: { employees: baseData.employees },
      isValid: true,
    },
    // Truncated array (missing last 3 rows)
    {
      type: 'truncated' as const,
      description: 'Array truncated: 3 rows removed from end',
      data: { employees: baseData.employees.slice(0, -3) },
      isValid: false, // [N] won't match actual row count in TOON
    },
    // Extra rows (3 more than original)
    {
      type: 'extra-rows' as const,
      description: 'Extra rows added beyond declared length',
      data: {
        employees: [
          ...baseData.employees,
          ...generateEmployees(3).employees,
        ],
      },
      isValid: false, // [N] won't match actual row count in TOON
    },
    // Width mismatch (inconsistent field count)
    {
      type: 'width-mismatch' as const,
      description: 'Inconsistent field count (missing salary in row 10)',
      data: {
        employees: baseData.employees.map((emp, i) => {
          if (i === 9) {
            // Row 10, missing salary field
            const { salary, ...rest } = emp
            return rest
          }
          return emp
        }),
      },
      isValid: false, // Not all objects have same fields (tabular requirement)
    },
    // Missing required fields
    {
      type: 'missing-fields' as const,
      description: 'Missing required fields (no email in multiple rows)',
      data: {
        employees: baseData.employees.map((emp, i) => {
          if (i % 5 === 0) {
            // Every 5th row, missing email
            const { email, ...rest } = emp
            return rest
          }
          return emp
        }),
      },
      isValid: false, // Not all objects have same fields (tabular requirement)
    },
  ]
}

/**
 * Event logs dataset: Semi-uniform structure
 *
 * @remarks
 * Tests TOON with semi-uniform data (~50% flat, ~50% with nested errors).
 */
const eventLogsDataset: Dataset = {
  name: 'event-logs',
  description: 'Semi-uniform event logs',
  data: generateEventLogs(75),
  metadata: {
    supportsCSV: false,
    structureClass: 'semi-uniform',
    tabularEligibility: 50, // Top-level logs array is tabular, but ~50% have nested optional error objects
  },
}

/**
 * Nested config dataset: Deeply nested structure
 *
 * @remarks
 * Tests TOON's worst-case scenario with deeply nested configuration.
 */
const nestedConfigDataset: Dataset = {
  name: 'nested-config',
  description: 'Deeply nested configuration',
  data: generateNestedConfig(),
  metadata: {
    supportsCSV: false,
    structureClass: 'deep',
    tabularEligibility: 0, // Deeply nested configuration with no tabular arrays
  },
}

/**
 * Structural validation datasets: Tests ability to detect incomplete, truncated, or corrupted data
 *
 * @remarks
 * These datasets test TOON's structural validation advantages via [N] length declarations
 * and {fields} headers. CSV is included to demonstrate its lack of structural metadata.
 */
const structuralValidationDatasets: Dataset[] = generateStructuralValidationFixtures().map((fixture, index) => {
  const datasetNames = [
    'structural-validation-control',
    'structural-validation-truncated',
    'structural-validation-extra-rows',
    'structural-validation-width-mismatch',
    'structural-validation-missing-fields',
  ] as const

  return {
    name: datasetNames[index]!,
    description: fixture.description,
    data: fixture.data,
    metadata: {
      supportsCSV: true, // Include CSV to show it can't validate structure
      structureClass: 'uniform',
      tabularEligibility: 100,
    },
  }
})

/**
 * Datasets for accuracy benchmarks (smaller sizes for faster evaluation)
 */
export const ACCURACY_DATASETS: Dataset[] = [
  tabularDataset, // 100 employees
  nestedDataset, // 50 orders
  analyticsDataset, // 60 days
  githubDataset, // 100 repos
  eventLogsDataset, // 75 logs
  nestedConfigDataset, // 1 config
  ...structuralValidationDatasets, // 5 validation fixtures
]

/**
 * Generate semi-uniform orders (~30% discount, ~60% shipping)
 */
const ORDER_STATUSES_SEMI = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const
const CARRIERS = ['UPS', 'FedEx', 'DHL', 'CJ', 'Hanjin'] as const
const CITIES = ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Gwangju', 'Daejeon'] as const
const DISCOUNT_CODES = ['SAVE20', 'VIP10', 'WELCOME', 'FLASH30', 'LOYALTY15'] as const

export function generateSemiUniformOrders(count: number): { orders: SemiUniformOrder[] } {
  return {
    orders: Array.from({ length: count }, (_, i): SemiUniformOrder => {
      const order: SemiUniformOrder = {
        orderId: `ORD-${String(i + 1).padStart(4, '0')}`,
        total: Number(faker.commerce.price({ min: 50, max: 500 })),
        status: ORDER_STATUSES_SEMI[i % ORDER_STATUSES_SEMI.length]!,
        orderDate: faker.date.recent({ days: 90 }).toISOString().split('T')[0]!,
      }
      if (faker.datatype.boolean(0.3)) {
        order.discount = {
          code: faker.helpers.arrayElement([...DISCOUNT_CODES]),
          amount: Number(faker.commerce.price({ min: 5, max: 50 })),
        }
      }
      if (faker.datatype.boolean(0.6)) {
        order.shipping = {
          carrier: faker.helpers.arrayElement([...CARRIERS]),
          tracking: faker.string.alphanumeric({ length: 8, casing: 'upper' }),
          address: {
            city: faker.helpers.arrayElement([...CITIES]),
            zip: faker.location.zipCode('#####'),
            country: 'KR',
          },
        }
      }
      return order
    }),
  }
}

/**
 * Generate incidents with deep optional resolution (~40%)
 */
export function generateIncidents(count: number): { incidents: Incident[] } {
  const severities = ['critical', 'major', 'minor', 'trivial'] as const
  const titles = [
    'Login page 500 error', 'Slow dashboard load', 'Payment timeout',
    'CSS broken on mobile', 'API rate limit hit', 'Search index stale',
    'Email delivery failure', 'Cache invalidation bug',
  ] as const

  return {
    incidents: Array.from({ length: count }, (_, i): Incident => {
      const incident: Incident = {
        id: `INC-${String(i + 1).padStart(4, '0')}`,
        title: faker.helpers.arrayElement([...titles]),
        severity: faker.helpers.arrayElement([...severities]),
        createdAt: faker.date.recent({ days: 30 }).toISOString(),
      }
      if (faker.datatype.boolean(0.4)) {
        const hasEscalation = faker.datatype.boolean(0.5)
        incident.resolution = {
          assignee: faker.internet.email().toLowerCase(),
          timeline: {
            startedAt: faker.date.recent({ days: 7 }).toISOString(),
            resolvedAt: faker.date.recent({ days: 3 }).toISOString(),
            ...(hasEscalation && {
              escalation: {
                level: faker.number.int({ min: 1, max: 4 }),
                approvedBy: faker.internet.email().toLowerCase(),
                notes: faker.lorem.sentence(),
              },
            }),
          },
        }
      }
      return incident
    }),
  }
}

/**
 * Grafana/Loki-style log entry
 */
export interface GrafanaLog {
  timestamp: string
  level: string
  job: string
  instance: string
  method: string
  endpoint: string
  status_code: number
  duration_ms: number
  bytes_sent: number
  message: string
  error?: { type: string, message: string, stack_trace: string }
  trace?: { traceId: string, spanId: string, parentSpanId: string | null }
  auth?: { userId: string, sessionId: string, role: string, ip: string }
}

/**
 * Generate Grafana/Loki-style logs (~35% error, ~20% trace, ~15% auth)
 */
const LOG_LEVELS = ['info', 'info', 'info', 'info', 'warn', 'error', 'debug', 'info', 'info', 'info'] as const
const LOG_JOBS = ['api-gateway', 'auth-service', 'order-service', 'payment-service', 'notification-service'] as const
const LOG_INSTANCES = ['pod-a1b2c3', 'pod-d4e5f6', 'pod-g7h8i9', 'pod-j0k1l2', 'pod-m3n4o5'] as const
const LOG_ENDPOINTS = ['/api/v1/users', '/api/v1/orders', '/api/v1/payments', '/api/v1/auth/login', '/api/v1/products', '/api/v1/notifications', '/healthz', '/metrics', '/api/v1/cart', '/api/v1/search'] as const
const LOG_ERROR_TYPES = ['TimeoutError', 'ConnectionRefused', 'ValidationError', 'AuthenticationError', 'RateLimitExceeded', 'DatabaseError', 'ServiceUnavailable'] as const
const LOG_ERROR_MSGS = ['upstream connect timeout', 'connection refused to db-primary:5432', 'invalid request body', 'token expired', 'rate limit exceeded: 100 req/min', 'deadlock detected on table orders', 'circuit breaker open'] as const
const LOG_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const

export function generateGrafanaLogs(count: number): { logs: GrafanaLog[] } {
  return {
    logs: Array.from({ length: count }, (): GrafanaLog => {
      const level = faker.helpers.arrayElement([...LOG_LEVELS])
      const isError = level === 'error' || level === 'warn'
      const job = faker.helpers.arrayElement([...LOG_JOBS])

      const entry: GrafanaLog = {
        timestamp: faker.date.recent({ days: 1 }).toISOString(),
        level,
        job,
        instance: faker.helpers.arrayElement([...LOG_INSTANCES]),
        method: faker.helpers.arrayElement([...LOG_METHODS]),
        endpoint: faker.helpers.arrayElement([...LOG_ENDPOINTS]),
        status_code: isError ? faker.helpers.arrayElement([400, 401, 403, 404, 408, 429, 500, 502, 503, 504]) : faker.helpers.arrayElement([200, 201, 204]),
        duration_ms: isError ? faker.number.int({ min: 500, max: 30000 }) : faker.number.int({ min: 1, max: 500 }),
        bytes_sent: faker.number.int({ min: 100, max: 50000 }),
        message: isError ? faker.helpers.arrayElement([...LOG_ERROR_MSGS]) : 'request completed successfully',
      }

      if (isError) {
        entry.error = {
          type: faker.helpers.arrayElement([...LOG_ERROR_TYPES]),
          message: faker.helpers.arrayElement([...LOG_ERROR_MSGS]),
          stack_trace: `at handleRequest (${job}/src/handler.ts:${faker.number.int({ min: 10, max: 500 })})`,
        }
      }
      if (faker.datatype.boolean(0.2)) {
        entry.trace = {
          traceId: faker.string.hexadecimal({ length: 32, prefix: '' }),
          spanId: faker.string.hexadecimal({ length: 16, prefix: '' }),
          parentSpanId: faker.datatype.boolean(0.7) ? faker.string.hexadecimal({ length: 16, prefix: '' }) : null,
        }
      }
      if (faker.datatype.boolean(0.15)) {
        entry.auth = {
          userId: `usr-${faker.string.alphanumeric(8)}`,
          sessionId: `sess-${faker.string.alphanumeric(12)}`,
          role: faker.helpers.arrayElement(['admin', 'user', 'service-account', 'readonly']),
          ip: faker.internet.ipv4(),
        }
      }

      return entry
    }),
  }
}

/**
 * Datasets for token efficiency benchmarks (larger sizes to amplify token differences)
 */
export const TOKEN_EFFICIENCY_DATASETS: Dataset[] = [
  // Tabular: 2000 employees
  {
    name: 'tabular',
    description: 'Uniform employee records',
    data: generateEmployees(2000),
    metadata: {
      supportsCSV: true,
      structureClass: 'uniform',
      tabularEligibility: 100, // All arrays contain uniform objects with primitive values only
    },
  },
  // Nested: 500 orders
  {
    name: 'nested',
    description: 'E-commerce orders with nested structures',
    data: generateOrders(500),
    metadata: {
      supportsCSV: false,
      structureClass: 'nested',
      tabularEligibility: 33, // Top-level orders array has nested objects (not tabular), but nested items arrays are tabular
    },
  },
  // Analytics: 365 days
  {
    name: 'analytics',
    description: 'Time-series analytics data',
    data: generateAnalyticsData(365),
    metadata: {
      supportsCSV: true,
      structureClass: 'uniform',
      tabularEligibility: 100, // Uniform time-series records with consistent primitive fields
    },
  },
  // GitHub: 100 repos (same as accuracy)
  githubDataset,
  // Event logs: 2000 logs
  {
    name: 'event-logs',
    description: 'Semi-uniform event logs',
    data: generateEventLogs(2000),
    metadata: {
      supportsCSV: false,
      structureClass: 'semi-uniform',
      tabularEligibility: 50, // Top-level logs array is tabular, but ~50% have nested optional error objects
    },
  },
  // Nested config: 1 config (same as accuracy)
  nestedConfigDataset,
  // Semi-uniform orders: 500 orders (~30% discount, ~60% shipping)
  {
    name: 'semi-uniform-orders',
    description: 'Semi-uniform orders with optional discount and shipping',
    data: generateSemiUniformOrders(500),
    metadata: {
      supportsCSV: false,
      structureClass: 'semi-uniform',
      tabularEligibility: 40,
    },
  },
  // Deep incidents: 500 incidents (~40% with deep resolution)
  {
    name: 'deep-incidents',
    description: 'Incidents with deep optional resolution',
    data: generateIncidents(500),
    metadata: {
      supportsCSV: false,
      structureClass: 'deep',
      tabularEligibility: 30,
    },
  },
  // Grafana/Loki-style logs: 2000 logs (~35% error, ~20% trace, ~15% auth)
  {
    name: 'grafana-logs',
    description: 'Grafana/Loki-style logs with multi-extras',
    data: generateGrafanaLogs(2000),
    metadata: {
      supportsCSV: false,
      structureClass: 'semi-uniform',
      tabularEligibility: 45,
    },
  },
]
