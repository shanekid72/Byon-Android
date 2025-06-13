"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrometheusMetricsService = void 0;
const prom_client_1 = require("prom-client");
const events_1 = require("events");
const express_1 = __importDefault(require("express"));
const logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
    error: (msg, error) => console.error(`[ERROR] ${msg}`, error || ''),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
    debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta || '')
};
class PrometheusMetricsService extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.isRunning = false;
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
        };
        this.initializeMetrics();
    }
    initializeMetrics() {
        logger.info('Initializing Prometheus metrics');
        if (this.config.enableDefaultMetrics) {
            (0, prom_client_1.collectDefaultMetrics)({
                register: prom_client_1.register,
                timeout: this.config.collectInterval
            });
        }
        if (this.config.enableBuildMetrics) {
            this.buildCounter = new prom_client_1.Counter({
                name: 'lulupay_builds_total',
                help: 'Total number of builds processed',
                labelNames: ['partner_id', 'status', 'build_type']
            });
            this.buildDuration = new prom_client_1.Histogram({
                name: 'lulupay_build_duration_seconds',
                help: 'Duration of build processing in seconds',
                labelNames: ['partner_id', 'status', 'build_type'],
                buckets: [5, 10, 30, 60, 120, 300, 600, 1200, 1800, 3600]
            });
            this.buildStagesDuration = new prom_client_1.Histogram({
                name: 'lulupay_build_stage_duration_seconds',
                help: 'Duration of individual build stages in seconds',
                labelNames: ['partner_id', 'stage', 'build_type'],
                buckets: [1, 5, 10, 30, 60, 120, 300, 600]
            });
            this.activeBuildGauge = new prom_client_1.Gauge({
                name: 'lulupay_active_builds',
                help: 'Number of currently active builds',
                labelNames: ['partner_id']
            });
            this.buildQueueGauge = new prom_client_1.Gauge({
                name: 'lulupay_build_queue_length',
                help: 'Number of builds waiting in queue'
            });
            this.buildErrorCounter = new prom_client_1.Counter({
                name: 'lulupay_build_errors_total',
                help: 'Total number of build errors',
                labelNames: ['partner_id', 'error_type', 'stage']
            });
        }
        if (this.config.enableAssetMetrics) {
            this.assetProcessingCounter = new prom_client_1.Counter({
                name: 'lulupay_assets_processed_total',
                help: 'Total number of assets processed',
                labelNames: ['partner_id', 'asset_type', 'format', 'density']
            });
            this.assetProcessingDuration = new prom_client_1.Histogram({
                name: 'lulupay_asset_processing_duration_seconds',
                help: 'Duration of asset processing in seconds',
                labelNames: ['asset_type', 'format'],
                buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
            });
            this.assetSizeHistogram = new prom_client_1.Histogram({
                name: 'lulupay_asset_size_bytes',
                help: 'Size distribution of processed assets',
                labelNames: ['asset_type', 'format', 'stage'],
                buckets: [1024, 10240, 102400, 1048576, 10485760, 52428800, 104857600]
            });
            this.assetCompressionGauge = new prom_client_1.Gauge({
                name: 'lulupay_asset_compression_ratio',
                help: 'Asset compression ratio achieved',
                labelNames: ['asset_type', 'format']
            });
            this.assetQualityGauge = new prom_client_1.Gauge({
                name: 'lulupay_asset_quality_score',
                help: 'Quality score of processed assets',
                labelNames: ['asset_type', 'format']
            });
        }
        if (this.config.enablePartnerMetrics) {
            this.partnerCounter = new prom_client_1.Counter({
                name: 'lulupay_partners_total',
                help: 'Total number of partners',
                labelNames: ['subscription_tier', 'status']
            });
            this.partnerBuildCounter = new prom_client_1.Counter({
                name: 'lulupay_partner_builds_total',
                help: 'Total builds per partner',
                labelNames: ['partner_id', 'subscription_tier']
            });
            this.partnerUsageGauge = new prom_client_1.Gauge({
                name: 'lulupay_partner_usage_percent',
                help: 'Partner usage as percentage of quota',
                labelNames: ['partner_id', 'resource_type']
            });
            this.partnerActiveGauge = new prom_client_1.Gauge({
                name: 'lulupay_partners_active',
                help: 'Number of active partners in the last 24 hours'
            });
        }
        if (this.config.enableSystemMetrics) {
            this.systemCpuGauge = new prom_client_1.Gauge({
                name: 'lulupay_system_cpu_usage_percent',
                help: 'System CPU usage percentage'
            });
            this.systemMemoryGauge = new prom_client_1.Gauge({
                name: 'lulupay_system_memory_usage_bytes',
                help: 'System memory usage in bytes',
                labelNames: ['type']
            });
            this.systemDiskGauge = new prom_client_1.Gauge({
                name: 'lulupay_system_disk_usage_bytes',
                help: 'System disk usage in bytes',
                labelNames: ['mount_point', 'type']
            });
            this.systemNetworkCounter = new prom_client_1.Counter({
                name: 'lulupay_system_network_bytes_total',
                help: 'System network bytes transferred',
                labelNames: ['direction', 'interface']
            });
        }
        this.httpRequestCounter = new prom_client_1.Counter({
            name: 'lulupay_http_requests_total',
            help: 'Total HTTP requests',
            labelNames: ['method', 'route', 'status_code']
        });
        this.httpRequestDuration = new prom_client_1.Histogram({
            name: 'lulupay_http_request_duration_seconds',
            help: 'HTTP request duration in seconds',
            labelNames: ['method', 'route'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
        });
        this.httpErrorCounter = new prom_client_1.Counter({
            name: 'lulupay_http_errors_total',
            help: 'Total HTTP errors',
            labelNames: ['method', 'route', 'error_type']
        });
        this.processingRateGauge = new prom_client_1.Gauge({
            name: 'lulupay_processing_rate_per_minute',
            help: 'Current processing rate per minute',
            labelNames: ['type']
        });
        this.throughputGauge = new prom_client_1.Gauge({
            name: 'lulupay_throughput_items_per_second',
            help: 'Current throughput in items per second',
            labelNames: ['type']
        });
        this.errorRateGauge = new prom_client_1.Gauge({
            name: 'lulupay_error_rate_percent',
            help: 'Current error rate percentage',
            labelNames: ['type']
        });
        logger.info('Prometheus metrics initialized successfully');
    }
    async start() {
        if (this.isRunning) {
            logger.warn('Prometheus metrics server is already running');
            return;
        }
        try {
            const app = (0, express_1.default)();
            app.get('/health', (req, res) => {
                res.status(200).json({ status: 'healthy', uptime: process.uptime() });
            });
            app.get(this.config.metricsPath, async (req, res) => {
                try {
                    res.set('Content-Type', prom_client_1.register.contentType);
                    const metrics = await prom_client_1.register.metrics();
                    res.end(metrics);
                }
                catch (error) {
                    logger.error('Failed to generate metrics:', error);
                    res.status(500).end();
                }
            });
            this.server = app.listen(this.config.metricsPort, () => {
                this.isRunning = true;
                logger.info(`Prometheus metrics server started on port ${this.config.metricsPort}`);
                this.emit('started');
            });
        }
        catch (error) {
            logger.error('Failed to start Prometheus metrics server:', error);
            throw error;
        }
    }
    async stop() {
        if (!this.isRunning || !this.server) {
            return;
        }
        return new Promise((resolve) => {
            this.server.close(() => {
                this.isRunning = false;
                logger.info('Prometheus metrics server stopped');
                this.emit('stopped');
                resolve();
            });
        });
    }
    recordBuildStarted(partnerId, buildType = 'standard') {
        if (!this.config.enableBuildMetrics)
            return;
        this.buildCounter.labels(partnerId, 'started', buildType).inc();
        this.activeBuildGauge.labels(partnerId).inc();
    }
    recordBuildCompleted(partnerId, duration, buildType = 'standard') {
        if (!this.config.enableBuildMetrics)
            return;
        this.buildCounter.labels(partnerId, 'completed', buildType).inc();
        this.buildDuration.labels(partnerId, 'completed', buildType).observe(duration);
        this.activeBuildGauge.labels(partnerId).dec();
    }
    recordBuildFailed(partnerId, duration, buildType = 'standard') {
        if (!this.config.enableBuildMetrics)
            return;
        this.buildCounter.labels(partnerId, 'failed', buildType).inc();
        this.buildDuration.labels(partnerId, 'failed', buildType).observe(duration);
        this.activeBuildGauge.labels(partnerId).dec();
    }
    recordBuildStage(partnerId, stage, duration, buildType = 'standard') {
        if (!this.config.enableBuildMetrics)
            return;
        this.buildStagesDuration.labels(partnerId, stage, buildType).observe(duration);
    }
    recordBuildError(partnerId, errorType, stage) {
        if (!this.config.enableBuildMetrics)
            return;
        this.buildErrorCounter.labels(partnerId, errorType, stage).inc();
    }
    updateBuildQueue(queueLength) {
        if (!this.config.enableBuildMetrics)
            return;
        this.buildQueueGauge.set(queueLength);
    }
    recordAssetProcessed(partnerId, assetType, format, density) {
        if (!this.config.enableAssetMetrics)
            return;
        this.assetProcessingCounter.labels(partnerId, assetType, format, density || 'default').inc();
    }
    recordAssetProcessingTime(assetType, format, duration) {
        if (!this.config.enableAssetMetrics)
            return;
        this.assetProcessingDuration.labels(assetType, format).observe(duration);
    }
    recordAssetSize(assetType, format, stage, sizeBytes) {
        if (!this.config.enableAssetMetrics)
            return;
        this.assetSizeHistogram.labels(assetType, format, stage).observe(sizeBytes);
    }
    recordAssetCompression(assetType, format, compressionRatio) {
        if (!this.config.enableAssetMetrics)
            return;
        this.assetCompressionGauge.labels(assetType, format).set(compressionRatio);
    }
    recordAssetQuality(assetType, format, qualityScore) {
        if (!this.config.enableAssetMetrics)
            return;
        this.assetQualityGauge.labels(assetType, format).set(qualityScore);
    }
    recordPartnerRegistered(subscriptionTier, status = 'active') {
        if (!this.config.enablePartnerMetrics)
            return;
        this.partnerCounter.labels(subscriptionTier, status).inc();
    }
    recordPartnerBuild(partnerId, subscriptionTier) {
        if (!this.config.enablePartnerMetrics)
            return;
        this.partnerBuildCounter.labels(partnerId, subscriptionTier).inc();
    }
    updatePartnerUsage(partnerId, resourceType, usagePercent) {
        if (!this.config.enablePartnerMetrics)
            return;
        this.partnerUsageGauge.labels(partnerId, resourceType).set(usagePercent);
    }
    updateActivePartners(count) {
        if (!this.config.enablePartnerMetrics)
            return;
        this.partnerActiveGauge.set(count);
    }
    updateSystemCpu(usagePercent) {
        if (!this.config.enableSystemMetrics)
            return;
        this.systemCpuGauge.set(usagePercent);
    }
    updateSystemMemory(type, usageBytes) {
        if (!this.config.enableSystemMetrics)
            return;
        this.systemMemoryGauge.labels(type).set(usageBytes);
    }
    updateSystemDisk(mountPoint, type, usageBytes) {
        if (!this.config.enableSystemMetrics)
            return;
        this.systemDiskGauge.labels(mountPoint, type).set(usageBytes);
    }
    recordNetworkTransfer(direction, interfaceName, bytes) {
        if (!this.config.enableSystemMetrics)
            return;
        this.systemNetworkCounter.labels(direction, interfaceName).inc(bytes);
    }
    recordHttpRequest(method, route, statusCode, duration) {
        this.httpRequestCounter.labels(method, route, statusCode.toString()).inc();
        this.httpRequestDuration.labels(method, route).observe(duration);
    }
    recordHttpError(method, route, errorType) {
        this.httpErrorCounter.labels(method, route, errorType).inc();
    }
    updateProcessingRate(type, ratePerMinute) {
        this.processingRateGauge.labels(type).set(ratePerMinute);
    }
    updateThroughput(type, itemsPerSecond) {
        this.throughputGauge.labels(type).set(itemsPerSecond);
    }
    updateErrorRate(type, errorRatePercent) {
        this.errorRateGauge.labels(type).set(errorRatePercent);
    }
    getHttpMetricsMiddleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            res.on('finish', () => {
                const duration = (Date.now() - startTime) / 1000;
                const route = req.route ? req.route.path : req.path;
                this.recordHttpRequest(req.method, route, res.statusCode, duration);
                if (res.statusCode >= 400) {
                    const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
                    this.recordHttpError(req.method, route, errorType);
                }
            });
            next();
        };
    }
    async getMetricsJson() {
        try {
            const metrics = await prom_client_1.register.getMetricsAsJSON();
            return metrics;
        }
        catch (error) {
            logger.error('Failed to get metrics as JSON:', error);
            throw error;
        }
    }
    clearMetrics() {
        prom_client_1.register.clear();
        this.initializeMetrics();
        logger.info('All metrics cleared and re-initialized');
    }
    getRegistry() {
        return prom_client_1.register;
    }
    isServerRunning() {
        return this.isRunning;
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.PrometheusMetricsService = PrometheusMetricsService;
exports.default = PrometheusMetricsService;
//# sourceMappingURL=PrometheusMetricsService.js.map