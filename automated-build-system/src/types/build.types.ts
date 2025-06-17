// Build System Type Definitions

export interface PartnerConfig {
  id?: string
  name: string
  companyName: string
  email: string
  phone: string
  website?: string
  
  // Branding
  branding: BrandingConfig
  
  // App Configuration
  appConfig: AppConfig
  
  // Features
  features: FeatureConfig
  
  // API Configuration
  apiConfig: ApiConfig
  
  // Metadata
  createdAt?: Date
  updatedAt?: Date
  status: 'draft' | 'generating' | 'ready' | 'deployed'
}

export interface BrandingConfig {
  // Logo & Images
  logo?: string // Base64 or file path
  logoUrl?: string
  icon?: string
  iconUrl?: string
  splashScreen?: string
  splashScreenUrl?: string
  
  // Colors
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  
  // Typography
  fontFamily: string
  
  // App Store Assets
  screenshots: string[]
  appStoreIcon?: string
  appStoreIconUrl?: string
}

export interface AppConfig {
  appName: string
  packageName: string
  bundleId: string
  version: string
  versionCode: number
  
  // App Store Information
  description: string
  shortDescription: string
  keywords: string[]
  category: string
  
  // Permissions
  permissions: Permission[]
  
  // Supported Countries
  supportedCountries: string[]
  
  // Languages
  supportedLanguages: string[]
}

export interface FeatureConfig {
  // Core Features
  remittance: boolean
  billPayment: boolean
  mobileRecharge: boolean
  cardServices: boolean
  
  // Advanced Features
  biometricAuth: boolean
  pushNotifications: boolean
  chatSupport: boolean
  loyaltyProgram: boolean
  referralProgram: boolean
  
  // eKYC Features
  documentUpload: boolean
  facialVerification: boolean
  livenessDetection: boolean
  
  // Payment Methods
  bankTransfer: boolean
  cardPayment: boolean
  digitalWallet: boolean
  cryptocurrency: boolean
}

export interface ApiConfig {
  baseUrl: string
  apiKey: string
  partnerId: string
  environment: 'sandbox' | 'production'
  
  // Rate Limiting
  rateLimits: {
    requestsPerMinute: number
    requestsPerHour: number
    requestsPerDay: number
  }
  
  // Webhook Configuration
  webhookUrl?: string
  webhookSecret?: string
}

export interface Permission {
  name: string
  description: string
  required: boolean
  category: 'security' | 'communication' | 'storage' | 'location' | 'camera' | 'other'
}

// Build System Types

export interface BuildRequest {
  id?: string
  partnerId: string
  partnerConfig: PartnerConfig
  priority: number
  requestedBy: string
  requestedAt: Date
  buildType: 'apk' | 'aab' | 'both'
  signedBuild: boolean
  debugMode: boolean
}

export interface BuildJob {
  id: string
  buildRequest: BuildRequest
  status: BuildStatus
  progress: number
  logs: BuildLog[]
  startedAt?: Date
  completedAt?: Date
  error?: string
  result?: BuildResult
}

/**
 * Build status enum
 */
export enum BuildStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface BuildConfig {
  partnerId: string;
  partnerName: string;
  appName: string;
  packageName: string;
  primaryColor: string;
  secondaryColor: string;
  logoBase64?: string;
  features?: {
    transactionHistory?: boolean;
    customerSupport?: boolean;
    pushNotifications?: boolean;
    biometricLogin?: boolean;
    multiLanguage?: boolean;
    darkMode?: boolean;
  };
  apiConfig?: {
    baseUrl?: string;
    apiKey?: string;
    timeout?: number;
  };
}

export interface Build {
  id: string;
  partnerId: string;
  config: BuildConfig;
  status: BuildStatus;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failureReason?: string;
  downloadUrl?: string;
}

export interface BuildQuery {
  partnerId?: string;
  status?: BuildStatus;
  page?: number;
  limit?: number;
}

export interface BuildLog {
  id: string
  buildId: string
  timestamp: Date
  level: 'info' | 'warning' | 'error' | 'debug'
  message: string
  details?: any
  stage: string
}

export interface BuildResult {
  buildId: string
  status: 'success' | 'failed'
  artifacts: BuildArtifact[]
  buildTime: number
  size: number
  logs: BuildLog[]
  downloadUrls: {
    apk?: string
    aab?: string
    mapping?: string
    logs?: string
  }
  metadata: {
    compileSdkVersion: string
    targetSdkVersion: string
    minSdkVersion: string
    buildToolsVersion: string
    gradleVersion: string
  }
}

export interface BuildArtifact {
  name: string
  type: 'apk' | 'aab' | 'mapping' | 'logs' | 'resources'
  path: string
  size: number
  checksum: string
  downloadUrl: string
}

// Template Processing Types

