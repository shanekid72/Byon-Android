"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildQueueManager = void 0;
const bull_1 = __importDefault(require("bull"));
const ioredis_1 = require("ioredis");
const temp_utils_1 = require("../utils/temp-utils");
const Build_model_1 = require("../models/Build.model");
const Partner_model_1 = require("../models/Partner.model");
const AndroidBuildService_1 = require("./AndroidBuildService");
class BuildQueueManager {
    constructor(statusService) {
        this.maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_BUILDS || '3');
        this.statusService = statusService;
        this.androidBuildService = new AndroidBuildService_1.AndroidBuildService();
        this.redis = new ioredis_1.Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3
        });
        this.queue = new bull_1.default('android-builds', {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD
            },
            defaultJobOptions: {
                removeOnComplete: 10,
                removeOnFail: 50,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            }
        });
        this.setupQueueProcessors();
        this.setupEventHandlers();
    }
    setupQueueProcessors() {
        this.queue.process('android-build', this.maxConcurrentJobs, async (job) => {
            return this.processBuildJob(job);
        });
    }
    setupEventHandlers() {
        this.queue.on('active', (job) => {
            temp_utils_1.logger.info(`Build job started: ${job.data.buildId}`);
        });
        this.queue.on('completed', (job, result) => {
            temp_utils_1.logger.info(`Build job completed: ${job.data.buildId}`, result);
        });
        this.queue.on('failed', (job, error) => {
            temp_utils_1.logger.error(`Build job failed: ${job.data.buildId}`, error);
        });
        this.queue.on('stalled', (job) => {
            temp_utils_1.logger.warn(`Build job stalled: ${job.data.buildId}`);
        });
        this.queue.on('progress', (job, progress) => {
            this.statusService.emitBuildProgress(job.data.buildId, {
                status: 'in-progress',
                progress,
                currentStep: `Build progress: ${progress}%`
            });
        });
    }
    async addBuildJob(buildJob) {
        try {
            const partner = await Partner_model_1.Partner.findById(buildJob.partnerId);
            let priority = 0;
            if (partner) {
                switch (partner.tier) {
                    case 'enterprise':
                        priority = 3;
                        break;
                    case 'premium':
                        priority = 2;
                        break;
                    case 'basic':
                    default:
                        priority = 1;
                        break;
                }
            }
            const job = await this.queue.add('android-build', buildJob, {
                priority,
                delay: 0
            });
            temp_utils_1.logger.info(`Build job queued: ${buildJob.buildId}`, {
                jobId: job.id,
                priority,
                partnerId: buildJob.partnerId
            });
            return job;
        }
        catch (error) {
            temp_utils_1.logger.error('Failed to add build job to queue:', error);
            throw error;
        }
    }
    async processBuildJob(job) {
        const { buildId, partnerConfig, buildType, assets } = job.data;
        try {
            await Build_model_1.Build.findByIdAndUpdate(buildId, {
                status: 'in-progress',
                progress: 0,
                currentStep: 'Starting build process',
                startedAt: new Date()
            });
            this.statusService.emitBuildProgress(buildId, {
                status: 'in-progress',
                progress: 0,
                currentStep: 'Starting build process'
            });
            const buildConfig = {
                buildId,
                partnerConfig,
                buildType,
                assets
            };
            const buildResult = await this.androidBuildService.buildAndroidApp(buildConfig);
            if (buildResult.success) {
                await Build_model_1.Build.findByIdAndUpdate(buildId, {
                    status: 'completed',
                    progress: 100,
                    currentStep: 'Build completed successfully',
                    completedAt: new Date(),
                    artifacts: buildResult.artifacts,
                    buildDuration: buildResult.buildDuration
                });
                this.statusService.emitBuildProgress(buildId, {
                    status: 'completed',
                    progress: 100,
                    currentStep: 'Build completed successfully',
                    artifacts: buildResult.artifacts
                });
                await this.updatePartnerUsage(job.data.partnerId);
                return buildResult;
            }
            else {
                throw new Error(buildResult.error || 'Android build failed');
            }
        }
        catch (error) {
            temp_utils_1.logger.error(`Build job failed for ${buildId}:`, error);
            await Build_model_1.Build.findByIdAndUpdate(buildId, {
                status: 'failed',
                currentStep: 'Build failed',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                completedAt: new Date()
            });
            this.statusService.emitBuildProgress(buildId, {
                status: 'failed',
                progress: 0,
                currentStep: 'Build failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async updatePartnerUsage(partnerId) {
        try {
            await Partner_model_1.Partner.findByIdAndUpdate(partnerId, {
                $inc: { 'usage.totalBuilds': 1 },
                lastBuildAt: new Date()
            });
        }
        catch (error) {
            temp_utils_1.logger.error('Failed to update partner usage:', error);
        }
    }
    async cancelBuild(buildId) {
        try {
            const jobs = await this.queue.getJobs(['waiting', 'active', 'delayed']);
            const job = jobs.find(j => j.data.buildId === buildId);
            if (job) {
                await job.remove();
                await Build_model_1.Build.findByIdAndUpdate(buildId, {
                    status: 'cancelled',
                    currentStep: 'Build cancelled by user',
                    completedAt: new Date()
                });
                this.statusService.emitBuildProgress(buildId, {
                    status: 'cancelled',
                    progress: 0,
                    currentStep: 'Build cancelled'
                });
                temp_utils_1.logger.info(`Build cancelled: ${buildId}`);
                return true;
            }
            return false;
        }
        catch (error) {
            temp_utils_1.logger.error(`Failed to cancel build ${buildId}:`, error);
            return false;
        }
    }
    async getQueueStats() {
        try {
            const waiting = await this.queue.getWaiting();
            const active = await this.queue.getActive();
            const completed = await this.queue.getCompleted();
            const failed = await this.queue.getFailed();
            return {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                total: waiting.length + active.length + completed.length + failed.length
            };
        }
        catch (error) {
            temp_utils_1.logger.error('Failed to get queue stats:', error);
            return {
                waiting: 0,
                active: 0,
                completed: 0,
                failed: 0,
                total: 0
            };
        }
    }
    async getBuildPosition(buildId) {
        try {
            const waitingJobs = await this.queue.getWaiting();
            const position = waitingJobs.findIndex(job => job.data.buildId === buildId);
            return position >= 0 ? position + 1 : null;
        }
        catch (error) {
            temp_utils_1.logger.error(`Failed to get build position for ${buildId}:`, error);
            return null;
        }
    }
    async cleanup() {
        try {
            await this.queue.close();
            await this.redis.quit();
            temp_utils_1.logger.info('BuildQueueManager cleanup completed');
        }
        catch (error) {
            temp_utils_1.logger.error('Error during BuildQueueManager cleanup:', error);
        }
    }
}
exports.BuildQueueManager = BuildQueueManager;
//# sourceMappingURL=BuildQueueManager.js.map