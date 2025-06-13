import mongoose, { Document } from 'mongoose';
export interface IPartner extends Document {
    id: string;
    name: string;
    email: string;
    company: string;
    phone?: string;
    apiKey: string;
    status: 'active' | 'inactive' | 'suspended';
    tier: 'basic' | 'premium' | 'enterprise';
    configuration: {
        maxConcurrentBuilds: number;
        maxBuildsPerMonth: number;
        allowedBuildTypes: Array<'debug' | 'release'>;
        features: {
            customBranding: boolean;
            pushNotifications: boolean;
            analytics: boolean;
            offlineMode: boolean;
            multiLanguage: boolean;
            darkMode: boolean;
            biometricAuth: boolean;
            customSplash: boolean;
        };
        webhookUrl?: string;
        notificationPreferences: {
            email: boolean;
            sms: boolean;
            webhook: boolean;
        };
    };
    billing: {
        plan: string;
        subscriptionId?: string;
        lastPayment?: Date;
        nextBilling?: Date;
        totalSpent: number;
    };
    usage: {
        buildsThisMonth: number;
        totalBuilds: number;
        storageUsed: number;
        bandwidthUsed: number;
    };
    lastLogin?: Date;
    lastBuildAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Partner: mongoose.Model<IPartner, {}, {}, {}, mongoose.Document<unknown, {}, IPartner, {}> & IPartner & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Partner.model.d.ts.map