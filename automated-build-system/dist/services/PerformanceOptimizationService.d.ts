import { EventEmitter } from 'events';
export type CacheStrategy = 'LRU' | 'LFU' | 'FIFO' | 'TTL' | 'ADAPTIVE';
export type LoadBalancingAlgorithm = 'round_robin' | 'least_connections' | 'weighted_round_robin' | 'ip_hash' | 'least_response_time';
export type ScalingStrategy = 'cpu_based' | 'memory_based' | 'request_based' | 'predictive' | 'hybrid';
export type OptimizationLevel = 'basic' | 'standard' | 'aggressive' | 'maximum';
export interface PerformanceConfig {
    optimizationLevel: OptimizationLevel;
    enableAutoScaling: boolean;
    enableCaching: boolean;
    enableLoadBalancing: boolean;
    enableCompressionOptimization: boolean;
    enableDatabaseOptimization: boolean;
    enableCDNOptimization: boolean;
    enableRealTimeMonitoring: boolean;
    caching: {
        strategy: CacheStrategy;
        maxMemoryUsage: number;
        defaultTTL: number;
        enableDistributedCache: boolean;
        enableCacheWarmup: boolean;
    };
    scaling: {
        strategy: ScalingStrategy;
        minInstances: number;
        maxInstances: number;
        cpuThreshold: number;
        memoryThreshold: number;
        requestThreshold: number;
        cooldownPeriod: number;
    };
    loadBalancing: {
        algorithm: LoadBalancingAlgorithm;
        healthCheckInterval: number;
        maxRetries: number;
        timeoutMs: number;
    };
    database: {
        enableConnectionPooling: boolean;
        maxConnections: number;
        enableQueryOptimization: boolean;
        enableIndexOptimization: boolean;
        enableReadReplicas: boolean;
    };
    compression: {
        enableGzip: boolean;
        enableBrotli: boolean;
        compressionLevel: number;
        minFileSizeForCompression: number;
    };
}
export interface PerformanceMetrics {
    timestamp: Date;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIO: {
        in: number;
        out: number;
    };
    requestsPerSecond: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    cacheHitRatio: number;
    cacheSize: number;
    cacheMisses: number;
    activeConnections: number;
    queryTime: number;
    slowQueries: number;
    activeBuildCount: number;
    averageBuildTime: number;
    buildQueueLength: number;
    customMetrics: Record<string, number>;
}
export interface CacheEntry<T = any> {
    key: string;
    value: T;
    ttl: number;
    accessCount: number;
    lastAccessed: Date;
    size: number;
}
export interface LoadBalancerNode {
    id: string;
    url: string;
    weight: number;
    isHealthy: boolean;
    currentConnections: number;
    responseTime: number;
    lastHealthCheck: Date;
}
export interface OptimizationRecommendation {
    category: 'cache' | 'database' | 'scaling' | 'compression' | 'cdn' | 'code';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    expectedImpact: string;
    implementation: string;
    estimatedEffort: 'low' | 'medium' | 'high';
    potentialSavings: {
        responseTime?: number;
        throughput?: number;
        cost?: number;
    };
}
export interface PerformanceReport {
    reportDate: Date;
    overallScore: number;
    categories: {
        responseTime: number;
        throughput: number;
        availability: number;
        scalability: number;
        efficiency: number;
    };
    recommendations: OptimizationRecommendation[];
    trends: {
        responseTime: number[];
        throughput: number[];
        errorRate: number[];
    };
    bottlenecks: string[];
}
export declare class PerformanceOptimizationService extends EventEmitter {
    private config;
    private metricsHistory;
    private cache;
    private loadBalancerNodes;
    private currentMetrics;
    private optimizationRecommendations;
    private performanceTuners;
    private monitoringInterval;
    constructor(config: PerformanceConfig);
    private initializePerformanceOptimization;
    setCache<T>(key: string, value: T, ttl?: number): Promise<void>;
    getCache<T>(key: string): Promise<T | null>;
    invalidateCache(pattern?: string): Promise<void>;
    addLoadBalancerNode(node: Omit<LoadBalancerNode, 'isHealthy' | 'currentConnections' | 'responseTime' | 'lastHealthCheck'>): void;
    removeLoadBalancerNode(nodeId: string): void;
    getOptimalNode(): LoadBalancerNode | null;
    measurePerformance<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T>;
    getCurrentMetrics(): PerformanceMetrics;
    getMetricsHistory(startDate?: Date, endDate?: Date, limit?: number): PerformanceMetrics[];
    analyzePerformance(): Promise<OptimizationRecommendation[]>;
    generatePerformanceReport(): Promise<PerformanceReport>;
    private checkScalingNeeds;
    private scaleUp;
    private scaleDown;
    private initializeMetrics;
    private initializeCaching;
    private initializeLoadBalancing;
    private initializeAutoScaling;
    private initializeDatabaseOptimization;
    private initializePerformanceTuners;
    private initializeCompressionTuner;
    private initializeCDNTuner;
    private startPerformanceMonitoring;
    private collectMetrics;
    private getCPUUsage;
    private getMemoryUsage;
    private getDiskUsage;
    private getNetworkIO;
    private getRequestsPerSecond;
    private getAverageResponseTime;
    private getP95ResponseTime;
    private getP99ResponseTime;
    private getErrorRate;
    private getCacheHitRatio;
    private getCacheSize;
    private getCacheMemoryUsage;
    private getActiveConnections;
    private getQueryTime;
    private getSlowQueries;
    private getActiveBuildCount;
    private getAverageBuildTime;
    private getBuildQueueLength;
    private getCustomMetrics;
    private calculateObjectSize;
    private evictCacheEntries;
    private performCacheWarmup;
    private performHealthChecks;
    private getRoundRobinNode;
    private getLeastConnectionsNode;
    private getWeightedRoundRobinNode;
    private getLeastResponseTimeNode;
    private recordPerformanceMetric;
    private analyzeCachePerformance;
    private analyzeResponseTimes;
    private analyzeResourceUsage;
    private analyzeDatabasePerformance;
    private calculateOverallPerformanceScore;
    private calculateCategoryScores;
    private calculateTrends;
    private identifyBottlenecks;
    getStatus(): {
        optimizationLevel: OptimizationLevel;
        enabledFeatures: {
            autoScaling: boolean;
            caching: boolean;
            loadBalancing: boolean;
            compression: boolean;
            database: boolean;
            cdn: boolean;
            monitoring: boolean;
        };
        currentMetrics: PerformanceMetrics;
        cacheStats: {
            size: number;
            memoryUsage: number;
            hitRatio: number;
        };
        loadBalancerNodes: LoadBalancerNode[];
        recommendationsCount: number;
    };
    cleanup(): void;
}
export default PerformanceOptimizationService;
//# sourceMappingURL=PerformanceOptimizationService.d.ts.map