import mongoose, { Document, Schema } from 'mongoose'

export interface IPartner extends Document {
  id: string
  name: string
  email: string
  company: string
  phone?: string
  apiKey: string
  status: 'active' | 'inactive' | 'suspended'
  tier: 'basic' | 'premium' | 'enterprise'
  configuration: {
    maxConcurrentBuilds: number
    maxBuildsPerMonth: number
    allowedBuildTypes: Array<'debug' | 'release'>
    features: {
      customBranding: boolean
      pushNotifications: boolean
      analytics: boolean
      offlineMode: boolean
      multiLanguage: boolean
      darkMode: boolean
      biometricAuth: boolean
      customSplash: boolean
    }
    webhookUrl?: string
    notificationPreferences: {
      email: boolean
      sms: boolean
      webhook: boolean
    }
  }
  billing: {
    plan: string
    subscriptionId?: string
    lastPayment?: Date
    nextBilling?: Date
    totalSpent: number
  }
  usage: {
    buildsThisMonth: number
    totalBuilds: number
    storageUsed: number // in MB
    bandwidthUsed: number // in MB
  }
  lastLogin?: Date
  lastBuildAt?: Date
  createdAt: Date
  updatedAt: Date
}

const PartnerSchema = new Schema<IPartner>({
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
})

// Indexes for performance
PartnerSchema.index({ email: 1 })
PartnerSchema.index({ apiKey: 1 })
PartnerSchema.index({ status: 1, tier: 1 })
PartnerSchema.index({ 'usage.buildsThisMonth': 1 })

// Virtual for remaining builds this month
PartnerSchema.virtual('remainingBuilds').get(function() {
  return Math.max(0, this.configuration.maxBuildsPerMonth - this.usage.buildsThisMonth)
})

// Methods
PartnerSchema.methods.canCreateBuild = function() {
  // Check if partner is active
  if (this.status !== 'active') {
    return { allowed: false, reason: 'Partner account is not active' }
  }
  
  // Check monthly build limit
  if (this.usage.buildsThisMonth >= this.configuration.maxBuildsPerMonth) {
    return { allowed: false, reason: 'Monthly build limit exceeded' }
  }
  
  return { allowed: true, reason: null }
}

PartnerSchema.methods.incrementBuildUsage = function() {
  this.usage.buildsThisMonth += 1
  this.usage.totalBuilds += 1
  this.lastBuildAt = new Date()
  return this.save()
}

PartnerSchema.methods.recordLogin = function() {
  this.lastLogin = new Date()
  return this.save()
}

PartnerSchema.methods.updateUsage = function(storage: number, bandwidth: number) {
  this.usage.storageUsed += storage
  this.usage.bandwidthUsed += bandwidth
  return this.save()
}

PartnerSchema.methods.resetMonthlyUsage = function() {
  this.usage.buildsThisMonth = 0
  this.usage.storageUsed = 0
  this.usage.bandwidthUsed = 0
  return this.save()
}

PartnerSchema.methods.upgradeTier = function(newTier: string) {
  this.tier = newTier as any
  
  // Update configuration based on tier
  switch (newTier) {
    case 'premium':
      this.configuration.maxConcurrentBuilds = 3
      this.configuration.maxBuildsPerMonth = 50
      this.configuration.features.analytics = true
      this.configuration.features.offlineMode = true
      break
    case 'enterprise':
      this.configuration.maxConcurrentBuilds = 10
      this.configuration.maxBuildsPerMonth = 500
      this.configuration.features.analytics = true
      this.configuration.features.offlineMode = true
      this.configuration.features.multiLanguage = true
      this.configuration.features.biometricAuth = true
      break
  }
  
  return this.save()
}

// Static methods
PartnerSchema.statics.findByApiKey = function(apiKey: string) {
  return this.findOne({ apiKey, status: 'active' })
}

PartnerSchema.statics.findActivePartners = function() {
  return this.find({ status: 'active' })
}

PartnerSchema.statics.getUsageStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$tier',
        count: { $sum: 1 },
        totalBuilds: { $sum: '$usage.totalBuilds' },
        avgBuildsPerMonth: { $avg: '$usage.buildsThisMonth' }
      }
    }
  ])
}

PartnerSchema.statics.findPartnersNeedingReset = function() {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  return this.find({
    'usage.buildsThisMonth': { $gt: 0 },
    updatedAt: { $lt: startOfMonth }
  })
}

// Pre-save middleware to generate API key
PartnerSchema.pre('save', function(next) {
  if (this.isNew && !this.apiKey) {
    this.apiKey = `lulu_${require('uuid').v4().replace(/-/g, '')}`
  }
  next()
})

export const Partner = mongoose.model<IPartner>('Partner', PartnerSchema) 