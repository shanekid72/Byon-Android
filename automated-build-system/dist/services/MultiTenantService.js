"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiTenantService = void 0;
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
const logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
    error: (msg, error) => console.error(`[ERROR] ${msg}`, error || ''),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
    debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta || ''),
    audit: (action, tenantId, details) => {
        console.log(`[AUDIT] ${action} for tenant ${tenantId}:`, details);
    }
};
class MultiTenantService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.tenants = new Map();
        this.tenantsBySlug = new Map();
        this.resourceQuotas = new Map();
        this.usageRecords = new Map();
        this.billingEvents = new Map();
        this.tenantMetrics = new Map();
        this.isolationPolicies = new Map();
        this.currentContexts = new Map();
        this.initializeMultiTenancy();
    }
    async initializeMultiTenancy() {
        logger.info('Initializing multi-tenant service');
        try {
            await this.loadTenants();
            if (this.config.enableResourceQuotas) {
                this.startResourceMonitoring();
            }
            if (this.config.enableUsageTracking) {
                this.startUsageTracking();
            }
            if (this.config.enableBilling) {
                this.startBillingEngine();
            }
            if (this.config.enableTenantAnalytics) {
                this.startMetricsCollection();
            }
            logger.info('Multi-tenant service initialized successfully');
            this.emit('multiTenantInitialized');
        }
        catch (error) {
            logger.error('Failed to initialize multi-tenant service:', error);
            throw error;
        }
    }
    async createTenant(tenantData) {
        try {
            const tenantId = crypto_1.default.randomUUID();
            const slug = this.generateTenantSlug(tenantData.name || tenantId);
            const tenant = {
                id: tenantId,
                name: tenantData.name || 'New Tenant',
                slug,
                tier: tenantData.tier || 'starter',
                status: tenantData.status || 'trial',
                isolationLevel: tenantData.isolationLevel || this.config.defaultIsolationLevel,
                primaryContact: tenantData.primaryContact || {
                    name: 'Admin User',
                    email: 'admin@example.com'
                },
                billing: tenantData.billing || {
                    model: 'subscription',
                    currency: 'USD',
                    billingEmail: tenantData.primaryContact?.email || 'billing@example.com'
                },
                config: {
                    timezone: 'UTC',
                    language: 'en',
                    features: [],
                    integrations: {},
                    ...tenantData.config
                },
                branding: tenantData.branding,
                quotas: {
                    buildsPerMonth: this.getQuotaForTier(tenantData.tier || 'starter').buildsPerMonth,
                    storageLimit: this.getQuotaForTier(tenantData.tier || 'starter').storageLimit,
                    apiCallsPerHour: this.getQuotaForTier(tenantData.tier || 'starter').apiCallsPerHour,
                    usersLimit: this.getQuotaForTier(tenantData.tier || 'starter').usersLimit,
                    customQuotas: {}
                },
                usage: {
                    currentPeriodBuilds: 0,
                    currentPeriodStorage: 0,
                    currentPeriodApiCalls: 0,
                    activeUsers: 0,
                    lastActivity: new Date()
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: tenantData.metadata || {}
            };
            this.tenants.set(tenantId, tenant);
            this.tenantsBySlug.set(slug, tenantId);
            if (this.config.enableTenantIsolation) {
                await this.setupTenantIsolation(tenant);
            }
            if (this.config.enableResourceQuotas) {
                await this.initializeTenantQuotas(tenant);
            }
            this.emit('tenantCreated', tenant);
            logger.audit('create_tenant', tenantId, { name: tenant.name, tier: tenant.tier });
            return tenant;
        }
        catch (error) {
            logger.error('Failed to create tenant:', error);
            throw error;
        }
    }
    async getTenant(tenantId) {
        return this.tenants.get(tenantId) || null;
    }
    async getTenantBySlug(slug) {
        const tenantId = this.tenantsBySlug.get(slug);
        return tenantId ? this.tenants.get(tenantId) || null : null;
    }
    async updateTenant(tenantId, updates) {
        const tenant = this.tenants.get(tenantId);
        if (!tenant) {
            throw new Error(`Tenant not found: ${tenantId}`);
        }
        const updatedTenant = {
            ...tenant,
            ...updates,
            updatedAt: new Date()
        };
        this.tenants.set(tenantId, updatedTenant);
        if (updates.name && updates.name !== tenant.name) {
            const newSlug = this.generateTenantSlug(updates.name);
            this.tenantsBySlug.delete(tenant.slug);
            this.tenantsBySlug.set(newSlug, tenantId);
            updatedTenant.slug = newSlug;
        }
        this.emit('tenantUpdated', updatedTenant);
        logger.audit('update_tenant', tenantId, updates);
        return updatedTenant;
    }
    async deleteTenant(tenantId, options = {}) {
        const tenant = this.tenants.get(tenantId);
        if (!tenant) {
            throw new Error(`Tenant not found: ${tenantId}`);
        }
        if (!options.force && tenant.status === 'active') {
            throw new Error('Cannot delete active tenant. Suspend first or use force option.');
        }
        await this.cleanupTenantData(tenantId);
        this.tenants.delete(tenantId);
        this.tenantsBySlug.delete(tenant.slug);
        this.resourceQuotas.delete(tenantId);
        this.usageRecords.delete(tenantId);
        this.billingEvents.delete(tenantId);
        this.tenantMetrics.delete(tenantId);
        this.isolationPolicies.delete(tenantId);
        this.emit('tenantDeleted', { tenantId, tenant });
        logger.audit('delete_tenant', tenantId, { name: tenant.name, force: options.force });
    }
    async listTenants(filters = {}) {
        let tenants = Array.from(this.tenants.values());
        if (filters.tier) {
            tenants = tenants.filter(t => t.tier === filters.tier);
        }
        if (filters.status) {
            tenants = tenants.filter(t => t.status === filters.status);
        }
        if (filters.search) {
            const search = filters.search.toLowerCase();
            tenants = tenants.filter(t => t.name.toLowerCase().includes(search) ||
                t.slug.toLowerCase().includes(search) ||
                t.primaryContact.email.toLowerCase().includes(search));
        }
        const totalCount = tenants.length;
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        tenants = tenants.slice(startIndex, endIndex);
        return {
            tenants,
            totalCount,
            page,
            limit,
            hasMore: endIndex < totalCount
        };
    }
    async createTenantContext(tenantId, userId, requestData) {
        const tenant = await this.getTenant(tenantId);
        if (!tenant) {
            throw new Error(`Tenant not found: ${tenantId}`);
        }
        const context = {
            tenantId,
            tenant,
            userId,
            requestId: requestData?.requestId || crypto_1.default.randomUUID(),
            ipAddress: requestData?.ipAddress,
            userAgent: requestData?.userAgent,
            timestamp: new Date()
        };
        this.currentContexts.set(context.requestId, context);
        if (this.currentContexts.size > 1000) {
            const contexts = Array.from(this.currentContexts.entries());
            contexts.sort(([, a], [, b]) => b.timestamp.getTime() - a.timestamp.getTime());
            this.currentContexts.clear();
            contexts.slice(0, 1000).forEach(([id, ctx]) => {
                this.currentContexts.set(id, ctx);
            });
        }
        return context;
    }
    getTenantContext(requestId) {
        return this.currentContexts.get(requestId) || null;
    }
    async checkResourceQuota(tenantId, resourceType, requestedQuantity = 1) {
        const quotas = this.resourceQuotas.get(tenantId) || [];
        const quota = quotas.find(q => q.resourceType === resourceType);
        if (!quota) {
            return { allowed: true, remaining: Infinity, limit: Infinity };
        }
        const remaining = Math.max(0, quota.limit - quota.used);
        const allowed = requestedQuantity <= remaining;
        return { allowed, remaining, limit: quota.limit };
    }
    async consumeResourceQuota(tenantId, resourceType, quantity = 1) {
        const quotas = this.resourceQuotas.get(tenantId) || [];
        const quotaIndex = quotas.findIndex(q => q.resourceType === resourceType);
        if (quotaIndex === -1) {
            const newQuota = {
                tenantId,
                resourceType,
                limit: this.getDefaultQuotaLimit(resourceType),
                used: quantity,
                resetPeriod: this.getQuotaResetPeriod(resourceType),
                lastReset: new Date(),
                alertThreshold: 80
            };
            quotas.push(newQuota);
            this.resourceQuotas.set(tenantId, quotas);
        }
        else {
            quotas[quotaIndex].used += quantity;
            const utilization = (quotas[quotaIndex].used / quotas[quotaIndex].limit) * 100;
            if (utilization >= quotas[quotaIndex].alertThreshold) {
                this.emit('quotaThresholdExceeded', {
                    tenantId,
                    resourceType,
                    utilization,
                    quota: quotas[quotaIndex]
                });
            }
        }
        if (this.config.enableUsageTracking) {
            await this.recordUsage(tenantId, resourceType, quantity);
        }
    }
    async recordUsage(tenantId, resourceType, quantity, metadata = {}) {
        const usageRecord = {
            id: crypto_1.default.randomUUID(),
            tenantId,
            resourceType,
            quantity,
            unit: this.getResourceUnit(resourceType),
            timestamp: new Date(),
            metadata,
            cost: this.calculateUsageCost(resourceType, quantity, tenantId),
            billable: this.isResourceBillable(resourceType, tenantId)
        };
        const records = this.usageRecords.get(tenantId) || [];
        records.push(usageRecord);
        this.usageRecords.set(tenantId, records);
        await this.updateTenantUsageStats(tenantId, resourceType, quantity);
        this.emit('usageRecorded', usageRecord);
        return usageRecord;
    }
    async getUsageRecords(tenantId, filters = {}) {
        let records = this.usageRecords.get(tenantId) || [];
        if (filters.resourceType) {
            records = records.filter(r => r.resourceType === filters.resourceType);
        }
        if (filters.startDate) {
            records = records.filter(r => r.timestamp >= filters.startDate);
        }
        if (filters.endDate) {
            records = records.filter(r => r.timestamp <= filters.endDate);
        }
        records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        if (filters.limit) {
            records = records.slice(0, filters.limit);
        }
        return records;
    }
    async calculateBilling(tenantId, period) {
        const tenant = await this.getTenant(tenantId);
        if (!tenant) {
            throw new Error(`Tenant not found: ${tenantId}`);
        }
        const usageRecords = await this.getUsageRecords(tenantId, {
            startDate: period.start,
            endDate: period.end
        });
        const billableRecords = usageRecords.filter(r => r.billable);
        const breakdown = new Map();
        for (const record of billableRecords) {
            const existing = breakdown.get(record.resourceType) || { quantity: 0, amount: 0 };
            existing.quantity += record.quantity;
            existing.amount += record.cost || 0;
            breakdown.set(record.resourceType, existing);
        }
        const breakdownArray = Array.from(breakdown.entries()).map(([resourceType, data]) => ({
            resourceType,
            quantity: data.quantity,
            rate: data.quantity > 0 ? data.amount / data.quantity : 0,
            amount: data.amount
        }));
        const totalAmount = breakdownArray.reduce((sum, item) => sum + item.amount, 0);
        return {
            totalAmount,
            currency: tenant.billing.currency,
            breakdown: breakdownArray
        };
    }
    async generateTenantReport(tenantId, period) {
        const tenant = await this.getTenant(tenantId);
        if (!tenant) {
            throw new Error(`Tenant not found: ${tenantId}`);
        }
        const usageRecords = await this.getUsageRecords(tenantId, {
            startDate: period.start,
            endDate: period.end
        });
        const billing = await this.calculateBilling(tenantId, period);
        const summary = {
            totalBuilds: usageRecords.filter(r => r.resourceType === 'builds').reduce((sum, r) => sum + r.quantity, 0),
            totalStorage: usageRecords.filter(r => r.resourceType === 'storage').reduce((sum, r) => sum + r.quantity, 0),
            totalApiCalls: usageRecords.filter(r => r.resourceType === 'api_calls').reduce((sum, r) => sum + r.quantity, 0),
            totalRevenue: billing.totalAmount,
            totalCosts: billing.totalAmount * 0.7,
            activeUsers: tenant.usage.activeUsers
        };
        const quotas = this.resourceQuotas.get(tenantId) || [];
        const quotaUsage = quotas.map(quota => ({
            resourceType: quota.resourceType,
            used: quota.used,
            limit: quota.limit,
            utilizationPercentage: Math.round((quota.used / quota.limit) * 100)
        }));
        const recommendations = this.generateTenantRecommendations(tenant, quotaUsage, summary);
        const report = {
            tenantId,
            reportPeriod: period,
            summary,
            quotaUsage,
            billing: {
                currentCharges: billing.totalAmount,
                projectedCharges: billing.totalAmount * 1.1,
                overageCharges: 0,
                credits: 0
            },
            recommendations
        };
        this.emit('tenantReportGenerated', report);
        return report;
    }
    async updateTenantBranding(tenantId, branding) {
        const tenant = await this.getTenant(tenantId);
        if (!tenant) {
            throw new Error(`Tenant not found: ${tenantId}`);
        }
        await this.updateTenant(tenantId, { branding });
        this.emit('tenantBrandingUpdated', { tenantId, branding });
        logger.audit('update_branding', tenantId, branding);
    }
    async getTenantBranding(tenantId) {
        const tenant = await this.getTenant(tenantId);
        return tenant?.branding || null;
    }
    async loadTenants() {
        logger.info('Loading existing tenants');
    }
    startResourceMonitoring() {
        setInterval(() => {
            this.checkResourceQuotas();
        }, 60000);
        setInterval(() => {
            this.resetExpiredQuotas();
        }, 3600000);
    }
    startUsageTracking() {
        setInterval(() => {
            this.aggregateUsageMetrics();
        }, 300000);
    }
    startBillingEngine() {
        setInterval(() => {
            this.processBillingEvents();
        }, 3600000);
    }
    startMetricsCollection() {
        setInterval(() => {
            this.collectTenantMetrics();
        }, 60000);
    }
    generateTenantSlug(name) {
        let slug = name.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
        let counter = 1;
        let originalSlug = slug;
        while (this.tenantsBySlug.has(slug)) {
            slug = `${originalSlug}-${counter}`;
            counter++;
        }
        return slug;
    }
    getQuotaForTier(tier) {
        const quotas = {
            starter: {
                buildsPerMonth: 100,
                storageLimit: 5,
                apiCallsPerHour: 1000,
                usersLimit: 5
            },
            professional: {
                buildsPerMonth: 500,
                storageLimit: 50,
                apiCallsPerHour: 10000,
                usersLimit: 25
            },
            enterprise: {
                buildsPerMonth: 2000,
                storageLimit: 500,
                apiCallsPerHour: 100000,
                usersLimit: 100
            },
            white_label: {
                buildsPerMonth: 10000,
                storageLimit: 2000,
                apiCallsPerHour: 1000000,
                usersLimit: 1000
            }
        };
        return quotas[tier] || quotas.starter;
    }
    async setupTenantIsolation(tenant) {
        const policy = {
            tenantId: tenant.id,
            isolationLevel: tenant.isolationLevel,
            data: {
                encryptionRequired: tenant.isolationLevel !== 'shared',
                separateDatabase: tenant.isolationLevel === 'dedicated_database' || tenant.isolationLevel === 'dedicated_infrastructure',
                separateSchema: tenant.isolationLevel === 'dedicated_schema' || tenant.isolationLevel === 'dedicated_database' || tenant.isolationLevel === 'dedicated_infrastructure',
                dataResidency: tenant.config.metadata?.dataResidency
            },
            network: {
                dedicatedVPC: tenant.isolationLevel === 'dedicated_infrastructure',
                firewallRules: [],
                allowedIPs: [],
                vpnRequired: tenant.tier === 'enterprise' || tenant.tier === 'white_label'
            },
            compute: {
                dedicatedInstances: tenant.isolationLevel === 'dedicated_infrastructure',
                resourceReservation: tenant.tier === 'enterprise' || tenant.tier === 'white_label',
                priorityLevel: this.getPriorityLevel(tenant.tier),
                affinityRules: []
            },
            storage: {
                dedicatedStorage: tenant.isolationLevel === 'dedicated_infrastructure',
                encryptionAtRest: true,
                backupIsolation: tenant.isolationLevel !== 'shared',
                compressionLevel: 6
            }
        };
        this.isolationPolicies.set(tenant.id, policy);
        logger.debug(`Tenant isolation policy created for ${tenant.id}`);
    }
    getPriorityLevel(tier) {
        switch (tier) {
            case 'starter': return 'low';
            case 'professional': return 'medium';
            case 'enterprise':
            case 'white_label': return 'high';
            default: return 'low';
        }
    }
    async initializeTenantQuotas(tenant) {
        const quotas = [
            {
                tenantId: tenant.id,
                resourceType: 'builds',
                limit: tenant.quotas.buildsPerMonth,
                used: 0,
                resetPeriod: 'monthly',
                lastReset: new Date(),
                alertThreshold: 80
            },
            {
                tenantId: tenant.id,
                resourceType: 'storage',
                limit: tenant.quotas.storageLimit,
                used: 0,
                resetPeriod: 'monthly',
                lastReset: new Date(),
                alertThreshold: 90
            },
            {
                tenantId: tenant.id,
                resourceType: 'api_calls',
                limit: tenant.quotas.apiCallsPerHour,
                used: 0,
                resetPeriod: 'hourly',
                lastReset: new Date(),
                alertThreshold: 75
            }
        ];
        this.resourceQuotas.set(tenant.id, quotas);
    }
    async cleanupTenantData(tenantId) {
        logger.info(`Cleaning up data for tenant ${tenantId}`);
    }
    checkResourceQuotas() {
        for (const [tenantId, quotas] of this.resourceQuotas) {
            for (const quota of quotas) {
                const utilization = (quota.used / quota.limit) * 100;
                if (utilization >= 100) {
                    this.emit('quotaExceeded', { tenantId, quota });
                }
                else if (utilization >= quota.alertThreshold) {
                    this.emit('quotaThresholdExceeded', { tenantId, quota, utilization });
                }
            }
        }
    }
    resetExpiredQuotas() {
        const now = new Date();
        for (const [tenantId, quotas] of this.resourceQuotas) {
            for (const quota of quotas) {
                const timeSinceReset = now.getTime() - quota.lastReset.getTime();
                let shouldReset = false;
                switch (quota.resetPeriod) {
                    case 'hourly':
                        shouldReset = timeSinceReset >= 3600000;
                        break;
                    case 'daily':
                        shouldReset = timeSinceReset >= 86400000;
                        break;
                    case 'monthly':
                        shouldReset = now.getMonth() !== quota.lastReset.getMonth();
                        break;
                }
                if (shouldReset) {
                    quota.used = 0;
                    quota.lastReset = now;
                    logger.debug(`Reset quota for tenant ${tenantId}, resource ${quota.resourceType}`);
                }
            }
        }
    }
    aggregateUsageMetrics() {
        logger.debug('Aggregating usage metrics');
    }
    processBillingEvents() {
        logger.debug('Processing billing events');
    }
    collectTenantMetrics() {
        for (const [tenantId, tenant] of this.tenants) {
            const metrics = {
                tenantId,
                timestamp: new Date(),
                buildsCount: tenant.usage.currentPeriodBuilds,
                storageUsed: tenant.usage.currentPeriodStorage,
                apiCalls: tenant.usage.currentPeriodApiCalls,
                activeUsers: tenant.usage.activeUsers,
                averageResponseTime: 250,
                errorRate: 0.5,
                uptime: 99.9,
                revenue: 0,
                costs: 0,
                profit: 0,
                customMetrics: {}
            };
            const existingMetrics = this.tenantMetrics.get(tenantId) || [];
            existingMetrics.push(metrics);
            if (existingMetrics.length > 1000) {
                existingMetrics.splice(0, existingMetrics.length - 1000);
            }
            this.tenantMetrics.set(tenantId, existingMetrics);
        }
    }
    getDefaultQuotaLimit(resourceType) {
        const defaults = {
            builds: this.config.quotas.defaultBuildsPerMonth,
            storage: this.config.quotas.defaultStorageLimit,
            api_calls: this.config.quotas.defaultApiCallsPerHour,
            users: this.config.quotas.defaultUsersPerTenant
        };
        return defaults[resourceType] || 100;
    }
    getQuotaResetPeriod(resourceType) {
        const periods = {
            builds: 'monthly',
            storage: 'monthly',
            api_calls: 'hourly',
            users: 'monthly'
        };
        return periods[resourceType] || 'monthly';
    }
    getResourceUnit(resourceType) {
        const units = {
            builds: 'build',
            storage: 'GB',
            api_calls: 'call',
            users: 'user'
        };
        return units[resourceType] || 'unit';
    }
    calculateUsageCost(resourceType, quantity, tenantId) {
        const tenant = this.tenants.get(tenantId);
        if (!tenant)
            return 0;
        const pricing = {
            starter: { builds: 0.10, storage: 0.05, api_calls: 0.001, users: 5.00 },
            professional: { builds: 0.08, storage: 0.04, api_calls: 0.0008, users: 4.00 },
            enterprise: { builds: 0.06, storage: 0.03, api_calls: 0.0005, users: 3.00 },
            white_label: { builds: 0.04, storage: 0.02, api_calls: 0.0003, users: 2.00 }
        };
        const tierPricing = pricing[tenant.tier] || pricing.starter;
        const unitPrice = tierPricing[resourceType] || 0;
        return quantity * unitPrice;
    }
    isResourceBillable(resourceType, tenantId) {
        const tenant = this.tenants.get(tenantId);
        if (!tenant)
            return false;
        if (tenant.status === 'trial')
            return false;
        return tenant.billing.model !== 'enterprise_contract';
    }
    async updateTenantUsageStats(tenantId, resourceType, quantity) {
        const tenant = this.tenants.get(tenantId);
        if (!tenant)
            return;
        switch (resourceType) {
            case 'builds':
                tenant.usage.currentPeriodBuilds += quantity;
                break;
            case 'storage':
                tenant.usage.currentPeriodStorage += quantity;
                break;
            case 'api_calls':
                tenant.usage.currentPeriodApiCalls += quantity;
                break;
        }
        tenant.usage.lastActivity = new Date();
        tenant.updatedAt = new Date();
    }
    generateTenantRecommendations(tenant, quotaUsage, summary) {
        const recommendations = [];
        const highUtilization = quotaUsage.filter(q => q.utilizationPercentage > 80);
        if (highUtilization.length > 0) {
            recommendations.push(`Consider upgrading your plan - ${highUtilization.length} resources are near quota limits`);
        }
        if (tenant.tier === 'starter' && summary.totalBuilds > 50) {
            recommendations.push('Consider upgrading to Professional tier for better value and higher limits');
        }
        if (summary.totalRevenue > 100) {
            recommendations.push('Enable auto-scaling to optimize costs based on actual usage patterns');
        }
        return recommendations;
    }
    getStatus() {
        return {
            config: {
                defaultIsolationLevel: this.config.defaultIsolationLevel,
                enabledFeatures: {
                    tenantIsolation: this.config.enableTenantIsolation,
                    resourceQuotas: this.config.enableResourceQuotas,
                    usageTracking: this.config.enableUsageTracking,
                    billing: this.config.enableBilling,
                    whiteLabeling: this.config.enableWhiteLabeling,
                    analytics: this.config.enableTenantAnalytics,
                    customDomains: this.config.enableCustomDomains
                }
            },
            tenants: {
                totalCount: this.tenants.size,
                byTier: this.getTenantCountsByTier(),
                byStatus: this.getTenantCountsByStatus()
            },
            resourceQuotas: {
                totalQuotas: Array.from(this.resourceQuotas.values()).reduce((sum, quotas) => sum + quotas.length, 0),
                activeAlerts: this.getActiveQuotaAlerts()
            },
            usageRecords: {
                totalRecords: Array.from(this.usageRecords.values()).reduce((sum, records) => sum + records.length, 0)
            },
            billing: {
                totalRevenue: this.calculateTotalRevenue(),
                activeSubscriptions: this.getActiveSubscriptionCount()
            }
        };
    }
    getTenantCountsByTier() {
        const counts = { starter: 0, professional: 0, enterprise: 0, white_label: 0 };
        for (const tenant of this.tenants.values()) {
            counts[tenant.tier]++;
        }
        return counts;
    }
    getTenantCountsByStatus() {
        const counts = { active: 0, suspended: 0, trial: 0, archived: 0, migrating: 0 };
        for (const tenant of this.tenants.values()) {
            counts[tenant.status]++;
        }
        return counts;
    }
    getActiveQuotaAlerts() {
        let alertCount = 0;
        for (const quotas of this.resourceQuotas.values()) {
            for (const quota of quotas) {
                const utilization = (quota.used / quota.limit) * 100;
                if (utilization >= quota.alertThreshold) {
                    alertCount++;
                }
            }
        }
        return alertCount;
    }
    calculateTotalRevenue() {
        let total = 0;
        for (const events of this.billingEvents.values()) {
            total += events.filter(e => e.eventType === 'usage' || e.eventType === 'subscription').reduce((sum, e) => sum + e.amount, 0);
        }
        return total;
    }
    getActiveSubscriptionCount() {
        return Array.from(this.tenants.values()).filter(t => t.status === 'active' && t.billing.subscriptionId).length;
    }
    cleanup() {
        this.tenants.clear();
        this.tenantsBySlug.clear();
        this.resourceQuotas.clear();
        this.usageRecords.clear();
        this.billingEvents.clear();
        this.tenantMetrics.clear();
        this.isolationPolicies.clear();
        this.currentContexts.clear();
        this.removeAllListeners();
        logger.info('Multi-tenant service cleaned up');
    }
}
exports.MultiTenantService = MultiTenantService;
exports.default = MultiTenantService;
//# sourceMappingURL=MultiTenantService.js.map