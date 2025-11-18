#!/usr/bin/env node

import process from 'node:process'
import { decode, encode } from '../../packages/toon/src/index.js'

interface MonitorOptions {
  interval?: number
  host?: string
  port?: number
  verbose?: boolean
}

class ToonMonitor {
  private options: Required<MonitorOptions>
  private isRunning = false

  constructor(options: MonitorOptions = {}) {
    this.options = {
      interval: options.interval || 10000, // 10 seconds
      host: options.host || 'localhost',
      port: options.port || 3001,
      verbose: options.verbose || false,
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      // eslint-disable-next-line no-console
      console.log('Monitor is already running')
      return
    }

    this.isRunning = true
    // eslint-disable-next-line no-console
    console.log(`TOON Monitor: ${this.options.host}:${this.options.port} (${this.options.interval}ms)\nCtrl+C to stop\n`)

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      // eslint-disable-next-line no-console
      console.log('\nStopping...')
      this.stop()
    })

    // Start monitoring loop
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

  stop(): void {
    this.isRunning = false
    console.error('Monitor stopped')
    process.exit(0)
  }

  private async runBenchmark(): Promise<void> {
    const data = this.data()
    const mem = process.memoryUsage().heapUsed

    const t1 = performance.now()
    const toon = encode(data)
    const t2 = performance.now()
    const decoded = decode(toon)
    const t3 = performance.now()

    const encodeSpeed = 1000 / (t2 - t1)
    const decodeSpeed = 1000 / (t3 - t2)
    const memoryUsage = (process.memoryUsage().heapUsed - mem) / 1048576
    const compressionRatio = JSON.stringify(data).length / toon.length
    const errorRate = JSON.stringify(data) === JSON.stringify(decoded) ? 0 : 1

    const metrics = {
      timestamp: Date.now(),
      compressionRatio,
      encodeSpeed,
      decodeSpeed,
      memoryUsage,
      errorRate,
      throughput: encodeSpeed + decodeSpeed,
    }

    await this.sendMetrics(metrics)

    // Console output
    if (this.options.verbose) {
      // eslint-disable-next-line no-console
      console.log(`[${new Date().toLocaleTimeString()}] C:${metrics.compressionRatio.toFixed(1)}x E:${metrics.encodeSpeed.toFixed(0)} D:${metrics.decodeSpeed.toFixed(0)} M:${metrics.memoryUsage.toFixed(1)}MB T:${metrics.throughput.toFixed(0)}`)
    }
    else {
      process.stdout.write('.')
    }
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
      this.options.verbose && console.error('Metrics send failed:', e)
    }
  }

  private data(): any {
    const types = [
      { name: 'test', value: Math.random() * 1000, active: true },
      Array.from({ length: 50 }, (_, i) => ({ id: i, value: Math.random() })),
      { user: { id: Math.floor(Math.random() * 1000) }, data: Array.from({ length: 20 }, () => Math.random()) },
    ]
    return types[Math.floor(Math.random() * types.length)]
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// CLI usage
const args = process.argv.slice(2)
const options: MonitorOptions = {}

args.forEach((arg, i) => {
  if (arg === '--interval') {
    options.interval = Number.parseInt(args[i + 1]) || 10000
  }
  else if (arg === '--host') {
    options.host = args[i + 1] || 'localhost'
  }
  else if (arg === '--port') {
    options.port = Number.parseInt(args[i + 1]) || 3001
  }
  else if (arg === '--verbose') {
    options.verbose = true
  }
  else if (arg === '--help') {
    console.error('TOON Monitor\nUsage: [--interval ms] [--host host] [--port port] [--verbose]')
    process.exit(0)
  }
})

const monitor = new ToonMonitor(options)
monitor.start().catch(console.error)
