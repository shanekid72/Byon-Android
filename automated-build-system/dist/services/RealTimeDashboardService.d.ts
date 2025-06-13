import { EventEmitter } from 'events';
import AnalyticsService from './AnalyticsService';
import PrometheusMetricsService from './PrometheusMetricsService';
export interface DashboardConfig {
    enableRealTimeUpdates: boolean;
    updateIntervalMs: number;
    maxClients: number;
    enableMetricsStreaming: boolean;
    enableBuildStreaming: boolean;
    enableAlertStreaming: boolean;
    enablePartnerStreaming: boolean;
    retentionWindowMs: number;
}
export interface RealTimeMetrics {
    timestamp: Date;
    builds: {
        active: number;
        queued: number;
        completedLast5Min: number;
        failedLast5Min: number;
        averageDuration: number;
    };
    system: {
        cpuUsage: number;
        memoryUsage: number;
        diskUsage: number;
        activeConnections: number;
    };
    partners: {
        active: number;
        totalBuildsToday: number;
        topPartners: Array<{
            partnerId: string;
            builds: number;
        }>;
    };
    assets: {
        processedLast5Min: number;
        averageProcessingTime: number;
        averageCompressionRatio: number;
        qualityScore: number;
    };
    alerts: Array<{
        id: string;
        type: string;
        severity: 'low' | 'medium' | 'high';
        message: string;
        timestamp: Date;
    }>;
}
export interface BuildStreamData {
    buildId: string;
    partnerId: string;
    status: 'started' | 'stage_completed' | 'completed' | 'failed';
    stage?: string;
    progress?: number;
    duration?: number;
    timestamp: Date;
}
export interface AlertStreamData {
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    source: string;
    timestamp: Date;
    resolved?: boolean;
}
export interface PartnerStreamData {
    partnerId: string;
    event: 'build_started' | 'build_completed' | 'quota_updated' | 'login';
    data: any;
    timestamp: Date;
}
export declare class RealTimeDashboardService extends EventEmitter {
    private config;
    private wss?;
    private server?;
    private clients;
    private analyticsService;
    private metricsService;
    private updateTimer?;
    private isRunning;
    private metricsCache;
    constructor(config: Partial<DashboardConfig>, analyticsService: AnalyticsService, metricsService: PrometheusMetricsService);
    start(port?: number): Promise<void>;
    stop(): Promise<void>;
    private handleConnection;
    private handleClientMessage;
    private sendInitialData;
    private setupEventListeners;
    private startMetricsStreaming;
    private broadcastMetricsUpdate;
    private getRealTimeMetrics;
    private broadcastToClients;
    private sendMessage;
    private sendMetricsUpdate;
    private sendBuildsUpdate;
    private handleSubscription;
    private handleUnsubscription;
    private getActiveBuildCount;
    private getQueuedBuildCount;
    private getSystemMetrics;
    private getPartnerMetrics;
    private getAssetMetrics;
    private getActiveAlerts;
    private getActiveBuilds;
    private getCompletedBuildsLast5Min;
    private getFailedBuildsLast5Min;
    private getAverageBuildDuration;
    getStatus(): any;
    getClientCount(): number;
    getConfig(): DashboardConfig;
}
export default RealTimeDashboardService;
//# sourceMappingURL=RealTimeDashboardService.d.ts.map