import { EventEmitter } from 'events';
export interface AnalyticsConfig {
    enableRealTimeAnalytics: boolean;
    enableBuildMetrics: boolean;
    enablePartnerAnalytics: boolean;
    enableAssetAnalytics: boolean;
    enableSystemMetrics: boolean;
    dataRetentionDays: number;
    aggregationIntervalMs: number;
    redisKeyPrefix: string;
}
export interface BuildMetrics {
    buildId: string;
    partnerId: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    stages: {
        templateProcessing: number;
        assetProcessing: number;
        assetInjection: number;
        codeGeneration: number;
        androidBuild: number;
        packaging: number;
    };
    assets: {
        totalAssets: number;
        processedAssets: number;
        failedAssets: number;
        totalSizeMB: number;
        optimizedSizeMB: number;
    };
    errors: string[];
    warnings: string[];
}
export interface PartnerMetrics {
    partnerId: string;
    partnerName: string;
    totalBuilds: number;
    successfulBuilds: number;
    failedBuilds: number;
    averageBuildTime: number;
    totalAssetsProcessed: number;
    lastBuildTime: Date;
    subscriptionTier: string;
    usageQuota: {
        buildsUsed: number;
        buildsLimit: number;
        storageUsedMB: number;
        storageLimitMB: number;
    };
}
export interface AssetMetrics {
    assetId: string;
    partnerId: string;
    type: string;
    originalSizeMB: number;
    processedSizeMB: number;
    compressionRatio: number;
    qualityScore: number;
    processingTime: number;
    format: string;
    density?: string;
    createdAt: Date;
    lastAccessedAt: Date;
}
export interface SystemMetrics {
    timestamp: Date;
    cpu: {
        usage: number;
        cores: number;
        loadAverage: number[];
    };
    memory: {
        totalMB: number;
        usedMB: number;
        freeMB: number;
        heapUsedMB: number;
        heapTotalMB: number;
    };
    disk: {
        totalGB: number;
        usedGB: number;
        freeGB: number;
    };
    network: {
        bytesIn: number;
        bytesOut: number;
        connectionsActive: number;
    };
    application: {
        activeBuilds: number;
        queueLength: number;
        uptime: number;
        restarts: number;
    };
}
export interface AnalyticsDashboard {
    overview: {
        totalBuilds: number;
        totalPartners: number;
        totalAssets: number;
        averageBuildTime: number;
        systemUptime: number;
        successRate: number;
    };
    buildTrends: {
        dailyBuilds: Array<{
            date: string;
            count: number;
            success: number;
            failed: number;
        }>;
        hourlyBuilds: Array<{
            hour: number;
            count: number;
        }>;
        averageProcessingTime: Array<{
            date: string;
            timeMs: number;
        }>;
    };
    partnerActivity: {
        topPartners: Array<{
            partnerId: string;
            partnerName: string;
            builds: number;
        }>;
        newPartners: Array<{
            partnerId: string;
            partnerName: string;
            joinDate: Date;
        }>;
        activePartners: number;
    };
    assetInsights: {
        totalAssetsProcessed: number;
        averageCompressionRatio: number;
        averageQualityScore: number;
        formatDistribution: Record<string, number>;
        densityDistribution: Record<string, number>;
    };
    systemHealth: {
        currentMetrics: SystemMetrics;
        alerts: Array<{
            type: string;
            message: string;
            severity: 'low' | 'medium' | 'high';
            timestamp: Date;
        }>;
        performanceTrends: Array<{
            timestamp: Date;
            cpu: number;
            memory: number;
            disk: number;
        }>;
    };
}
export declare class AnalyticsService extends EventEmitter {
    private redis;
    private config;
    private metricsCollection;
    private alertThresholds;
    private aggregationTimer?;
    constructor(config?: Partial<AnalyticsConfig>);
    private initialize;
    recordBuildMetrics(metrics: BuildMetrics): Promise<void>;
    recordPartnerMetrics(metrics: PartnerMetrics): Promise<void>;
    recordAssetMetrics(metrics: AssetMetrics): Promise<void>;
    recordSystemMetrics(metrics: SystemMetrics): Promise<void>;
    getDashboardData(): Promise<AnalyticsDashboard>;
    getRealTimeMetrics(): Promise<any>;
    exportAnalytics(format: 'json' | 'csv', dateRange: {
        from: Date;
        to: Date;
    }): Promise<string>;
    private updateBuildAggregates;
    private updatePartnerAggregates;
    private updateAssetAggregates;
    private checkSystemAlerts;
    private startMetricsAggregation;
    private startSystemMetricsCollection;
    private collectSystemMetrics;
    private getCpuUsage;
    private getActiveBuildCount;
    private getBuildQueueLength;
    private setupDataRetentionCleanup;
    private cleanupExpiredData;
    private getOverviewMetrics;
    private getBuildTrends;
    private getPartnerActivity;
    private getAssetInsights;
    private getSystemHealth;
    private aggregateMetrics;
    private getRecentBuilds;
    private getActiveBuilds;
    private getCurrentSystemMetrics;
    private getActiveAlerts;
    private getAnalyticsData;
    private convertToCsv;
    destroy(): Promise<void>;
}
export default AnalyticsService;
//# sourceMappingURL=AnalyticsService.d.ts.map