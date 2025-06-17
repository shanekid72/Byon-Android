import { Build, BuildStatus, BuildQuery } from '../types/build.types';
export declare class BuildService {
    /**
     * Create a new build record in the database
     */
    createBuild(build: Build): Promise<Build>;
    /**
     * Queue a build for processing
     */
    queueBuild(build: Build): Promise<void>;
    /**
     * Add to queue (temporary implementation)
     */
    private addToQueue;
    /**
     * Get a build by ID
     */
    getBuildById(buildId: string): Promise<Build | null>;
    /**
     * Update build status
     */
    updateBuildStatus(buildId: string, status: BuildStatus, progress: number): Promise<void>;
    /**
     * Get build logs
     */
    getBuildLogs(buildId: string): Promise<string[]>;
    /**
     * Get download URL for a build
     */
    getDownloadUrl(buildId: string): Promise<string | null>;
    /**
     * Cancel a build
     */
    cancelBuild(buildId: string): Promise<void>;
    /**
     * Get builds based on query parameters
     */
    getBuilds(query: BuildQuery): Promise<{
        builds: Build[];
        total: number;
        page: number;
        limit: number;
    }>;
    /**
     * Calculate estimated time remaining for a build
     */
    calculateEstimatedTimeRemaining(build: Build): number;
    /**
     * Load builds from file (simulated database)
     */
    private loadBuildsFromFile;
    /**
     * Save builds to file (simulated database)
     */
    private saveBuildsToFile;
}
//# sourceMappingURL=BuildService.d.ts.map