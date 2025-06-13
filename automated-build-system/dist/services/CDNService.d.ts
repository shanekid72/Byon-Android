import { EventEmitter } from 'events';
import CloudStorageService from './CloudStorageService';
export type CDNProvider = 'cloudflare' | 'aws-cloudfront' | 'azure-cdn' | 'gcp-cdn';
export type CacheStrategy = 'aggressive' | 'standard' | 'conservative' | 'dynamic';
export type EdgeLocation = 'global' | 'us-east' | 'us-west' | 'eu-west' | 'ap-southeast';
export interface CDNConfig {
    provider: CDNProvider;
    enableEdgeOptimization: boolean;
    enableImageOptimization: boolean;
    enableCompression: boolean;
    enableGeoRouting: boolean;
    defaultCacheTTL: number;
    enablePurging: boolean;
    enableAnalytics: boolean;
    cloudflare?: {
        zoneId: string;
        apiToken: string;
        customDomain?: string;
    };
    awsCloudFront?: {
        distributionId: string;
        domain: string;
        accessKeyId: string;
        secretAccessKey: string;
    };
    azureCDN?: {
        profileName: string;
        endpointName: string;
        resourceGroup: string;
        subscriptionId: string;
    };
    gcpCDN?: {
        projectId: string;
        loadBalancerName: string;
        serviceAccount: string;
    };
}
export interface CachePolicy {
    ttl: number;
    strategy: CacheStrategy;
    varyHeaders: string[];
    enableCompression: boolean;
    enableBrotli: boolean;
}
export interface EdgeRule {
    pattern: string;
    cachePolicy: CachePolicy;
    redirects?: {
        from: string;
        to: string;
        statusCode: number;
    }[];
    headers?: {
        name: string;
        value: string;
    }[];
    geoBlocking?: {
        allowedCountries?: string[];
        blockedCountries?: string[];
    };
}
export interface CDNAnalytics {
    requests: {
        total: number;
        cached: number;
        origin: number;
        hitRatio: number;
    };
    bandwidth: {
        total: number;
        saved: number;
        efficiency: number;
    };
    performance: {
        averageResponseTime: number;
        p95ResponseTime: number;
        uptime: number;
    };
    geography: Record<string, {
        requests: number;
        bandwidth: number;
    }>;
    topFiles: Array<{
        url: string;
        requests: number;
        bandwidth: number;
    }>;
}
export interface PurgeResult {
    success: boolean;
    purgedUrls: string[];
    invalidationId?: string;
    estimatedTime?: number;
}
export declare class CDNService extends EventEmitter {
    private config;
    private storageService;
    private edgeRules;
    private cacheStats;
    constructor(config: CDNConfig, storageService: CloudStorageService);
    private initializeCDN;
    getCDNUrl(assetKey: string, options?: {
        format?: 'webp' | 'avif' | 'original';
        quality?: number;
        width?: number;
        height?: number;
        fit?: 'cover' | 'contain' | 'fill';
        region?: EdgeLocation;
    }): string;
    purgeCache(urls: string[] | string, options?: {
        purgeEverything?: boolean;
        tags?: string[];
        hostnames?: string[];
    }): Promise<PurgeResult>;
    addEdgeRule(name: string, rule: EdgeRule): void;
    removeEdgeRule(name: string): void;
    getAnalytics(timeRange: {
        from: Date;
        to: Date;
    }): Promise<CDNAnalytics>;
    preloadAssets(assetKeys: string[], regions?: EdgeLocation[]): Promise<void>;
    setupSecurityPolicies(policies: {
        enableHSTS?: boolean;
        enableCSP?: boolean;
        enableCORS?: boolean;
        allowedOrigins?: string[];
        blockedCountries?: string[];
        rateLimiting?: {
            requestsPerMinute: number;
            windowSize: number;
        };
    }): Promise<void>;
    private initializeCloudflare;
    private initializeCloudFront;
    private initializeAzureCDN;
    private initializeGCPCDN;
    private purgeCloudflare;
    private purgeCloudFront;
    private purgeAzureCDN;
    private purgeGCPCDN;
    private getCloudflareAnalytics;
    private getCloudFrontAnalytics;
    private getAzureCDNAnalytics;
    private getGCPCDNAnalytics;
    private generateMockAnalytics;
    private preloadAssetToRegion;
    private applyEdgeRule;
    private removeEdgeRuleFromProvider;
    private setupCloudflareSecurityPolicies;
    private setupCloudFrontSecurityPolicies;
    private setupDefaultRules;
    private getBaseURL;
    private isImageAsset;
    getStatus(): {
        provider: CDNProvider;
        baseUrl: string;
        edgeRules: {
            [k: string]: EdgeRule;
        };
        config: {
            enableEdgeOptimization: boolean;
            enableImageOptimization: boolean;
            enableCompression: boolean;
            defaultCacheTTL: number;
        };
    };
}
export default CDNService;
//# sourceMappingURL=CDNService.d.ts.map