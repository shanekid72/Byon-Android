import winston from 'winston';
export declare const logger: winston.Logger;
export declare const buildLogger: winston.Logger;
export declare const apiLogger: winston.Logger;
export declare const dbLogger: winston.Logger;
export declare const queueLogger: winston.Logger;
export declare const dockerLogger: winston.Logger;
export declare const logBuildStart: (buildId: string, partnerId: string) => void;
export declare const logBuildProgress: (buildId: string, stage: string, progress: number, message?: string) => void;
export declare const logBuildComplete: (buildId: string, status: "success" | "failed", buildTime?: number) => void;
export declare const logBuildError: (buildId: string, stage: string, error: Error | string) => void;
export declare const logApiRequest: (method: string, url: string, userId?: string, duration?: number) => void;
export declare const logApiError: (method: string, url: string, error: Error | string, statusCode?: number) => void;
export declare const logDatabaseOperation: (operation: string, collection?: string, duration?: number) => void;
export declare const logQueueOperation: (operation: string, jobId?: string, status?: string) => void;
export declare const logDockerOperation: (operation: string, containerId?: string, image?: string) => void;
export declare const createTimer: (label: string) => {
    end: () => number;
};
export declare const morganStream: {
    write: (message: string) => void;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map