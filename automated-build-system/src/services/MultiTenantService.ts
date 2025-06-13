import { EventEmitter } from 'events'
import crypto from 'crypto'

// Simple logger
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ''),
  debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta || ''),
  audit: (action: string, tenantId: string, details: any) => {
    console.log(`[AUDIT] ${action} for tenant ${tenantId}:`, details)
  }
}

export type TenantTier = 'starter' | 'professional' | 'enterprise' | 'white_label'
export type IsolationLevel = 'shared' | 'dedicated_schema' | 'dedicated_database' | 'dedicated_infrastructure'
export type BillingModel = 'usage_based' | 'subscription' | 'hybrid' | 'enterprise_contract'
export type TenantStatus = 'active' | 'suspended' | 'trial' | 'archived' | 'migrating'

export interface MultiTenantConfig {
  defaultIsolationLevel: IsolationLevel
  enableTenantIsolation: boolean
  enableResourceQuotas: boolean
  enableUsageTracking: boolean
  enableBilling: boolean
  enableWhiteLabeling: boolean
  enableTenantAnalytics: boolean
  enableCustomDomains: boolean
  
  isolation: {
    enableDataEncryption: boolean
    enableNetworkIsolation: boolean
    enableComputeIsolation: boolean
    enableStorageIsolation: boolean
  }
  
  quotas: {
    defaultBuildsPerMonth: number
    defaultStorageLimit: number // GB
    defaultApiCallsPerHour: number
    defaultUsersPerTenant: number
  }
  
  billing: {
    enableUsageMetering: boolean
    enableBillingAlerts: boolean
    billingCycle: 'monthly' | 'quarterly' | 'yearly'
    enableOverageCharges: boolean
  }
}

export interface Tenant {
  id: string
  name: string
  slug: string
  tier: TenantTier
  status: TenantStatus
  isolationLevel: IsolationLevel
  
  // Contact Information
  primaryContact: {
    name: string
    email: string
    phone?: string
  }
  
  // Billing Information
  billing: {
    model: BillingModel
    currency: string
    billingEmail: string
    paymentMethodId?: string
    subscriptionId?: string
  }
  
  // Configuration
  config: {
    customDomain?: string
    timezone: string
    language: string
    features: string[]
    integrations: Record<string, any>
  }
  
  // White-label Customization
  branding?: {
    logo?: string
    primaryColor: string
    secondaryColor: string
    favicon?: string
    customCss?: string
    companyName: string
  }
  
  // Resource Quotas
  quotas: {
    buildsPerMonth: number
    storageLimit: number // GB
    apiCallsPerHour: number
    usersLimit: number
    customQuotas: Record<string, number>
  }
  
  // Usage Statistics
  usage: {
    currentPeriodBuilds: number
    currentPeriodStorage: number // GB
    currentPeriodApiCalls: number
    activeUsers: number
    lastActivity: Date
  }
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  lastBillingDate?: Date
  trialEndsAt?: Date
  metadata: Record<string, any>
}

export interface TenantContext {
  tenantId: string
  tenant: Tenant
  userId?: string
  requestId: string
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

export interface ResourceQuota {
  tenantId: string
  resourceType: string
  limit: number
  used: number
  resetPeriod: 'hourly' | 'daily' | 'monthly'
  lastReset: Date
  alertThreshold: number // percentage
}

export interface UsageRecord {
  id: string
  tenantId: string
  resourceType: string
  quantity: number
  unit: string
  timestamp: Date
  metadata: Record<string, any>
  cost?: number
  billable: boolean
}

export interface BillingEvent {
  id: string
  tenantId: string
  eventType: 'usage' | 'subscription' | 'payment' | 'refund' | 'credit'
  amount: number
  currency: string
  description: string
  timestamp: Date
  metadata: Record<string, any>
}

export interface TenantMetrics {
  tenantId: string
  timestamp: Date
  
  // Resource Usage
  buildsCount: number
  storageUsed: number
  apiCalls: number
  activeUsers: number
  
  // Performance Metrics
  averageResponseTime: number
  errorRate: number
  uptime: number
  
  // Business Metrics
  revenue: number
  costs: number
  profit: number
  
  // Custom Metrics
  customMetrics: Record<string, number>
}

export interface TenantReport {
  tenantId: string
  reportPeriod: {
    start: Date
    end: Date
  }
  
  summary: {
    totalBuilds: number
    totalStorage: number
    totalApiCalls: number
    totalRevenue: number
    totalCosts: number
    activeUsers: number
  }
  
