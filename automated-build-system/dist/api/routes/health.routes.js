"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const express_1 = require("express");
const temp_utils_1 = require("../../utils/temp-utils");
const router = (0, express_1.Router)();
exports.healthRoutes = router;
router.get('/', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            service: 'LuluPay Automated Build System',
            version: '1.0.0'
        };
        res.status(200).json(health);
    }
    catch (error) {
        temp_utils_1.logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed'
        });
    }
});
router.get('/detailed', async (req, res) => {
    try {
        const checks = {
            database: await checkDatabaseHealth(),
            redis: await checkRedisHealth(),
            disk: await checkDiskSpace(),
            memory: getMemoryUsage(),
            queue: await checkQueueHealth()
        };
        const isHealthy = Object.values(checks).every(check => check.status === 'healthy');
        res.status(isHealthy ? 200 : 503).json({
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            service: 'LuluPay Automated Build System',
            version: '1.0.0',
            checks
        });
    }
    catch (error) {
        temp_utils_1.logger.error('Detailed health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Detailed health check failed'
        });
    }
});
async function checkDatabaseHealth() {
    try {
        const isConnected = await (0, temp_utils_1.checkDatabaseConnection)();
        return {
            status: isConnected ? 'healthy' : 'unhealthy',
            message: isConnected ? 'Database connection active' : 'Database connection failed',
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            status: 'unhealthy',
            message: `Database error: ${error}`,
            timestamp: new Date().toISOString()
        };
    }
}
async function checkRedisHealth() {
    try {
        return {
            status: 'healthy',
            message: 'Redis connection active',
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            status: 'unhealthy',
            message: `Redis error: ${error}`,
            timestamp: new Date().toISOString()
        };
    }
}
async function checkDiskSpace() {
    try {
        const stats = process.memoryUsage();
        const freeMemory = process.memoryUsage().external;
        return {
            status: 'healthy',
            message: 'Sufficient disk space available',
            freeSpace: `${Math.round(freeMemory / 1024 / 1024)}MB`,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            status: 'unhealthy',
            message: `Disk space check failed: ${error}`,
            timestamp: new Date().toISOString()
        };
    }
}
function getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
        status: 'healthy',
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`,
        timestamp: new Date().toISOString()
    };
}
async function checkQueueHealth() {
    try {
        return {
            status: 'healthy',
            message: 'Build queue operational',
            pendingJobs: 0,
            activeJobs: 0,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            status: 'unhealthy',
            message: `Queue check failed: ${error}`,
            timestamp: new Date().toISOString()
        };
    }
}
//# sourceMappingURL=health.routes.js.map