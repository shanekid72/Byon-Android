"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../../utils/logger");
const errorHandler = (error, req, res, next) => {
    logger_1.logger.error('API Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });
    // Default error
    let status = 500;
    let message = 'Internal Server Error';
    // Handle specific error types
    if (error.name === 'ValidationError') {
        status = 400;
        message = error.message;
    }
    else if (error.name === 'UnauthorizedError') {
        status = 401;
        message = 'Unauthorized';
    }
    else if (error.status) {
        status = error.status;
        message = error.message;
    }
    res.status(status).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.middleware.js.map