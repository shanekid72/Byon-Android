import { EventEmitter } from 'events'
import Redis from 'ioredis'

// Simple logger replacement
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ''),
  debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta || '')
}

export interface AnalyticsConfig {
  enableRealTimeAnalytics: boolean
  enableBuildMetrics: boolean
  enablePartnerAnalytics: boolean
  enableAssetAnalytics: boolean
  enableSystemMetrics: boolean
  dataRetentionDays: number
  aggregationIntervalMs: number
  redisKeyPrefix: string
}

export interface BuildMetrics {
  buildId: string
  partnerId: string
  startTime: Date
  endTime?: Date
  duration?: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  stages: {
    templateProcessing: number
    assetProcessing: number
    assetInjection: number
    codeGeneration: number
    androidBuild: number
    packaging: number
  }
  assets: {
    totalAssets: number
    processedAssets: number
    failedAssets: number
    totalSizeMB: number
    optimizedSizeMB: number
  }
  errors: string[]
  warnings: string[]
}

export interface PartnerMetrics {
  partnerId: string
  partnerName: string
  totalBuilds: number
  successfulBuilds: number
  failedBuilds: number
  averageBuildTime: number
  totalAssetsProcessed: number
  lastBuildTime: Date
  subscriptionTier: string
  usageQuota: {
    buildsUsed: number
    buildsLimit: number
    storageUsedMB: number
    storageLimitMB: number
  }
}

export interface AssetMetrics {
  assetId: string
  partnerId: string
  type: string
  originalSizeMB: number
  processedSizeMB: number
  compressionRatio: number
  qualityScore: number
  processingTime: number
  format: string
  density?: string
  createdAt: Date
  lastAccessedAt: Date
}

export interface SystemMetrics {
  timestamp: Date
  cpu: {
    usage: number
    cores: number
    loadAverage: number[]
  }
  memory: {
    totalMB: number
    usedMB: number
    freeMB: number
    heapUsedMB: number
    heapTotalMB: number
  }
  disk: {
    totalGB: number
    usedGB: number
    freeGB: number
  }
  network: {
    bytesIn: number
    bytesOut: number
    connectionsActive: number
  }
  application: {
    activeBuilds: number
    queueLength: number
    uptime: number
    restarts: number
  }
}

export interface AnalyticsDashboard {
  overview: {
    totalBuilds: number
    totalPartners: number
    totalAssets: number
    averageBuildTime: number
    systemUptime: number
    successRate: number
  }
  buildTrends: {
    dailyBuilds: Array<{ date: string; count: number; success: number; failed: number }>
    hourlyBuilds: Array<{ hour: number; count: number }>
    averageProcessingTime: Array<{ date: string; timeMs: number }>
  }
  partnerActivity: {
    topPartners: Array<{ partnerId: string; partnerName: string; builds: number }>
    newPartners: Array<{ partnerId: string; partnerName: string; joinDate: Date }>
    activePartners: number
  }
  assetInsights: {
    totalAssetsProcessed: number
    averageCompressionRatio: number
    averageQualityScore: number
    formatDistribution: Record<string, number>
    densityDistribution: Record<string, number>
  }
  systemHealth: {
    currentMetrics: SystemMetrics
    alerts: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high'; timestamp: Date }>
    performanceTrends: Array<{ timestamp: Date; cpu: number; memory: number; disk: number }>
  }
}

export class AnalyticsService extends EventEmitter {
  private redis: Redis
  private config: AnalyticsConfig
  private metricsCollection: Map<string, any>
  private alertThresholds: Map<string, number>
  private aggregationTimer?: NodeJS.Timeout

