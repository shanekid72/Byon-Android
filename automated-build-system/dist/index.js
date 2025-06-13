"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LuluPayServer = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const http_1 = require("http");
const ws_1 = __importDefault(require("ws"));
const dotenv_1 = __importDefault(require("dotenv"));
const temp_utils_1 = require("./utils/temp-utils");
const database_1 = require("./utils/database");
const QueueManager_1 = require("./services/QueueManager");
const BuildStatusService_1 = require("./services/BuildStatusService");
const build_routes_1 = require("./api/routes/build.routes");
const partner_routes_1 = require("./api/routes/partner.routes");
const health_routes_1 = require("./api/routes/health.routes");
const assets_1 = require("./api/routes/assets");
const error_middleware_1 = require("./api/middleware/error.middleware");
const logging_middleware_1 = require("./api/middleware/logging.middleware");
dotenv_1.default.config();
class LuluPayServer {
    constructor() {
        this.app = (0, express_1.default)();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    setupMiddleware() {
        this.app.use((0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
        }));
        this.app.use((0, cors_1.default)({
            origin: process.env.CORS_ORIGINS?.split(',') || [
                'http://localhost:3000',
                'http://localhost:5173',
                'http://localhost:8080'
            ],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
        }));
        this.app.use((0, compression_1.default)());
        this.app.use(express_1.default.json({ limit: '50mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
        this.app.use(logging_middleware_1.requestLogger);
    }
    setupRoutes() {
        const apiPrefix = '/api/v1';
        this.app.use(`${apiPrefix}/health`, health_routes_1.healthRoutes);
        this.app.use(`${apiPrefix}/builds`, build_routes_1.buildRoutes);
        this.app.use(`${apiPrefix}/partners`, partner_routes_1.partnerRoutes);
        this.app.use(`${apiPrefix}/assets`, assets_1.assetRoutes);
        this.app.get('/docs', (_, res) => {
            res.json({
                name: 'LuluPay Automated Build System API',
                version: '1.0.0',
                description: 'REST API for automated white-label app generation',
                status: 'operational',
                endpoints: {
                    builds: {
                        'POST /api/v1/builds/create': 'Create new build job',
                        'GET /api/v1/builds/:id/status': 'Get build status',
                        'GET /api/v1/builds/:id/logs': 'Get build logs',
                        'GET /api/v1/builds/:id/download': 'Download generated app',
                        'DELETE /api/v1/builds/:id/cancel': 'Cancel build job',
                        'GET /api/v1/builds': 'List builds with pagination'
                    },
                    partners: {
                        'POST /api/v1/partners/register': 'Register new partner',
                        'GET /api/v1/partners/:id': 'Get partner details',
                        'GET /api/v1/partners/:id/builds': 'List partner builds',
                        'PUT /api/v1/partners/:id/config': 'Update partner config',
                        'GET /api/v1/partners/:id/stats': 'Get partner statistics'
                    },
                    assets: {
                        'POST /api/v1/assets/:partnerId/upload': 'Upload single asset',
                        'POST /api/v1/assets/:partnerId/upload-multiple': 'Upload multiple assets',
                        'POST /api/v1/assets/:partnerId/assets/:assetId/process': 'Process uploaded asset',
                        'GET /api/v1/assets/:partnerId/assets/:assetId': 'Get asset details',
                        'GET /api/v1/assets/:partnerId/assets': 'List partner assets',
                        'DELETE /api/v1/assets/:partnerId/assets/:assetId': 'Delete asset',
                        'GET /api/v1/assets/:partnerId/assets/:assetId/download/:density?': 'Download processed asset'
                    },
                    health: {
                        'GET /api/v1/health': 'Basic system health check',
                        'GET /api/v1/health/detailed': 'Detailed system status with database info'
                    }
                },
                websocket: {
                    endpoint: '/ws',
                    description: 'Real-time build progress updates',
                    usage: 'Connect and send {"type": "subscribe_build", "buildId": "your-build-id"}'
                }
            });
        });
        this.app.get('/', (_, res) => {
            res.json({
                service: 'LuluPay Automated Build System',
                version: '1.0.0',
                status: 'running',
                timestamp: new Date().toISOString(),
                documentation: '/docs',
                websocket: '/ws',
                capabilities: [
                    'White-label Android app generation',
                    'Real-time build progress tracking',
                    'Partner management and configuration',
                    'Build queue management',
                    'Asset processing and customization'
                ]
            });
        });
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                path: req.originalUrl,
                method: req.method,
                timestamp: new Date().toISOString(),
                availableEndpoints: '/docs'
            });
        });
    }
    setupErrorHandling() {
        this.app.use(error_middleware_1.errorHandler);
    }
    setupWebSocket() {
        this.wss = new ws_1.default.Server({
            server: this.server,
            path: '/ws'
        });
        this.buildStatusService = new BuildStatusService_1.BuildStatusService(this.wss);
        temp_utils_1.logger.info('WebSocket server initialized for real-time build updates');
    }
    async start() {
        try {
            temp_utils_1.logger.info('🚀 Starting LuluPay Automated Build System...');
            await (0, database_1.initializeDatabases)();
            temp_utils_1.logger.info('✅ Database connections established');
            await (0, QueueManager_1.initializeQueue)();
            temp_utils_1.logger.info('✅ Build queue system initialized');
            this.server = (0, http_1.createServer)(this.app);
            this.setupWebSocket();
            const port = process.env.PORT || 8080;
            const host = process.env.HOST || '0.0.0.0';
            this.server.listen(port, host, () => {
                temp_utils_1.logger.info(`🎯 LuluPay Build System Server running on ${host}:${port}`);
                temp_utils_1.logger.info(`📖 API Documentation: http://${host}:${port}/docs`);
                temp_utils_1.logger.info(`🔗 WebSocket endpoint: ws://${host}:${port}/ws`);
                temp_utils_1.logger.info(`🏗️ Environment: ${process.env.NODE_ENV || 'development'}`);
                temp_utils_1.logger.info('✨ Ready to process white-label app builds!');
            });
            this.setupGracefulShutdown();
        }
        catch (error) {
            temp_utils_1.logger.error('💥 Failed to start server:', error);
            process.exit(1);
        }
    }
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            temp_utils_1.logger.info(`📤 Received ${signal}. Starting graceful shutdown...`);
            try {
                if (this.buildStatusService) {
                    this.buildStatusService.shutdown();
                    temp_utils_1.logger.info('✅ WebSocket service closed');
                }
                if (this.server) {
                    await new Promise((resolve) => {
                        this.server.close(() => {
                            temp_utils_1.logger.info('✅ HTTP server closed');
                            resolve();
                        });
                    });
                }
                temp_utils_1.logger.info('✅ Graceful shutdown completed');
                process.exit(0);
            }
            catch (error) {
                temp_utils_1.logger.error('❌ Error during shutdown:', error);
                process.exit(1);
            }
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('uncaughtException', (error) => {
            temp_utils_1.logger.error('💥 Uncaught Exception:', error);
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            temp_utils_1.logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });
    }
}
exports.LuluPayServer = LuluPayServer;
if (require.main === module) {
    const server = new LuluPayServer();
    server.start().catch((error) => {
        console.error('💥 Failed to start LuluPay Build System:', error);
        process.exit(1);
    });
}
exports.default = LuluPayServer;
//# sourceMappingURL=index.js.map