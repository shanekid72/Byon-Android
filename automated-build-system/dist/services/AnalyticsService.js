"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const events_1 = require("events");
const ioredis_1 = __importDefault(require("ioredis"));
const logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
    error: (msg, error) => console.error(`[ERROR] ${msg}`, error || ''),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
    debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta || '')
};
class AnalyticsService extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            enableRealTimeAnalytics: true,
            enableBuildMetrics: true,
            enablePartnerAnalytics: true,
            enableAssetAnalytics: true,
            enableSystemMetrics: true,
            dataRetentionDays: 90,
            aggregationIntervalMs: 60000,
            redisKeyPrefix: 'lulupay:analytics',
            ...config
        };
        this.redis = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            maxRetriesPerRequest: 3
        });
        this.metricsCollection = new Map();
        this.alertThresholds = new Map([
            ['cpu_usage', 80],
            ['memory_usage', 85],
            ['disk_usage', 90],
            ['build_failure_rate', 15],
            ['average_response_time', 5000]
        ]);
        this.initialize();
    }
    async initialize() {
        logger.info('Initializing Analytics Service');
        try {
            await this.redis.ping();
            logger.info('Redis connection established for analytics');
            if (this.config.enableRealTimeAnalytics) {
                this.startMetricsAggregation();
            }
            if (this.config.enableSystemMetrics) {
                this.startSystemMetricsCollection();
            }
            this.setupDataRetentionCleanup();
            logger.info('Analytics Service initialized successfully');
        }
        catch (error) {
            logger.error('Failed to initialize Analytics Service:', error);
            throw error;
        }
    }
    async recordBuildMetrics(metrics) {
        if (!this.config.enableBuildMetrics)
            return;
        try {
            const key = `${this.config.redisKeyPrefix}:builds:${metrics.buildId}`;
            const timestamp = Date.now();
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
            });
            await this.redis.expire(key, this.config.dataRetentionDays * 24 * 3600);
            await this.updateBuildAggregates(metrics);
            this.emit('buildMetrics', metrics);
            logger.debug(`Build metrics recorded for build ${metrics.buildId}`);
        }
        catch (error) {
            logger.error('Failed to record build metrics:', error);
        }
    }
    async recordPartnerMetrics(metrics) {
        if (!this.config.enablePartnerAnalytics)
            return;
        try {
            const key = `${this.config.redisKeyPrefix}:partners:${metrics.partnerId}`;
            const timestamp = Date.now();
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
            });
            await this.redis.expire(key, this.config.dataRetentionDays * 24 * 3600);
            await this.updatePartnerAggregates(metrics);
            this.emit('partnerMetrics', metrics);
            logger.debug(`Partner metrics recorded for partner ${metrics.partnerId}`);
        }
        catch (error) {
            logger.error('Failed to record partner metrics:', error);
        }
    }
    async recordAssetMetrics(metrics) {
        if (!this.config.enableAssetAnalytics)
            return;
        try {
            const key = `${this.config.redisKeyPrefix}:assets:${metrics.assetId}`;
            const timestamp = Date.now();
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
            });
            await this.redis.expire(key, this.config.dataRetentionDays * 24 * 3600);
            await this.updateAssetAggregates(metrics);
            this.emit('assetMetrics', metrics);
            logger.debug(`Asset metrics recorded for asset ${metrics.assetId}`);
        }
        catch (error) {
            logger.error('Failed to record asset metrics:', error);
        }
    }
    async recordSystemMetrics(metrics) {
        if (!this.config.enableSystemMetrics)
            return;
        try {
            const key = `${this.config.redisKeyPrefix}:system:${Date.now()}`;
            await this.redis.hset(key, {
                timestamp: metrics.timestamp.toISOString(),
                cpu: JSON.stringify(metrics.cpu),
                memory: JSON.stringify(metrics.memory),
                disk: JSON.stringify(metrics.disk),
                network: JSON.stringify(metrics.network),
                application: JSON.stringify(metrics.application)
            });
            await this.redis.expire(key, 7 * 24 * 3600);
            await this.checkSystemAlerts(metrics);
            this.emit('systemMetrics', metrics);
            logger.debug('System metrics recorded');
        }
        catch (error) {
            logger.error('Failed to record system metrics:', error);
        }
    }
    async getDashboardData() {
        try {
            const [overview, buildTrends, partnerActivity, assetInsights, systemHealth] = await Promise.all([
                this.getOverviewMetrics(),
                this.getBuildTrends(),
                this.getPartnerActivity(),
                this.getAssetInsights(),
                this.getSystemHealth()
            ]);
            return {
                overview,
                buildTrends,
                partnerActivity,
                assetInsights,
                systemHealth
            };
        }
        catch (error) {
            logger.error('Failed to get dashboard data:', error);
            throw error;
        }
    }
    async getRealTimeMetrics() {
        try {
            const currentTime = Date.now();
            const fiveMinutesAgo = currentTime - (5 * 60 * 1000);
            const recentBuilds = await this.getRecentBuilds(fiveMinutesAgo);
            const activeBuilds = await this.getActiveBuilds();
            const systemMetrics = await this.getCurrentSystemMetrics();
            return {
                timestamp: new Date(currentTime),
                recentBuilds,
                activeBuilds,
                systemMetrics,
                alerts: await this.getActiveAlerts()
            };
        }
        catch (error) {
            logger.error('Failed to get real-time metrics:', error);
            throw error;
        }
    }
    async exportAnalytics(format, dateRange) {
        try {
            const data = await this.getAnalyticsData(dateRange.from, dateRange.to);
            if (format === 'json') {
                return JSON.stringify(data, null, 2);
            }
            else {
                return this.convertToCsv(data);
            }
        }
        catch (error) {
            logger.error('Failed to export analytics:', error);
            throw error;
        }
    }
    async updateBuildAggregates(metrics) {
        const date = new Date().toISOString().split('T')[0];
        const hour = new Date().getHours();
        await this.redis.hincrby(`${this.config.redisKeyPrefix}:aggregates:daily:${date}`, 'totalBuilds', 1);
        if (metrics.status === 'completed') {
            await this.redis.hincrby(`${this.config.redisKeyPrefix}:aggregates:daily:${date}`, 'successfulBuilds', 1);
        }
        else if (metrics.status === 'failed') {
            await this.redis.hincrby(`${this.config.redisKeyPrefix}:aggregates:daily:${date}`, 'failedBuilds', 1);
        }
        await this.redis.hincrby(`${this.config.redisKeyPrefix}:aggregates:hourly:${date}:${hour}`, 'builds', 1);
        if (metrics.duration) {
            await this.redis.lpush(`${this.config.redisKeyPrefix}:processing-times:${date}`, metrics.duration);
            await this.redis.ltrim(`${this.config.redisKeyPrefix}:processing-times:${date}`, 0, 1000);
        }
    }
    async updatePartnerAggregates(metrics) {
        await this.redis.zadd(`${this.config.redisKeyPrefix}:partners:active`, Date.now(), metrics.partnerId);
        await this.redis.zadd(`${this.config.redisKeyPrefix}:partners:builds`, metrics.totalBuilds, metrics.partnerId);
    }
    async updateAssetAggregates(metrics) {
        const date = new Date().toISOString().split('T')[0];
        await this.redis.hincrby(`${this.config.redisKeyPrefix}:assets:daily:${date}`, 'totalAssets', 1);
        await this.redis.hincrby(`${this.config.redisKeyPrefix}:assets:formats`, metrics.format, 1);
        if (metrics.density) {
            await this.redis.hincrby(`${this.config.redisKeyPrefix}:assets:densities`, metrics.density, 1);
        }
    }
    async checkSystemAlerts(metrics) {
        const alerts = [];
        if (metrics.cpu.usage > (this.alertThresholds.get('cpu_usage') || 80)) {
            alerts.push({
                type: 'high_cpu_usage',
                message: `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
                severity: 'high',
                timestamp: new Date()
            });
        }
        const memoryUsage = (metrics.memory.usedMB / metrics.memory.totalMB) * 100;
        if (memoryUsage > (this.alertThresholds.get('memory_usage') || 85)) {
            alerts.push({
                type: 'high_memory_usage',
                message: `High memory usage: ${memoryUsage.toFixed(1)}%`,
                severity: 'high',
                timestamp: new Date()
            });
        }
        for (const alert of alerts) {
            await this.redis.lpush(`${this.config.redisKeyPrefix}:alerts`, JSON.stringify(alert));
            await this.redis.ltrim(`${this.config.redisKeyPrefix}:alerts`, 0, 100);
            this.emit('alert', alert);
        }
    }
    startMetricsAggregation() {
        this.aggregationTimer = setInterval(async () => {
            try {
                await this.aggregateMetrics();
            }
            catch (error) {
                logger.error('Metrics aggregation failed:', error);
            }
        }, this.config.aggregationIntervalMs);
    }
    startSystemMetricsCollection() {
        setInterval(async () => {
            try {
                const systemMetrics = await this.collectSystemMetrics();
                await this.recordSystemMetrics(systemMetrics);
            }
            catch (error) {
                logger.error('System metrics collection failed:', error);
            }
        }, 30000);
    }
    async collectSystemMetrics() {
        const memUsage = process.memoryUsage();
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
                totalGB: 100,
                usedGB: 45,
                freeGB: 55
            },
            network: {
                bytesIn: 0,
                bytesOut: 0,
                connectionsActive: 0
            },
            application: {
                activeBuilds: await this.getActiveBuildCount(),
                queueLength: await this.getBuildQueueLength(),
                uptime: process.uptime(),
                restarts: 0
            }
        };
    }
    async getCpuUsage() {
        return Math.random() * 30 + 20;
    }
    async getActiveBuildCount() {
        const activeBuilds = await this.redis.keys(`${this.config.redisKeyPrefix}:builds:*`);
        return activeBuilds.length;
    }
    async getBuildQueueLength() {
        return 0;
    }
    setupDataRetentionCleanup() {
        setInterval(async () => {
            try {
                await this.cleanupExpiredData();
            }
            catch (error) {
                logger.error('Data retention cleanup failed:', error);
            }
        }, 24 * 60 * 60 * 1000);
    }
    async cleanupExpiredData() {
        const cutoffTime = Date.now() - (this.config.dataRetentionDays * 24 * 60 * 60 * 1000);
        const aggregateKeys = await this.redis.keys(`${this.config.redisKeyPrefix}:aggregates:*`);
        for (const key of aggregateKeys) {
            const keyDate = key.split(':').pop();
            if (keyDate && new Date(keyDate).getTime() < cutoffTime) {
                await this.redis.del(key);
            }
        }
        logger.info('Data retention cleanup completed');
    }
    async getOverviewMetrics() {
        return {
            totalBuilds: 0,
            totalPartners: 0,
            totalAssets: 0,
            averageBuildTime: 0,
            systemUptime: process.uptime(),
            successRate: 0
        };
    }
    async getBuildTrends() {
        return {
            dailyBuilds: [],
            hourlyBuilds: [],
            averageProcessingTime: []
        };
    }
    async getPartnerActivity() {
        return {
            topPartners: [],
            newPartners: [],
            activePartners: 0
        };
    }
    async getAssetInsights() {
        return {
            totalAssetsProcessed: 0,
            averageCompressionRatio: 0,
            averageQualityScore: 0,
            formatDistribution: {},
            densityDistribution: {}
        };
    }
    async getSystemHealth() {
        return {
            currentMetrics: await this.collectSystemMetrics(),
            alerts: [],
            performanceTrends: []
        };
    }
    async aggregateMetrics() {
        logger.debug('Aggregating metrics');
    }
    async getRecentBuilds(since) {
        return [];
    }
    async getActiveBuilds() {
        return [];
    }
    async getCurrentSystemMetrics() {
        return this.collectSystemMetrics();
    }
    async getActiveAlerts() {
        return [];
    }
    async getAnalyticsData(from, to) {
        return {};
    }
    convertToCsv(data) {
        return 'CSV data';
    }
    async destroy() {
        if (this.aggregationTimer) {
            clearInterval(this.aggregationTimer);
        }
        await this.redis.quit();
        logger.info('Analytics Service destroyed');
    }
}
exports.AnalyticsService = AnalyticsService;
exports.default = AnalyticsService;
//# sourceMappingURL=AnalyticsService.js.map