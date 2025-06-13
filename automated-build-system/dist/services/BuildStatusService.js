"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildStatusService = void 0;
const ws_1 = __importDefault(require("ws"));
const temp_utils_1 = require("../utils/temp-utils");
class BuildStatusService {
    constructor(wss) {
        this.clients = new Map();
        this.buildSubscriptions = new Map();
        this.partnerSubscriptions = new Map();
        this.wss = wss;
        this.setupWebSocketHandlers();
        this.startPingInterval();
    }
    setupWebSocketHandlers() {
        this.wss.on('connection', (ws, request) => {
            const clientInfo = {
                ws,
                subscriptions: new Set(),
                lastPing: new Date()
            };
            this.clients.set(ws, clientInfo);
            temp_utils_1.logger.info('WebSocket client connected', {
                clientsCount: this.clients.size,
                url: request.url
            });
            this.sendToClient(ws, {
                type: 'build_progress',
                buildId: 'system',
                status: 'queued',
                message: 'Connected to LuluPay Build System',
                timestamp: new Date().toISOString()
            });
            ws.on('message', (message) => {
                this.handleMessage(ws, message);
            });
            ws.on('pong', () => {
                const client = this.clients.get(ws);
                if (client) {
                    client.lastPing = new Date();
                }
            });
            ws.on('close', () => {
                this.handleClientDisconnect(ws);
            });
            ws.on('error', (error) => {
                temp_utils_1.logger.error('WebSocket error:', error);
                this.handleClientDisconnect(ws);
            });
        });
    }
    handleMessage(ws, message) {
        try {
            const data = JSON.parse(message.toString());
            const client = this.clients.get(ws);
            if (!client) {
                return;
            }
            switch (data.type) {
                case 'subscribe_build':
                    this.subscribeToBuild(ws, data.buildId);
                    break;
                case 'subscribe_partner':
                    this.subscribeToPartner(ws, data.partnerId);
                    break;
                case 'unsubscribe_build':
                    this.unsubscribeFromBuild(ws, data.buildId);
                    break;
                case 'unsubscribe_partner':
                    this.unsubscribeFromPartner(ws, data.partnerId);
                    break;
                case 'ping':
                    this.sendToClient(ws, {
                        type: 'build_progress',
                        buildId: 'system',
                        status: 'queued',
                        message: 'pong',
                        timestamp: new Date().toISOString()
                    });
                    break;
                default:
                    temp_utils_1.logger.warn('Unknown message type:', data.type);
            }
        }
        catch (error) {
            temp_utils_1.logger.error('Error handling WebSocket message:', error);
        }
    }
    subscribeToBuild(ws, buildId) {
        const client = this.clients.get(ws);
        if (!client)
            return;
        client.subscriptions.add(`build:${buildId}`);
        if (!this.buildSubscriptions.has(buildId)) {
            this.buildSubscriptions.set(buildId, new Set());
        }
        this.buildSubscriptions.get(buildId).add(ws);
        temp_utils_1.logger.info(`Client subscribed to build: ${buildId}`);
        this.sendToClient(ws, {
            type: 'build_progress',
            buildId,
            status: 'queued',
            message: `Subscribed to build ${buildId}`,
            timestamp: new Date().toISOString()
        });
    }
    subscribeToPartner(ws, partnerId) {
        const client = this.clients.get(ws);
        if (!client)
            return;
        client.subscriptions.add(`partner:${partnerId}`);
        if (!this.partnerSubscriptions.has(partnerId)) {
            this.partnerSubscriptions.set(partnerId, new Set());
        }
        this.partnerSubscriptions.get(partnerId).add(ws);
        temp_utils_1.logger.info(`Client subscribed to partner: ${partnerId}`);
    }
    unsubscribeFromBuild(ws, buildId) {
        const client = this.clients.get(ws);
        if (!client)
            return;
        client.subscriptions.delete(`build:${buildId}`);
        const subscribers = this.buildSubscriptions.get(buildId);
        if (subscribers) {
            subscribers.delete(ws);
            if (subscribers.size === 0) {
                this.buildSubscriptions.delete(buildId);
            }
        }
        temp_utils_1.logger.info(`Client unsubscribed from build: ${buildId}`);
    }
    unsubscribeFromPartner(ws, partnerId) {
        const client = this.clients.get(ws);
        if (!client)
            return;
        client.subscriptions.delete(`partner:${partnerId}`);
        const subscribers = this.partnerSubscriptions.get(partnerId);
        if (subscribers) {
            subscribers.delete(ws);
            if (subscribers.size === 0) {
                this.partnerSubscriptions.delete(partnerId);
            }
        }
        temp_utils_1.logger.info(`Client unsubscribed from partner: ${partnerId}`);
    }
    removeConnection(ws) {
        this.handleClientDisconnect(ws);
    }
    handleClientDisconnect(ws) {
        const client = this.clients.get(ws);
        if (!client)
            return;
        client.subscriptions.forEach(subscription => {
            if (subscription.startsWith('build:')) {
                const buildId = subscription.replace('build:', '');
                this.unsubscribeFromBuild(ws, buildId);
            }
            else if (subscription.startsWith('partner:')) {
                const partnerId = subscription.replace('partner:', '');
                this.unsubscribeFromPartner(ws, partnerId);
            }
        });
        this.clients.delete(ws);
        temp_utils_1.logger.info('WebSocket client disconnected', {
            clientsCount: this.clients.size
        });
    }
    broadcastBuildUpdate(buildId, update) {
        const message = {
            type: 'build_progress',
            buildId,
            status: 'in_progress',
            timestamp: new Date().toISOString(),
            ...update
        };
        const subscribers = this.buildSubscriptions.get(buildId);
        if (subscribers) {
            subscribers.forEach(ws => {
                this.sendToClient(ws, message);
            });
        }
        temp_utils_1.logger.info(`Broadcast build update: ${buildId}`, {
            subscribersCount: subscribers?.size || 0,
            status: message.status,
            progress: message.progress
        });
    }
    broadcastToPartner(partnerId, message) {
        const subscribers = this.partnerSubscriptions.get(partnerId);
        if (subscribers) {
            subscribers.forEach(ws => {
                this.sendToClient(ws, message);
            });
        }
    }
    broadcastSystemMessage(message) {
        const systemMessage = {
            type: 'build_progress',
            buildId: 'system',
            status: 'queued',
            message,
            timestamp: new Date().toISOString()
        };
        this.clients.forEach((client, ws) => {
            this.sendToClient(ws, systemMessage);
        });
        temp_utils_1.logger.info('System message broadcast', {
            clientsCount: this.clients.size,
            message
        });
    }
    sendToClient(ws, message) {
        if (ws.readyState === ws_1.default.OPEN) {
            try {
                ws.send(JSON.stringify(message));
            }
            catch (error) {
                temp_utils_1.logger.error('Error sending message to client:', error);
                this.handleClientDisconnect(ws);
            }
        }
    }
    startPingInterval() {
        this.pingInterval = setInterval(() => {
            const now = new Date();
            this.clients.forEach((client, ws) => {
                const timeSinceLastPing = now.getTime() - client.lastPing.getTime();
                if (timeSinceLastPing > 60000) {
                    temp_utils_1.logger.warn('Removing stale WebSocket connection');
                    this.handleClientDisconnect(ws);
                    return;
                }
                if (ws.readyState === ws_1.default.OPEN) {
                    ws.ping();
                }
            });
        }, 30000);
    }
    getStats() {
        return {
            connectedClients: this.clients.size,
            buildSubscriptions: this.buildSubscriptions.size,
            partnerSubscriptions: this.partnerSubscriptions.size,
            totalSubscriptions: Array.from(this.clients.values())
                .reduce((total, client) => total + client.subscriptions.size, 0)
        };
    }
    shutdown() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        this.clients.forEach((client, ws) => {
            if (ws.readyState === ws_1.default.OPEN) {
                ws.close(1000, 'Server shutting down');
            }
        });
        this.clients.clear();
        this.buildSubscriptions.clear();
        this.partnerSubscriptions.clear();
        temp_utils_1.logger.info('BuildStatusService shutdown completed');
    }
}
exports.BuildStatusService = BuildStatusService;
//# sourceMappingURL=BuildStatusService.js.map