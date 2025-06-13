"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBuildQueueManager = exports.initializeQueue = exports.BuildQueueManager = void 0;
const bull_1 = __importDefault(require("bull"));
const temp_utils_1 = require("../utils/temp-utils");
class BuildQueueManager {
    constructor() {
        this.QUEUE_NAME = 'android-builds';
        this.buildQueue = new bull_1.default(this.QUEUE_NAME, {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            },
            defaultJobOptions: {
                removeOnComplete: 10,
                removeOnFail: 50,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
            },
        });
        this.setupEventHandlers();
        this.setupJobProcessor();
    }
    async addBuildJob(jobData) {
        try {
            const job = await this.buildQueue.add(jobData, {
                priority: this.getPriorityByTier('basic'),
                delay: 0,
                jobId: jobData.buildId,
            });
            temp_utils_1.logger.info(`Build job added to queue: ${jobData.buildId}`);
            return job;
        }
        catch (error) {
            temp_utils_1.logger.error('Failed to add build job to queue:', error);
            throw error;
        }
    }
    async getQueueStats() {
        try {
            const [waiting, active, completed, failed] = await Promise.all([
                this.buildQueue.getWaiting(),
                this.buildQueue.getActive(),
                this.buildQueue.getCompleted(),
                this.buildQueue.getFailed(),
            ]);
            return {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
            };
        }
        catch (error) {
            temp_utils_1.logger.error('Failed to get queue stats:', error);
            return null;
        }
    }
    getPriorityByTier(tier) {
        switch (tier) {
            case 'enterprise': return 1;
            case 'premium': return 5;
            case 'basic': return 10;
            default: return 15;
        }
    }
    setupEventHandlers() {
        this.buildQueue.on('completed', async (job, result) => {
            temp_utils_1.logger.info(`Build job completed: ${job.id}`);
        });
        this.buildQueue.on('failed', async (job, err) => {
            temp_utils_1.logger.error(`Build job failed: ${job.id}`, err);
        });
        this.buildQueue.on('active', async (job) => {
            temp_utils_1.logger.info(`Build job started: ${job.id}`);
        });
    }
    setupJobProcessor() {
        this.buildQueue.process(async (job) => {
            const { buildId } = job.data;
            try {
                temp_utils_1.logger.info(`Processing build job: ${buildId}`);
                const steps = [10, 25, 50, 75, 100];
                for (let i = 0; i < steps.length; i++) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    job.progress(steps[i]);
                }
                return {
                    success: true,
                    buildId,
                    artifacts: {
                        apkPath: `/builds/${buildId}/app.apk`,
                    },
                };
            }
            catch (error) {
                temp_utils_1.logger.error(`Build job processing failed: ${buildId}`, error);
                throw error;
            }
        });
    }
    async close() {
        await this.buildQueue.close();
        temp_utils_1.logger.info('Build queue manager closed');
    }
}
exports.BuildQueueManager = BuildQueueManager;
let buildQueueManager = null;
const initializeQueue = async () => {
    if (!buildQueueManager) {
        buildQueueManager = new BuildQueueManager();
        temp_utils_1.logger.info('Build queue manager initialized');
    }
    return buildQueueManager;
};
exports.initializeQueue = initializeQueue;
const getBuildQueueManager = () => {
    if (!buildQueueManager) {
        throw new Error('Build queue manager not initialized');
    }
    return buildQueueManager;
};
exports.getBuildQueueManager = getBuildQueueManager;
//# sourceMappingURL=QueueManager.js.map