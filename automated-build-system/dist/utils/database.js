"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabases = exports.closeConnections = exports.getRedisClient = exports.getMongoConnection = exports.getDatabaseStats = exports.checkRedisConnection = exports.checkDatabaseConnection = exports.connectRedis = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const redis_1 = __importDefault(require("redis"));
const temp_utils_1 = require("./temp-utils");
let redisClient = null;
let mongoConnection = null;
const mongoConfig = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
};
const redisConfig = {
    socket: {
        connectTimeout: 60000,
        lazyConnect: true,
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
    },
    retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
            return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
    }
};
const connectDatabase = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lulupay_builds';
        mongoose_1.default.set('strictQuery', false);
        const conn = await mongoose_1.default.connect(mongoUri, mongoConfig);
        mongoConnection = conn;
        temp_utils_1.logger.info(`MongoDB Connected: ${conn.connection.host}`);
        mongoose_1.default.connection.on('error', (err) => {
            temp_utils_1.logger.error('MongoDB connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            temp_utils_1.logger.warn('MongoDB disconnected');
        });
        mongoose_1.default.connection.on('reconnected', () => {
            temp_utils_1.logger.info('MongoDB reconnected');
        });
    }
    catch (error) {
        temp_utils_1.logger.error('MongoDB connection failed:', error);
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
};
exports.connectDatabase = connectDatabase;
const connectRedis = async () => {
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        redisClient = redis_1.default.createClient({
            url: redisUrl,
            ...redisConfig
        });
        redisClient.on('error', (err) => {
            temp_utils_1.logger.error('Redis connection error:', err);
        });
        redisClient.on('connect', () => {
            temp_utils_1.logger.info('Redis connected successfully');
        });
        redisClient.on('ready', () => {
            temp_utils_1.logger.info('Redis ready to receive commands');
        });
        redisClient.on('reconnecting', () => {
            temp_utils_1.logger.info('Redis reconnecting...');
        });
        await redisClient.connect();
        return redisClient;
    }
    catch (error) {
        temp_utils_1.logger.error('Redis connection failed:', error);
        if (process.env.NODE_ENV === 'production') {
            throw error;
        }
        return null;
    }
};
exports.connectRedis = connectRedis;
const checkDatabaseConnection = async () => {
    try {
        if (!mongoConnection) {
            return false;
        }
        const state = mongoose_1.default.connection.readyState;
        return state === 1;
    }
    catch (error) {
        temp_utils_1.logger.error('Database health check failed:', error);
        return false;
    }
};
exports.checkDatabaseConnection = checkDatabaseConnection;
const checkRedisConnection = async () => {
    try {
        if (!redisClient || !redisClient.isOpen) {
            return false;
        }
        const result = await redisClient.ping();
        return result === 'PONG';
    }
    catch (error) {
        temp_utils_1.logger.error('Redis health check failed:', error);
        return false;
    }
};
exports.checkRedisConnection = checkRedisConnection;
const getDatabaseStats = async () => {
    try {
        const mongoStats = await mongoose_1.default.connection.db?.stats();
        const redisInfo = redisClient ? await redisClient.info() : null;
        return {
            mongodb: {
                connected: mongoose_1.default.connection.readyState === 1,
                database: mongoose_1.default.connection.name,
                collections: mongoStats?.collections || 0,
                dataSize: mongoStats?.dataSize || 0,
                indexSize: mongoStats?.indexSize || 0
            },
            redis: {
                connected: redisClient?.isOpen || false,
                info: redisInfo ? redisInfo.split('\r\n').slice(0, 5) : []
            }
        };
    }
    catch (error) {
        temp_utils_1.logger.error('Failed to get database stats:', error);
        return null;
    }
};
exports.getDatabaseStats = getDatabaseStats;
const getMongoConnection = () => mongoConnection;
exports.getMongoConnection = getMongoConnection;
const getRedisClient = () => redisClient;
exports.getRedisClient = getRedisClient;
const closeConnections = async () => {
    try {
        if (mongoConnection) {
            await mongoose_1.default.connection.close();
            mongoConnection = null;
            temp_utils_1.logger.info('MongoDB connection closed');
        }
        if (redisClient && redisClient.isOpen) {
            await redisClient.quit();
            redisClient = null;
            temp_utils_1.logger.info('Redis connection closed');
        }
    }
    catch (error) {
        temp_utils_1.logger.error('Error closing database connections:', error);
    }
};
exports.closeConnections = closeConnections;
const initializeDatabases = async () => {
    temp_utils_1.logger.info('Initializing database connections...');
    await Promise.allSettled([
        (0, exports.connectDatabase)(),
        (0, exports.connectRedis)()
    ]);
    temp_utils_1.logger.info('Database initialization completed');
};
exports.initializeDatabases = initializeDatabases;
//# sourceMappingURL=database.js.map