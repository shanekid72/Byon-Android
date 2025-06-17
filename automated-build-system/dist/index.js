"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const ws_1 = __importDefault(require("ws"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./utils/logger");
const database_1 = require("./utils/database");
const QueueManager_1 = require("./services/QueueManager");
const BuildStatusService_1 = require("./services/BuildStatusService");
const build_routes_1 = require("./api/routes/build.routes");
const partner_routes_1 = require("./api/routes/partner.routes");
const health_routes_1 = require("./api/routes/health.routes");
const error_middleware_1 = require("./api/middleware/error.middleware");
const logging_middleware_1 = require("./api/middleware/logging.middleware");
// Load environment variables
dotenv_1.default.config();
class BuildSystemServer {
    app;
    server;
    wss;
    buildStatusService;
    constructor() {
        this.app = (0, express_1.default)();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    setupMiddleware() {
        // Security middleware
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
        // CORS configuration
        this.app.use((0, cors_1.default)({
            origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3002'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        }));
        // Compression and parsing
        this.app.use((0, compression_1.default)());
        this.app.use(express_1.default.json({ limit: '50mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
        // Logging
        this.app.use((0, morgan_1.default)('combined', {
            stream: { write: (message) => logger_1.logger.info(message.trim()) }
        }));
        this.app.use(logging_middleware_1.requestLogger);
    }
    setupRoutes() {
        // API version prefix
        const apiPrefix = '/api/v1';
        // Health check (no auth required)
        this.app.use(`${apiPrefix}/health`, health_routes_1.healthRoutes);
        // Main API routes
        this.app.use(`${apiPrefix}/builds`, build_routes_1.buildRoutes);
        this.app.use(`${apiPrefix}/partners`, partner_routes_1.partnerRoutes);
        // API documentation
        this.app.get('/docs', (req, res) => {
            res.json({
                name: 'LuluPay Automated Build System API',
                version: '1.0.0',
                description: 'REST API for automated white-label app generation',
                endpoints: {
                    builds: {
                        'POST /api/v1/builds/create': 'Create new build job',
                        'GET /api/v1/builds/:id/status': 'Get build status',
                        'GET /api/v1/builds/:id/logs': 'Get build logs',
                        'GET /api/v1/builds/:id/download': 'Download generated app',
                        'DELETE /api/v1/builds/:id/cancel': 'Cancel build job',
                    },
                    partners: {
                        'POST /api/v1/partners/register': 'Register new partner',
                        'GET /api/v1/partners/:id/builds': 'List partner builds',
                        'PUT /api/v1/partners/:id/config': 'Update partner config',
                    },
                    health: {
                        'GET /api/v1/health': 'System health check',
                        'GET /api/v1/health/detailed': 'Detailed system status',
                    }
                },
                websocket: {
                    '/api/v1/builds/:id/progress': 'Real-time build progress updates'
                }
            });
        });
        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                service: 'LuluPay Automated Build System',
                version: '1.0.0',
                status: 'running',
                timestamp: new Date().toISOString(),
                documentation: '/docs'
            });
        });
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                path: req.originalUrl,
                method: req.method,
                timestamp: new Date().toISOString()
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
        this.wss.on('connection', (ws, req) => {
            logger_1.logger.info(`WebSocket connection established: ${req.url}`);
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    this.buildStatusService.handleMessage(ws, data);
                }
                catch (error) {
                    logger_1.logger.error('Invalid WebSocket message:', error);
                }
            });
            ws.on('close', () => {
                logger_1.logger.info('WebSocket connection closed');
                this.buildStatusService.removeConnection(ws);
            });
            ws.on('error', (error) => {
                logger_1.logger.error('WebSocket error:', error);
            });
        });
    }
    async start() {
        try {
            // Initialize database connections
            await (0, database_1.connectDatabase)();
            logger_1.logger.info('Database connected successfully');
            // Initialize build queue
            await (0, QueueManager_1.initializeQueue)();
            logger_1.logger.info('Build queue initialized successfully');
            // Create HTTP server
            this.server = (0, http_1.createServer)(this.app);
            // Setup WebSocket
            this.setupWebSocket();
            // Start server
            const port = process.env.PORT || 8080;
            const host = process.env.HOST || '0.0.0.0';
            this.server.listen(port, host, () => {
                logger_1.logger.info(`🚀 Build System Server running on ${host}:${port}`);
                logger_1.logger.info(`📖 API Documentation: http://${host}:${port}/docs`);
                logger_1.logger.info(`🔗 WebSocket endpoint: ws://${host}:${port}/ws`);
                logger_1.logger.info(`🏗️ Environment: ${process.env.NODE_ENV || 'development'}`);
            });
            // Graceful shutdown handling
            this.setupGracefulShutdown();
        }
        catch (error) {
            logger_1.logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            logger_1.logger.info(`Received ${signal}. Starting graceful shutdown...`);
            // Close HTTP server
            if (this.server) {
                this.server.close(() => {
                    logger_1.logger.info('HTTP server closed');
                });
            }
            // Close WebSocket server
            if (this.wss) {
                this.wss.close(() => {
                    logger_1.logger.info('WebSocket server closed');
                });
            }
            // Close database connections
            // Database connection closing is handled in the database utility
            logger_1.logger.info('Graceful shutdown completed');
            process.exit(0);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught Exception:', error);
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });
    }
}
// Start the server
if (require.main === module) {
    const server = new BuildSystemServer();
    server.start().catch((error) => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
}
exports.default = BuildSystemServer;
//# sourceMappingURL=index.js.map