  constructor(config: Partial<AnalyticsConfig> = {}) {
    super()
    
    this.config = {
      enableRealTimeAnalytics: true,
      enableBuildMetrics: true,
      enablePartnerAnalytics: true,
      enableAssetAnalytics: true,
      enableSystemMetrics: true,
      dataRetentionDays: 90,
      aggregationIntervalMs: 60000, // 1 minute
      redisKeyPrefix: 'lulupay:analytics',
      ...config
    }

    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3
    })

    this.metricsCollection = new Map()
    this.alertThresholds = new Map([
      ['cpu_usage', 80],
      ['memory_usage', 85],
      ['disk_usage', 90],
      ['build_failure_rate', 15],
      ['average_response_time', 5000]
    ])

    this.initialize()
  }

  /**
   * Initialize analytics service
   */
  private async initialize(): Promise<void> {
    logger.info('Initializing Analytics Service')

    try {
      // Test Redis connection
      await this.redis.ping()
      logger.info('Redis connection established for analytics')

      // Start metrics aggregation
      if (this.config.enableRealTimeAnalytics) {
        this.startMetricsAggregation()
      }

      // Start system metrics collection
      if (this.config.enableSystemMetrics) {
        this.startSystemMetricsCollection()
      }

      // Setup data retention cleanup
      this.setupDataRetentionCleanup()

      logger.info('Analytics Service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Analytics Service:', error)
      throw error
    }
  }

  /**
   * Record build metrics
   */
  async recordBuildMetrics(metrics: BuildMetrics): Promise<void> {
    if (!this.config.enableBuildMetrics) return

    try {
      const key = `${this.config.redisKeyPrefix}:builds:${metrics.buildId}`
      const timestamp = Date.now()

      // Store detailed build metrics
      await this.redis.hset(key, {
        buildId: metrics.buildId,
        partnerId: metrics.partnerId,
        startTime: metrics.startTime.toISOString(),
        endTime: metrics.endTime?.toISOString() || '',
        duration: metrics.duration || 0,
        status: metrics.status,
        stages: JSON.stringify(metrics.stages),
        assets: JSON.stringify(metrics.assets),
        errors: JSON.stringify(metrics.errors),
        warnings: JSON.stringify(metrics.warnings),
        timestamp
      })

      // Set expiry based on retention policy
      await this.redis.expire(key, this.config.dataRetentionDays * 24 * 3600)

      // Update aggregated metrics
      await this.updateBuildAggregates(metrics)

      // Emit real-time event
      this.emit('buildMetrics', metrics)

      logger.debug(`Build metrics recorded for build ${metrics.buildId}`)
    } catch (error) {
      logger.error('Failed to record build metrics:', error)
    }
  }

  /**
   * Record partner metrics
   */
  async recordPartnerMetrics(metrics: PartnerMetrics): Promise<void> {
    if (!this.config.enablePartnerAnalytics) return

    try {
      const key = `${this.config.redisKeyPrefix}:partners:${metrics.partnerId}`
      const timestamp = Date.now()

      await this.redis.hset(key, {
        partnerId: metrics.partnerId,
        partnerName: metrics.partnerName,
        totalBuilds: metrics.totalBuilds,
        successfulBuilds: metrics.successfulBuilds,
        failedBuilds: metrics.failedBuilds,
        averageBuildTime: metrics.averageBuildTime,
        totalAssetsProcessed: metrics.totalAssetsProcessed,
        lastBuildTime: metrics.lastBuildTime.toISOString(),
        subscriptionTier: metrics.subscriptionTier,
        usageQuota: JSON.stringify(metrics.usageQuota),
        timestamp
      })

      await this.redis.expire(key, this.config.dataRetentionDays * 24 * 3600)

      // Update partner aggregates
      await this.updatePartnerAggregates(metrics)

      this.emit('partnerMetrics', metrics)

      logger.debug(`Partner metrics recorded for partner ${metrics.partnerId}`)
    } catch (error) {
      logger.error('Failed to record partner metrics:', error)
    }
  }

  /**
   * Record asset metrics
   */
  async recordAssetMetrics(metrics: AssetMetrics): Promise<void> {
    if (!this.config.enableAssetAnalytics) return

    try {
      const key = `${this.config.redisKeyPrefix}:assets:${metrics.assetId}`
      const timestamp = Date.now()

      await this.redis.hset(key, {
        assetId: metrics.assetId,
        partnerId: metrics.partnerId,
        type: metrics.type,
        originalSizeMB: metrics.originalSizeMB,
        processedSizeMB: metrics.processedSizeMB,
        compressionRatio: metrics.compressionRatio,
        qualityScore: metrics.qualityScore,
        processingTime: metrics.processingTime,
        format: metrics.format,
        density: metrics.density || '',
        createdAt: metrics.createdAt.toISOString(),
        lastAccessedAt: metrics.lastAccessedAt.toISOString(),
        timestamp
      })

      await this.redis.expire(key, this.config.dataRetentionDays * 24 * 3600)

      // Update asset aggregates
      await this.updateAssetAggregates(metrics)

      this.emit('assetMetrics', metrics)

      logger.debug(`Asset metrics recorded for asset ${metrics.assetId}`)
    } catch (error) {
      logger.error('Failed to record asset metrics:', error)
    }
  }

  /**
   * Record system metrics
   */
  async recordSystemMetrics(metrics: SystemMetrics): Promise<void> {
    if (!this.config.enableSystemMetrics) return

    try {
      const key = `${this.config.redisKeyPrefix}:system:${Date.now()}`

      await this.redis.hset(key, {
        timestamp: metrics.timestamp.toISOString(),
        cpu: JSON.stringify(metrics.cpu),
        memory: JSON.stringify(metrics.memory),
        disk: JSON.stringify(metrics.disk),
        network: JSON.stringify(metrics.network),
        application: JSON.stringify(metrics.application)
      })

      await this.redis.expire(key, 7 * 24 * 3600) // Keep system metrics for 7 days

      // Check for alerts
      await this.checkSystemAlerts(metrics)

      this.emit('systemMetrics', metrics)

      logger.debug('System metrics recorded')
    } catch (error) {
      logger.error('Failed to record system metrics:', error)
    }
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardData(): Promise<AnalyticsDashboard> {
    try {
      const [overview, buildTrends, partnerActivity, assetInsights, systemHealth] = await Promise.all([
        this.getOverviewMetrics(),
        this.getBuildTrends(),
        this.getPartnerActivity(),
        this.getAssetInsights(),
        this.getSystemHealth()
      ])

      return {
        overview,
        buildTrends,
        partnerActivity,
        assetInsights,
        systemHealth
      }
    } catch (error) {
      logger.error('Failed to get dashboard data:', error)
      throw error
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<any> {
    try {
      const currentTime = Date.now()
      const fiveMinutesAgo = currentTime - (5 * 60 * 1000)

      const recentBuilds = await this.getRecentBuilds(fiveMinutesAgo)
      const activeBuilds = await this.getActiveBuilds()
      const systemMetrics = await this.getCurrentSystemMetrics()

      return {
        timestamp: new Date(currentTime),
        recentBuilds,
        activeBuilds,
        systemMetrics,
        alerts: await this.getActiveAlerts()
      }
    } catch (error) {
      logger.error('Failed to get real-time metrics:', error)
      throw error
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(format: 'json' | 'csv', dateRange: { from: Date; to: Date }): Promise<string> {
    try {
      const data = await this.getAnalyticsData(dateRange.from, dateRange.to)

      if (format === 'json') {
        return JSON.stringify(data, null, 2)
      } else {
        return this.convertToCsv(data)
      }
    } catch (error) {
      logger.error('Failed to export analytics:', error)
      throw error
    }
  }

  /**
   * Private helper methods
   */
  private async updateBuildAggregates(metrics: BuildMetrics): Promise<void> {
    const date = new Date().toISOString().split('T')[0]
    const hour = new Date().getHours()

    // Daily aggregates
    await this.redis.hincrby(`${this.config.redisKeyPrefix}:aggregates:daily:${date}`, 'totalBuilds', 1)
    
    if (metrics.status === 'completed') {
      await this.redis.hincrby(`${this.config.redisKeyPrefix}:aggregates:daily:${date}`, 'successfulBuilds', 1)
    } else if (metrics.status === 'failed') {
      await this.redis.hincrby(`${this.config.redisKeyPrefix}:aggregates:daily:${date}`, 'failedBuilds', 1)
    }

    // Hourly aggregates
    await this.redis.hincrby(`${this.config.redisKeyPrefix}:aggregates:hourly:${date}:${hour}`, 'builds', 1)

    // Processing time aggregates
    if (metrics.duration) {
      await this.redis.lpush(`${this.config.redisKeyPrefix}:processing-times:${date}`, metrics.duration)
      await this.redis.ltrim(`${this.config.redisKeyPrefix}:processing-times:${date}`, 0, 1000)
    }
  }

  private async updatePartnerAggregates(metrics: PartnerMetrics): Promise<void> {
    await this.redis.zadd(`${this.config.redisKeyPrefix}:partners:active`, Date.now(), metrics.partnerId)
    await this.redis.zadd(`${this.config.redisKeyPrefix}:partners:builds`, metrics.totalBuilds, metrics.partnerId)
  }

  private async updateAssetAggregates(metrics: AssetMetrics): Promise<void> {
    const date = new Date().toISOString().split('T')[0]
    
    await this.redis.hincrby(`${this.config.redisKeyPrefix}:assets:daily:${date}`, 'totalAssets', 1)
    await this.redis.hincrby(`${this.config.redisKeyPrefix}:assets:formats`, metrics.format, 1)
    
    if (metrics.density) {
      await this.redis.hincrby(`${this.config.redisKeyPrefix}:assets:densities`, metrics.density, 1)
    }
  }

  private async checkSystemAlerts(metrics: SystemMetrics): Promise<void> {
    const alerts: any[] = []

    // CPU usage check
    if (metrics.cpu.usage > (this.alertThresholds.get('cpu_usage') || 80)) {
      alerts.push({
        type: 'high_cpu_usage',
        message: `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
        severity: 'high',
        timestamp: new Date()
      })
    }

    // Memory usage check
    const memoryUsage = (metrics.memory.usedMB / metrics.memory.totalMB) * 100
    if (memoryUsage > (this.alertThresholds.get('memory_usage') || 85)) {
      alerts.push({
        type: 'high_memory_usage',
        message: `High memory usage: ${memoryUsage.toFixed(1)}%`,
        severity: 'high',
        timestamp: new Date()
      })
    }

    // Store alerts
    for (const alert of alerts) {
      await this.redis.lpush(`${this.config.redisKeyPrefix}:alerts`, JSON.stringify(alert))
      await this.redis.ltrim(`${this.config.redisKeyPrefix}:alerts`, 0, 100)
      this.emit('alert', alert)
    }
  }

  private startMetricsAggregation(): void {
    this.aggregationTimer = setInterval(async () => {
      try {
        await this.aggregateMetrics()
      } catch (error) {
        logger.error('Metrics aggregation failed:', error)
      }
    }, this.config.aggregationIntervalMs)
  }

  private startSystemMetricsCollection(): void {
    setInterval(async () => {
      try {
        const systemMetrics = await this.collectSystemMetrics()
        await this.recordSystemMetrics(systemMetrics)
      } catch (error) {
        logger.error('System metrics collection failed:', error)
      }
    }, 30000) // Collect every 30 seconds
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage()
    
    return {
      timestamp: new Date(),
      cpu: {
        usage: await this.getCpuUsage(),
        cores: require('os').cpus().length,
        loadAverage: require('os').loadavg()
      },
      memory: {
        totalMB: require('os').totalmem() / 1024 / 1024,
        usedMB: (require('os').totalmem() - require('os').freemem()) / 1024 / 1024,
        freeMB: require('os').freemem() / 1024 / 1024,
        heapUsedMB: memUsage.heapUsed / 1024 / 1024,
        heapTotalMB: memUsage.heapTotal / 1024 / 1024
      },
      disk: {
        totalGB: 100, // Placeholder - would integrate with actual disk monitoring
        usedGB: 45,
        freeGB: 55
      },
      network: {
        bytesIn: 0, // Placeholder - would integrate with network monitoring
        bytesOut: 0,
        connectionsActive: 0
      },
      application: {
        activeBuilds: await this.getActiveBuildCount(),
        queueLength: await this.getBuildQueueLength(),
        uptime: process.uptime(),
        restarts: 0
      }
    }
  }

  private async getCpuUsage(): Promise<number> {
    // Simplified CPU usage calculation
    return Math.random() * 30 + 20 // Placeholder: 20-50% usage
  }

  private async getActiveBuildCount(): Promise<number> {
    const activeBuilds = await this.redis.keys(`${this.config.redisKeyPrefix}:builds:*`)
    return activeBuilds.length
  }

  private async getBuildQueueLength(): Promise<number> {
    // Placeholder - would integrate with actual queue system
    return 0
  }

  private setupDataRetentionCleanup(): void {
    // Run cleanup daily at 2 AM
    setInterval(async () => {
      try {
        await this.cleanupExpiredData()
      } catch (error) {
        logger.error('Data retention cleanup failed:', error)
      }
    }, 24 * 60 * 60 * 1000)
  }

  private async cleanupExpiredData(): Promise<void> {
    const cutoffTime = Date.now() - (this.config.dataRetentionDays * 24 * 60 * 60 * 1000)
    
    // Clean up old aggregates
    const aggregateKeys = await this.redis.keys(`${this.config.redisKeyPrefix}:aggregates:*`)
    for (const key of aggregateKeys) {
      const keyDate = key.split(':').pop()
      if (keyDate && new Date(keyDate).getTime() < cutoffTime) {
        await this.redis.del(key)
      }
    }

    logger.info('Data retention cleanup completed')
  }

  private async getOverviewMetrics(): Promise<any> {
    // Implementation for overview metrics
    return {
      totalBuilds: 0,
      totalPartners: 0,
      totalAssets: 0,
      averageBuildTime: 0,
      systemUptime: process.uptime(),
      successRate: 0
    }
  }

  private async getBuildTrends(): Promise<any> {
    // Implementation for build trends
    return {
      dailyBuilds: [],
      hourlyBuilds: [],
      averageProcessingTime: []
    }
  }

  private async getPartnerActivity(): Promise<any> {
    // Implementation for partner activity
    return {
      topPartners: [],
      newPartners: [],
      activePartners: 0
    }
  }

  private async getAssetInsights(): Promise<any> {
    // Implementation for asset insights
    return {
      totalAssetsProcessed: 0,
      averageCompressionRatio: 0,
      averageQualityScore: 0,
      formatDistribution: {},
      densityDistribution: {}
    }
  }

  private async getSystemHealth(): Promise<any> {
    // Implementation for system health
    return {
      currentMetrics: await this.collectSystemMetrics(),
      alerts: [],
      performanceTrends: []
    }
  }

  private async aggregateMetrics(): Promise<void> {
    // Implementation for metrics aggregation
    logger.debug('Aggregating metrics')
  }

  private async getRecentBuilds(since: number): Promise<any[]> {
    // Implementation for recent builds
    return []
  }

  private async getActiveBuilds(): Promise<any[]> {
    // Implementation for active builds
    return []
  }

  private async getCurrentSystemMetrics(): Promise<SystemMetrics> {
    return this.collectSystemMetrics()
  }

  private async getActiveAlerts(): Promise<any[]> {
    // Implementation for active alerts
    return []
  }

  private async getAnalyticsData(from: Date, to: Date): Promise<any> {
    // Implementation for analytics data export
    return {}
  }

  private convertToCsv(data: any): string {
    // Implementation for CSV conversion
    return 'CSV data'
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer)
    }
    
    await this.redis.quit()
    logger.info('Analytics Service destroyed')
  }
}

export default AnalyticsService 