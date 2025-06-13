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
exports.Build = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const BuildSchema = new mongoose_1.Schema({
    partnerId: {
        type: String,
        required: true,
        index: true
    },
    partnerConfig: {
        appName: { type: String, required: true },
        packageName: { type: String, required: true },
        version: { type: String, required: true },
        description: String,
        branding: {
            primaryColor: { type: String, required: true },
            secondaryColor: { type: String, required: true },
            logo: String,
            splashScreen: String
        },
        features: {
            type: Map,
            of: Boolean,
            default: {}
        }
    },
    buildType: {
        type: String,
        enum: ['debug', 'release'],
        default: 'release',
        required: true
    },
    status: {
        type: String,
        enum: ['queued', 'in_progress', 'completed', 'failed', 'cancelled'],
        default: 'queued',
        required: true,
        index: true
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    currentStep: String,
    estimatedTimeRemaining: String,
    logs: [{
            timestamp: { type: Date, default: Date.now },
            level: {
                type: String,
                enum: ['info', 'warn', 'error', 'debug'],
                required: true
            },
            message: { type: String, required: true },
            details: mongoose_1.Schema.Types.Mixed
        }],
    assets: [{
            filename: { type: String, required: true },
            originalName: { type: String, required: true },
            mimetype: { type: String, required: true },
            size: { type: Number, required: true },
            path: { type: String, required: true }
        }],
    buildArtifacts: {
        apkPath: String,
        aabPath: String,
        mappingFile: String,
        buildReport: String
    },
    buildEnvironment: {
        androidSdkVersion: String,
        buildToolsVersion: String,
        gradleVersion: String,
        javaVersion: String
    },
    startedAt: Date,
    completedAt: Date,
    failureReason: String,
    downloadCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
BuildSchema.index({ partnerId: 1, createdAt: -1 });
BuildSchema.index({ status: 1, createdAt: -1 });
BuildSchema.index({ partnerId: 1, status: 1 });
BuildSchema.virtual('buildDuration').get(function () {
    if (this.startedAt && this.completedAt) {
        return this.completedAt.getTime() - this.startedAt.getTime();
    }
    return null;
});
BuildSchema.methods.addLog = function (level, message, details) {
    this.logs.push({
        timestamp: new Date(),
        level,
        message,
        details
    });
    return this.save();
};
BuildSchema.methods.updateProgress = function (progress, currentStep, estimatedTime) {
    this.progress = progress;
    if (currentStep)
        this.currentStep = currentStep;
    if (estimatedTime)
        this.estimatedTimeRemaining = estimatedTime;
    return this.save();
};
BuildSchema.methods.markAsStarted = function () {
    this.status = 'in_progress';
    this.startedAt = new Date();
    this.progress = 0;
    return this.save();
};
BuildSchema.methods.markAsCompleted = function (artifacts) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.progress = 100;
    this.currentStep = 'Build completed successfully';
    if (artifacts)
        this.buildArtifacts = artifacts;
    return this.save();
};
BuildSchema.methods.markAsFailed = function (reason) {
    this.status = 'failed';
    this.completedAt = new Date();
    this.failureReason = reason;
    this.currentStep = 'Build failed';
    return this.save();
};
BuildSchema.statics.findByPartner = function (partnerId) {
    return this.find({ partnerId }).sort({ createdAt: -1 });
};
BuildSchema.statics.findActiveBuilds = function () {
    return this.find({ status: { $in: ['queued', 'in_progress'] } });
};
BuildSchema.statics.getPartnerStats = function (partnerId) {
    return this.aggregate([
        { $match: { partnerId } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalDownloads: { $sum: '$downloadCount' }
            }
        }
    ]);
};
exports.Build = mongoose_1.default.model('Build', BuildSchema);
//# sourceMappingURL=Build.model.js.map