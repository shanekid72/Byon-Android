import { EventEmitter } from 'events'
import WebSocket from 'ws'
import http from 'http'
import AnalyticsService from './AnalyticsService'
import PrometheusMetricsService from './PrometheusMetricsService'

// Simple logger
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ''),
  debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta || '')
}

export interface DashboardConfig {
  enableRealTimeUpdates: boolean
  updateIntervalMs: number
  maxClients: number
  enableMetricsStreaming: boolean
  enableBuildStreaming: boolean
  enableAlertStreaming: boolean
  enablePartnerStreaming: boolean
  retentionWindowMs: number
}

export interface RealTimeMetrics {
  timestamp: Date
  builds: {
    active: number
    queued: number
    completedLast5Min: number
    failedLast5Min: number
    averageDuration: number
  }
  system: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    activeConnections: number
  }
  partners: {
    active: number
    totalBuildsToday: number
    topPartners: Array<{ partnerId: string; builds: number }>
  }
  assets: {
    processedLast5Min: number
    averageProcessingTime: number
    averageCompressionRatio: number
    qualityScore: number
  }
  alerts: Array<{
    id: string
    type: string
    severity: 'low' | 'medium' | 'high'
    message: string
    timestamp: Date
  }>
}

export interface BuildStreamData {
  buildId: string
  partnerId: string
  status: 'started' | 'stage_completed' | 'completed' | 'failed'
  stage?: string
  progress?: number
  duration?: number
  timestamp: Date
}

export interface AlertStreamData {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high'
  message: string
  source: string
  timestamp: Date
  resolved?: boolean
}

export interface PartnerStreamData {
  partnerId: string
  event: 'build_started' | 'build_completed' | 'quota_updated' | 'login'
  data: any
  timestamp: Date
}

export class RealTimeDashboardService extends EventEmitter {
  private config: DashboardConfig
  private wss?: WebSocket.Server
  private server?: http.Server
  private clients: Set<WebSocket>
  private analyticsService: AnalyticsService
  private metricsService: PrometheusMetricsService
  private updateTimer?: NodeJS.Timeout
  private isRunning: boolean = false
  private metricsCache: Map<string, any>

  constructor(
    config: Partial<DashboardConfig> = {},
    analyticsService: AnalyticsService,
    metricsService: PrometheusMetricsService
  ) {
    super()

    this.config = {
      enableRealTimeUpdates: true,
      updateIntervalMs: 5000, // 5 seconds
      maxClients: 100,
      enableMetricsStreaming: true,
      enableBuildStreaming: true,
      enableAlertStreaming: true,
      enablePartnerStreaming: true,
      retentionWindowMs: 300000, // 5 minutes
      ...config
    }

    this.clients = new Set()
    this.analyticsService = analyticsService
    this.metricsService = metricsService
    this.metricsCache = new Map()

    this.setupEventListeners()
  }

  /**
   * Start the real-time dashboard service
   */
  async start(port: number = 8080): Promise<void> {
    if (this.isRunning) {
      logger.warn('Real-time dashboard service is already running')
      return
    }

    try {
      // Create HTTP server
      this.server = http.createServer()

      // Create WebSocket server
      this.wss = new WebSocket.Server({ server: this.server })

      // Setup WebSocket connection handling
      this.wss.on('connection', this.handleConnection.bind(this))
      this.wss.on('error', (error) => {
        logger.error('WebSocket server error:', error)
      })

      // Start server
      this.server.listen(port, () => {
        this.isRunning = true
        logger.info(`Real-time dashboard service started on port ${port}`)
        this.emit('started')
      })

      // Start metrics streaming
      if (this.config.enableRealTimeUpdates) {
        this.startMetricsStreaming()
      }

    } catch (error) {
      logger.error('Failed to start real-time dashboard service:', error)
      throw error
    }
  }