export interface TemplateContext {
  package: {
    name: string
    path: string
  }
  app: {
    name: string
    displayName: string
    version: string
    versionCode: number
    description: string
  }
  branding: {
    colors: {
      primary: string
      secondary: string
      accent: string
      background: string
      text: string
    }
    fonts: {
      primary: string
    }
  }
  features: FeatureConfig
  api: {
    baseUrl: string
    endpoints: Record<string, string>
  }
  permissions: string[]
  assets: {
    logo: string
    icon: string
    splash: string
    screenshots: string[]
  }
}

export interface ProcessedTemplate {
  sources: GeneratedFile[]
  resources: GeneratedFile[]
  assets: GeneratedFile[]
  manifest: string
  buildScript: string
}

export interface GeneratedFile {
  path: string
  content: string | Buffer
  type: 'source' | 'resource' | 'asset' | 'config'
}

// Asset Processing Types

export interface AssetBundle {
  logo: Buffer
  icon: Buffer
  splash?: Buffer
  screenshots: Buffer[]
  additionalAssets: Record<string, Buffer>
}

export interface ProcessedAssets {
  icons: IconSet
  splash: Buffer
  screenshots: Buffer[]
  optimizedAssets: Record<string, Buffer>
}

export interface IconSet {
  [key: string]: Buffer // e.g., 'ic_launcher_48': Buffer
}

// Docker and Build Environment Types

export interface BuildEnvironment {
  dockerImage: string
  containerName: string
  workspaceVolume: string
  outputVolume: string
  environment: Record<string, string>
  timeout: number
}

export interface DockerBuildConfig {
  image: string
  containerName: string
  volumes: Array<{
    host: string
    container: string
    readonly?: boolean
  }>
  environment: Record<string, string>
  workingDir: string
  command: string[]
  timeout: number
}

// Storage Types

export interface StorageConfig {
  provider: 'local' | 's3' | 'gcs'
  basePath: string
  bucketName?: string
  region?: string
  credentials?: any
}

export interface StoredFile {
  id: string
  name: string
  path: string
  size: number
  mimeType: string
  checksum: string
  uploadedAt: Date
  downloadUrl: string
  expiresAt?: Date
}

// Queue Types

export interface QueueConfig {
  redis: {
    host: string
    port: number
    password?: string
    db?: number
  }
  concurrency: number
  attempts: number
  backoffType: 'fixed' | 'exponential'
  backoffDelay: number
}

export interface JobOptions {
  priority: number
  delay: number
  attempts: number
  backoff?: {
    type: 'fixed' | 'exponential'
    delay: number
  }
  removeOnComplete: number
  removeOnFail: number
}

// WebSocket Types

export interface BuildUpdateMessage {
  type: 'build-update'
  buildId: string
  data: {
    status: BuildStatus
    progress: number
    stage: string
    message: string
    logs?: BuildLog[]
    error?: string
  }
}

export interface WebSocketConnection {
  id: string
  buildId: string
  socket: any // WebSocket
  connectedAt: Date
  lastPing: Date
}

// API Response Types

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  errors?: ValidationError[]
  timestamp: string
  requestId: string
}

export interface ValidationError {
  field: string
  message: string
  value?: any
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Database Types

export interface DatabaseConfig {
  mongodb: {
    uri: string
    dbName: string
    options: Record<string, any>
  }
  redis: {
    uri: string
    options: Record<string, any>
  }
}

// Configuration Types

export interface SystemConfig {
  server: {
    port: number
    host: string
    corsOrigins: string[]
  }
  database: DatabaseConfig
  storage: StorageConfig
  queue: QueueConfig
  docker: {
    host: string
    socketPath: string
    buildImage: string
    maxConcurrentBuilds: number
    buildTimeout: number
  }
  build: {
    maxFileSize: number
    allowedImageTypes: string[]
    outputFormats: ('apk' | 'aab')[]
    signingEnabled: boolean
    defaultKeystore: string
  }
  security: {
    jwtSecret: string
    jwtExpiry: string
    bcryptRounds: number
    rateLimitWindow: number
    rateLimitMax: number
  }
  logging: {
    level: string
    file: string
    console: boolean
  }
}

// Error Types

export class BuildError extends Error {
  public readonly code: string
  public readonly buildId?: string
  public readonly stage?: string
  public readonly details?: any

  constructor(
    message: string,
    code: string,
    buildId?: string,
    stage?: string,
    details?: any
  ) {
    super(message)
    this.name = 'BuildError'
    this.code = code
    this.buildId = buildId
    this.stage = stage
    this.details = details
  }
}

export interface ErrorCode {
  INVALID_CONFIG: 'INVALID_CONFIG'
  TEMPLATE_PROCESSING_FAILED: 'TEMPLATE_PROCESSING_FAILED'
  ASSET_PROCESSING_FAILED: 'ASSET_PROCESSING_FAILED'
  BUILD_FAILED: 'BUILD_FAILED'
  SIGNING_FAILED: 'SIGNING_FAILED'
  STORAGE_FAILED: 'STORAGE_FAILED'
  DOCKER_ERROR: 'DOCKER_ERROR'
  QUEUE_ERROR: 'QUEUE_ERROR'
  TIMEOUT: 'TIMEOUT'
  RESOURCE_LIMIT: 'RESOURCE_LIMIT'
} 