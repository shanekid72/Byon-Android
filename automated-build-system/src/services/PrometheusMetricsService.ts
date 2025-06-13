import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client'
import { EventEmitter } from 'events'
import express from 'express'

// Simple logger
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ''),
  debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta || '')
}

export interface PrometheusConfig {
  enableDefaultMetrics: boolean
  metricsPort: number
  metricsPath: string
  collectInterval: number
  enableCustomMetrics: boolean
  enableBuildMetrics: boolean
  enableAssetMetrics: boolean
  enablePartnerMetrics: boolean
  enableSystemMetrics: boolean
}

export class PrometheusMetricsService extends EventEmitter {
  private config: PrometheusConfig
  private server?: any
  private isRunning: boolean = false

  // Build Metrics
  private buildCounter: Counter<string>
  private buildDuration: Histogram<string>
  private buildStagesDuration: Histogram<string>
  private activeBuildGauge: Gauge<string>
  private buildQueueGauge: Gauge<string>
  private buildErrorCounter: Counter<string>

  // Asset Metrics
  private assetProcessingCounter: Counter<string>
  private assetProcessingDuration: Histogram<string>
  private assetSizeHistogram: Histogram<string>
  private assetCompressionGauge: Gauge<string>
  private assetQualityGauge: Gauge<string>

  // Partner Metrics
  private partnerCounter: Counter<string>
  private partnerBuildCounter: Counter<string>
  private partnerUsageGauge: Gauge<string>
  private partnerActiveGauge: Gauge<string>

  // System Metrics
  private systemCpuGauge: Gauge<string>
  private systemMemoryGauge: Gauge<string>
  private systemDiskGauge: Gauge<string>
  private systemNetworkCounter: Counter<string>

  // API Metrics
  private httpRequestCounter: Counter<string>
  private httpRequestDuration: Histogram<string>
  private httpErrorCounter: Counter<string>

  // Performance Metrics
  private processingRateGauge: Gauge<string>
  private throughputGauge: Gauge<string>
  private errorRateGauge: Gauge<string>

  constructor(config: Partial<PrometheusConfig> = {}) {
    super()

    this.config = {
      enableDefaultMetrics: true,
      metricsPort: 9090,
      metricsPath: '/metrics',
      collectInterval: 5000,
      enableCustomMetrics: true,
      enableBuildMetrics: true,
      enableAssetMetrics: true,
      enablePartnerMetrics: true,
      enableSystemMetrics: true,
      ...config
    }

    this.initializeMetrics()
  }