  quotaUsage: Array<{
    resourceType: string
    used: number
    limit: number
    utilizationPercentage: number
  }>
  
  billing: {
    currentCharges: number
    projectedCharges: number
    overageCharges: number
    credits: number
  }
  
  recommendations: string[]
}

export interface TenantIsolationPolicy {
  tenantId: string
  isolationLevel: IsolationLevel
  
  data: {
    encryptionRequired: boolean
    separateDatabase: boolean
    separateSchema: boolean
    dataResidency?: string
  }
  
  network: {
    dedicatedVPC: boolean
    firewallRules: string[]
    allowedIPs: string[]
    vpnRequired: boolean
  }
  
  compute: {
    dedicatedInstances: boolean
    resourceReservation: boolean
    priorityLevel: 'low' | 'medium' | 'high'
    affinityRules: string[]
  }
  
  storage: {
    dedicatedStorage: boolean
    encryptionAtRest: boolean
    backupIsolation: boolean
    compressionLevel: number
  }
}

export class MultiTenantService extends EventEmitter {
  private config: MultiTenantConfig
  private tenants: Map<string, Tenant>
  private tenantsBySlug: Map<string, string> // slug -> tenantId
  private resourceQuotas: Map<string, ResourceQuota[]>
  private usageRecords: Map<string, UsageRecord[]>
  private billingEvents: Map<string, BillingEvent[]>
  private tenantMetrics: Map<string, TenantMetrics[]>
  private isolationPolicies: Map<string, TenantIsolationPolicy>
  private currentContexts: Map<string, TenantContext>

  constructor(config: MultiTenantConfig) {
    super()
    this.config = config
    this.tenants = new Map()
    this.tenantsBySlug = new Map()
    this.resourceQuotas = new Map()
    this.usageRecords = new Map()
    this.billingEvents = new Map()
    this.tenantMetrics = new Map()
    this.isolationPolicies = new Map()
    this.currentContexts = new Map()
    
    this.initializeMultiTenancy()
  }

  /**
   * Initialize multi-tenant service
   */
  private async initializeMultiTenancy(): Promise<void> {
    logger.info('Initializing multi-tenant service')

    try {
      // Load existing tenants
      await this.loadTenants()
      
      // Initialize resource monitoring
      if (this.config.enableResourceQuotas) {
        this.startResourceMonitoring()
      }
      
      // Initialize usage tracking
      if (this.config.enableUsageTracking) {
        this.startUsageTracking()
      }
      
      // Initialize billing
      if (this.config.enableBilling) {
        this.startBillingEngine()
      }
      
      // Start metrics collection
      if (this.config.enableTenantAnalytics) {
        this.startMetricsCollection()
      }

      logger.info('Multi-tenant service initialized successfully')
      this.emit('multiTenantInitialized')

    } catch (error) {
      logger.error('Failed to initialize multi-tenant service:', error)
      throw error
    }
  }

  /**
   * Tenant Management
   */
  
