"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildValidator = void 0;
const logger_1 = require("../../utils/logger");
/**
 * Validation middleware for build-related requests
 */
class BuildValidator {
    /**
     * Validate create build request
     */
    static validateCreateBuild(req, res, next) {
        try {
            const { partnerId, config } = req.body;
            // Check if required fields are present
            if (!partnerId) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: 'partnerId is required'
                });
            }
            if (!config) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: 'config is required'
                });
            }
            // Validate config fields
            const requiredConfigFields = [
                'partnerName',
                'appName',
                'packageName',
                'primaryColor',
                'secondaryColor'
            ];
            const missingFields = requiredConfigFields.filter(field => !config[field]);
            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: `Missing required config fields: ${missingFields.join(', ')}`
                });
            }
            // Validate package name format
            const packageNameRegex = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+[0-9a-z_]$/i;
            if (!packageNameRegex.test(config.packageName)) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: 'Invalid package name format. Must be in format like "com.example.app"'
                });
            }
            // Validate color format (hex)
            const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            if (!colorRegex.test(config.primaryColor) || !colorRegex.test(config.secondaryColor)) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: 'Colors must be in hex format (e.g., #FF5500)'
                });
            }
            // If user is not an admin, ensure they can only create builds for their own partnerId
            if (req.user && !req.user.isAdmin && req.user.partnerId !== partnerId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'You can only create builds for your own partner ID'
                });
            }
            next();
        }
        catch (error) {
            logger_1.logger.error('Validation error:', error);
            res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'Invalid request data'
            });
        }
    }
    /**
     * Validate build ID parameter
     */
    static validateBuildId(req, res, next) {
        const buildId = req.params.id;
        if (!buildId) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'Build ID is required'
            });
        }
        if (!buildId.startsWith('build-')) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'Invalid build ID format'
            });
        }
        next();
    }
}
exports.BuildValidator = BuildValidator;
//# sourceMappingURL=validation.middleware.js.map