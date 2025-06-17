"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.morganStream = exports.createTimer = exports.logDockerOperation = exports.logQueueOperation = exports.logDatabaseOperation = exports.logApiError = exports.logApiRequest = exports.logBuildError = exports.logBuildComplete = exports.logBuildProgress = exports.logBuildStart = exports.dockerLogger = exports.queueLogger = exports.dbLogger = exports.apiLogger = exports.buildLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// Create logs directory if it doesn't exist
const logDir = process.env.LOG_DIR || './logs';
// Define log format
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.prettyPrint());
// Console format for development
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return log;
}));
// Create logger instance
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'lulupay-build-system' },
    transports: [
        // File transport for all logs
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // File transport for combined logs
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 10,
        }),
    ],
});
// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: consoleFormat,
        level: 'debug'
    }));
}
// Add console transport for production with info level
if (process.env.NODE_ENV === 'production' && process.env.LOG_CONSOLE === 'true') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: consoleFormat,
        level: 'info'
    }));
}
// Create specialized loggers
exports.buildLogger = exports.logger.child({ component: 'build' });
exports.apiLogger = exports.logger.child({ component: 'api' });
exports.dbLogger = exports.logger.child({ component: 'database' });
exports.queueLogger = exports.logger.child({ component: 'queue' });
exports.dockerLogger = exports.logger.child({ component: 'docker' });
// Helper functions for structured logging
const logBuildStart = (buildId, partnerId) => {
    exports.buildLogger.info('Build started', {
        buildId,
        partnerId,
        event: 'build_start',
        timestamp: new Date().toISOString()
    });
};
exports.logBuildStart = logBuildStart;
const logBuildProgress = (buildId, stage, progress, message) => {
    exports.buildLogger.info('Build progress', {
        buildId,
        stage,
        progress,
        message,
        event: 'build_progress',
        timestamp: new Date().toISOString()
    });
};
exports.logBuildProgress = logBuildProgress;
const logBuildComplete = (buildId, status, buildTime) => {
    exports.buildLogger.info('Build completed', {
        buildId,
        status,
        buildTime,
        event: 'build_complete',
        timestamp: new Date().toISOString()
    });
};
exports.logBuildComplete = logBuildComplete;
const logBuildError = (buildId, stage, error) => {
    exports.buildLogger.error('Build error', {
        buildId,
        stage,
        error: typeof error === 'string' ? error : error.message,
        stack: typeof error === 'object' ? error.stack : undefined,
        event: 'build_error',
        timestamp: new Date().toISOString()
    });
};
exports.logBuildError = logBuildError;
const logApiRequest = (method, url, userId, duration) => {
    exports.apiLogger.info('API request', {
        method,
        url,
        userId,
        duration,
        event: 'api_request',
        timestamp: new Date().toISOString()
    });
};
exports.logApiRequest = logApiRequest;
const logApiError = (method, url, error, statusCode) => {
    exports.apiLogger.error('API error', {
        method,
        url,
        error: typeof error === 'string' ? error : error.message,
        statusCode,
        event: 'api_error',
        timestamp: new Date().toISOString()
    });
};
exports.logApiError = logApiError;
const logDatabaseOperation = (operation, collection, duration) => {
    exports.dbLogger.info('Database operation', {
        operation,
        collection,
        duration,
        event: 'db_operation',
        timestamp: new Date().toISOString()
    });
};
exports.logDatabaseOperation = logDatabaseOperation;
const logQueueOperation = (operation, jobId, status) => {
    exports.queueLogger.info('Queue operation', {
        operation,
        jobId,
        status,
        event: 'queue_operation',
        timestamp: new Date().toISOString()
    });
};
exports.logQueueOperation = logQueueOperation;
const logDockerOperation = (operation, containerId, image) => {
    exports.dockerLogger.info('Docker operation', {
        operation,
        containerId,
        image,
        event: 'docker_operation',
        timestamp: new Date().toISOString()
    });
};
exports.logDockerOperation = logDockerOperation;
// Performance monitoring
const createTimer = (label) => {
    const start = Date.now();
    return {
        end: () => {
            const duration = Date.now() - start;
            exports.logger.debug(`Timer: ${label}`, { duration, label });
            return duration;
        }
    };
};
exports.createTimer = createTimer;
// Stream for Morgan HTTP logging
exports.morganStream = {
    write: (message) => {
        exports.apiLogger.info(message.trim());
    }
};
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map