  /**
   * Create new tenant
   */
  async createTenant(tenantData: Partial<Tenant>): Promise<Tenant> {
    try {
      const tenantId = crypto.randomUUID()
      const slug = this.generateTenantSlug(tenantData.name || tenantId)
      
      const tenant: Tenant = {
        id: tenantId,
        name: tenantData.name || 'New Tenant',
        slug,
        tier: tenantData.tier || 'starter',
        status: tenantData.status || 'trial',
        isolationLevel: tenantData.isolationLevel || this.config.defaultIsolationLevel,
        
        primaryContact: tenantData.primaryContact || {
          name: 'Admin User',
          email: 'admin@example.com'
        },
        
        billing: tenantData.billing || {
          model: 'subscription',
          currency: 'USD',
          billingEmail: tenantData.primaryContact?.email || 'billing@example.com'
        },
        
        config: {
          timezone: 'UTC',
          language: 'en',
          features: [],
          integrations: {},
          ...tenantData.config
        },
        
        branding: tenantData.branding,
        
        quotas: {
          buildsPerMonth: this.getQuotaForTier(tenantData.tier || 'starter').buildsPerMonth,
          storageLimit: this.getQuotaForTier(tenantData.tier || 'starter').storageLimit,
          apiCallsPerHour: this.getQuotaForTier(tenantData.tier || 'starter').apiCallsPerHour,
          usersLimit: this.getQuotaForTier(tenantData.tier || 'starter').usersLimit,
          customQuotas: {}
        },
        
        usage: {
          currentPeriodBuilds: 0,
          currentPeriodStorage: 0,
          currentPeriodApiCalls: 0,
          activeUsers: 0,
          lastActivity: new Date()
        },
        
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: tenantData.metadata || {}
      }

      // Store tenant
      this.tenants.set(tenantId, tenant)
      this.tenantsBySlug.set(slug, tenantId)
      
      // Initialize tenant isolation
      if (this.config.enableTenantIsolation) {
        await this.setupTenantIsolation(tenant)
      }
      
      // Initialize resource quotas
      if (this.config.enableResourceQuotas) {
        await this.initializeTenantQuotas(tenant)
      }

      this.emit('tenantCreated', tenant)
      logger.audit('create_tenant', tenantId, { name: tenant.name, tier: tenant.tier })
      
      return tenant

    } catch (error) {
      logger.error('Failed to create tenant:', error)
      throw error
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string): Promise<Tenant | null> {
    return this.tenants.get(tenantId) || null
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const tenantId = this.tenantsBySlug.get(slug)
    return tenantId ? this.tenants.get(tenantId) || null : null
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    const tenant = this.tenants.get(tenantId)
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`)
    }

    const updatedTenant: Tenant = {
      ...tenant,
      ...updates,
      updatedAt: new Date()
    }

    this.tenants.set(tenantId, updatedTenant)
    
    // Update slug mapping if name changed
    if (updates.name && updates.name !== tenant.name) {
      const newSlug = this.generateTenantSlug(updates.name)
      this.tenantsBySlug.delete(tenant.slug)
      this.tenantsBySlug.set(newSlug, tenantId)
      updatedTenant.slug = newSlug
    }

    this.emit('tenantUpdated', updatedTenant)
    logger.audit('update_tenant', tenantId, updates)
    
    return updatedTenant
  }

  /**
   * Delete tenant
   */
  async deleteTenant(tenantId: string, options: { force?: boolean } = {}): Promise<void> {
    const tenant = this.tenants.get(tenantId)
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`)
    }

    if (!options.force && tenant.status === 'active') {
      throw new Error('Cannot delete active tenant. Suspend first or use force option.')
    }

    // Clean up tenant data
    await this.cleanupTenantData(tenantId)
    
    // Remove from maps
    this.tenants.delete(tenantId)
    this.tenantsBySlug.delete(tenant.slug)
    this.resourceQuotas.delete(tenantId)
    this.usageRecords.delete(tenantId)
    this.billingEvents.delete(tenantId)
    this.tenantMetrics.delete(tenantId)
    this.isolationPolicies.delete(tenantId)

    this.emit('tenantDeleted', { tenantId, tenant })
    logger.audit('delete_tenant', tenantId, { name: tenant.name, force: options.force })
  }

  /**
   * List tenants with filtering and pagination
   */
  async listTenants(filters: {
    tier?: TenantTier
    status?: TenantStatus
    search?: string
    page?: number
    limit?: number
  } = {}): Promise<{
    tenants: Tenant[]
    totalCount: number
    page: number
    limit: number
    hasMore: boolean
  }> {
    let tenants = Array.from(this.tenants.values())

    // Apply filters
    if (filters.tier) {
      tenants = tenants.filter(t => t.tier === filters.tier)
    }
    
    if (filters.status) {
      tenants = tenants.filter(t => t.status === filters.status)
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase()
      tenants = tenants.filter(t => 
        t.name.toLowerCase().includes(search) ||
        t.slug.toLowerCase().includes(search) ||
        t.primaryContact.email.toLowerCase().includes(search)
      )
    }

    const totalCount = tenants.length
    const page = filters.page || 1
    const limit = filters.limit || 50
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    tenants = tenants.slice(startIndex, endIndex)

    return {
      tenants,
      totalCount,
      page,
      limit,
      hasMore: endIndex < totalCount
    }
  }

  /**
   * Context Management
   */
  
