export interface MetricPoint {
  timestamp: number
  compressionRatio: number
  encodeSpeed: number
  decodeSpeed: number
  memoryUsage: number
  errorRate: number
  throughput: number
}

export interface MetricsSnapshot {
  current: MetricPoint
  history: MetricPoint[]
  averages: MetricPoint
}

export class MetricsCollector {
  private history: MetricPoint[] = []
  private subscribers: ((metrics: MetricPoint) => void)[] = []
  private readonly maxSize = 1000

  record(m: Partial<MetricPoint>): void {
    const p: MetricPoint = { timestamp: Date.now(), compressionRatio: m.compressionRatio || 0, encodeSpeed: m.encodeSpeed || 0, decodeSpeed: m.decodeSpeed || 0, memoryUsage: m.memoryUsage || 0, errorRate: m.errorRate || 0, throughput: m.throughput || 0 }
    this.history.push(p)
    this.history.length > this.maxSize && this.history.shift()
    this.subscribers.forEach(cb => cb(p))
  }

  getSnapshot(): MetricsSnapshot {
    const current = this.history[this.history.length - 1] || this.empty()
    return { current, history: this.history, averages: this.avg() }
  }

  getHistory(min: number): MetricPoint[] {
    const cutoff = Date.now() - min * 60000
    return this.history.filter(p => p.timestamp >= cutoff)
  }

  subscribe(cb: (m: MetricPoint) => void): () => void {
    this.subscribers.push(cb)
    return () => this.subscribers.splice(this.subscribers.indexOf(cb), 1)
  }

  private avg(): MetricPoint {
    if (!this.history.length)
      return this.empty()
    const r = this.history.slice(-100)
    const s = r.reduce((a, p) => ({ timestamp: 0, compressionRatio: a.compressionRatio + p.compressionRatio, encodeSpeed: a.encodeSpeed + p.encodeSpeed, decodeSpeed: a.decodeSpeed + p.decodeSpeed, memoryUsage: a.memoryUsage + p.memoryUsage, errorRate: a.errorRate + p.errorRate, throughput: a.throughput + p.throughput }), this.empty())
    const c = r.length
    return { timestamp: Date.now(), compressionRatio: s.compressionRatio / c, encodeSpeed: s.encodeSpeed / c, decodeSpeed: s.decodeSpeed / c, memoryUsage: s.memoryUsage / c, errorRate: s.errorRate / c, throughput: s.throughput / c }
  }

  private empty(): MetricPoint {
    return { timestamp: Date.now(), compressionRatio: 0, encodeSpeed: 0, decodeSpeed: 0, memoryUsage: 0, errorRate: 0, throughput: 0 }
  }
}