  /**
   * Initialize all Prometheus metrics
   */
  private initializeMetrics(): void {
    logger.info('Initializing Prometheus metrics')

    // Enable default Node.js metrics
    if (this.config.enableDefaultMetrics) {
      collectDefaultMetrics({
        register,
        timeout: this.config.collectInterval
      })
    }

    // Build Metrics
    if (this.config.enableBuildMetrics) {
      this.buildCounter = new Counter({
        name: 'lulupay_builds_total',
        help: 'Total number of builds processed',
        labelNames: ['partner_id', 'status', 'build_type']
      })

      this.buildDuration = new Histogram({
        name: 'lulupay_build_duration_seconds',
        help: 'Duration of build processing in seconds',
        labelNames: ['partner_id', 'status', 'build_type'],
        buckets: [5, 10, 30, 60, 120, 300, 600, 1200, 1800, 3600]
      })

      this.buildStagesDuration = new Histogram({
        name: 'lulupay_build_stage_duration_seconds',
        help: 'Duration of individual build stages in seconds',
        labelNames: ['partner_id', 'stage', 'build_type'],
        buckets: [1, 5, 10, 30, 60, 120, 300, 600]
      })

      this.activeBuildGauge = new Gauge({
        name: 'lulupay_active_builds',
        help: 'Number of currently active builds',
        labelNames: ['partner_id']
      })

      this.buildQueueGauge = new Gauge({
        name: 'lulupay_build_queue_length',
        help: 'Number of builds waiting in queue'
      })

      this.buildErrorCounter = new Counter({
        name: 'lulupay_build_errors_total',
        help: 'Total number of build errors',
        labelNames: ['partner_id', 'error_type', 'stage']
      })
    }

    // Asset Metrics
    if (this.config.enableAssetMetrics) {
      this.assetProcessingCounter = new Counter({
        name: 'lulupay_assets_processed_total',
        help: 'Total number of assets processed',
        labelNames: ['partner_id', 'asset_type', 'format', 'density']
      })

      this.assetProcessingDuration = new Histogram({
        name: 'lulupay_asset_processing_duration_seconds',
        help: 'Duration of asset processing in seconds',
        labelNames: ['asset_type', 'format'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
      })

      this.assetSizeHistogram = new Histogram({
        name: 'lulupay_asset_size_bytes',
        help: 'Size distribution of processed assets',
        labelNames: ['asset_type', 'format', 'stage'],
        buckets: [1024, 10240, 102400, 1048576, 10485760, 52428800, 104857600]
      })

      this.assetCompressionGauge = new Gauge({
        name: 'lulupay_asset_compression_ratio',
        help: 'Asset compression ratio achieved',
        labelNames: ['asset_type', 'format']
      })

      this.assetQualityGauge = new Gauge({
        name: 'lulupay_asset_quality_score',
        help: 'Quality score of processed assets',
        labelNames: ['asset_type', 'format']
      })
    }

    // Partner Metrics
    if (this.config.enablePartnerMetrics) {
      this.partnerCounter = new Counter({
        name: 'lulupay_partners_total',
        help: 'Total number of partners',
        labelNames: ['subscription_tier', 'status']
      })

      this.partnerBuildCounter = new Counter({
        name: 'lulupay_partner_builds_total',
        help: 'Total builds per partner',
        labelNames: ['partner_id', 'subscription_tier']
      })

      this.partnerUsageGauge = new Gauge({
        name: 'lulupay_partner_usage_percent',
        help: 'Partner usage as percentage of quota',
        labelNames: ['partner_id', 'resource_type']
      })

      this.partnerActiveGauge = new Gauge({
        name: 'lulupay_partners_active',
        help: 'Number of active partners in the last 24 hours'
      })
    }

    // System Metrics
    if (this.config.enableSystemMetrics) {
      this.systemCpuGauge = new Gauge({
        name: 'lulupay_system_cpu_usage_percent',
        help: 'System CPU usage percentage'
      })

      this.systemMemoryGauge = new Gauge({
        name: 'lulupay_system_memory_usage_bytes',
        help: 'System memory usage in bytes',
        labelNames: ['type']
      })

      this.systemDiskGauge = new Gauge({
        name: 'lulupay_system_disk_usage_bytes',
        help: 'System disk usage in bytes',
        labelNames: ['mount_point', 'type']
      })

      this.systemNetworkCounter = new Counter({
        name: 'lulupay_system_network_bytes_total',
        help: 'System network bytes transferred',
        labelNames: ['direction', 'interface']
      })
    }

    // API Metrics
    this.httpRequestCounter = new Counter({
      name: 'lulupay_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    })

    this.httpRequestDuration = new Histogram({
      name: 'lulupay_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
    })

    this.httpErrorCounter = new Counter({
      name: 'lulupay_http_errors_total',
      help: 'Total HTTP errors',
      labelNames: ['method', 'route', 'error_type']
    })

    // Performance Metrics
    this.processingRateGauge = new Gauge({
      name: 'lulupay_processing_rate_per_minute',
      help: 'Current processing rate per minute',
      labelNames: ['type']
    })

    this.throughputGauge = new Gauge({
      name: 'lulupay_throughput_items_per_second',
      help: 'Current throughput in items per second',
      labelNames: ['type']
    })

    this.errorRateGauge = new Gauge({
      name: 'lulupay_error_rate_percent',
      help: 'Current error rate percentage',
      labelNames: ['type']
    })

    logger.info('Prometheus metrics initialized successfully')
  }

  /**
   * Start the metrics server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Prometheus metrics server is already running')
      return
    }

    try {
      const app = express()

      // Health check endpoint
      app.get('/health', (req, res) => {
        res.status(200).json({ status: 'healthy', uptime: process.uptime() })
      })

      // Metrics endpoint
      app.get(this.config.metricsPath, async (req, res) => {
        try {
          res.set('Content-Type', register.contentType)
          const metrics = await register.metrics()
          res.end(metrics)
        } catch (error) {
          logger.error('Failed to generate metrics:', error)
          res.status(500).end()
        }
      })

      this.server = app.listen(this.config.metricsPort, () => {
        this.isRunning = true
        logger.info(`Prometheus metrics server started on port ${this.config.metricsPort}`)
        this.emit('started')
      })

    } catch (error) {
      logger.error('Failed to start Prometheus metrics server:', error)
      throw error
    }
  }

  /**
   * Stop the metrics server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        this.isRunning = false
        logger.info('Prometheus metrics server stopped')
        this.emit('stopped')
        resolve()
      })
    })
  }

  /**
   * Record build metrics
   */
  recordBuildStarted(partnerId: string, buildType: string = 'standard'): void {
    if (!this.config.enableBuildMetrics) return

    this.buildCounter.labels(partnerId, 'started', buildType).inc()
    this.activeBuildGauge.labels(partnerId).inc()
  }

  recordBuildCompleted(partnerId: string, duration: number, buildType: string = 'standard'): void {
    if (!this.config.enableBuildMetrics) return

    this.buildCounter.labels(partnerId, 'completed', buildType).inc()
    this.buildDuration.labels(partnerId, 'completed', buildType).observe(duration)
    this.activeBuildGauge.labels(partnerId).dec()
  }

  recordBuildFailed(partnerId: string, duration: number, buildType: string = 'standard'): void {
    if (!this.config.enableBuildMetrics) return

    this.buildCounter.labels(partnerId, 'failed', buildType).inc()
    this.buildDuration.labels(partnerId, 'failed', buildType).observe(duration)
    this.activeBuildGauge.labels(partnerId).dec()
  }

  recordBuildStage(partnerId: string, stage: string, duration: number, buildType: string = 'standard'): void {
    if (!this.config.enableBuildMetrics) return

    this.buildStagesDuration.labels(partnerId, stage, buildType).observe(duration)
  }

  recordBuildError(partnerId: string, errorType: string, stage: string): void {
    if (!this.config.enableBuildMetrics) return

    this.buildErrorCounter.labels(partnerId, errorType, stage).inc()
  }

  updateBuildQueue(queueLength: number): void {
    if (!this.config.enableBuildMetrics) return

    this.buildQueueGauge.set(queueLength)
  }

  /**
   * Record asset metrics
   */
  recordAssetProcessed(partnerId: string, assetType: string, format: string, density?: string): void {
    if (!this.config.enableAssetMetrics) return

    this.assetProcessingCounter.labels(partnerId, assetType, format, density || 'default').inc()
  }

  recordAssetProcessingTime(assetType: string, format: string, duration: number): void {
    if (!this.config.enableAssetMetrics) return

    this.assetProcessingDuration.labels(assetType, format).observe(duration)
  }

  recordAssetSize(assetType: string, format: string, stage: 'original' | 'processed', sizeBytes: number): void {
    if (!this.config.enableAssetMetrics) return

    this.assetSizeHistogram.labels(assetType, format, stage).observe(sizeBytes)
  }

  recordAssetCompression(assetType: string, format: string, compressionRatio: number): void {
    if (!this.config.enableAssetMetrics) return

    this.assetCompressionGauge.labels(assetType, format).set(compressionRatio)
  }

  recordAssetQuality(assetType: string, format: string, qualityScore: number): void {
    if (!this.config.enableAssetMetrics) return

    this.assetQualityGauge.labels(assetType, format).set(qualityScore)
  }

  /**
   * Record partner metrics
   */
  recordPartnerRegistered(subscriptionTier: string, status: string = 'active'): void {
    if (!this.config.enablePartnerMetrics) return

    this.partnerCounter.labels(subscriptionTier, status).inc()
  }

  recordPartnerBuild(partnerId: string, subscriptionTier: string): void {
    if (!this.config.enablePartnerMetrics) return

    this.partnerBuildCounter.labels(partnerId, subscriptionTier).inc()
  }

  updatePartnerUsage(partnerId: string, resourceType: string, usagePercent: number): void {
    if (!this.config.enablePartnerMetrics) return

    this.partnerUsageGauge.labels(partnerId, resourceType).set(usagePercent)
  }

  updateActivePartners(count: number): void {
    if (!this.config.enablePartnerMetrics) return

    this.partnerActiveGauge.set(count)
  }

  /**
   * Record system metrics
   */
  updateSystemCpu(usagePercent: number): void {
    if (!this.config.enableSystemMetrics) return

    this.systemCpuGauge.set(usagePercent)
  }

  updateSystemMemory(type: string, usageBytes: number): void {
    if (!this.config.enableSystemMetrics) return

    this.systemMemoryGauge.labels(type).set(usageBytes)
  }

  updateSystemDisk(mountPoint: string, type: string, usageBytes: number): void {
    if (!this.config.enableSystemMetrics) return

    this.systemDiskGauge.labels(mountPoint, type).set(usageBytes)
  }

  recordNetworkTransfer(direction: 'in' | 'out', interfaceName: string, bytes: number): void {
    if (!this.config.enableSystemMetrics) return

    this.systemNetworkCounter.labels(direction, interfaceName).inc(bytes)
  }

  /**
   * Record HTTP metrics
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestCounter.labels(method, route, statusCode.toString()).inc()
    this.httpRequestDuration.labels(method, route).observe(duration)
  }

  recordHttpError(method: string, route: string, errorType: string): void {
    this.httpErrorCounter.labels(method, route, errorType).inc()
  }

  /**
   * Record performance metrics
   */
  updateProcessingRate(type: string, ratePerMinute: number): void {
    this.processingRateGauge.labels(type).set(ratePerMinute)
  }

  updateThroughput(type: string, itemsPerSecond: number): void {
    this.throughputGauge.labels(type).set(itemsPerSecond)
  }

  updateErrorRate(type: string, errorRatePercent: number): void {
    this.errorRateGauge.labels(type).set(errorRatePercent)
  }

  /**
   * Express middleware for automatic HTTP metrics collection
   */
  getHttpMetricsMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now()

      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000
        const route = req.route ? req.route.path : req.path
        
        this.recordHttpRequest(req.method, route, res.statusCode, duration)

        if (res.statusCode >= 400) {
          const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error'
          this.recordHttpError(req.method, route, errorType)
        }
      })

      next()
    }
  }

  /**
   * Get current metrics as JSON
   */
  async getMetricsJson(): Promise<any> {
    try {
      const metrics = await register.getMetricsAsJSON()
      return metrics
    } catch (error) {
      logger.error('Failed to get metrics as JSON:', error)
      throw error
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    register.clear()
    this.initializeMetrics()
    logger.info('All metrics cleared and re-initialized')
  }

  /**
   * Get metrics registry
   */
  getRegistry() {
    return register
  }

  /**
   * Get server status
   */
  isServerRunning(): boolean {
    return this.isRunning
  }

  /**
   * Get configuration
   */
  getConfig(): PrometheusConfig {
    return { ...this.config }
  }
}

export default PrometheusMetricsService 