  /**
   * Create tenant context for request
   */
  async createTenantContext(
    tenantId: string,
    userId?: string,
    requestData?: {
      requestId?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<TenantContext> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`)
    }

    const context: TenantContext = {
      tenantId,
      tenant,
      userId,
      requestId: requestData?.requestId || crypto.randomUUID(),
      ipAddress: requestData?.ipAddress,
      userAgent: requestData?.userAgent,
      timestamp: new Date()
    }

    this.currentContexts.set(context.requestId, context)
    
    // Clean up old contexts (keep last 1000)
    if (this.currentContexts.size > 1000) {
      const contexts = Array.from(this.currentContexts.entries())
      contexts.sort(([, a], [, b]) => b.timestamp.getTime() - a.timestamp.getTime())
      
      // Keep only the newest 1000
      this.currentContexts.clear()
      contexts.slice(0, 1000).forEach(([id, ctx]) => {
        this.currentContexts.set(id, ctx)
      })
    }

    return context
  }

  /**
   * Get tenant context
   */
  getTenantContext(requestId: string): TenantContext | null {
    return this.currentContexts.get(requestId) || null
  }

  /**
   * Resource Quota Management
   */
  
  /**
   * Check resource quota
   */
  async checkResourceQuota(
    tenantId: string,
    resourceType: string,
    requestedQuantity: number = 1
  ): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const quotas = this.resourceQuotas.get(tenantId) || []
    const quota = quotas.find(q => q.resourceType === resourceType)
    
    if (!quota) {
      return { allowed: true, remaining: Infinity, limit: Infinity }
    }

    const remaining = Math.max(0, quota.limit - quota.used)
    const allowed = requestedQuantity <= remaining

    return { allowed, remaining, limit: quota.limit }
  }

  /**
   * Consume resource quota
   */
  async consumeResourceQuota(
    tenantId: string,
    resourceType: string,
    quantity: number = 1
  ): Promise<void> {
    const quotas = this.resourceQuotas.get(tenantId) || []
    const quotaIndex = quotas.findIndex(q => q.resourceType === resourceType)
    
    if (quotaIndex === -1) {
      // Create new quota if it doesn't exist
      const newQuota: ResourceQuota = {
        tenantId,
        resourceType,
        limit: this.getDefaultQuotaLimit(resourceType),
        used: quantity,
        resetPeriod: this.getQuotaResetPeriod(resourceType),
        lastReset: new Date(),
        alertThreshold: 80
      }
      
      quotas.push(newQuota)
      this.resourceQuotas.set(tenantId, quotas)
    } else {
      quotas[quotaIndex].used += quantity
      
      // Check for alerts
      const utilization = (quotas[quotaIndex].used / quotas[quotaIndex].limit) * 100
      if (utilization >= quotas[quotaIndex].alertThreshold) {
        this.emit('quotaThresholdExceeded', {
          tenantId,
          resourceType,
          utilization,
          quota: quotas[quotaIndex]
        })
      }
    }

    // Record usage
    if (this.config.enableUsageTracking) {
      await this.recordUsage(tenantId, resourceType, quantity)
    }
  }

  /**
   * Usage Tracking
   */
  
  /**
   * Record usage event
   */
  async recordUsage(
    tenantId: string,
    resourceType: string,
    quantity: number,
    metadata: Record<string, any> = {}
  ): Promise<UsageRecord> {
    const usageRecord: UsageRecord = {
      id: crypto.randomUUID(),
      tenantId,
      resourceType,
      quantity,
      unit: this.getResourceUnit(resourceType),
      timestamp: new Date(),
      metadata,
      cost: this.calculateUsageCost(resourceType, quantity, tenantId),
      billable: this.isResourceBillable(resourceType, tenantId)
    }

    const records = this.usageRecords.get(tenantId) || []
    records.push(usageRecord)
    this.usageRecords.set(tenantId, records)

    // Update tenant usage stats
    await this.updateTenantUsageStats(tenantId, resourceType, quantity)

    this.emit('usageRecorded', usageRecord)
    return usageRecord
  }

  /**
   * Get usage records for tenant
   */
  async getUsageRecords(
    tenantId: string,
    filters: {
      resourceType?: string
      startDate?: Date
      endDate?: Date
      limit?: number
    } = {}
  ): Promise<UsageRecord[]> {
    let records = this.usageRecords.get(tenantId) || []

    // Apply filters
    if (filters.resourceType) {
      records = records.filter(r => r.resourceType === filters.resourceType)
    }
    
    if (filters.startDate) {
      records = records.filter(r => r.timestamp >= filters.startDate!)
    }
    
    if (filters.endDate) {
      records = records.filter(r => r.timestamp <= filters.endDate!)
    }

    // Sort by timestamp (newest first)
    records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Apply limit
    if (filters.limit) {
      records = records.slice(0, filters.limit)
    }

    return records
  }

  /**
   * Billing Management
   */
  
  /**
   * Calculate tenant billing
   */
  async calculateBilling(
    tenantId: string,
    period: { start: Date; end: Date }
  ): Promise<{
    totalAmount: number
    currency: string
    breakdown: Array<{
      resourceType: string
      quantity: number
      rate: number
      amount: number
    }>
  }> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`)
    }

