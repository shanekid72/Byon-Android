"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceOptimizationService = void 0;
const events_1 = require("events");
const os_1 = __importDefault(require("os"));
const logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
    error: (msg, error) => console.error(`[ERROR] ${msg}`, error || ''),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
    debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta || ''),
    perf: (operation, duration, meta) => {
        console.log(`[PERF] ${operation} took ${duration}ms`, meta || '');
    }
};
class PerformanceOptimizationService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.monitoringInterval = null;
        this.config = config;
        this.metricsHistory = [];
        this.cache = new Map();
        this.loadBalancerNodes = new Map();
        this.optimizationRecommendations = [];
        this.performanceTuners = new Map();
        this.currentMetrics = this.initializeMetrics();
        this.initializePerformanceOptimization();
    }
    async initializePerformanceOptimization() {
        logger.info('Initializing performance optimization service');
        try {
            if (this.config.enableCaching) {
                await this.initializeCaching();
            }
            if (this.config.enableLoadBalancing) {
                await this.initializeLoadBalancing();
            }
            if (this.config.enableAutoScaling) {
                await this.initializeAutoScaling();
            }
            if (this.config.enableDatabaseOptimization) {
                await this.initializeDatabaseOptimization();
            }
            if (this.config.enableRealTimeMonitoring) {
                this.startPerformanceMonitoring();
            }
            this.initializePerformanceTuners();
            logger.info('Performance optimization service initialized successfully');
            this.emit('performanceOptimizationInitialized');
        }
        catch (error) {
            logger.error('Failed to initialize performance optimization service:', error);
            throw error;
        }
    }
    async setCache(key, value, ttl) {
        const entry = {
            key,
            value,
            ttl: ttl || this.config.caching.defaultTTL,
            accessCount: 0,
            lastAccessed: new Date(),
            size: this.calculateObjectSize(value)
        };
        if (this.getCacheMemoryUsage() + entry.size > this.config.caching.maxMemoryUsage * 1024 * 1024) {
            await this.evictCacheEntries();
        }
        this.cache.set(key, entry);
        logger.debug(`Cache set: ${key}`);
    }
    async getCache(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.currentMetrics.cacheMisses++;
            return null;
        }
        if (Date.now() - entry.lastAccessed.getTime() > entry.ttl * 1000) {
            this.cache.delete(key);
            this.currentMetrics.cacheMisses++;
            return null;
        }
        entry.accessCount++;
        entry.lastAccessed = new Date();
        logger.debug(`Cache hit: ${key}`);
        return entry.value;
    }
    async invalidateCache(pattern) {
        if (pattern) {
            const regex = new RegExp(pattern);
            for (const [key] of this.cache) {
                if (regex.test(key)) {
                    this.cache.delete(key);
                }
            }
        }
        else {
            this.cache.clear();
        }
        logger.info(`Cache invalidated: ${pattern || 'all'}`);
    }
    addLoadBalancerNode(node) {
        const loadBalancerNode = {
            ...node,
            isHealthy: true,
            currentConnections: 0,
            responseTime: 0,
            lastHealthCheck: new Date()
        };
        this.loadBalancerNodes.set(node.id, loadBalancerNode);
        logger.info(`Load balancer node added: ${node.id}`);
    }
    removeLoadBalancerNode(nodeId) {
        this.loadBalancerNodes.delete(nodeId);
        logger.info(`Load balancer node removed: ${nodeId}`);
    }
    getOptimalNode() {
        const healthyNodes = Array.from(this.loadBalancerNodes.values()).filter(node => node.isHealthy);
        if (healthyNodes.length === 0) {
            return null;
        }
        switch (this.config.loadBalancing.algorithm) {
            case 'round_robin':
                return this.getRoundRobinNode(healthyNodes);
            case 'least_connections':
                return this.getLeastConnectionsNode(healthyNodes);
            case 'weighted_round_robin':
                return this.getWeightedRoundRobinNode(healthyNodes);
            case 'least_response_time':
                return this.getLeastResponseTimeNode(healthyNodes);
            default:
                return healthyNodes[0];
        }
    }
    async measurePerformance(operation, fn, metadata) {
        const startTime = Date.now();
        try {
            const result = await fn();
            const duration = Date.now() - startTime;
            this.recordPerformanceMetric(operation, duration, 'success', metadata);
            logger.perf(operation, duration, metadata);
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.recordPerformanceMetric(operation, duration, 'error', metadata);
            logger.perf(`${operation} (failed)`, duration, metadata);
            throw error;
        }
    }
    getCurrentMetrics() {
        return { ...this.currentMetrics };
    }
    getMetricsHistory(startDate, endDate, limit) {
        let metrics = [...this.metricsHistory];
        if (startDate) {
            metrics = metrics.filter(m => m.timestamp >= startDate);
        }
        if (endDate) {
            metrics = metrics.filter(m => m.timestamp <= endDate);
        }
        if (limit) {
            metrics = metrics.slice(-limit);
        }
        return metrics;
    }
    async analyzePerformance() {
        logger.info('Analyzing performance for optimization opportunities');
        const recommendations = [];
        const cacheRecommendations = this.analyzeCachePerformance();
        recommendations.push(...cacheRecommendations);
        const responseTimeRecommendations = this.analyzeResponseTimes();
        recommendations.push(...responseTimeRecommendations);
        const resourceRecommendations = this.analyzeResourceUsage();
        recommendations.push(...resourceRecommendations);
        const databaseRecommendations = this.analyzeDatabasePerformance();
        recommendations.push(...databaseRecommendations);
        recommendations.sort((a, b) => {
            const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityWeight[b.priority] - priorityWeight[a.priority];
        });
        this.optimizationRecommendations = recommendations;
        return recommendations;
    }
    async generatePerformanceReport() {
        const recentMetrics = this.getMetricsHistory(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date());
        const overallScore = this.calculateOverallPerformanceScore(recentMetrics);
        const categories = this.calculateCategoryScores(recentMetrics);
        const recommendations = await this.analyzePerformance();
        const trends = this.calculateTrends(recentMetrics);
        const bottlenecks = this.identifyBottlenecks(recentMetrics);
        const report = {
            reportDate: new Date(),
            overallScore,
            categories,
            recommendations,
            trends,
            bottlenecks
        };
        this.emit('performanceReportGenerated', report);
        return report;
    }
    async checkScalingNeeds() {
        const metrics = this.currentMetrics;
        const config = this.config.scaling;
        let shouldScaleUp = false;
        let shouldScaleDown = false;
        if (config.strategy === 'cpu_based' || config.strategy === 'hybrid') {
            shouldScaleUp = shouldScaleUp || metrics.cpuUsage > config.cpuThreshold;
            shouldScaleDown = shouldScaleDown || metrics.cpuUsage < config.cpuThreshold * 0.5;
        }
        if (config.strategy === 'memory_based' || config.strategy === 'hybrid') {
            shouldScaleUp = shouldScaleUp || metrics.memoryUsage > config.memoryThreshold;
            shouldScaleDown = shouldScaleDown || metrics.memoryUsage < config.memoryThreshold * 0.5;
        }
        if (config.strategy === 'request_based' || config.strategy === 'hybrid') {
            shouldScaleUp = shouldScaleUp || metrics.requestsPerSecond > config.requestThreshold;
            shouldScaleDown = shouldScaleDown || metrics.requestsPerSecond < config.requestThreshold * 0.5;
        }
        if (shouldScaleUp) {
            await this.scaleUp();
        }
        else if (shouldScaleDown) {
            await this.scaleDown();
        }
    }
    async scaleUp() {
        logger.info('Scaling up instances');
        this.emit('scalingUp', {
            currentInstances: this.config.scaling.minInstances,
            reason: 'High resource usage detected'
        });
    }
    async scaleDown() {
        logger.info('Scaling down instances');
        this.emit('scalingDown', {
            currentInstances: this.config.scaling.maxInstances,
            reason: 'Low resource usage detected'
        });
    }
    initializeMetrics() {
        return {
            timestamp: new Date(),
            cpuUsage: 0,
            memoryUsage: 0,
            diskUsage: 0,
            networkIO: { in: 0, out: 0 },
            requestsPerSecond: 0,
            averageResponseTime: 0,
            p95ResponseTime: 0,
            p99ResponseTime: 0,
            errorRate: 0,
            cacheHitRatio: 0,
            cacheSize: 0,
            cacheMisses: 0,
            activeConnections: 0,
            queryTime: 0,
            slowQueries: 0,
            activeBuildCount: 0,
            averageBuildTime: 0,
            buildQueueLength: 0,
            customMetrics: {}
        };
    }
    async initializeCaching() {
        logger.info('Initializing caching system');
        if (this.config.caching.enableCacheWarmup) {
            await this.performCacheWarmup();
        }
    }
    async initializeLoadBalancing() {
        logger.info('Initializing load balancing');
        setInterval(() => {
            this.performHealthChecks();
        }, this.config.loadBalancing.healthCheckInterval * 1000);
    }
    async initializeAutoScaling() {
        logger.info('Initializing auto-scaling');
        setInterval(() => {
            this.checkScalingNeeds();
        }, this.config.scaling.cooldownPeriod * 1000);
    }
    async initializeDatabaseOptimization() {
        logger.info('Initializing database optimization');
    }
    initializePerformanceTuners() {
        this.performanceTuners.set('compression', this.initializeCompressionTuner());
        this.performanceTuners.set('cdn', this.initializeCDNTuner());
    }
    initializeCompressionTuner() {
        return {
            shouldCompress: (size, contentType) => {
                return size >= this.config.compression.minFileSizeForCompression &&
                    ['text/', 'application/json', 'application/javascript'].some(type => contentType.startsWith(type));
            },
            getCompressionLevel: () => this.config.compression.compressionLevel
        };
    }
    initializeCDNTuner() {
        return {
            shouldUseCDN: (fileType) => {
                return ['image/', 'video/', 'audio/', 'font/'].some(type => fileType.startsWith(type));
            }
        };
    }
    startPerformanceMonitoring() {
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, 10000);
        logger.info('Performance monitoring started');
    }
    collectMetrics() {
        const metrics = {
            timestamp: new Date(),
            cpuUsage: this.getCPUUsage(),
            memoryUsage: this.getMemoryUsage(),
            diskUsage: this.getDiskUsage(),
            networkIO: this.getNetworkIO(),
            requestsPerSecond: this.getRequestsPerSecond(),
            averageResponseTime: this.getAverageResponseTime(),
            p95ResponseTime: this.getP95ResponseTime(),
            p99ResponseTime: this.getP99ResponseTime(),
            errorRate: this.getErrorRate(),
            cacheHitRatio: this.getCacheHitRatio(),
            cacheSize: this.getCacheSize(),
            cacheMisses: this.currentMetrics.cacheMisses,
            activeConnections: this.getActiveConnections(),
            queryTime: this.getQueryTime(),
            slowQueries: this.getSlowQueries(),
            activeBuildCount: this.getActiveBuildCount(),
            averageBuildTime: this.getAverageBuildTime(),
            buildQueueLength: this.getBuildQueueLength(),
            customMetrics: this.getCustomMetrics()
        };
        this.currentMetrics = metrics;
        this.metricsHistory.push(metrics);
        if (this.metricsHistory.length > 1000) {
            this.metricsHistory = this.metricsHistory.slice(-1000);
        }
        this.emit('metricsCollected', metrics);
    }
    getCPUUsage() {
        const cpus = os_1.default.cpus();
        let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
        for (const cpu of cpus) {
            user += cpu.times.user;
            nice += cpu.times.nice;
            sys += cpu.times.sys;
            idle += cpu.times.idle;
            irq += cpu.times.irq;
        }
        const total = user + nice + sys + idle + irq;
        const usage = ((total - idle) / total) * 100;
        return Math.round(usage * 100) / 100;
    }
    getMemoryUsage() {
        const totalMem = os_1.default.totalmem();
        const freeMem = os_1.default.freemem();
        const usedMem = totalMem - freeMem;
        return Math.round((usedMem / totalMem) * 100 * 100) / 100;
    }
    getDiskUsage() {
        return 45.5;
    }
    getNetworkIO() {
        return { in: 1024, out: 2048 };
    }
    getRequestsPerSecond() {
        return 150;
    }
    getAverageResponseTime() {
        return 245;
    }
    getP95ResponseTime() {
        return 450;
    }
    getP99ResponseTime() {
        return 800;
    }
    getErrorRate() {
        return 1.2;
    }
    getCacheHitRatio() {
        const totalRequests = this.cache.size + this.currentMetrics.cacheMisses;
        if (totalRequests === 0)
            return 0;
        return Math.round((this.cache.size / totalRequests) * 100 * 100) / 100;
    }
    getCacheSize() {
        return this.cache.size;
    }
    getCacheMemoryUsage() {
        let totalSize = 0;
        for (const entry of this.cache.values()) {
            totalSize += entry.size;
        }
        return totalSize;
    }
    getActiveConnections() {
        return 25;
    }
    getQueryTime() {
        return 15;
    }
    getSlowQueries() {
        return 2;
    }
    getActiveBuildCount() {
        return 3;
    }
    getAverageBuildTime() {
        return 180000;
    }
    getBuildQueueLength() {
        return 5;
    }
    getCustomMetrics() {
        return {};
    }
    calculateObjectSize(obj) {
        return JSON.stringify(obj).length * 2;
    }
    async evictCacheEntries() {
        const entries = Array.from(this.cache.entries());
        switch (this.config.caching.strategy) {
            case 'LRU':
                entries.sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());
                break;
            case 'LFU':
                entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
                break;
            case 'FIFO':
                break;
        }
        const toRemove = Math.ceil(entries.length * 0.25);
        for (let i = 0; i < toRemove; i++) {
            this.cache.delete(entries[i][0]);
        }
        logger.debug(`Evicted ${toRemove} cache entries`);
    }
    async performCacheWarmup() {
        logger.info('Performing cache warmup');
    }
    async performHealthChecks() {
        for (const [nodeId, node] of this.loadBalancerNodes) {
            try {
                const startTime = Date.now();
                const isHealthy = true;
                const responseTime = Date.now() - startTime;
                node.isHealthy = isHealthy;
                node.responseTime = responseTime;
                node.lastHealthCheck = new Date();
            }
            catch (error) {
                node.isHealthy = false;
                logger.warn(`Health check failed for node ${nodeId}:`, error);
            }
        }
    }
    getRoundRobinNode(nodes) {
        const sortedNodes = nodes.sort((a, b) => a.currentConnections - b.currentConnections);
        return sortedNodes[0];
    }
    getLeastConnectionsNode(nodes) {
        return nodes.reduce((min, node) => node.currentConnections < min.currentConnections ? node : min);
    }
    getWeightedRoundRobinNode(nodes) {
        const totalWeight = nodes.reduce((sum, node) => sum + node.weight, 0);
        const random = Math.random() * totalWeight;
        let currentWeight = 0;
        for (const node of nodes) {
            currentWeight += node.weight;
            if (random <= currentWeight) {
                return node;
            }
        }
        return nodes[0];
    }
    getLeastResponseTimeNode(nodes) {
        return nodes.reduce((fastest, node) => node.responseTime < fastest.responseTime ? node : fastest);
    }
    recordPerformanceMetric(operation, duration, status, metadata) {
        this.currentMetrics.customMetrics[`${operation}_duration`] = duration;
        this.currentMetrics.customMetrics[`${operation}_status`] = status === 'success' ? 1 : 0;
    }
    analyzeCachePerformance() {
        const recommendations = [];
        if (this.currentMetrics.cacheHitRatio < 80) {
            recommendations.push({
                category: 'cache',
                priority: 'high',
                title: 'Improve Cache Hit Ratio',
                description: `Current cache hit ratio is ${this.currentMetrics.cacheHitRatio}%, which is below optimal threshold of 80%`,
                expectedImpact: 'Reduce database load and improve response times',
                implementation: 'Review cache TTL settings and identify frequently accessed data for pre-warming',
                estimatedEffort: 'medium',
                potentialSavings: {
                    responseTime: 50,
                    throughput: 25
                }
            });
        }
        return recommendations;
    }
    analyzeResponseTimes() {
        const recommendations = [];
        if (this.currentMetrics.p95ResponseTime > 1000) {
            recommendations.push({
                category: 'code',
                priority: 'high',
                title: 'Optimize Response Times',
                description: `95th percentile response time is ${this.currentMetrics.p95ResponseTime}ms, exceeding acceptable threshold`,
                expectedImpact: 'Significantly improve user experience',
                implementation: 'Profile slow endpoints and optimize database queries',
                estimatedEffort: 'high',
                potentialSavings: {
                    responseTime: 200,
                    throughput: 15
                }
            });
        }
        return recommendations;
    }
    analyzeResourceUsage() {
        const recommendations = [];
        if (this.currentMetrics.cpuUsage > 80) {
            recommendations.push({
                category: 'scaling',
                priority: 'critical',
                title: 'Scale Up CPU Resources',
                description: `CPU usage is at ${this.currentMetrics.cpuUsage}%, indicating resource constraints`,
                expectedImpact: 'Prevent performance degradation and service outages',
                implementation: 'Increase instance size or add more instances',
                estimatedEffort: 'low',
                potentialSavings: {
                    throughput: 40,
                    cost: -10
                }
            });
        }
        return recommendations;
    }
    analyzeDatabasePerformance() {
        const recommendations = [];
        if (this.currentMetrics.slowQueries > 5) {
            recommendations.push({
                category: 'database',
                priority: 'high',
                title: 'Optimize Slow Database Queries',
                description: `${this.currentMetrics.slowQueries} slow queries detected`,
                expectedImpact: 'Reduce database load and improve response times',
                implementation: 'Add database indexes and optimize query patterns',
                estimatedEffort: 'medium',
                potentialSavings: {
                    responseTime: 100,
                    throughput: 20
                }
            });
        }
        return recommendations;
    }
    calculateOverallPerformanceScore(metrics) {
        if (metrics.length === 0)
            return 0;
        const latest = metrics[metrics.length - 1];
        let score = 100;
        if (latest.averageResponseTime > 500)
            score -= 20;
        if (latest.p95ResponseTime > 1000)
            score -= 15;
        score -= latest.errorRate * 10;
        if (latest.cpuUsage > 80)
            score -= 15;
        if (latest.memoryUsage > 80)
            score -= 10;
        if (latest.cacheHitRatio > 80)
            score += 5;
        return Math.max(0, Math.min(100, score));
    }
    calculateCategoryScores(metrics) {
        if (metrics.length === 0) {
            return {
                responseTime: 0,
                throughput: 0,
                availability: 0,
                scalability: 0,
                efficiency: 0
            };
        }
        const latest = metrics[metrics.length - 1];
        return {
            responseTime: Math.max(0, 100 - (latest.averageResponseTime / 10)),
            throughput: Math.min(100, latest.requestsPerSecond * 2),
            availability: Math.max(0, 100 - (latest.errorRate * 10)),
            scalability: Math.max(0, 100 - latest.cpuUsage),
            efficiency: latest.cacheHitRatio
        };
    }
    calculateTrends(metrics) {
        return {
            responseTime: metrics.map(m => m.averageResponseTime),
            throughput: metrics.map(m => m.requestsPerSecond),
            errorRate: metrics.map(m => m.errorRate)
        };
    }
    identifyBottlenecks(metrics) {
        const bottlenecks = [];
        if (metrics.length === 0)
            return bottlenecks;
        const latest = metrics[metrics.length - 1];
        if (latest.cpuUsage > 80) {
            bottlenecks.push('High CPU usage');
        }
        if (latest.memoryUsage > 80) {
            bottlenecks.push('High memory usage');
        }
        if (latest.slowQueries > 5) {
            bottlenecks.push('Slow database queries');
        }
        if (latest.cacheHitRatio < 70) {
            bottlenecks.push('Poor cache performance');
        }
        if (latest.p95ResponseTime > 1000) {
            bottlenecks.push('High response times');
        }
        return bottlenecks;
    }
    getStatus() {
        return {
            optimizationLevel: this.config.optimizationLevel,
            enabledFeatures: {
                autoScaling: this.config.enableAutoScaling,
                caching: this.config.enableCaching,
                loadBalancing: this.config.enableLoadBalancing,
                compression: this.config.enableCompressionOptimization,
                database: this.config.enableDatabaseOptimization,
                cdn: this.config.enableCDNOptimization,
                monitoring: this.config.enableRealTimeMonitoring
            },
            currentMetrics: this.getCurrentMetrics(),
            cacheStats: {
                size: this.cache.size,
                memoryUsage: this.getCacheMemoryUsage(),
                hitRatio: this.getCacheHitRatio()
            },
            loadBalancerNodes: Array.from(this.loadBalancerNodes.values()),
            recommendationsCount: this.optimizationRecommendations.length
        };
    }
    cleanup() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        this.cache.clear();
        this.loadBalancerNodes.clear();
        this.removeAllListeners();
        logger.info('Performance optimization service cleaned up');
    }
}
exports.PerformanceOptimizationService = PerformanceOptimizationService;
exports.default = PerformanceOptimizationService;
//# sourceMappingURL=PerformanceOptimizationService.js.map