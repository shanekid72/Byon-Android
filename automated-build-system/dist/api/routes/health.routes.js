"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const express_1 = require("express");
const database_1 = require("../../utils/database");
const cors_1 = __importDefault(require("cors"));
const router = (0, express_1.Router)();
exports.healthRoutes = router;
// Allow all localhost origins for development
const corsOptions = (req, callback) => {
    const origin = req.headers['origin'];
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
        callback(null, {
            origin: true,
            methods: ['GET', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            credentials: true,
            preflightContinue: false,
            optionsSuccessStatus: 204
        });
    }
    else {
        callback(new Error('Not allowed by CORS'), {});
    }
};
// Apply CORS middleware to all health routes
router.use((0, cors_1.default)(corsOptions));
router.get('/', async (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'LuluPay Build System'
    });
});
router.get('/detailed', async (req, res) => {
    try {
        const [mongo, redis] = await Promise.all([
            (0, database_1.checkMongoHealth)(),
            (0, database_1.checkRedisHealth)()
        ]);
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                mongodb: mongo,
                redis: redis
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Health check failed',
            timestamp: new Date().toISOString()
        });
    }
});
//# sourceMappingURL=health.routes.js.map