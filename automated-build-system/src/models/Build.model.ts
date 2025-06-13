import mongoose, { Document, Schema } from 'mongoose'

export interface IBuild extends Document {
  id: string
  partnerId: string
  partnerConfig: {
    appName: string
    packageName: string
    version: string
    description?: string
    branding: {
      primaryColor: string
      secondaryColor: string
      logo?: string
      splashScreen?: string
    }
    features: {
      [key: string]: boolean
    }
  }
  buildType: 'debug' | 'release'
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  progress: number
  currentStep?: string
  estimatedTimeRemaining?: string
  logs: Array<{
    timestamp: Date
    level: 'info' | 'warn' | 'error' | 'debug'
    message: string
    details?: any
  }>
  assets: Array<{
    filename: string
    originalName: string
    mimetype: string
    size: number
    path: string
  }>
  buildArtifacts?: {
    apkPath?: string
    aabPath?: string
    mappingFile?: string
    buildReport?: string
  }
  buildEnvironment?: {
    androidSdkVersion: string
    buildToolsVersion: string
    gradleVersion: string
    javaVersion: string
  }
  startedAt?: Date
  completedAt?: Date
  failureReason?: string
  downloadCount: number
  createdAt: Date
  updatedAt: Date
}

const BuildSchema = new Schema<IBuild>({
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
    details: Schema.Types.Mixed
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
})

// Indexes for performance
BuildSchema.index({ partnerId: 1, createdAt: -1 })
BuildSchema.index({ status: 1, createdAt: -1 })
BuildSchema.index({ partnerId: 1, status: 1 })

// Virtual for build duration
BuildSchema.virtual('buildDuration').get(function() {
  if (this.startedAt && this.completedAt) {
    return this.completedAt.getTime() - this.startedAt.getTime()
  }
  return null
})

// Methods
BuildSchema.methods.addLog = function(level: string, message: string, details?: any) {
  this.logs.push({
    timestamp: new Date(),
    level,
    message,
    details
  })
  return this.save()
}

BuildSchema.methods.updateProgress = function(progress: number, currentStep?: string, estimatedTime?: string) {
  this.progress = progress
  if (currentStep) this.currentStep = currentStep
  if (estimatedTime) this.estimatedTimeRemaining = estimatedTime
  return this.save()
}

BuildSchema.methods.markAsStarted = function() {
  this.status = 'in_progress'
  this.startedAt = new Date()
  this.progress = 0
  return this.save()
}

BuildSchema.methods.markAsCompleted = function(artifacts?: any) {
  this.status = 'completed'
  this.completedAt = new Date()
  this.progress = 100
  this.currentStep = 'Build completed successfully'
  if (artifacts) this.buildArtifacts = artifacts
  return this.save()
}

BuildSchema.methods.markAsFailed = function(reason: string) {
  this.status = 'failed'
  this.completedAt = new Date()
  this.failureReason = reason
  this.currentStep = 'Build failed'
  return this.save()
}

// Static methods
BuildSchema.statics.findByPartner = function(partnerId: string) {
  return this.find({ partnerId }).sort({ createdAt: -1 })
}

BuildSchema.statics.findActiveBuilds = function() {
  return this.find({ status: { $in: ['queued', 'in_progress'] } })
}

BuildSchema.statics.getPartnerStats = function(partnerId: string) {
  return this.aggregate([
    { $match: { partnerId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalDownloads: { $sum: '$downloadCount' }
      }
    }
  ])
}

export const Build = mongoose.model<IBuild>('Build', BuildSchema) 