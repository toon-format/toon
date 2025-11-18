import * as React from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const { useState, useEffect } = React

interface MetricPoint {
  timestamp: number
  compressionRatio: number
  encodeSpeed: number
  decodeSpeed: number
  memoryUsage: number
  errorRate: number
  throughput: number
}

interface MetricsSnapshot {
  current: MetricPoint
  history: MetricPoint[]
  averages: {
    compressionRatio: number
    encodeSpeed: number
    decodeSpeed: number
    memoryUsage: number
    errorRate: number
    throughput: number
  }
}

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [connectionMode, setConnectionMode] = useState<'websocket' | 'http' | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number>(0)
  const [tick, setTick] = useState(() => Date.now())

  useEffect(() => {
    const apiHost = window.location.hostname || 'localhost'
    const apiBase = `http://${apiHost}:3001`
    let cancelled = false
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null

    const loadDataHttp = async () => {
      try {
        const response = await fetch(`${apiBase}/api/metrics`)
        if (!response.ok)
          throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        if (cancelled)
          return
        setMetrics(data)
        setStatus('connected')
        setConnectionMode(prev => (prev === 'websocket' ? prev : 'http'))
        setLastUpdate(Date.now())
      }
      catch (err) {
        if (!cancelled)
          console.error('HTTP polling failed:', err)
      }
    }

    const scheduleReconnect = () => {
      if (reconnectTimer)
        window.clearTimeout(reconnectTimer)
      reconnectTimer = window.setTimeout(() => connect(), 3000)
    }

    function connect() {
      if (cancelled)
        return

      setStatus(prev => (prev === 'connected' ? prev : 'connecting'))

      try {
        ws = new WebSocket(`ws://${apiHost}:3001/ws`)
      }
      catch (err) {
        console.error('WebSocket creation failed:', err)
        setStatus('disconnected')
        setConnectionMode(prev => (prev === 'websocket' ? null : prev))
        scheduleReconnect()
        return
      }

      ws.onopen = () => {
        if (cancelled)
          return
        setStatus('connected')
        setConnectionMode('websocket')
      }

      ws.onmessage = (event) => {
        if (cancelled)
          return
        try {
          const payload = JSON.parse(event.data)
          if (payload.type === 'initial')
            setMetrics(payload.data)
          else if (payload.type === 'update')
            setMetrics(prev => prev ? { ...prev, current: payload.data, history: [...prev.history, payload.data].slice(-1000) } : null)
          setLastUpdate(Date.now())
        }
        catch (err) {
          console.error('WebSocket message error:', err)
        }
      }

      ws.onclose = () => {
        if (cancelled)
          return
        setStatus('disconnected')
        setConnectionMode(prev => (prev === 'websocket' ? null : prev))
        loadDataHttp()
        scheduleReconnect()
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        ws?.close()
      }
    }

    loadDataHttp()
    const httpInterval = window.setInterval(loadDataHttp, 5000)
    connect()

    return () => {
      cancelled = true
      if (reconnectTimer)
        window.clearTimeout(reconnectTimer)
      window.clearInterval(httpInterval)
      ws?.close()
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const isStale = lastUpdate === 0 ? false : (tick - lastUpdate > 10000)

  let effectiveStatus: 'connecting' | 'connected' | 'disconnected'
  if (connectionMode)
    effectiveStatus = 'connected'
  else if (!metrics)
    effectiveStatus = status
  else if (isStale)
    effectiveStatus = 'disconnected'
  else if (status === 'connecting')
    effectiveStatus = 'connecting'
  else
    effectiveStatus = 'connected'

  const statusClass = effectiveStatus === 'connected' ? 'connected' : 'disconnected'

  const statusLabel = (() => {
    if (effectiveStatus === 'connected') {
      if (connectionMode === 'websocket')
        return 'Live (WebSocket)'
      if (connectionMode === 'http')
        return 'Connected (Polling)'
      return 'Connected (Recent Data)'
    }

    if (effectiveStatus === 'connecting')
      return 'Connecting...'

    if (!metrics)
      return status === 'connecting' ? 'Connecting...' : 'Disconnected'

    if (isStale)
      return 'No recent data'

    return 'Disconnected'
  })()

  const fmtVal = (v: number, d = 2) => v.toFixed(d)
  const fmtTime = (t: number) => new Date(t).toLocaleTimeString()

  const chartData = metrics?.history.slice(-50).map(p => ({
    time: fmtTime(p.timestamp),
    Compression: p.compressionRatio,
    Encode: p.encodeSpeed,
    Decode: p.decodeSpeed,
    Memory: p.memoryUsage,
    Throughput: p.throughput,
  })) || []

  if (!metrics) {
    return (
      <div className="dashboard">
        <div className="header">
          <h1>TOON Analytics</h1>
          <div className={`connection-status ${effectiveStatus}`}>
            <span className={`status-indicator status-${statusClass}`}></span>
            {statusLabel}
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Loading metrics...
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="header">
        <h1>TOON Analytics Dashboard</h1>
        <div className={`connection-status ${effectiveStatus}`}>
          <span className={`status-indicator status-${statusClass}`}></span>
          {statusLabel}
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-title">Compression</div>
          <div className="metric-value">
            {fmtVal(metrics.current.compressionRatio)}
            x
          </div>
          <div className="metric-unit">
            Avg:
            {fmtVal(metrics.averages.compressionRatio)}
            x
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Encode</div>
          <div className="metric-value">{fmtVal(metrics.current.encodeSpeed)}</div>
          <div className="metric-unit">
            ops/s (Avg:
            {fmtVal(metrics.averages.encodeSpeed)}
            )
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Decode</div>
          <div className="metric-value">{fmtVal(metrics.current.decodeSpeed)}</div>
          <div className="metric-unit">
            ops/s (Avg:
            {fmtVal(metrics.averages.decodeSpeed)}
            )
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Memory</div>
          <div className="metric-value">{fmtVal(metrics.current.memoryUsage)}</div>
          <div className="metric-unit">
            MB (Avg:
            {fmtVal(metrics.averages.memoryUsage)}
            )
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Errors</div>
          <div className="metric-value">
            {fmtVal(metrics.current.errorRate * 100)}
            %
          </div>
          <div className="metric-unit">
            Avg:
            {fmtVal(metrics.averages.errorRate * 100)}
            %
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Throughput</div>
          <div className="metric-value">{fmtVal(metrics.current.throughput)}</div>
          <div className="metric-unit">
            ops/s (Avg:
            {fmtVal(metrics.averages.throughput)}
            )
          </div>
        </div>
      </div>

      <div className="chart-container">
        <h3>Trends</h3>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line dataKey="Compression" stroke="#8884d8" strokeWidth={1} dot={false} />
            <Line dataKey="Encode" stroke="#82ca9d" strokeWidth={1} dot={false} />
            <Line dataKey="Decode" stroke="#ffc658" strokeWidth={1} dot={false} />
            <Line dataKey="Memory" stroke="#ff7300" strokeWidth={1} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
