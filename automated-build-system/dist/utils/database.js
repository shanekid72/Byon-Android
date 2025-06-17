"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldRecords = exports.withRetry = exports.checkRedisHealth = exports.checkMongoHealth = exports.getRedisClient = exports.getMongoConnection = exports.disconnectDatabase = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const redis_1 = require("redis");
const logger_1 = require("./logger");
// MongoDB connection
let mongoConnection = null;
// Redis connection
let redisClient = null;
const connectDatabase = async () => {
    // Skip database connections in development if SKIP_DATABASE is set
    if (process.env.SKIP_DATABASE === 'true') {
        logger_1.dbLogger.info('Skipping database connections (SKIP_DATABASE=true)');
        return;
    }
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lulupay_builds';
        mongoose_1.default.set('strictQuery', false);
        mongoConnection = await mongoose_1.default.connect(mongoUri, {
            // Remove deprecated options and use defaults
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        logger_1.dbLogger.info('MongoDB connected successfully', { uri: mongoUri.replace(/\/\/.*@/, '//***:***@') });
        // Set up MongoDB event listeners
        mongoose_1.default.connection.on('error', (error) => {
            logger_1.dbLogger.error('MongoDB connection error:', error);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            logger_1.dbLogger.warn('MongoDB disconnected');
        });
        mongoose_1.default.connection.on('reconnected', () => {
            logger_1.dbLogger.info('MongoDB reconnected');
        });
    }
    catch (error) {
        logger_1.dbLogger.error('Failed to connect to MongoDB:', error);
        throw error;
    }
    try {
        // Connect to Redis
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        redisClient = (0, redis_1.createClient)({
            url: redisUrl,
            socket: {
                connectTimeout: 5000,
            },
        });
        redisClient.on('error', (error) => {
            logger_1.dbLogger.error('Redis connection error:', error);
        });
        redisClient.on('connect', () => {
            logger_1.dbLogger.info('Redis connected successfully');
        });
        redisClient.on('reconnecting', () => {
            logger_1.dbLogger.info('Redis reconnecting...');
        });
        redisClient.on('ready', () => {
            logger_1.dbLogger.info('Redis client ready');
        });
        await redisClient.connect();
    }
    catch (error) {
        logger_1.dbLogger.error('Failed to connect to Redis:', error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    try {
        // Disconnect MongoDB
        if (mongoConnection) {
            await mongoose_1.default.disconnect();
            mongoConnection = null;
            logger_1.dbLogger.info('MongoDB disconnected');
        }
        // Disconnect Redis
        if (redisClient) {
            await redisClient.quit();
            redisClient = null;
            logger_1.dbLogger.info('Redis disconnected');
        }
    }
    catch (error) {
        logger_1.dbLogger.error('Error disconnecting from databases:', error);
        throw error;
    }
};
exports.disconnectDatabase = disconnectDatabase;
const getMongoConnection = () => {
    if (process.env.SKIP_DATABASE === 'true') {
        logger_1.dbLogger.warn('MongoDB access attempted but database connections are skipped');
        return null;
    }
    if (!mongoConnection) {
        throw new Error('MongoDB not connected. Call connectDatabase() first.');
    }
    return mongoConnection;
};
exports.getMongoConnection = getMongoConnection;
const getRedisClient = () => {
    if (process.env.SKIP_DATABASE === 'true') {
        logger_1.dbLogger.warn('Redis access attempted but database connections are skipped');
        return null;
    }
    if (!redisClient) {
        throw new Error('Redis not connected. Call connectDatabase() first.');
    }
    return redisClient;
};
exports.getRedisClient = getRedisClient;
// Health check functions
const checkMongoHealth = async () => {
    try {
        if (!mongoConnection) {
            return { status: 'disconnected' };
        }
        const state = mongoose_1.default.connection.readyState;
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        if (state === 1) {
            // Test with a simple operation
            if (mongoose_1.default.connection.db) {
                await mongoose_1.default.connection.db.admin().ping();
            }
            return {
                status: 'healthy',
                details: {
                    state: states[state],
                    host: mongoose_1.default.connection.host,
                    port: mongoose_1.default.connection.port,
                    name: mongoose_1.default.connection.name
                }
            };
        }
        return {
            status: states[state] || 'unknown',
            details: { state }
        };
    }
    catch (error) {
        return {
            status: 'error',
            details: { error: error instanceof Error ? error.message : 'Unknown error' }
        };
    }
};
exports.checkMongoHealth = checkMongoHealth;
const checkRedisHealth = async () => {
    try {
        if (!redisClient) {
            return { status: 'disconnected' };
        }
        // Test with a simple operation
        const result = await redisClient.ping();
        if (result === 'PONG') {
            return {
                status: 'healthy',
                details: {
                    response: result,
                    isReady: redisClient.isReady,
                    isOpen: redisClient.isOpen
                }
            };
        }
        return {
            status: 'error',
            details: { response: result }
        };
    }
    catch (error) {
        return {
            status: 'error',
            details: { error: error instanceof Error ? error.message : 'Unknown error' }
        };
    }
};
exports.checkRedisHealth = checkRedisHealth;
// Utility functions for database operations
const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            logger_1.dbLogger.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error);
            if (attempt === maxRetries) {
                break;
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }
    throw lastError;
};
exports.withRetry = withRetry;
// Database cleanup utility
const cleanupOldRecords = async (collection, field, olderThanDays) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        if (!mongoose_1.default.connection.db) {
            throw new Error('Database connection not available');
        }
        const result = await mongoose_1.default.connection.db.collection(collection).deleteMany({
            [field]: { $lt: cutoffDate }
        });
        logger_1.dbLogger.info(`Cleaned up ${result.deletedCount} old records from ${collection}`);
        return result.deletedCount;
    }
    catch (error) {
        logger_1.dbLogger.error(`Failed to cleanup old records from ${collection}:`, error);
        throw error;
    }
};
exports.cleanupOldRecords = cleanupOldRecords;
// Set up graceful shutdown for database connections
process.on('SIGINT', async () => {
    logger_1.dbLogger.info('Received SIGINT. Closing database connections...');
    await (0, exports.disconnectDatabase)();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    logger_1.dbLogger.info('Received SIGTERM. Closing database connections...');
    await (0, exports.disconnectDatabase)();
    process.exit(0);
});
exports.default = {
    connect: exports.connectDatabase,
    disconnect: exports.disconnectDatabase,
    getMongoConnection: exports.getMongoConnection,
    getRedisClient: exports.getRedisClient,
    checkMongoHealth: exports.checkMongoHealth,
    checkRedisHealth: exports.checkRedisHealth,
    withRetry: exports.withRetry,
    cleanupOldRecords: exports.cleanupOldRecords
};
//# sourceMappingURL=database.js.map