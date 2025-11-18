import type { MetricsCollector } from './metrics.js'
import process from 'node:process'
import { decode, encode } from '../../packages/toon/src/index.js'

export class PerformanceMonitor {
  private running = false
  private timer?: NodeJS.Timeout

  constructor(private collector: MetricsCollector) {}

  start(): void {
    if (!this.running) {
      this.running = true
      this.bench()
      this.timer = setInterval(() => this.bench(), 30000)
    }
  }

  stop(): void {
    if (this.running) {
      this.running = false
      if (this.timer) {
        clearInterval(this.timer)
      }
    }
  }

  private bench(): void {
    try {
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

      this.collector.record({
        compressionRatio,
        encodeSpeed,
        decodeSpeed,
        memoryUsage,
        errorRate,
        throughput: encodeSpeed + decodeSpeed,
      })
    }
    catch {
      this.collector.record({ errorRate: 1, timestamp: Date.now() })
    }
  }

  private data(): any {
    const t = [{ n: 'test', v: Math.random() * 100, a: true }, Array.from({ length: 25 }, (_, i) => ({ i, v: Math.random() })), { u: { i: Math.floor(Math.random() * 1000) }, d: Array.from({ length: 10 }, () => Math.random()) }]
    return t[Math.floor(Math.random() * 3)]
  }
}
