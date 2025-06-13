import mongoose, { Document } from 'mongoose';
export interface IBuild extends Document {
    id: string;
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
    status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    currentStep?: string;
    estimatedTimeRemaining?: string;
    logs: Array<{
        timestamp: Date;
        level: 'info' | 'warn' | 'error' | 'debug';
        message: string;
        details?: any;
    }>;
    assets: Array<{
        filename: string;
        originalName: string;
        mimetype: string;
        size: number;
        path: string;
    }>;
    buildArtifacts?: {
        apkPath?: string;
        aabPath?: string;
        mappingFile?: string;
        buildReport?: string;
    };
    buildEnvironment?: {
        androidSdkVersion: string;
        buildToolsVersion: string;
        gradleVersion: string;
        javaVersion: string;
    };
    startedAt?: Date;
    completedAt?: Date;
    failureReason?: string;
    downloadCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Build: mongoose.Model<IBuild, {}, {}, {}, mongoose.Document<unknown, {}, IBuild, {}> & IBuild & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Build.model.d.ts.map