  /**
   * Stop the real-time dashboard service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    try {
      // Stop metrics streaming
      if (this.updateTimer) {
        clearInterval(this.updateTimer)
        this.updateTimer = undefined
      }

      // Close all client connections
      for (const client of this.clients) {
        client.terminate()
      }
      this.clients.clear()

      // Close WebSocket server
      if (this.wss) {
        this.wss.close()
      }

      // Close HTTP server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server!.close(() => resolve())
        })
      }

      this.isRunning = false
      logger.info('Real-time dashboard service stopped')
      this.emit('stopped')

    } catch (error) {
      logger.error('Error stopping real-time dashboard service:', error)
      throw error
    }
  }

  /**
   * Handle new WebSocket connections
   */
  private handleConnection(ws: WebSocket): void {
    // Check client limit
    if (this.clients.size >= this.config.maxClients) {
      logger.warn('Maximum client limit reached, closing connection')
      ws.close(1013, 'Server overloaded')
      return
    }

    // Add client
    this.clients.add(ws)
    logger.info(`New dashboard client connected. Total clients: ${this.clients.size}`)

    // Send initial data
    this.sendInitialData(ws)

    // Handle messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        this.handleClientMessage(ws, message)
      } catch (error) {
        logger.error('Invalid message from client:', error)
      }
    })

    // Handle client disconnect
    ws.on('close', () => {
      this.clients.delete(ws)
      logger.info(`Dashboard client disconnected. Total clients: ${this.clients.size}`)
    })

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket client error:', error)
      this.clients.delete(ws)
    })
  }

  /**
   * Handle messages from clients
   */
  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(ws, message.channels || [])
        break
      case 'unsubscribe':
        this.handleUnsubscription(ws, message.channels || [])
        break
      case 'get_metrics':
        this.sendMetricsUpdate(ws)
        break
      case 'get_builds':
        this.sendBuildsUpdate(ws)
        break
      case 'ping':
        this.sendMessage(ws, { type: 'pong', timestamp: new Date() })
        break
      default:
        logger.warn('Unknown message type:', message.type)
    }
  }

  /**
   * Send initial data to new client
   */
  private async sendInitialData(ws: WebSocket): Promise<void> {
    try {
      const [metrics, builds, alerts] = await Promise.all([
        this.getRealTimeMetrics(),
        this.getActiveBuilds(),
        this.getActiveAlerts()
      ])

      this.sendMessage(ws, {
        type: 'initial_data',
        data: {
          metrics,
          builds,
          alerts,
          timestamp: new Date()
        }
      })

    } catch (error) {
      logger.error('Failed to send initial data:', error)
    }
  }

  /**
   * Setup event listeners for real-time updates
   */
  private setupEventListeners(): void {
    // Build events
    if (this.config.enableBuildStreaming) {
      this.analyticsService.on('buildMetrics', (buildMetrics) => {
        const streamData: BuildStreamData = {
          buildId: buildMetrics.buildId,
          partnerId: buildMetrics.partnerId,
          status: buildMetrics.status === 'completed' ? 'completed' : 
                  buildMetrics.status === 'failed' ? 'failed' : 'stage_completed',
          duration: buildMetrics.duration,
          timestamp: new Date()
        }
        this.broadcastToClients('build_update', streamData)
      })
    }

    // Alert events
    if (this.config.enableAlertStreaming) {
      this.analyticsService.on('alert', (alert) => {
        const streamData: AlertStreamData = {
          id: `alert_${Date.now()}`,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          source: 'system',
          timestamp: alert.timestamp
        }
        this.broadcastToClients('alert_update', streamData)
      })
    }

    // Partner events
    if (this.config.enablePartnerStreaming) {
      this.analyticsService.on('partnerMetrics', (partnerMetrics) => {
        const streamData: PartnerStreamData = {
          partnerId: partnerMetrics.partnerId,
          event: 'quota_updated',
          data: partnerMetrics.usageQuota,
          timestamp: new Date()
        }
        this.broadcastToClients('partner_update', streamData)
      })
    }
  }

  /**
   * Start metrics streaming timer
   */
  private startMetricsStreaming(): void {
    this.updateTimer = setInterval(async () => {
      try {
        if (this.clients.size > 0) {
          await this.broadcastMetricsUpdate()
        }
      } catch (error) {
        logger.error('Metrics streaming error:', error)
      }
    }, this.config.updateIntervalMs)

    logger.info('Metrics streaming started')
  }

  /**
   * Broadcast metrics update to all clients
   */
  private async broadcastMetricsUpdate(): Promise<void> {
    try {
      const metrics = await this.getRealTimeMetrics()
      this.broadcastToClients('metrics_update', metrics)
    } catch (error) {
      logger.error('Failed to broadcast metrics update:', error)
    }
  }

  /**
   * Get real-time metrics
   */
  private async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      const [
        activeBuilds,
        queuedBuilds,
        systemMetrics,
        partnerMetrics,
        assetMetrics,
        alerts
      ] = await Promise.all([
        this.getActiveBuildCount(),
        this.getQueuedBuildCount(),
        this.getSystemMetrics(),
        this.getPartnerMetrics(),
        this.getAssetMetrics(),
        this.getActiveAlerts()
      ])

      return {
        timestamp: new Date(),
        builds: {
          active: activeBuilds,
          queued: queuedBuilds,
          completedLast5Min: await this.getCompletedBuildsLast5Min(),
          failedLast5Min: await this.getFailedBuildsLast5Min(),
          averageDuration: await this.getAverageBuildDuration()
        },
        system: systemMetrics,
        partners: partnerMetrics,
        assets: assetMetrics,
        alerts
      }

    } catch (error) {
      logger.error('Failed to get real-time metrics:', error)
      throw error
    }
  }

  /**
   * Broadcast message to all clients
   */
  private broadcastToClients(type: string, data: any): void {
    const message = {
      type,
      data,
      timestamp: new Date()
    }

    const deadClients: WebSocket[] = []

    for (const client of this.clients) {
      try {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message))
        } else {
          deadClients.push(client)
        }
      } catch (error) {
        logger.error('Failed to send message to client:', error)
        deadClients.push(client)
      }
    }

    // Clean up dead clients
    for (const deadClient of deadClients) {
      this.clients.delete(deadClient)
    }
  }

  /**
   * Send message to specific client
   */
  private sendMessage(ws: WebSocket, message: any): void {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
      }
    } catch (error) {
      logger.error('Failed to send message to client:', error)
    }
  }

  /**
   * Send metrics update to specific client
   */
  private async sendMetricsUpdate(ws: WebSocket): Promise<void> {
    try {
      const metrics = await this.getRealTimeMetrics()
      this.sendMessage(ws, {
        type: 'metrics_update',
        data: metrics
      })
    } catch (error) {
      logger.error('Failed to send metrics update:', error)
    }
  }

  /**
   * Send builds update to specific client
   */
  private async sendBuildsUpdate(ws: WebSocket): Promise<void> {
    try {
      const builds = await this.getActiveBuilds()
      this.sendMessage(ws, {
        type: 'builds_update',
        data: builds
      })
    } catch (error) {
      logger.error('Failed to send builds update:', error)
    }
  }

  /**
   * Handle client subscription
   */
  private handleSubscription(ws: WebSocket, channels: string[]): void {
    // Implementation for channel subscription
    logger.debug(`Client subscribed to channels: ${channels.join(', ')}`)
  }

  /**
   * Handle client unsubscription
   */
  private handleUnsubscription(ws: WebSocket, channels: string[]): void {
    // Implementation for channel unsubscription
    logger.debug(`Client unsubscribed from channels: ${channels.join(', ')}`)
  }

  /**
   * Helper methods for metrics collection
   */
  private async getActiveBuildCount(): Promise<number> {
    // Placeholder - would integrate with actual metrics
    return Math.floor(Math.random() * 10)
  }

  private async getQueuedBuildCount(): Promise<number> {
    // Placeholder - would integrate with actual queue system
    return Math.floor(Math.random() * 5)
  }

  private async getSystemMetrics(): Promise<any> {
    return {
      cpuUsage: Math.random() * 40 + 30, // 30-70%
      memoryUsage: Math.random() * 30 + 50, // 50-80%
      diskUsage: Math.random() * 20 + 60, // 60-80%
      activeConnections: this.clients.size
    }
  }

  private async getPartnerMetrics(): Promise<any> {
    return {
      active: Math.floor(Math.random() * 50) + 20,
      totalBuildsToday: Math.floor(Math.random() * 1000) + 500,
      topPartners: [
        { partnerId: 'partner1', builds: 150 },
        { partnerId: 'partner2', builds: 120 },
        { partnerId: 'partner3', builds: 95 }
      ]
    }
  }

  private async getAssetMetrics(): Promise<any> {
    return {
      processedLast5Min: Math.floor(Math.random() * 50) + 10,
      averageProcessingTime: Math.random() * 5 + 2, // 2-7 seconds
      averageCompressionRatio: Math.random() * 1.5 + 1.5, // 1.5-3.0
      qualityScore: Math.random() * 10 + 85 // 85-95
    }
  }

  private async getActiveAlerts(): Promise<any[]> {
    // Placeholder - would integrate with actual alert system
    return []
  }

  private async getActiveBuilds(): Promise<any[]> {
    // Placeholder - would integrate with actual build system
    return []
  }

  private async getCompletedBuildsLast5Min(): Promise<number> {
    return Math.floor(Math.random() * 20) + 5
  }

  private async getFailedBuildsLast5Min(): Promise<number> {
    return Math.floor(Math.random() * 3)
  }

  private async getAverageBuildDuration(): Promise<number> {
    return Math.random() * 300 + 120 // 2-7 minutes in seconds
  }

  /**
   * Get service status
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      clientCount: this.clients.size,
      config: this.config,
      uptime: process.uptime()
    }
  }

  /**
   * Get connected clients count
   */
  getClientCount(): number {
    return this.clients.size
  }

  /**
   * Get service configuration
   */
  getConfig(): DashboardConfig {
    return { ...this.config }
  }
}

export default RealTimeDashboardService 