"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealTimeDashboardService = void 0;
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
const http_1 = __importDefault(require("http"));
const logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
    error: (msg, error) => console.error(`[ERROR] ${msg}`, error || ''),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
    debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta || '')
};
class RealTimeDashboardService extends events_1.EventEmitter {
    constructor(config = {}, analyticsService, metricsService) {
        super();
        this.isRunning = false;
        this.config = {
            enableRealTimeUpdates: true,
            updateIntervalMs: 5000,
            maxClients: 100,
            enableMetricsStreaming: true,
            enableBuildStreaming: true,
            enableAlertStreaming: true,
            enablePartnerStreaming: true,
            retentionWindowMs: 300000,
            ...config
        };
        this.clients = new Set();
        this.analyticsService = analyticsService;
        this.metricsService = metricsService;
        this.metricsCache = new Map();
        this.setupEventListeners();
    }
    async start(port = 8080) {
        if (this.isRunning) {
            logger.warn('Real-time dashboard service is already running');
            return;
        }
        try {
            this.server = http_1.default.createServer();
            this.wss = new ws_1.default.Server({ server: this.server });
            this.wss.on('connection', this.handleConnection.bind(this));
            this.wss.on('error', (error) => {
                logger.error('WebSocket server error:', error);
            });
            this.server.listen(port, () => {
                this.isRunning = true;
                logger.info(`Real-time dashboard service started on port ${port}`);
                this.emit('started');
            });
            if (this.config.enableRealTimeUpdates) {
                this.startMetricsStreaming();
            }
        }
        catch (error) {
            logger.error('Failed to start real-time dashboard service:', error);
            throw error;
        }
    }
    async stop() {
        if (!this.isRunning) {
            return;
        }
        try {
            if (this.updateTimer) {
                clearInterval(this.updateTimer);
                this.updateTimer = undefined;
            }
            for (const client of this.clients) {
                client.terminate();
            }
            this.clients.clear();
            if (this.wss) {
                this.wss.close();
            }
            if (this.server) {
                await new Promise((resolve) => {
                    this.server.close(() => resolve());
                });
            }
            this.isRunning = false;
            logger.info('Real-time dashboard service stopped');
            this.emit('stopped');
        }
        catch (error) {
            logger.error('Error stopping real-time dashboard service:', error);
            throw error;
        }
    }
    handleConnection(ws) {
        if (this.clients.size >= this.config.maxClients) {
            logger.warn('Maximum client limit reached, closing connection');
            ws.close(1013, 'Server overloaded');
            return;
        }
        this.clients.add(ws);
        logger.info(`New dashboard client connected. Total clients: ${this.clients.size}`);
        this.sendInitialData(ws);
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleClientMessage(ws, message);
            }
            catch (error) {
                logger.error('Invalid message from client:', error);
            }
        });
        ws.on('close', () => {
            this.clients.delete(ws);
            logger.info(`Dashboard client disconnected. Total clients: ${this.clients.size}`);
        });
        ws.on('error', (error) => {
            logger.error('WebSocket client error:', error);
            this.clients.delete(ws);
        });
    }
    handleClientMessage(ws, message) {
        switch (message.type) {
            case 'subscribe':
                this.handleSubscription(ws, message.channels || []);
                break;
            case 'unsubscribe':
                this.handleUnsubscription(ws, message.channels || []);
                break;
            case 'get_metrics':
                this.sendMetricsUpdate(ws);
                break;
            case 'get_builds':
                this.sendBuildsUpdate(ws);
                break;
            case 'ping':
                this.sendMessage(ws, { type: 'pong', timestamp: new Date() });
                break;
            default:
                logger.warn('Unknown message type:', message.type);
        }
    }
    async sendInitialData(ws) {
        try {
            const [metrics, builds, alerts] = await Promise.all([
                this.getRealTimeMetrics(),
                this.getActiveBuilds(),
                this.getActiveAlerts()
            ]);
            this.sendMessage(ws, {
                type: 'initial_data',
                data: {
                    metrics,
                    builds,
                    alerts,
                    timestamp: new Date()
                }
            });
        }
        catch (error) {
            logger.error('Failed to send initial data:', error);
        }
    }
    setupEventListeners() {
        if (this.config.enableBuildStreaming) {
            this.analyticsService.on('buildMetrics', (buildMetrics) => {
                const streamData = {
                    buildId: buildMetrics.buildId,
                    partnerId: buildMetrics.partnerId,
                    status: buildMetrics.status === 'completed' ? 'completed' :
                        buildMetrics.status === 'failed' ? 'failed' : 'stage_completed',
                    duration: buildMetrics.duration,
                    timestamp: new Date()
                };
                this.broadcastToClients('build_update', streamData);
            });
        }
        if (this.config.enableAlertStreaming) {
            this.analyticsService.on('alert', (alert) => {
                const streamData = {
                    id: `alert_${Date.now()}`,
                    type: alert.type,
                    severity: alert.severity,
                    message: alert.message,
                    source: 'system',
                    timestamp: alert.timestamp
                };
                this.broadcastToClients('alert_update', streamData);
            });
        }
        if (this.config.enablePartnerStreaming) {
            this.analyticsService.on('partnerMetrics', (partnerMetrics) => {
                const streamData = {
                    partnerId: partnerMetrics.partnerId,
                    event: 'quota_updated',
                    data: partnerMetrics.usageQuota,
                    timestamp: new Date()
                };
                this.broadcastToClients('partner_update', streamData);
            });
        }
    }
    startMetricsStreaming() {
        this.updateTimer = setInterval(async () => {
            try {
                if (this.clients.size > 0) {
                    await this.broadcastMetricsUpdate();
                }
            }
            catch (error) {
                logger.error('Metrics streaming error:', error);
            }
        }, this.config.updateIntervalMs);
        logger.info('Metrics streaming started');
    }
    async broadcastMetricsUpdate() {
        try {
            const metrics = await this.getRealTimeMetrics();
            this.broadcastToClients('metrics_update', metrics);
        }
        catch (error) {
            logger.error('Failed to broadcast metrics update:', error);
        }
    }
    async getRealTimeMetrics() {
        try {
            const [activeBuilds, queuedBuilds, systemMetrics, partnerMetrics, assetMetrics, alerts] = await Promise.all([
                this.getActiveBuildCount(),
                this.getQueuedBuildCount(),
                this.getSystemMetrics(),
                this.getPartnerMetrics(),
                this.getAssetMetrics(),
                this.getActiveAlerts()
            ]);
            return {
                timestamp: new Date(),
                builds: {
                    active: activeBuilds,
                    queued: queuedBuilds,
                    completedLast5Min: await this.getCompletedBuildsLast5Min(),
                    failedLast5Min: await this.getFailedBuildsLast5Min(),
                    averageDuration: await this.getAverageBuildDuration()
                },
                system: systemMetrics,
                partners: partnerMetrics,
                assets: assetMetrics,
                alerts
            };
        }
        catch (error) {
            logger.error('Failed to get real-time metrics:', error);
            throw error;
        }
    }
    broadcastToClients(type, data) {
        const message = {
            type,
            data,
            timestamp: new Date()
        };
        const deadClients = [];
        for (const client of this.clients) {
            try {
                if (client.readyState === ws_1.default.OPEN) {
                    client.send(JSON.stringify(message));
                }
                else {
                    deadClients.push(client);
                }
            }
            catch (error) {
                logger.error('Failed to send message to client:', error);
                deadClients.push(client);
            }
        }
        for (const deadClient of deadClients) {
            this.clients.delete(deadClient);
        }
    }
    sendMessage(ws, message) {
        try {
            if (ws.readyState === ws_1.default.OPEN) {
                ws.send(JSON.stringify(message));
            }
        }
        catch (error) {
            logger.error('Failed to send message to client:', error);
        }
    }
    async sendMetricsUpdate(ws) {
        try {
            const metrics = await this.getRealTimeMetrics();
            this.sendMessage(ws, {
                type: 'metrics_update',
                data: metrics
            });
        }
        catch (error) {
            logger.error('Failed to send metrics update:', error);
        }
    }
    async sendBuildsUpdate(ws) {
        try {
            const builds = await this.getActiveBuilds();
            this.sendMessage(ws, {
                type: 'builds_update',
                data: builds
            });
        }
        catch (error) {
            logger.error('Failed to send builds update:', error);
        }
    }
    handleSubscription(ws, channels) {
        logger.debug(`Client subscribed to channels: ${channels.join(', ')}`);
    }
    handleUnsubscription(ws, channels) {
        logger.debug(`Client unsubscribed from channels: ${channels.join(', ')}`);
    }
    async getActiveBuildCount() {
        return Math.floor(Math.random() * 10);
    }
    async getQueuedBuildCount() {
        return Math.floor(Math.random() * 5);
    }
    async getSystemMetrics() {
        return {
            cpuUsage: Math.random() * 40 + 30,
            memoryUsage: Math.random() * 30 + 50,
            diskUsage: Math.random() * 20 + 60,
            activeConnections: this.clients.size
        };
    }
    async getPartnerMetrics() {
        return {
            active: Math.floor(Math.random() * 50) + 20,
            totalBuildsToday: Math.floor(Math.random() * 1000) + 500,
            topPartners: [
                { partnerId: 'partner1', builds: 150 },
                { partnerId: 'partner2', builds: 120 },
                { partnerId: 'partner3', builds: 95 }
            ]
        };
    }
    async getAssetMetrics() {
        return {
            processedLast5Min: Math.floor(Math.random() * 50) + 10,
            averageProcessingTime: Math.random() * 5 + 2,
            averageCompressionRatio: Math.random() * 1.5 + 1.5,
            qualityScore: Math.random() * 10 + 85
        };
    }
    async getActiveAlerts() {
        return [];
    }
    async getActiveBuilds() {
        return [];
    }
    async getCompletedBuildsLast5Min() {
        return Math.floor(Math.random() * 20) + 5;
    }
    async getFailedBuildsLast5Min() {
        return Math.floor(Math.random() * 3);
    }
    async getAverageBuildDuration() {
        return Math.random() * 300 + 120;
    }
    getStatus() {
        return {
            isRunning: this.isRunning,
            clientCount: this.clients.size,
            config: this.config,
            uptime: process.uptime()
        };
    }
    getClientCount() {
        return this.clients.size;
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.RealTimeDashboardService = RealTimeDashboardService;
exports.default = RealTimeDashboardService;
//# sourceMappingURL=RealTimeDashboardService.js.map