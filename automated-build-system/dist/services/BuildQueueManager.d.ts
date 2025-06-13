import { Job } from 'bull';
import { BuildStatusService } from './BuildStatusService';
export interface IBuildJob {
    buildId: string;
    partnerId: string;
    partnerConfig: {
        appName: string;
        packageName: string;
        version: string;
        description?: string;
        branding: {
            primaryColor: string;
            secondaryColor: string;
            logo?: string;
            splashScreen?: string;
        };
        features: {
            [key: string]: boolean;
        };
    };
    buildType: 'debug' | 'release';
    assets: Array<{
        filename: string;
        originalName: string;
        path: string;
        mimetype: string;
    }>;
    priority?: number;
}
export declare class BuildQueueManager {
    private queue;
    private redis;
    private statusService;
    private androidBuildService;
    private readonly maxConcurrentJobs;
    constructor(statusService: BuildStatusService);
    private setupQueueProcessors;
    private setupEventHandlers;
    addBuildJob(buildJob: IBuildJob): Promise<Job<IBuildJob>>;
    private processBuildJob;
    private updatePartnerUsage;
    cancelBuild(buildId: string): Promise<boolean>;
    getQueueStats(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        total: number;
    }>;
    getBuildPosition(buildId: string): Promise<number | null>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=BuildQueueManager.d.ts.map