import type { FastifyInstance } from 'fastify'
import type { WebSocket } from 'ws'
import type { MetricPoint } from './metrics'

import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import cors from '@fastify/cors'
import staticFiles from '@fastify/static'
import websocket from '@fastify/websocket'
import Fastify from 'fastify'
import { MetricsCollector } from './metrics'
import { PerformanceMonitor } from './performance'

const fastify: FastifyInstance = Fastify({ logger: false })
const collector = new MetricsCollector()
const monitor = new PerformanceMonitor(collector)

async function setupServer() {
  // Register CORS first
  await fastify.register(cors, { origin: true })
  
  // Register WebSocket support
  await fastify.register(websocket)
  
  // Register static files
  await fastify.register(staticFiles, {
    root: join(dirname(fileURLToPath(import.meta.url)), '..', 'dist'),
    prefix: '/',
  })
  
  // Register WebSocket endpoint
  await fastify.register(async (f) => {
    f.get('/ws', { websocket: true }, (connection) => {
      const socket = (connection as unknown as { socket: WebSocket }).socket
      // eslint-disable-next-line no-console
      console.log('WebSocket client connected')

      const send = (type: string, data: any) => {
        try {
          if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify({ type, data }))
          }
        }
        catch (e) { console.error('WebSocket send error:', e) }
      }
      
      // Send initial snapshot
      send('initial', collector.getSnapshot())
      
      // Subscribe to updates
      const unsubscribe = collector.subscribe((metrics: MetricPoint) => send('update', metrics))

      let cleanedUp = false
      const cleanup = () => {
        if (cleanedUp)
          return
        cleanedUp = true
        unsubscribe()
      }

      socket.once('close', () => {
        // eslint-disable-next-line no-console
        console.log('WebSocket client disconnected')
        cleanup()
      })

      socket.once('error', (err: any) => {
        console.error('WebSocket error:', err)
        cleanup()
        try {
          socket.close()
        }
        catch (closeErr) {
          console.error('WebSocket close error:', closeErr)
        }
      })
    })
  })
}

// API endpoints
fastify.get('/api/metrics', () => collector.getSnapshot())
fastify.get('/api/history', (req: any) => collector.getHistory((req.query as any).minutes || 60))
fastify.post('/api/metrics', (req: any) => {
  collector.record(req.body as any)
  return { success: true }
})
fastify.get('/api/health', () => ({ status: 'ok', timestamp: Date.now() }))

// Start server
async function startServer() {
  await setupServer()
  const port = Number.parseInt(process.env.PORT || '3001')
  try {
    await fastify.listen({ port, host: '0.0.0.0' })
    // eslint-disable-next-line no-console
    console.log(`Analytics dashboard: http://localhost:${port}`)
    monitor.start()

    const shutdown = async (signal: NodeJS.Signals) => {
      // eslint-disable-next-line no-console
      console.log(`\nReceived ${signal}. Shutting down gracefully...`)
      try {
        await fastify.close()
      }
      finally {
        process.exit(0)
      }
    }

    process.once('SIGINT', () => { void shutdown('SIGINT') })
    process.once('SIGTERM', () => { void shutdown('SIGTERM') })
  }
  catch (err) {
    console.error('Server error:', err)
    process.exit(1)
  }
}

startServer().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
