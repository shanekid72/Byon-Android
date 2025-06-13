import mongoose from 'mongoose';
export declare const connectDatabase: () => Promise<void>;
export declare const connectRedis: () => Promise<any>;
export declare const checkDatabaseConnection: () => Promise<boolean>;
export declare const checkRedisConnection: () => Promise<boolean>;
export declare const getDatabaseStats: () => Promise<{
    mongodb: {
        connected: boolean;
        database: string;
        collections: any;
        dataSize: any;
        indexSize: any;
    };
    redis: {
        connected: any;
        info: any;
    };
}>;
export declare const getMongoConnection: () => typeof mongoose;
export declare const getRedisClient: () => any;
export declare const closeConnections: () => Promise<void>;
export declare const initializeDatabases: () => Promise<void>;
//# sourceMappingURL=database.d.ts.map