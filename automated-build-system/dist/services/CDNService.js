"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDNService = void 0;
const events_1 = require("events");
const logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
    error: (msg, error) => console.error(`[ERROR] ${msg}`, error || ''),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
    debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta || '')
};
class CDNService extends events_1.EventEmitter {
    constructor(config, storageService) {
        super();
        this.config = config;
        this.storageService = storageService;
        this.edgeRules = new Map();
        this.cacheStats = new Map();
        this.initializeCDN();
        this.setupDefaultRules();
    }
    async initializeCDN() {
        logger.info(`Initializing CDN service with provider: ${this.config.provider}`);
        try {
            switch (this.config.provider) {
                case 'cloudflare':
                    await this.initializeCloudflare();
                    break;
                case 'aws-cloudfront':
                    await this.initializeCloudFront();
                    break;
                case 'azure-cdn':
                    await this.initializeAzureCDN();
                    break;
                case 'gcp-cdn':
                    await this.initializeGCPCDN();
                    break;
                default:
                    throw new Error(`Unsupported CDN provider: ${this.config.provider}`);
            }
            logger.info('CDN service initialized successfully');
            this.emit('initialized');
        }
        catch (error) {
            logger.error('Failed to initialize CDN service:', error);
            throw error;
        }
    }
    getCDNUrl(assetKey, options = {}) {
        const baseUrl = this.getBaseURL();
        let url = `${baseUrl}/${assetKey}`;
        if (this.config.enableImageOptimization && this.isImageAsset(assetKey)) {
            const params = new URLSearchParams();
            if (options.format && options.format !== 'original') {
                params.append('format', options.format);
            }
            if (options.quality) {
                params.append('quality', options.quality.toString());
            }
            if (options.width) {
                params.append('width', options.width.toString());
            }
            if (options.height) {
                params.append('height', options.height.toString());
            }
            if (options.fit) {
                params.append('fit', options.fit);
            }
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
        }
        return url;
    }
    async purgeCache(urls, options = {}) {
        logger.info('Purging CDN cache', { urls, options });
        try {
            let result;
            switch (this.config.provider) {
                case 'cloudflare':
                    result = await this.purgeCloudflare(urls, options);
                    break;
                case 'aws-cloudfront':
                    result = await this.purgeCloudFront(urls, options);
                    break;
                case 'azure-cdn':
                    result = await this.purgeAzureCDN(urls, options);
                    break;
                case 'gcp-cdn':
                    result = await this.purgeGCPCDN(urls, options);
                    break;
                default:
                    throw new Error(`Purge not supported for provider: ${this.config.provider}`);
            }
            this.emit('cachePurged', result);
            logger.info('Cache purged successfully', result);
            return result;
        }
        catch (error) {
            logger.error('Failed to purge cache:', error);
            throw error;
        }
    }
    addEdgeRule(name, rule) {
        this.edgeRules.set(name, rule);
        logger.info(`Edge rule added: ${name}`);
        this.applyEdgeRule(name, rule);
    }
    removeEdgeRule(name) {
        if (this.edgeRules.delete(name)) {
            logger.info(`Edge rule removed: ${name}`);
            this.removeEdgeRuleFromProvider(name);
        }
    }
    async getAnalytics(timeRange) {
        try {
            switch (this.config.provider) {
                case 'cloudflare':
                    return this.getCloudflareAnalytics(timeRange);
                case 'aws-cloudfront':
                    return this.getCloudFrontAnalytics(timeRange);
                case 'azure-cdn':
                    return this.getAzureCDNAnalytics(timeRange);
                case 'gcp-cdn':
                    return this.getGCPCDNAnalytics(timeRange);
                default:
                    throw new Error(`Analytics not supported for provider: ${this.config.provider}`);
            }
        }
        catch (error) {
            logger.error('Failed to get CDN analytics:', error);
            throw error;
        }
    }
    async preloadAssets(assetKeys, regions = ['global']) {
        logger.info('Preloading assets to edge locations', { assetKeys, regions });
        try {
            const promises = [];
            for (const assetKey of assetKeys) {
                for (const region of regions) {
                    promises.push(this.preloadAssetToRegion(assetKey, region));
                }
            }
            await Promise.all(promises);
            this.emit('assetsPreloaded', { assetKeys, regions });
            logger.info('Assets preloaded successfully');
        }
        catch (error) {
            logger.error('Failed to preload assets:', error);
            throw error;
        }
    }
    async setupSecurityPolicies(policies) {
        logger.info('Setting up CDN security policies', policies);
        try {
            switch (this.config.provider) {
                case 'cloudflare':
                    await this.setupCloudflareSecurityPolicies(policies);
                    break;
                case 'aws-cloudfront':
                    await this.setupCloudFrontSecurityPolicies(policies);
                    break;
            }
            this.emit('securityPoliciesUpdated', policies);
            logger.info('Security policies updated successfully');
        }
        catch (error) {
            logger.error('Failed to setup security policies:', error);
            throw error;
        }
    }
    async initializeCloudflare() {
        if (!this.config.cloudflare) {
            throw new Error('Cloudflare configuration missing');
        }
        logger.info('Cloudflare CDN initialized');
    }
    async initializeCloudFront() {
        if (!this.config.awsCloudFront) {
            throw new Error('CloudFront configuration missing');
        }
        logger.info('AWS CloudFront initialized');
    }
    async initializeAzureCDN() {
        if (!this.config.azureCDN) {
            throw new Error('Azure CDN configuration missing');
        }
        logger.info('Azure CDN initialized');
    }
    async initializeGCPCDN() {
        if (!this.config.gcpCDN) {
            throw new Error('GCP CDN configuration missing');
        }
        logger.info('GCP CDN initialized');
    }
    async purgeCloudflare(urls, options) {
        const urlArray = Array.isArray(urls) ? urls : [urls];
        return {
            success: true,
            purgedUrls: urlArray,
            estimatedTime: 30
        };
    }
    async purgeCloudFront(urls, options) {
        const urlArray = Array.isArray(urls) ? urls : [urls];
        return {
            success: true,
            purgedUrls: urlArray,
            invalidationId: `INV-${Date.now()}`,
            estimatedTime: 900
        };
    }
    async purgeAzureCDN(urls, options) {
        const urlArray = Array.isArray(urls) ? urls : [urls];
        return {
            success: true,
            purgedUrls: urlArray,
            estimatedTime: 300
        };
    }
    async purgeGCPCDN(urls, options) {
        const urlArray = Array.isArray(urls) ? urls : [urls];
        return {
            success: true,
            purgedUrls: urlArray,
            estimatedTime: 600
        };
    }
    async getCloudflareAnalytics(timeRange) {
        return this.generateMockAnalytics();
    }
    async getCloudFrontAnalytics(timeRange) {
        return this.generateMockAnalytics();
    }
    async getAzureCDNAnalytics(timeRange) {
        return this.generateMockAnalytics();
    }
    async getGCPCDNAnalytics(timeRange) {
        return this.generateMockAnalytics();
    }
    generateMockAnalytics() {
        return {
            requests: {
                total: 1000000,
                cached: 850000,
                origin: 150000,
                hitRatio: 85.0
            },
            bandwidth: {
                total: 500000000,
                saved: 425000000,
                efficiency: 85.0
            },
            performance: {
                averageResponseTime: 45,
                p95ResponseTime: 120,
                uptime: 99.98
            },
            geography: {
                'US': { requests: 400000, bandwidth: 200000000 },
                'EU': { requests: 300000, bandwidth: 150000000 },
                'APAC': { requests: 200000, bandwidth: 100000000 },
                'Other': { requests: 100000, bandwidth: 50000000 }
            },
            topFiles: [
                { url: '/assets/app-icon.png', requests: 50000, bandwidth: 25000000 },
                { url: '/assets/splash-screen.jpg', requests: 40000, bandwidth: 80000000 },
                { url: '/assets/main.css', requests: 30000, bandwidth: 15000000 }
            ]
        };
    }
    async preloadAssetToRegion(assetKey, region) {
        logger.debug(`Preloading ${assetKey} to ${region}`);
    }
    async applyEdgeRule(name, rule) {
        logger.debug(`Applying edge rule: ${name}`);
    }
    async removeEdgeRuleFromProvider(name) {
        logger.debug(`Removing edge rule: ${name}`);
    }
    async setupCloudflareSecurityPolicies(policies) {
        logger.debug('Setting up Cloudflare security policies');
    }
    async setupCloudFrontSecurityPolicies(policies) {
        logger.debug('Setting up CloudFront security policies');
    }
    setupDefaultRules() {
        this.addEdgeRule('images', {
            pattern: '*.{jpg,jpeg,png,webp,avif,svg}',
            cachePolicy: {
                ttl: 31536000,
                strategy: 'aggressive',
                varyHeaders: ['Accept', 'Accept-Encoding'],
                enableCompression: true,
                enableBrotli: true
            }
        });
        this.addEdgeRule('static-assets', {
            pattern: '*.{css,js,woff2,woff,ttf}',
            cachePolicy: {
                ttl: 31536000,
                strategy: 'aggressive',
                varyHeaders: ['Accept-Encoding'],
                enableCompression: true,
                enableBrotli: true
            }
        });
        this.addEdgeRule('api', {
            pattern: '/api/*',
            cachePolicy: {
                ttl: 300,
                strategy: 'dynamic',
                varyHeaders: ['Authorization', 'Accept'],
                enableCompression: true,
                enableBrotli: false
            }
        });
    }
    getBaseURL() {
        switch (this.config.provider) {
            case 'cloudflare':
                return this.config.cloudflare?.customDomain
                    ? `https://${this.config.cloudflare.customDomain}`
                    : 'https://cdn.lulupay.com';
            case 'aws-cloudfront':
                return `https://${this.config.awsCloudFront?.domain}`;
            case 'azure-cdn':
                return `https://${this.config.azureCDN?.endpointName}.azureedge.net`;
            case 'gcp-cdn':
                return `https://cdn-${this.config.gcpCDN?.projectId}.googleapis.com`;
            default:
                return 'https://cdn.lulupay.com';
        }
    }
    isImageAsset(assetKey) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg'];
        return imageExtensions.some(ext => assetKey.toLowerCase().endsWith(ext));
    }
    getStatus() {
        return {
            provider: this.config.provider,
            baseUrl: this.getBaseURL(),
            edgeRules: Object.fromEntries(this.edgeRules),
            config: {
                enableEdgeOptimization: this.config.enableEdgeOptimization,
                enableImageOptimization: this.config.enableImageOptimization,
                enableCompression: this.config.enableCompression,
                defaultCacheTTL: this.config.defaultCacheTTL
            }
        };
    }
}
exports.CDNService = CDNService;
exports.default = CDNService;
//# sourceMappingURL=CDNService.js.map