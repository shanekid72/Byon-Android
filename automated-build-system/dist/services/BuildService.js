"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildService = void 0;
const logger_1 = require("../utils/logger");
const build_types_1 = require("../types/build.types");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class BuildService {
    /**
     * Create a new build record in the database
     */
    async createBuild(build) {
        logger_1.logger.info(`Creating build record for partner ${build.partnerId}`);
        try {
            // In a real implementation, this would insert into a database
            // For now, we'll simulate by writing to a JSON file
            const builds = this.loadBuildsFromFile();
            builds.push(build);
            this.saveBuildsToFile(builds);
            return build;
        }
        catch (error) {
            logger_1.logger.error('Failed to create build record:', error);
            throw new Error('Failed to create build record');
        }
    }
    /**
     * Queue a build for processing
     */
    async queueBuild(build) {
        logger_1.logger.info(`Queueing build ${build.id} for processing`);
        try {
            // Add to queue for processing
            await this.addToQueue('build', {
                buildId: build.id,
                partnerId: build.partnerId,
                config: build.config
            });
            logger_1.logger.info(`Build ${build.id} added to queue`);
        }
        catch (error) {
            logger_1.logger.error('Failed to queue build:', error);
            // Update build status to failed
            await this.updateBuildStatus(build.id, build_types_1.BuildStatus.FAILED, 0);
            throw new Error('Failed to queue build');
        }
    }
    /**
     * Add to queue (temporary implementation)
     */
    async addToQueue(queueName, data) {
        // In a real implementation, this would use a queue system like Bull or RabbitMQ
        // For now, we'll just log the queue request
        logger_1.logger.info(`[MOCK] Adding to queue ${queueName}:`, data);
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'mock-job-id';
    }
    /**
     * Get a build by ID
     */
    async getBuildById(buildId) {
        logger_1.logger.info(`Getting build ${buildId}`);
        try {
            // In a real implementation, this would query a database
            const builds = this.loadBuildsFromFile();
            const build = builds.find(b => b.id === buildId);
            return build || null;
        }
        catch (error) {
            logger_1.logger.error('Failed to get build:', error);
            throw new Error('Failed to get build');
        }
    }
    /**
     * Update build status
     */
    async updateBuildStatus(buildId, status, progress) {
        logger_1.logger.info(`Updating build ${buildId} status to ${status} (${progress}%)`);
        try {
            // In a real implementation, this would update a database record
            const builds = this.loadBuildsFromFile();
            const buildIndex = builds.findIndex(b => b.id === buildId);
            if (buildIndex === -1) {
                throw new Error(`Build ${buildId} not found`);
            }
            builds[buildIndex].status = status;
            builds[buildIndex].progress = progress;
            builds[buildIndex].updatedAt = new Date();
            this.saveBuildsToFile(builds);
            logger_1.logger.info(`Build ${buildId} status updated to ${status}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to update build status:', error);
            throw new Error('Failed to update build status');
        }
    }
    /**
     * Get build logs
     */
    async getBuildLogs(buildId) {
        logger_1.logger.info(`Getting logs for build ${buildId}`);
        try {
            // In a real implementation, this would fetch logs from a storage system
            // For now, we'll return simulated logs
            return [
                `[${new Date().toISOString()}] Build ${buildId} started`,
                `[${new Date().toISOString()}] Cloning repository...`,
                `[${new Date().toISOString()}] Installing dependencies...`,
                `[${new Date().toISOString()}] Configuring build...`,
                `[${new Date().toISOString()}] Compiling...`,
                `[${new Date().toISOString()}] Running tests...`,
                `[${new Date().toISOString()}] Packaging application...`,
                `[${new Date().toISOString()}] Build completed`
            ];
        }
        catch (error) {
            logger_1.logger.error('Failed to get build logs:', error);
            throw new Error('Failed to get build logs');
        }
    }
    /**
     * Get download URL for a build
     */
    async getDownloadUrl(buildId) {
        logger_1.logger.info(`Getting download URL for build ${buildId}`);
        try {
            // In a real implementation, this would generate a signed URL for the build artifacts
            // For now, we'll return a simulated URL
            const build = await this.getBuildById(buildId);
            if (!build || build.status !== build_types_1.BuildStatus.COMPLETED) {
                return null;
            }
            return `https://storage.lulupay.com/builds/${buildId}/app-release.apk`;
        }
        catch (error) {
            logger_1.logger.error('Failed to get download URL:', error);
            throw new Error('Failed to get download URL');
        }
    }
    /**
     * Cancel a build
     */
    async cancelBuild(buildId) {
        logger_1.logger.info(`Cancelling build ${buildId}`);
        try {
            // Update build status to cancelled
            await this.updateBuildStatus(buildId, build_types_1.BuildStatus.CANCELLED, 0);
            // In a real implementation, this would also remove the build from the queue
            // or stop the build process if it's already running
            logger_1.logger.info(`Build ${buildId} cancelled`);
        }
        catch (error) {
            logger_1.logger.error('Failed to cancel build:', error);
            throw new Error('Failed to cancel build');
        }
    }
    /**
     * Get builds based on query parameters
     */
    async getBuilds(query) {
        logger_1.logger.info(`Getting builds for partner ${query.partnerId}`);
        try {
            // In a real implementation, this would query a database with pagination
            const builds = this.loadBuildsFromFile();
            // Filter by partnerId if provided
            let filteredBuilds = builds;
            if (query.partnerId) {
                filteredBuilds = builds.filter(b => b.partnerId === query.partnerId);
            }
            // Filter by status if provided
            if (query.status) {
                filteredBuilds = filteredBuilds.filter(b => b.status === query.status);
            }
            // Sort by createdAt (newest first)
            filteredBuilds.sort((a, b) => {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            // Apply pagination
            const page = query.page || 1;
            const limit = query.limit || 10;
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            const paginatedBuilds = filteredBuilds.slice(startIndex, endIndex);
            return {
                builds: paginatedBuilds,
                total: filteredBuilds.length,
                page,
                limit
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get builds:', error);
            throw new Error('Failed to get builds');
        }
    }
    /**
     * Calculate estimated time remaining for a build
     */
    calculateEstimatedTimeRemaining(build) {
        // In a real implementation, this would use historical data and the current progress
        // to estimate the remaining time
        // For now, we'll use a simple formula:
        // - Average build takes 5 minutes (300 seconds)
        // - Remaining time = (100 - progress) / 100 * 300
        if (build.status === build_types_1.BuildStatus.COMPLETED || build.status === build_types_1.BuildStatus.FAILED || build.status === build_types_1.BuildStatus.CANCELLED) {
            return 0;
        }
        if (build.status === build_types_1.BuildStatus.QUEUED) {
            // Queued builds have an additional wait time
            return 300 + 60; // 5 minutes build time + 1 minute queue time
        }
        const remainingPercentage = 100 - build.progress;
        return Math.round((remainingPercentage / 100) * 300);
    }
    /**
     * Load builds from file (simulated database)
     */
    loadBuildsFromFile() {
        try {
            const dataDir = path_1.default.join(__dirname, '../../data');
            const filePath = path_1.default.join(dataDir, 'builds.json');
            // Create directory if it doesn't exist
            if (!fs_1.default.existsSync(dataDir)) {
                fs_1.default.mkdirSync(dataDir, { recursive: true });
            }
            // Create file if it doesn't exist
            if (!fs_1.default.existsSync(filePath)) {
                fs_1.default.writeFileSync(filePath, JSON.stringify([]));
            }
            const data = fs_1.default.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        catch (error) {
            logger_1.logger.error('Failed to load builds from file:', error);
            return [];
        }
    }
    /**
     * Save builds to file (simulated database)
     */
    saveBuildsToFile(builds) {
        try {
            const dataDir = path_1.default.join(__dirname, '../../data');
            const filePath = path_1.default.join(dataDir, 'builds.json');
            // Create directory if it doesn't exist
            if (!fs_1.default.existsSync(dataDir)) {
                fs_1.default.mkdirSync(dataDir, { recursive: true });
            }
            fs_1.default.writeFileSync(filePath, JSON.stringify(builds, null, 2));
        }
        catch (error) {
            logger_1.logger.error('Failed to save builds to file:', error);
            throw new Error('Failed to save builds to file');
        }
    }
}
exports.BuildService = BuildService;
//# sourceMappingURL=BuildService.js.map