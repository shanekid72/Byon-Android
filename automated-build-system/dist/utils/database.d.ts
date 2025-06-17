import mongoose from 'mongoose';
export declare const connectDatabase: () => Promise<void>;
export declare const disconnectDatabase: () => Promise<void>;
export declare const getMongoConnection: () => typeof mongoose;
export declare const getRedisClient: () => any;
export declare const checkMongoHealth: () => Promise<{
    status: string;
    details?: any;
}>;
export declare const checkRedisHealth: () => Promise<{
    status: string;
    details?: any;
}>;
export declare const withRetry: <T>(operation: () => Promise<T>, maxRetries?: number, delay?: number) => Promise<T>;
export declare const cleanupOldRecords: (collection: string, field: string, olderThanDays: number) => Promise<number>;
declare const _default: {
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    getMongoConnection: () => typeof mongoose;
    getRedisClient: () => any;
    checkMongoHealth: () => Promise<{
        status: string;
        details?: any;
    }>;
    checkRedisHealth: () => Promise<{
        status: string;
        details?: any;
    }>;
    withRetry: <T>(operation: () => Promise<T>, maxRetries?: number, delay?: number) => Promise<T>;
    cleanupOldRecords: (collection: string, field: string, olderThanDays: number) => Promise<number>;
};
export default _default;
//# sourceMappingURL=database.d.ts.map