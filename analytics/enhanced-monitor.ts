#!/usr/bin/env node

/**
 * Simplified Enhanced Monitor for TOON Analytics Testing
 * Generates realistic test scenarios with proper validation
 */

import process from 'node:process'
import { decode, encode } from '../packages/toon/src/index.js'

interface MonitorOptions {
  interval?: number
  host?: string
  port?: number
  verbose?: boolean
  test?: boolean
}

class EnhancedMonitor {
  private options: Required<MonitorOptions>
  private isRunning = false
  private testScenarios: Array<{ name: string, data: any, expectedRatio: number }> = []
  private currentScenario = 0

  constructor(options: MonitorOptions = {}) {
    this.options = {
      interval: options.interval || 3000,
      host: options.host || 'localhost',
      port: options.port || 3001,
      verbose: options.verbose || false,
      test: options.test || false,
    }
    this.initTestScenarios()
  }

  private initTestScenarios(): void {
    this.testScenarios = [
      {
        name: 'GitHub Repos',
        expectedRatio: 2.0,
        data: {
          repositories: Array.from({ length: 25 }, (_, i) => ({
            id: 1000 + i,
            name: `project-${i + 1}`,
            full_name: `user/project-${i + 1}`,
            private: Math.random() > 0.7,
            stargazers_count: Math.floor(Math.random() * 1000),
            language: ['JavaScript', 'TypeScript', 'Python'][Math.floor(Math.random() * 3)],
            created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          })),
        },
      },
      {
        name: 'User Analytics',
        expectedRatio: 2.1,
        data: {
          users: Array.from({ length: 100 }, (_, i) => ({
            id: 1000 + i,
            name: `User${i + 1}`,
            email: `user${i + 1}@company.com`,
            tier: ['free', 'pro', 'enterprise'][i % 3],
            status: ['active', 'inactive'][i % 2],
            usage_mb: Math.floor((i % 10 + 1) * 100),
            last_login: `2024-11-${String((i % 30) + 1).padStart(2, '0')}`,
            features: ['analytics', 'reports', 'export'][i % 3],
          })),
          total: 100,
          active: 75,
        },
      },
      {
        name: 'API Metrics',
        expectedRatio: 2.3,
        data: {
          requests: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            endpoint: ['/api/users', '/api/orders', '/api/products'][Math.floor(Math.random() * 3)],
            method: ['GET', 'POST', 'PUT'][Math.floor(Math.random() * 3)],
            status_code: [200, 201, 400, 500][Math.floor(Math.random() * 4)],
            response_time_ms: Math.floor(Math.random() * 2000),
            timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          })),
        },
      },
      {
        name: 'Time Series',
        expectedRatio: 2.9,
        data: {
          metrics: Array.from({ length: 200 }, (_, i) => ({
            timestamp: Date.now() - (200 - i) * 60000,
            cpu_usage: Number((Math.random() * 100).toFixed(2)),
            memory_usage: Number((Math.random() * 16).toFixed(2)),
            active_connections: Math.floor(Math.random() * 500),
          })),
        },
      },
    ]
  }

  async start(): Promise<void> {
    if (this.isRunning)
      return

    this.isRunning = true

    // eslint-disable-next-line no-console
    console.log(`Enhanced TOON Monitor (${this.options.test ? 'Testing Mode' : 'Standard Mode'})`)
    // eslint-disable-next-line no-console
    console.log(`Target: ${this.options.host}:${this.options.port} | Interval: ${this.options.interval}ms`)
    // eslint-disable-next-line no-console
    console.log('Press Ctrl+C to stop\\n')

    process.on('SIGINT', () => {
      this.isRunning = false
      process.exit(0)
    })

    while (this.isRunning) {
      try {
        await this.runBenchmark()
        await this.sleep(this.options.interval)
      }
      catch (error) {
        console.error('Benchmark error:', error)
        await this.sleep(this.options.interval)
      }
    }
  }

  private async runBenchmark(): Promise<void> {
    const scenario = this.options.test
      ? this.testScenarios[this.currentScenario]
      : { name: 'Random', data: this.generateRandomData(), expectedRatio: 2.0 }

    if (!scenario) {
      console.error('No scenario available')
      return
    }

    const data = scenario.data
    const startMem = process.memoryUsage().heapUsed

    const t1 = performance.now()
    const toonEncoded = encode(data)
    const t2 = performance.now()
    const decoded = decode(toonEncoded)
    const t3 = performance.now()

    const jsonSize = JSON.stringify(data).length
    const toonSize = toonEncoded.length
    const compressionRatio = jsonSize / toonSize
    const encodeSpeed = 1000 / (t2 - t1)
    const decodeSpeed = 1000 / (t3 - t2)
    const memoryUsage = (process.memoryUsage().heapUsed - startMem) / 1048576
    const dataIntegrity = JSON.stringify(data) === JSON.stringify(decoded)

    const metrics = {
      timestamp: Date.now(),
      compressionRatio,
      encodeSpeed,
      decodeSpeed,
      memoryUsage,
      errorRate: dataIntegrity ? 0 : 1,
      throughput: encodeSpeed + decodeSpeed,
      scenario: scenario.name,
      jsonSize,
      toonSize,
    }

    await this.sendMetrics(metrics)

    if (this.options.verbose) {
      // eslint-disable-next-line no-console
      console.log(`[${new Date().toLocaleTimeString()}] ${scenario.name}`)
      // eslint-disable-next-line no-console
      console.log(`  Size: ${jsonSize}b → ${toonSize}b (${compressionRatio.toFixed(2)}x compression)`)
      // eslint-disable-next-line no-console
      console.log(`  Speed: ${encodeSpeed.toFixed(0)} enc/sec, ${decodeSpeed.toFixed(0)} dec/sec`)
      // eslint-disable-next-line no-console
      console.log(`  Memory: ${memoryUsage.toFixed(2)}MB | Integrity: ${dataIntegrity ? 'OK' : 'FAIL'}`)

      if (this.options.test && scenario.expectedRatio) {
        const withinRange = Math.abs(compressionRatio - scenario.expectedRatio) <= 0.5
        // eslint-disable-next-line no-console
        console.log(`  Expected: ${scenario.expectedRatio}x | Status: ${withinRange ? '✅ PASS' : '❌ FAIL'}`)
      }
      // eslint-disable-next-line no-console
      console.log('')
    }
    else {
      const status = dataIntegrity ? '✓' : '✗'
      process.stdout.write(status)
    }

    if (this.options.test) {
      this.currentScenario = (this.currentScenario + 1) % this.testScenarios.length
    }
  }

  private generateRandomData(): any {
    const types = [
      { type: 'simple', value: Math.random() * 1000, active: true },
      Array.from({ length: 30 }, (_, i) => ({ id: i, value: Math.random().toFixed(3) })),
      {
        user: { id: Math.floor(Math.random() * 1000) },
        data: Array.from({ length: 15 }, () => Math.random().toFixed(2)),
        metadata: { timestamp: Date.now(), version: '1.0' },
      },
    ]
    return types[Math.floor(Math.random() * types.length)]
  }

  private async sendMetrics(metrics: any): Promise<void> {
    try {
      const res = await fetch(`http://${this.options.host}:${this.options.port}/api/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics),
      })
      if (!res.ok)
        throw new Error(`HTTP ${res.status}`)
    }
    catch (e) {
      if (this.options.verbose) {
        console.error('Failed to send metrics:', e)
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// CLI parsing
const args = process.argv.slice(2)
const options: MonitorOptions = {}

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--interval' && args[i + 1]) {
    options.interval = Number.parseInt(args[i + 1] || '3000') || 3000
    i++
  }
  else if (arg === '--host' && args[i + 1]) {
    options.host = args[i + 1]
    i++
  }
  else if (arg === '--port' && args[i + 1]) {
    options.port = Number.parseInt(args[i + 1] || '3001') || 3001
    i++
  }
  else if (arg === '--verbose') {
    options.verbose = true
  }
  else if (arg === '--test') {
    options.test = true
  }
  else if (arg === '--help') {
    // eslint-disable-next-line no-console
    console.log('Enhanced TOON Monitor')
    // eslint-disable-next-line no-console
    console.log('Usage: [options]')
    // eslint-disable-next-line no-console
    console.log('Options:')
    // eslint-disable-next-line no-console
    console.log('  --interval ms  Benchmark interval (default: 3000)')
    // eslint-disable-next-line no-console
    console.log('  --host host    Server hostname (default: localhost)')
    // eslint-disable-next-line no-console
    console.log('  --port port    Server port (default: 3001)')
    // eslint-disable-next-line no-console
    console.log('  --verbose      Detailed output')
    // eslint-disable-next-line no-console
    console.log('  --test         Use realistic test scenarios')
    process.exit(0)
  }
}

const monitor = new EnhancedMonitor(options)
monitor.start().catch(console.error)
