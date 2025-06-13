import { EventEmitter } from 'events';
export type TenantTier = 'starter' | 'professional' | 'enterprise' | 'white_label';
export type IsolationLevel = 'shared' | 'dedicated_schema' | 'dedicated_database' | 'dedicated_infrastructure';
export type BillingModel = 'usage_based' | 'subscription' | 'hybrid' | 'enterprise_contract';
export type TenantStatus = 'active' | 'suspended' | 'trial' | 'archived' | 'migrating';
export interface MultiTenantConfig {
    defaultIsolationLevel: IsolationLevel;
    enableTenantIsolation: boolean;
    enableResourceQuotas: boolean;
    enableUsageTracking: boolean;
    enableBilling: boolean;
    enableWhiteLabeling: boolean;
    enableTenantAnalytics: boolean;
    enableCustomDomains: boolean;
    isolation: {
        enableDataEncryption: boolean;
        enableNetworkIsolation: boolean;
        enableComputeIsolation: boolean;
        enableStorageIsolation: boolean;
    };
    quotas: {
        defaultBuildsPerMonth: number;
        defaultStorageLimit: number;
        defaultApiCallsPerHour: number;
        defaultUsersPerTenant: number;
    };
    billing: {
        enableUsageMetering: boolean;
        enableBillingAlerts: boolean;
        billingCycle: 'monthly' | 'quarterly' | 'yearly';
        enableOverageCharges: boolean;
    };
}
export interface Tenant {
    id: string;
    name: string;
    slug: string;
    tier: TenantTier;
    status: TenantStatus;
    isolationLevel: IsolationLevel;
    primaryContact: {
        name: string;
        email: string;
        phone?: string;
    };
    billing: {
        model: BillingModel;
        currency: string;
        billingEmail: string;
        paymentMethodId?: string;
        subscriptionId?: string;
    };
    config: {
        customDomain?: string;
        timezone: string;
        language: string;
        features: string[];
        integrations: Record<string, any>;
    };
    branding?: {
        logo?: string;
        primaryColor: string;
        secondaryColor: string;
        favicon?: string;
        customCss?: string;
        companyName: string;
    };
    quotas: {
        buildsPerMonth: number;
        storageLimit: number;
        apiCallsPerHour: number;
        usersLimit: number;
        customQuotas: Record<string, number>;
    };
    usage: {
        currentPeriodBuilds: number;
        currentPeriodStorage: number;
        currentPeriodApiCalls: number;
        activeUsers: number;
        lastActivity: Date;
    };
    createdAt: Date;
    updatedAt: Date;
    lastBillingDate?: Date;
    trialEndsAt?: Date;
    metadata: Record<string, any>;
}
export interface TenantContext {
    tenantId: string;
    tenant: Tenant;
    userId?: string;
    requestId: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
}
export interface ResourceQuota {
    tenantId: string;
    resourceType: string;
    limit: number;
    used: number;
    resetPeriod: 'hourly' | 'daily' | 'monthly';
    lastReset: Date;
    alertThreshold: number;
}
export interface UsageRecord {
    id: string;
    tenantId: string;
    resourceType: string;
    quantity: number;
    unit: string;
    timestamp: Date;
    metadata: Record<string, any>;
    cost?: number;
    billable: boolean;
}
export interface BillingEvent {
    id: string;
    tenantId: string;
    eventType: 'usage' | 'subscription' | 'payment' | 'refund' | 'credit';
    amount: number;
    currency: string;
    description: string;
    timestamp: Date;
    metadata: Record<string, any>;
}
export interface TenantMetrics {
    tenantId: string;
    timestamp: Date;
    buildsCount: number;
    storageUsed: number;
    apiCalls: number;
    activeUsers: number;
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
    revenue: number;
    costs: number;
    profit: number;
    customMetrics: Record<string, number>;
}
export interface TenantReport {
    tenantId: string;
    reportPeriod: {
        start: Date;
        end: Date;
    };
    summary: {
        totalBuilds: number;
        totalStorage: number;
        totalApiCalls: number;
        totalRevenue: number;
        totalCosts: number;
        activeUsers: number;
    };
    quotaUsage: Array<{
        resourceType: string;
        used: number;
        limit: number;
        utilizationPercentage: number;
    }>;
    billing: {
        currentCharges: number;
        projectedCharges: number;
        overageCharges: number;
        credits: number;
    };
    recommendations: string[];
}
export interface TenantIsolationPolicy {
    tenantId: string;
    isolationLevel: IsolationLevel;
    data: {
        encryptionRequired: boolean;
        separateDatabase: boolean;
        separateSchema: boolean;
        dataResidency?: string;
    };
    network: {
        dedicatedVPC: boolean;
        firewallRules: string[];
        allowedIPs: string[];
        vpnRequired: boolean;
    };
    compute: {
        dedicatedInstances: boolean;
        resourceReservation: boolean;
        priorityLevel: 'low' | 'medium' | 'high';
        affinityRules: string[];
    };
    storage: {
        dedicatedStorage: boolean;
        encryptionAtRest: boolean;
        backupIsolation: boolean;
        compressionLevel: number;
    };
}
export declare class MultiTenantService extends EventEmitter {
    private config;
    private tenants;
    private tenantsBySlug;
    private resourceQuotas;
    private usageRecords;
    private billingEvents;
    private tenantMetrics;
    private isolationPolicies;
    private currentContexts;
    constructor(config: MultiTenantConfig);
    private initializeMultiTenancy;
    createTenant(tenantData: Partial<Tenant>): Promise<Tenant>;
    getTenant(tenantId: string): Promise<Tenant | null>;
    getTenantBySlug(slug: string): Promise<Tenant | null>;
    updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant>;
    deleteTenant(tenantId: string, options?: {
        force?: boolean;
    }): Promise<void>;
    listTenants(filters?: {
        tier?: TenantTier;
        status?: TenantStatus;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        tenants: Tenant[];
        totalCount: number;
        page: number;
        limit: number;
        hasMore: boolean;
    }>;
    createTenantContext(tenantId: string, userId?: string, requestData?: {
        requestId?: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<TenantContext>;
    getTenantContext(requestId: string): TenantContext | null;
    checkResourceQuota(tenantId: string, resourceType: string, requestedQuantity?: number): Promise<{
        allowed: boolean;
        remaining: number;
        limit: number;
    }>;
    consumeResourceQuota(tenantId: string, resourceType: string, quantity?: number): Promise<void>;
    recordUsage(tenantId: string, resourceType: string, quantity: number, metadata?: Record<string, any>): Promise<UsageRecord>;
    getUsageRecords(tenantId: string, filters?: {
        resourceType?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Promise<UsageRecord[]>;
    calculateBilling(tenantId: string, period: {
        start: Date;
        end: Date;
    }): Promise<{
        totalAmount: number;
        currency: string;
        breakdown: Array<{
            resourceType: string;
            quantity: number;
            rate: number;
            amount: number;
        }>;
    }>;
    generateTenantReport(tenantId: string, period: {
        start: Date;
        end: Date;
    }): Promise<TenantReport>;
    updateTenantBranding(tenantId: string, branding: Tenant['branding']): Promise<void>;
    getTenantBranding(tenantId: string): Promise<Tenant['branding'] | null>;
    private loadTenants;
    private startResourceMonitoring;
    private startUsageTracking;
    private startBillingEngine;
    private startMetricsCollection;
    private generateTenantSlug;
    private getQuotaForTier;
    private setupTenantIsolation;
    private getPriorityLevel;
    private initializeTenantQuotas;
    private cleanupTenantData;
    private checkResourceQuotas;
    private resetExpiredQuotas;
    private aggregateUsageMetrics;
    private processBillingEvents;
    private collectTenantMetrics;
    private getDefaultQuotaLimit;
    private getQuotaResetPeriod;
    private getResourceUnit;
    private calculateUsageCost;
    private isResourceBillable;
    private updateTenantUsageStats;
    private generateTenantRecommendations;
    getStatus(): {
        config: {
            defaultIsolationLevel: IsolationLevel;
            enabledFeatures: {
                tenantIsolation: boolean;
                resourceQuotas: boolean;
                usageTracking: boolean;
                billing: boolean;
                whiteLabeling: boolean;
                analytics: boolean;
                customDomains: boolean;
            };
        };
        tenants: {
            totalCount: number;
            byTier: {
                starter: number;
                professional: number;
                enterprise: number;
                white_label: number;
            };
            byStatus: {
                active: number;
                suspended: number;
                trial: number;
                archived: number;
                migrating: number;
            };
        };
        resourceQuotas: {
            totalQuotas: number;
            activeAlerts: number;
        };
        usageRecords: {
            totalRecords: number;
        };
        billing: {
            totalRevenue: number;
            activeSubscriptions: number;
        };
    };
    private getTenantCountsByTier;
    private getTenantCountsByStatus;
    private getActiveQuotaAlerts;
    private calculateTotalRevenue;
    private getActiveSubscriptionCount;
    cleanup(): void;
}
export default MultiTenantService;
//# sourceMappingURL=MultiTenantService.d.ts.map