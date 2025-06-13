import Bull from 'bull';
export interface BuildJobData {
    buildId: string;
    partnerId: string;
    partnerConfig: any;
    assets: any[];
    buildType: 'debug' | 'release';
}
export declare class BuildQueueManager {
    private buildQueue;
    private readonly QUEUE_NAME;
    constructor();
    addBuildJob(jobData: BuildJobData): Promise<Bull.Job<BuildJobData>>;
    getQueueStats(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
    }>;
    private getPriorityByTier;
    private setupEventHandlers;
    private setupJobProcessor;
    close(): Promise<void>;
}
export declare const initializeQueue: () => Promise<BuildQueueManager>;
export declare const getBuildQueueManager: () => BuildQueueManager;
//# sourceMappingURL=QueueManager.d.ts.map