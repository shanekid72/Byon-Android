"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildStatusService = void 0;
const ws_1 = __importDefault(require("ws"));
const logger_1 = require("../utils/logger");
class BuildStatusService {
    wss;
    connections = new Map();
    constructor(wss) {
        this.wss = wss;
    }
    addConnection(buildId, ws) {
        if (!this.connections.has(buildId)) {
            this.connections.set(buildId, []);
        }
        this.connections.get(buildId).push(ws);
        logger_1.logger.info(`WebSocket connection added for build ${buildId}`);
    }
    removeConnection(ws) {
        for (const [buildId, connections] of this.connections.entries()) {
            const index = connections.indexOf(ws);
            if (index > -1) {
                connections.splice(index, 1);
                if (connections.length === 0) {
                    this.connections.delete(buildId);
                }
                logger_1.logger.info(`WebSocket connection removed for build ${buildId}`);
                break;
            }
        }
    }
    broadcastUpdate(buildId, update) {
        const connections = this.connections.get(buildId) || [];
        const message = JSON.stringify({
            type: 'build-update',
            buildId,
            data: update
        });
        connections.forEach(ws => {
            if (ws.readyState === ws_1.default.OPEN) {
                ws.send(message);
            }
        });
    }
    handleMessage(ws, data) {
        if (data.type === 'subscribe' && data.buildId) {
            this.addConnection(data.buildId, ws);
        }
    }
}
exports.BuildStatusService = BuildStatusService;
//# sourceMappingURL=BuildStatusService.js.map