    const usageRecords = await this.getUsageRecords(tenantId, {
      startDate: period.start,
      endDate: period.end
    })

    const billableRecords = usageRecords.filter(r => r.billable)
    const breakdown = new Map<string, { quantity: number; amount: number }>()

    // Aggregate usage by resource type
    for (const record of billableRecords) {
      const existing = breakdown.get(record.resourceType) || { quantity: 0, amount: 0 }
      existing.quantity += record.quantity
      existing.amount += record.cost || 0
      breakdown.set(record.resourceType, existing)
    }

    const breakdownArray = Array.from(breakdown.entries()).map(([resourceType, data]) => ({
      resourceType,
      quantity: data.quantity,
      rate: data.quantity > 0 ? data.amount / data.quantity : 0,
      amount: data.amount
    }))

    const totalAmount = breakdownArray.reduce((sum, item) => sum + item.amount, 0)

    return {
      totalAmount,
      currency: tenant.billing.currency,
      breakdown: breakdownArray
    }
  }

  /**
   * Generate tenant report
   */
  async generateTenantReport(
    tenantId: string,
    period: { start: Date; end: Date }
  ): Promise<TenantReport> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`)
    }

    const usageRecords = await this.getUsageRecords(tenantId, {
      startDate: period.start,
      endDate: period.end
    })

    const billing = await this.calculateBilling(tenantId, period)

    // Calculate summary
    const summary = {
      totalBuilds: usageRecords.filter(r => r.resourceType === 'builds').reduce((sum, r) => sum + r.quantity, 0),
      totalStorage: usageRecords.filter(r => r.resourceType === 'storage').reduce((sum, r) => sum + r.quantity, 0),
      totalApiCalls: usageRecords.filter(r => r.resourceType === 'api_calls').reduce((sum, r) => sum + r.quantity, 0),
      totalRevenue: billing.totalAmount,
      totalCosts: billing.totalAmount * 0.7, // Assume 30% margin
      activeUsers: tenant.usage.activeUsers
    }

    // Calculate quota usage
    const quotas = this.resourceQuotas.get(tenantId) || []
    const quotaUsage = quotas.map(quota => ({
      resourceType: quota.resourceType,
      used: quota.used,
      limit: quota.limit,
      utilizationPercentage: Math.round((quota.used / quota.limit) * 100)
    }))

    // Generate recommendations
    const recommendations = this.generateTenantRecommendations(tenant, quotaUsage, summary)

    const report: TenantReport = {
      tenantId,
      reportPeriod: period,
      summary,
      quotaUsage,
      billing: {
        currentCharges: billing.totalAmount,
        projectedCharges: billing.totalAmount * 1.1, // 10% growth assumption
        overageCharges: 0, // Calculate based on quota overages
        credits: 0 // Track any credits applied
      },
      recommendations
    }

    this.emit('tenantReportGenerated', report)
    return report
  }

  /**
   * White-label Customization
   */
  
  /**
   * Update tenant branding
   */
  async updateTenantBranding(
    tenantId: string,
    branding: Tenant['branding']
  ): Promise<void> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`)
    }

    await this.updateTenant(tenantId, { branding })
    
    this.emit('tenantBrandingUpdated', { tenantId, branding })
    logger.audit('update_branding', tenantId, branding)
  }

  /**
   * Get tenant branding for UI customization
   */
  async getTenantBranding(tenantId: string): Promise<Tenant['branding'] | null> {
    const tenant = await this.getTenant(tenantId)
    return tenant?.branding || null
  }

  /**
   * Private Helper Methods
   */
  
  private async loadTenants(): Promise<void> {
    // In a real implementation, this would load from database
    logger.info('Loading existing tenants')
  }

  private startResourceMonitoring(): void {
    setInterval(() => {
      this.checkResourceQuotas()
    }, 60000) // Check every minute

    setInterval(() => {
      this.resetExpiredQuotas()
    }, 3600000) // Reset expired quotas every hour
  }

  private startUsageTracking(): void {
    // Start usage aggregation
    setInterval(() => {
      this.aggregateUsageMetrics()
    }, 300000) // Every 5 minutes
  }

  private startBillingEngine(): void {
    // Start billing calculations
    setInterval(() => {
      this.processBillingEvents()
    }, 3600000) // Every hour
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectTenantMetrics()
    }, 60000) // Every minute
  }

  private generateTenantSlug(name: string): string {
    let slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    // Ensure uniqueness
    let counter = 1
    let originalSlug = slug
    while (this.tenantsBySlug.has(slug)) {
      slug = `${originalSlug}-${counter}`
      counter++
    }

    return slug
  }

  private getQuotaForTier(tier: TenantTier) {
    const quotas = {
      starter: {
        buildsPerMonth: 100,
        storageLimit: 5, // GB
        apiCallsPerHour: 1000,
        usersLimit: 5
      },
      professional: {
        buildsPerMonth: 500,
        storageLimit: 50, // GB
        apiCallsPerHour: 10000,
        usersLimit: 25
      },
      enterprise: {
        buildsPerMonth: 2000,
        storageLimit: 500, // GB
        apiCallsPerHour: 100000,
        usersLimit: 100
      },
      white_label: {
        buildsPerMonth: 10000,
        storageLimit: 2000, // GB
        apiCallsPerHour: 1000000,
        usersLimit: 1000
      }
    }

    return quotas[tier] || quotas.starter
  }

  private async setupTenantIsolation(tenant: Tenant): Promise<void> {
    const policy: TenantIsolationPolicy = {
      tenantId: tenant.id,
      isolationLevel: tenant.isolationLevel,
      
      data: {
        encryptionRequired: tenant.isolationLevel !== 'shared',
        separateDatabase: tenant.isolationLevel === 'dedicated_database' || tenant.isolationLevel === 'dedicated_infrastructure',
        separateSchema: tenant.isolationLevel === 'dedicated_schema' || tenant.isolationLevel === 'dedicated_database' || tenant.isolationLevel === 'dedicated_infrastructure',
        dataResidency: tenant.config.metadata?.dataResidency
      },
      
      network: {
        dedicatedVPC: tenant.isolationLevel === 'dedicated_infrastructure',
        firewallRules: [],
        allowedIPs: [],
        vpnRequired: tenant.tier === 'enterprise' || tenant.tier === 'white_label'
      },
      
      compute: {
        dedicatedInstances: tenant.isolationLevel === 'dedicated_infrastructure',
        resourceReservation: tenant.tier === 'enterprise' || tenant.tier === 'white_label',
        priorityLevel: this.getPriorityLevel(tenant.tier),
        affinityRules: []
      },
      
      storage: {
        dedicatedStorage: tenant.isolationLevel === 'dedicated_infrastructure',
        encryptionAtRest: true,
        backupIsolation: tenant.isolationLevel !== 'shared',
        compressionLevel: 6
      }
    }

    this.isolationPolicies.set(tenant.id, policy)
    logger.debug(`Tenant isolation policy created for ${tenant.id}`)
  }

  private getPriorityLevel(tier: TenantTier): 'low' | 'medium' | 'high' {
    switch (tier) {
      case 'starter': return 'low'
      case 'professional': return 'medium'
      case 'enterprise':
      case 'white_label': return 'high'
      default: return 'low'
    }
  }

  private async initializeTenantQuotas(tenant: Tenant): Promise<void> {
    const quotas: ResourceQuota[] = [
      {
        tenantId: tenant.id,
        resourceType: 'builds',
        limit: tenant.quotas.buildsPerMonth,
        used: 0,
        resetPeriod: 'monthly',
        lastReset: new Date(),
        alertThreshold: 80
      },
      {
        tenantId: tenant.id,
        resourceType: 'storage',
        limit: tenant.quotas.storageLimit,
        used: 0,
        resetPeriod: 'monthly',
        lastReset: new Date(),
        alertThreshold: 90
      },
      {
        tenantId: tenant.id,
        resourceType: 'api_calls',
        limit: tenant.quotas.apiCallsPerHour,
        used: 0,
        resetPeriod: 'hourly',
        lastReset: new Date(),
        alertThreshold: 75
      }
    ]

    this.resourceQuotas.set(tenant.id, quotas)
  }

  private async cleanupTenantData(tenantId: string): Promise<void> {
    // Clean up all tenant-related data
    logger.info(`Cleaning up data for tenant ${tenantId}`)
    
    // In a real implementation, this would:
    // - Delete tenant databases/schemas
    // - Clean up storage buckets
    // - Remove network resources
    // - Archive billing data
    // - etc.
  }

  private checkResourceQuotas(): void {
    // Check all tenant quotas for violations
    for (const [tenantId, quotas] of this.resourceQuotas) {
      for (const quota of quotas) {
        const utilization = (quota.used / quota.limit) * 100
        
        if (utilization >= 100) {
          this.emit('quotaExceeded', { tenantId, quota })
        } else if (utilization >= quota.alertThreshold) {
          this.emit('quotaThresholdExceeded', { tenantId, quota, utilization })
        }
      }
    }
  }

  private resetExpiredQuotas(): void {
    const now = new Date()
    
    for (const [tenantId, quotas] of this.resourceQuotas) {
      for (const quota of quotas) {
        const timeSinceReset = now.getTime() - quota.lastReset.getTime()
        let shouldReset = false
        
        switch (quota.resetPeriod) {
          case 'hourly':
            shouldReset = timeSinceReset >= 3600000 // 1 hour
            break
          case 'daily':
            shouldReset = timeSinceReset >= 86400000 // 24 hours
            break
          case 'monthly':
            shouldReset = now.getMonth() !== quota.lastReset.getMonth()
            break
        }
        
        if (shouldReset) {
          quota.used = 0
          quota.lastReset = now
          logger.debug(`Reset quota for tenant ${tenantId}, resource ${quota.resourceType}`)
        }
      }
    }
  }

  private aggregateUsageMetrics(): void {
    // Aggregate usage data for reporting
    logger.debug('Aggregating usage metrics')
  }

  private processBillingEvents(): void {
    // Process billing events and generate invoices
    logger.debug('Processing billing events')
  }

  private collectTenantMetrics(): void {
    // Collect metrics for all tenants
    for (const [tenantId, tenant] of this.tenants) {
      const metrics: TenantMetrics = {
        tenantId,
        timestamp: new Date(),
        buildsCount: tenant.usage.currentPeriodBuilds,
        storageUsed: tenant.usage.currentPeriodStorage,
        apiCalls: tenant.usage.currentPeriodApiCalls,
        activeUsers: tenant.usage.activeUsers,
        averageResponseTime: 250, // Would get from actual metrics
        errorRate: 0.5, // Would get from actual metrics
        uptime: 99.9, // Would get from actual metrics
        revenue: 0, // Would calculate from billing
        costs: 0, // Would calculate from infrastructure costs
        profit: 0, // Revenue - costs
        customMetrics: {}
      }

      const existingMetrics = this.tenantMetrics.get(tenantId) || []
      existingMetrics.push(metrics)
      
      // Keep only last 1000 entries
      if (existingMetrics.length > 1000) {
        existingMetrics.splice(0, existingMetrics.length - 1000)
      }
      
      this.tenantMetrics.set(tenantId, existingMetrics)
    }
  }

  private getDefaultQuotaLimit(resourceType: string): number {
    const defaults = {
      builds: this.config.quotas.defaultBuildsPerMonth,
      storage: this.config.quotas.defaultStorageLimit,
      api_calls: this.config.quotas.defaultApiCallsPerHour,
      users: this.config.quotas.defaultUsersPerTenant
    }

    return defaults[resourceType as keyof typeof defaults] || 100
  }

  private getQuotaResetPeriod(resourceType: string): ResourceQuota['resetPeriod'] {
    const periods = {
      builds: 'monthly' as const,
      storage: 'monthly' as const,
      api_calls: 'hourly' as const,
      users: 'monthly' as const
    }

    return periods[resourceType as keyof typeof periods] || 'monthly'
  }

  private getResourceUnit(resourceType: string): string {
    const units = {
      builds: 'build',
      storage: 'GB',
      api_calls: 'call',
      users: 'user'
    }

    return units[resourceType as keyof typeof units] || 'unit'
  }

  private calculateUsageCost(resourceType: string, quantity: number, tenantId: string): number {
    const tenant = this.tenants.get(tenantId)
    if (!tenant) return 0

    // Pricing per unit by tier
    const pricing = {
      starter: { builds: 0.10, storage: 0.05, api_calls: 0.001, users: 5.00 },
      professional: { builds: 0.08, storage: 0.04, api_calls: 0.0008, users: 4.00 },
      enterprise: { builds: 0.06, storage: 0.03, api_calls: 0.0005, users: 3.00 },
      white_label: { builds: 0.04, storage: 0.02, api_calls: 0.0003, users: 2.00 }
    }

    const tierPricing = pricing[tenant.tier] || pricing.starter
    const unitPrice = tierPricing[resourceType as keyof typeof tierPricing] || 0

    return quantity * unitPrice
  }

  private isResourceBillable(resourceType: string, tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId)
    if (!tenant) return false

    // Trial tenants don't get billed
    if (tenant.status === 'trial') return false

    // All resources are billable for paid tiers
    return tenant.billing.model !== 'enterprise_contract'
  }

  private async updateTenantUsageStats(tenantId: string, resourceType: string, quantity: number): Promise<void> {
    const tenant = this.tenants.get(tenantId)
    if (!tenant) return

    // Update usage stats
    switch (resourceType) {
      case 'builds':
        tenant.usage.currentPeriodBuilds += quantity
        break
      case 'storage':
        tenant.usage.currentPeriodStorage += quantity
        break
      case 'api_calls':
        tenant.usage.currentPeriodApiCalls += quantity
        break
    }

    tenant.usage.lastActivity = new Date()
    tenant.updatedAt = new Date()
  }

  private generateTenantRecommendations(
    tenant: Tenant,
    quotaUsage: any[],
    summary: any
  ): string[] {
    const recommendations: string[] = []

    // Check for high quota utilization
    const highUtilization = quotaUsage.filter(q => q.utilizationPercentage > 80)
    if (highUtilization.length > 0) {
      recommendations.push(`Consider upgrading your plan - ${highUtilization.length} resources are near quota limits`)
    }

    // Check for tier optimization
    if (tenant.tier === 'starter' && summary.totalBuilds > 50) {
      recommendations.push('Consider upgrading to Professional tier for better value and higher limits')
    }

    // Check for cost optimization
    if (summary.totalRevenue > 100) {
      recommendations.push('Enable auto-scaling to optimize costs based on actual usage patterns')
    }

    return recommendations
  }

  /**
   * Get service status and configuration
   */
  getStatus() {
    return {
      config: {
        defaultIsolationLevel: this.config.defaultIsolationLevel,
        enabledFeatures: {
          tenantIsolation: this.config.enableTenantIsolation,
          resourceQuotas: this.config.enableResourceQuotas,
          usageTracking: this.config.enableUsageTracking,
          billing: this.config.enableBilling,
          whiteLabeling: this.config.enableWhiteLabeling,
          analytics: this.config.enableTenantAnalytics,
          customDomains: this.config.enableCustomDomains
        }
      },
      tenants: {
        totalCount: this.tenants.size,
        byTier: this.getTenantCountsByTier(),
        byStatus: this.getTenantCountsByStatus()
      },
      resourceQuotas: {
        totalQuotas: Array.from(this.resourceQuotas.values()).reduce((sum, quotas) => sum + quotas.length, 0),
        activeAlerts: this.getActiveQuotaAlerts()
      },
      usageRecords: {
        totalRecords: Array.from(this.usageRecords.values()).reduce((sum, records) => sum + records.length, 0)
      },
      billing: {
        totalRevenue: this.calculateTotalRevenue(),
        activeSubscriptions: this.getActiveSubscriptionCount()
      }
    }
  }

  private getTenantCountsByTier() {
    const counts = { starter: 0, professional: 0, enterprise: 0, white_label: 0 }
    for (const tenant of this.tenants.values()) {
      counts[tenant.tier]++
    }
    return counts
  }

  private getTenantCountsByStatus() {
    const counts = { active: 0, suspended: 0, trial: 0, archived: 0, migrating: 0 }
    for (const tenant of this.tenants.values()) {
      counts[tenant.status]++
    }
    return counts
  }

  private getActiveQuotaAlerts(): number {
    let alertCount = 0
    for (const quotas of this.resourceQuotas.values()) {
      for (const quota of quotas) {
        const utilization = (quota.used / quota.limit) * 100
        if (utilization >= quota.alertThreshold) {
          alertCount++
        }
      }
    }
    return alertCount
  }

  private calculateTotalRevenue(): number {
    let total = 0
    for (const events of this.billingEvents.values()) {
      total += events.filter(e => e.eventType === 'usage' || e.eventType === 'subscription').reduce((sum, e) => sum + e.amount, 0)
    }
    return total
  }

  private getActiveSubscriptionCount(): number {
    return Array.from(this.tenants.values()).filter(t => t.status === 'active' && t.billing.subscriptionId).length
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.tenants.clear()
    this.tenantsBySlug.clear()
    this.resourceQuotas.clear()
    this.usageRecords.clear()
    this.billingEvents.clear()
    this.tenantMetrics.clear()
    this.isolationPolicies.clear()
    this.currentContexts.clear()
    this.removeAllListeners()
    
    logger.info('Multi-tenant service cleaned up')
  }
}

export default MultiTenantService 