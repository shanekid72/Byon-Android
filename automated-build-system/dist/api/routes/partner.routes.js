"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partnerRoutes = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const temp_utils_1 = require("../../utils/temp-utils");
const router = (0, express_1.Router)();
exports.partnerRoutes = router;
router.post('/register', async (req, res) => {
    try {
        const { name, email, company, phone } = req.body;
        const partner = {
            id: (0, uuid_1.v4)(),
            name,
            email,
            company,
            phone,
            apiKey: `lulu_${(0, uuid_1.v4)().replace(/-/g, '')}`,
            status: 'active',
            createdAt: new Date(),
            builds: [],
            configuration: {
                maxConcurrentBuilds: 3,
                allowedBuildTypes: ['debug', 'release'],
                features: {
                    customBranding: true,
                    pushNotifications: true,
                    analytics: true,
                    offlineMode: false
                }
            }
        };
        temp_utils_1.logger.info('New partner registered:', { partnerId: partner.id, email: partner.email });
        res.status(201).json({
            success: true,
            data: {
                partner: {
                    id: partner.id,
                    name: partner.name,
                    email: partner.email,
                    company: partner.company,
                    apiKey: partner.apiKey,
                    status: partner.status,
                    createdAt: partner.createdAt
                },
                message: 'Partner registered successfully'
            }
        });
    }
    catch (error) {
        temp_utils_1.logger.error('Partner registration failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register partner',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const partner = {
            id,
            name: 'Sample Partner',
            email: 'partner@example.com',
            company: 'Sample Company',
            phone: '+1234567890',
            status: 'active',
            createdAt: new Date('2024-01-01'),
            lastLogin: new Date(),
            totalBuilds: 15,
            activeBuilds: 2,
            configuration: {
                maxConcurrentBuilds: 3,
                allowedBuildTypes: ['debug', 'release'],
                features: {
                    customBranding: true,
                    pushNotifications: true,
                    analytics: true,
                    offlineMode: false
                }
            }
        };
        res.status(200).json({
            success: true,
            data: partner
        });
    }
    catch (error) {
        temp_utils_1.logger.error('Failed to get partner details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve partner details'
        });
    }
});
router.put('/:id/config', async (req, res) => {
    try {
        const { id } = req.params;
        const { configuration } = req.body;
        temp_utils_1.logger.info('Partner configuration update:', { partnerId: id, config: configuration });
        res.status(200).json({
            success: true,
            data: {
                partnerId: id,
                configuration,
                updatedAt: new Date()
            },
            message: 'Configuration updated successfully'
        });
    }
    catch (error) {
        temp_utils_1.logger.error('Failed to update partner configuration:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update configuration'
        });
    }
});
router.get('/:id/builds', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, limit = 20, offset = 0 } = req.query;
        const builds = [
            {
                id: (0, uuid_1.v4)(),
                partnerId: id,
                appName: 'Partner Mobile Banking',
                status: 'completed',
                createdAt: new Date('2024-01-15'),
                completedAt: new Date('2024-01-15'),
                downloadCount: 5,
                fileSize: '25.4 MB'
            },
            {
                id: (0, uuid_1.v4)(),
                partnerId: id,
                appName: 'Partner Wallet App',
                status: 'in_progress',
                createdAt: new Date(),
                progress: 45,
                estimatedTimeRemaining: '12 minutes'
            }
        ];
        res.status(200).json({
            success: true,
            data: {
                partnerId: id,
                builds,
                pagination: {
                    total: builds.length,
                    limit: Number(limit),
                    offset: Number(offset)
                }
            }
        });
    }
    catch (error) {
        temp_utils_1.logger.error('Failed to get partner builds:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve partner builds'
        });
    }
});
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const stats = {
            partnerId: id,
            totalBuilds: 15,
            successfulBuilds: 13,
            failedBuilds: 2,
            averageBuildTime: '18 minutes',
            totalDownloads: 47,
            lastBuildDate: new Date(),
            monthlyStats: {
                builds: 8,
                downloads: 23,
                successRate: '87.5%'
            },
            popularFeatures: [
                { feature: 'customBranding', usage: 100 },
                { feature: 'pushNotifications', usage: 85 },
                { feature: 'analytics', usage: 92 },
                { feature: 'offlineMode', usage: 35 }
            ]
        };
        res.status(200).json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        temp_utils_1.logger.error('Failed to get partner statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve partner statistics'
        });
    }
});
router.post('/:id/regenerate-key', async (req, res) => {
    try {
        const { id } = req.params;
        const newApiKey = `lulu_${(0, uuid_1.v4)().replace(/-/g, '')}`;
        temp_utils_1.logger.info('API key regenerated for partner:', { partnerId: id });
        res.status(200).json({
            success: true,
            data: {
                partnerId: id,
                newApiKey,
                regeneratedAt: new Date()
            },
            message: 'API key regenerated successfully'
        });
    }
    catch (error) {
        temp_utils_1.logger.error('Failed to regenerate API key:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to regenerate API key'
        });
    }
});
//# sourceMappingURL=partner.routes.js.map