"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Partner = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PartnerSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    company: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    apiKey: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active',
        required: true
    },
    tier: {
        type: String,
        enum: ['basic', 'premium', 'enterprise'],
        default: 'basic',
        required: true
    },
    configuration: {
        maxConcurrentBuilds: {
            type: Number,
            default: 1,
            min: 1,
            max: 10
        },
        maxBuildsPerMonth: {
            type: Number,
            default: 10
        },
        allowedBuildTypes: {
            type: [String],
            enum: ['debug', 'release'],
            default: ['debug', 'release']
        },
        features: {
            customBranding: { type: Boolean, default: true },
            pushNotifications: { type: Boolean, default: true },
            analytics: { type: Boolean, default: false },
            offlineMode: { type: Boolean, default: false },
            multiLanguage: { type: Boolean, default: false },
            darkMode: { type: Boolean, default: true },
            biometricAuth: { type: Boolean, default: false },
            customSplash: { type: Boolean, default: true }
        },
        webhookUrl: String,
        notificationPreferences: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            webhook: { type: Boolean, default: false }
        }
    },
    billing: {
        plan: { type: String, default: 'free' },
        subscriptionId: String,
        lastPayment: Date,
        nextBilling: Date,
        totalSpent: { type: Number, default: 0 }
    },
    usage: {
        buildsThisMonth: { type: Number, default: 0 },
        totalBuilds: { type: Number, default: 0 },
        storageUsed: { type: Number, default: 0 },
        bandwidthUsed: { type: Number, default: 0 }
    },
    lastLogin: Date,
    lastBuildAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
PartnerSchema.index({ email: 1 });
PartnerSchema.index({ apiKey: 1 });
PartnerSchema.index({ status: 1, tier: 1 });
PartnerSchema.index({ 'usage.buildsThisMonth': 1 });
PartnerSchema.virtual('remainingBuilds').get(function () {
    return Math.max(0, this.configuration.maxBuildsPerMonth - this.usage.buildsThisMonth);
});
PartnerSchema.methods.canCreateBuild = function () {
    if (this.status !== 'active') {
        return { allowed: false, reason: 'Partner account is not active' };
    }
    if (this.usage.buildsThisMonth >= this.configuration.maxBuildsPerMonth) {
        return { allowed: false, reason: 'Monthly build limit exceeded' };
    }
    return { allowed: true, reason: null };
};
PartnerSchema.methods.incrementBuildUsage = function () {
    this.usage.buildsThisMonth += 1;
    this.usage.totalBuilds += 1;
    this.lastBuildAt = new Date();
    return this.save();
};
PartnerSchema.methods.recordLogin = function () {
    this.lastLogin = new Date();
    return this.save();
};
PartnerSchema.methods.updateUsage = function (storage, bandwidth) {
    this.usage.storageUsed += storage;
    this.usage.bandwidthUsed += bandwidth;
    return this.save();
};
PartnerSchema.methods.resetMonthlyUsage = function () {
    this.usage.buildsThisMonth = 0;
    this.usage.storageUsed = 0;
    this.usage.bandwidthUsed = 0;
    return this.save();
};
PartnerSchema.methods.upgradeTier = function (newTier) {
    this.tier = newTier;
    switch (newTier) {
        case 'premium':
            this.configuration.maxConcurrentBuilds = 3;
            this.configuration.maxBuildsPerMonth = 50;
            this.configuration.features.analytics = true;
            this.configuration.features.offlineMode = true;
            break;
        case 'enterprise':
            this.configuration.maxConcurrentBuilds = 10;
            this.configuration.maxBuildsPerMonth = 500;
            this.configuration.features.analytics = true;
            this.configuration.features.offlineMode = true;
            this.configuration.features.multiLanguage = true;
            this.configuration.features.biometricAuth = true;
            break;
    }
    return this.save();
};
PartnerSchema.statics.findByApiKey = function (apiKey) {
    return this.findOne({ apiKey, status: 'active' });
};
PartnerSchema.statics.findActivePartners = function () {
    return this.find({ status: 'active' });
};
PartnerSchema.statics.getUsageStats = function () {
    return this.aggregate([
        {
            $group: {
                _id: '$tier',
                count: { $sum: 1 },
                totalBuilds: { $sum: '$usage.totalBuilds' },
                avgBuildsPerMonth: { $avg: '$usage.buildsThisMonth' }
            }
        }
    ]);
};
PartnerSchema.statics.findPartnersNeedingReset = function () {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return this.find({
        'usage.buildsThisMonth': { $gt: 0 },
        updatedAt: { $lt: startOfMonth }
    });
};
PartnerSchema.pre('save', function (next) {
    if (this.isNew && !this.apiKey) {
        this.apiKey = `lulu_${require('uuid').v4().replace(/-/g, '')}`;
    }
    next();
});
exports.Partner = mongoose_1.default.model('Partner', PartnerSchema);
//# sourceMappingURL=Partner.model.js.map