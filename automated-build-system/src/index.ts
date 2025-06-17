import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import { createServer } from 'http'
import WebSocket from 'ws'
import dotenv from 'dotenv'

import { logger } from './utils/logger'
import { connectDatabase } from './utils/database'
import { initializeQueue } from './services/QueueManager'
import { BuildStatusService } from './services/BuildStatusService'
import { buildRoutes } from './api/routes/build.routes'
import { partnerRoutes } from './api/routes/partner.routes'
import { healthRoutes } from './api/routes/health.routes'
import { errorHandler } from './api/middleware/error.middleware'
import { requestLogger } from './api/middleware/logging.middleware'

// Load environment variables
dotenv.config()

class BuildSystemServer {
  private app: express.Application
  private server: any
  private wss: WebSocket.Server
  private buildStatusService: BuildStatusService

  constructor() {
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
    this.setupErrorHandling()
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }))

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3002'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }))

    // Compression and parsing
    this.app.use(compression())
    this.app.use(express.json({ limit: '50mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }))

    // Logging
    this.app.use(morgan('combined', {
      stream: { write: (message: string) => logger.info(message.trim()) }
    }))
    this.app.use(requestLogger)
  }

  private setupRoutes(): void {
    // API version prefix
    const apiPrefix = '/api/v1'

    // Health check (no auth required)
    this.app.use(`${apiPrefix}/health`, healthRoutes)

    // Main API routes
    this.app.use(`${apiPrefix}/builds`, buildRoutes)
    this.app.use(`${apiPrefix}/partners`, partnerRoutes)

    // API documentation
    this.app.get('/docs', (req, res) => {
      res.json({
        name: 'LuluPay Automated Build System API',
        version: '1.0.0',
        description: 'REST API for automated white-label app generation',
        endpoints: {
          builds: {
            'POST /api/v1/builds/create': 'Create new build job',
            'GET /api/v1/builds/:id/status': 'Get build status',
            'GET /api/v1/builds/:id/logs': 'Get build logs',
            'GET /api/v1/builds/:id/download': 'Download generated app',
            'DELETE /api/v1/builds/:id/cancel': 'Cancel build job',
          },
          partners: {
            'POST /api/v1/partners/register': 'Register new partner',
            'GET /api/v1/partners/:id/builds': 'List partner builds',
            'PUT /api/v1/partners/:id/config': 'Update partner config',
          },
          health: {
            'GET /api/v1/health': 'System health check',
            'GET /api/v1/health/detailed': 'Detailed system status',
          }
        },
        websocket: {
          '/api/v1/builds/:id/progress': 'Real-time build progress updates'
        }
      })
    })

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'LuluPay Automated Build System',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        documentation: '/docs'
      })
    })

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      })
    })
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler)
  }

  private setupWebSocket(): void {
    this.wss = new WebSocket.Server({ 
      server: this.server,
      path: '/ws'
    })

    this.buildStatusService = new BuildStatusService(this.wss)

    this.wss.on('connection', (ws, req) => {
      logger.info(`WebSocket connection established: ${req.url}`)
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString())
          this.buildStatusService.handleMessage(ws, data)
        } catch (error) {
          logger.error('Invalid WebSocket message:', error)
        }
      })

      ws.on('close', () => {
        logger.info('WebSocket connection closed')
        this.buildStatusService.removeConnection(ws)
      })

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error)
      })
    })
  }

  public async start(): Promise<void> {
    try {
      // Initialize database connections
      await connectDatabase()
      logger.info('Database connected successfully')

      // Initialize build queue
      await initializeQueue()
      logger.info('Build queue initialized successfully')

      // Create HTTP server
      this.server = createServer(this.app)

      // Setup WebSocket
      this.setupWebSocket()

      // Start server
      const port = process.env.PORT || 8080
      const host = process.env.HOST || '0.0.0.0'

      this.server.listen(port, host, () => {
        logger.info(`🚀 Build System Server running on ${host}:${port}`)
        logger.info(`📖 API Documentation: http://${host}:${port}/docs`)
        logger.info(`🔗 WebSocket endpoint: ws://${host}:${port}/ws`)
        logger.info(`🏗️ Environment: ${process.env.NODE_ENV || 'development'}`)
      })

      // Graceful shutdown handling
      this.setupGracefulShutdown()

    } catch (error) {
      logger.error('Failed to start server:', error)
      process.exit(1)
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`)

      // Close HTTP server
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed')
        })
      }

      // Close WebSocket server
      if (this.wss) {
        this.wss.close(() => {
          logger.info('WebSocket server closed')
        })
      }

      // Close database connections
      // Database connection closing is handled in the database utility

      logger.info('Graceful shutdown completed')
      process.exit(0)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
    
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error)
      process.exit(1)
    })

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
      process.exit(1)
    })
  }
}

// Start the server
if (require.main === module) {
  const server = new BuildSystemServer()
  server.start().catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
}

export default BuildSystemServer 