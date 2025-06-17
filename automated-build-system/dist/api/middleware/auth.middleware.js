"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../../utils/logger");
/**
 * Authentication middleware
 * Verifies JWT token and adds user information to request object
 */
const authMiddleware = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'No authorization header provided'
            });
        }
        // Check if token is in correct format
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Invalid authentication format',
                message: 'Authorization header must start with Bearer'
            });
        }
        // Extract token from header
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'No token provided'
            });
        }
        // Verify token
        const secret = process.env.JWT_SECRET || 'default-secret-key-for-development';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Add user information to request object
        req.user = decoded;
        next();
    }
    catch (error) {
        logger_1.logger.error('Authentication error:', error);
        if (typeof error === 'object' && error !== null && 'name' in error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expired',
                    message: 'Your session has expired. Please log in again.'
                });
            }
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid token',
                    message: 'The provided authentication token is invalid.'
                });
            }
        }
        return res.status(500).json({
            success: false,
            error: 'Authentication error',
            message: 'An error occurred during authentication.'
        });
    }
};
exports.authMiddleware = authMiddleware;
/**
 * Admin middleware
 * Ensures the authenticated user is an admin
 */
const adminMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            message: 'You must be authenticated to access this resource.'
        });
    }
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You do not have permission to access this resource.'
        });
    }
    next();
};
exports.adminMiddleware = adminMiddleware;
//# sourceMappingURL=auth.middleware.js.map