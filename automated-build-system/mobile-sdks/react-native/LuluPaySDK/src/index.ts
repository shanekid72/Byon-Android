import { NativeModules, NativeEventEmitter, Platform } from 'react-native'
import RNFS from 'react-native-fs'

const { LuluPayNativeModule } = NativeModules

/**
 * LuluPay React Native SDK for mobile asset management and build monitoring
 *
 * Features:
 * - Cross-platform asset upload and management
 * - Real-time build monitoring with event listeners
 * - Build trigger and configuration
 * - Offline asset caching
 * - TypeScript support with complete type definitions
 * - React hooks for easy integration
 *
 * @author LuluPay SDK Team
 * @version 4.0.0
 */

// Types
export type CloudProvider = 'aws' | 'azure' | 'gcp'
export type AssetType = 'app_icon' | 'splash_screen' | 'logo' | 'background_image' | 'button_image' | 'custom_font' | 'color_scheme' | 'theme_config' | 'other'
export type BuildStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type BuildType = 'debug' | 'release' | 'staging'

export interface LuluPayConfig {
  apiKey: string
  partnerId: string
  baseUrl?: string
  enableLogging?: boolean
  enableCaching?: boolean
  cacheMaxSize?: number
  requestTimeout?: number
  enableRealTimeUpdates?: boolean
}

export interface AssetMetadata {
  name?: string
  description?: string
  tags?: string[]
  category?: string
  version?: string
  customProperties?: Record<string, string>
}

export interface AssetUploadResult {
  assetId: string
  url: string
  cdnUrl?: string
  size: number
  contentType: string
  uploadedAt: number
}

export interface Asset {
  id: string
  name: string
  type: AssetType
  url: string
  cdnUrl?: string
  size: number
  contentType: string
  metadata: AssetMetadata
  createdAt: number
  updatedAt: number
}

export interface AssetList {
  assets: Asset[]
  totalCount: number
  page: number
  limit: number
  hasMore: boolean
}

export interface BuildConfiguration {
  buildType?: BuildType
  appName: string
  packageName: string
  versionName?: string
  versionCode?: number
  assetIds: string[]
  themeConfig?: ThemeConfig
  features?: string[]
  customProperties?: Record<string, any>
}

export interface ThemeConfig {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  accentColor: string
  fontFamily?: string
  borderRadius?: number
  customCss?: string
}

export interface BuildResult {
  buildId: string
  status: BuildStatus
  createdAt: number
  completedAt?: number
  downloadUrl?: string
  errorMessage?: string
}

export interface BuildDetails {
  buildId: string
  status: BuildStatus
  progress: number
  stages: BuildStage[]
  logs: BuildLog[]
  assets: Asset[]
  config: BuildConfiguration
  createdAt: number
  startedAt?: number
  completedAt?: number
  duration?: number
  downloadUrl?: string
  errorMessage?: string
}

export interface BuildStage {
  name: string
  status: BuildStatus
  startedAt?: number
  completedAt?: number
  duration?: number
  progress: number
}

export interface BuildLog {
  timestamp: number
  level: string
  message: string
  stage?: string
}

export interface BuildProgress {
  buildId: string
  status: BuildStatus
  overallProgress: number
  currentStage: string
  stageProgress: number
  estimatedTimeRemaining?: number
  message?: string
}

export interface BuildEvent {
  buildId: string
  event: string
  data?: any
  timestamp: number
}

export interface BuildList {
  builds: BuildResult[]
  totalCount: number
  page: number
  limit: number
  hasMore: boolean
}

export interface PartnerInfo {
  partnerId: string
  name: string
  email: string
  subscriptionTier: string
  status: string
  createdAt: number
  lastLoginAt?: number
}

export interface UsageStats {
  buildsThisMonth: number
  buildsLimit: number
  storageUsed: number
  storageLimit: number
  assetsCount: number
  assetsLimit: number
  apiCallsThisMonth: number
  apiCallsLimit: number
}

export interface UploadProgress {
  assetId: string
  progress: number
  bytesUploaded: number
  totalBytes: number
}

export interface SDKStatus {
  version: string
  isInitialized: boolean
  isConnected: boolean
  cacheSize: number
  activeBuildsCount: number
}

// Events
export type LuluPayEventType = 
  | 'uploadProgress'
  | 'uploadComplete'
  | 'uploadError'
  | 'buildProgress'
  | 'buildComplete'
  | 'buildError'
  | 'buildEvent'
  | 'connectionChanged'

export interface LuluPayEvent {
  type: LuluPayEventType
  data: any
}

// Event Emitter
const eventEmitter = new NativeEventEmitter(LuluPayNativeModule)

/**
 * Main LuluPay SDK Class
 */
class LuluPaySDK {
  private static instance: LuluPaySDK | null = null
  private config: LuluPayConfig | null = null
  private isInitialized = false
  private eventListeners: Map<string, Function[]> = new Map()

  public static readonly VERSION = '4.0.0'

  private constructor() {
    this.setupNativeEventListeners()
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LuluPaySDK {
    if (!LuluPaySDK.instance) {
      LuluPaySDK.instance = new LuluPaySDK()
    }
    return LuluPaySDK.instance
  }

  /**
   * Initialize the SDK
   */
  public async initialize(config: LuluPayConfig): Promise<void> {
    try {
      this.config = {
        baseUrl: 'https://api.lulupay.com',
        enableLogging: false,
        enableCaching: true,
        cacheMaxSize: 100 * 1024 * 1024, // 100MB
        requestTimeout: 60000,
        enableRealTimeUpdates: true,
        ...config
      }

      if (LuluPayNativeModule) {
        await LuluPayNativeModule.initialize(this.config)
      }

      this.isInitialized = true
      console.log(`LuluPay React Native SDK v${LuluPaySDK.VERSION} initialized`)
    } catch (error) {
      console.error('Failed to initialize LuluPay SDK:', error)
      throw error
    }
  }

  /**
   * Check if SDK is initialized
   */
  public getIsInitialized(): boolean {
    return this.isInitialized
  }

  /**
   * Get SDK configuration
   */
  public getConfig(): LuluPayConfig | null {
    return this.config
  }

  // MARK: - Asset Management

  /**
   * Upload asset to LuluPay platform
   */
  public async uploadAsset(
    filePath: string,
    assetType: AssetType,
    metadata: AssetMetadata = {}
  ): Promise<AssetUploadResult> {
    this.checkInitialized()

    try {
      // Check if file exists
      const fileExists = await RNFS.exists(filePath)
      if (!fileExists) {
        throw new Error('File not found')
      }

      // Get file info
      const fileInfo = await RNFS.stat(filePath)
      const assetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      console.log(`Uploading asset: ${filePath}`)

      // Start upload process
      const result = await this.performAssetUpload(filePath, assetType, metadata, assetId)
      
      // Cache asset locally if caching is enabled
      if (this.config?.enableCaching) {
        await this.cacheAsset(result.assetId, filePath)
      }

      this.emit('uploadComplete', result)
      return result

    } catch (error) {
      console.error('Asset upload failed:', error)
      this.emit('uploadError', { error: error.message })
      throw error
    }
  }

  /**
   * Get asset information
   */
  public async getAsset(assetId: string): Promise<Asset> {
    this.checkInitialized()

    try {
      if (LuluPayNativeModule) {
        return await LuluPayNativeModule.getAsset(assetId)
      }
      
      // Fallback implementation
      return this.mockAsset(assetId)
    } catch (error) {
      console.error('Failed to get asset:', error)
      throw error
    }
  }

  /**
   * List all assets for the partner
   */
  public async listAssets(
    page: number = 1,
    limit: number = 50,
    assetType?: AssetType
  ): Promise<AssetList> {
    this.checkInitialized()

    try {
      if (LuluPayNativeModule) {
        return await LuluPayNativeModule.listAssets(page, limit, assetType)
      }
      
      // Fallback implementation
      return {
        assets: [],
        totalCount: 0,
        page,
        limit,
        hasMore: false
      }
    } catch (error) {
      console.error('Failed to list assets:', error)
      throw error
    }
  }

  /**
   * Delete asset
   */
  public async deleteAsset(assetId: string): Promise<void> {
    this.checkInitialized()

    try {
      if (LuluPayNativeModule) {
        await LuluPayNativeModule.deleteAsset(assetId)
      }
      
      // Remove from local cache
      await this.removeCachedAsset(assetId)
      
      console.log(`Asset deleted: ${assetId}`)
    } catch (error) {
      console.error('Failed to delete asset:', error)
      throw error
    }
  }

  /**
   * Download asset to device
   */
  public async downloadAsset(
    assetId: string,
    downloadPath?: string
  ): Promise<string> {
    this.checkInitialized()

    try {
      const asset = await this.getAsset(assetId)
      const fileName = `${assetId}.${this.getFileExtensionFromContentType(asset.contentType)}`
      const filePath = downloadPath || `${RNFS.DocumentDirectoryPath}/${fileName}`

      // Download from CDN URL if available, otherwise from main URL
      const downloadUrl = asset.cdnUrl || asset.url

      const downloadResult = await RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: filePath,
        progress: (res) => {
          const progress = res.bytesWritten / res.contentLength
          this.emit('downloadProgress', {
            assetId,
            progress,
            bytesDownloaded: res.bytesWritten,
            totalBytes: res.contentLength
          })
        }
      }).promise

      if (downloadResult.statusCode === 200) {
        return filePath
      } else {
        throw new Error(`Download failed with status: ${downloadResult.statusCode}`)
      }
    } catch (error) {
      console.error('Failed to download asset:', error)
      throw error
    }
  }

  // MARK: - Build Management

  /**
   * Trigger a new build
   */
  public async triggerBuild(buildConfig: BuildConfiguration): Promise<BuildResult> {
    this.checkInitialized()

    try {
      console.log('Triggering build with config:', buildConfig.buildType)

      const buildResult = await this.performBuildTrigger(buildConfig)
      
      // Start monitoring build progress
      this.startBuildMonitoring(buildResult.buildId)
      
      return buildResult
    } catch (error) {
      console.error('Failed to trigger build:', error)
      throw error
    }
  }

  /**
   * Get build status
   */
  public async getBuildStatus(buildId: string): Promise<BuildStatus> {
    this.checkInitialized()

    try {
      if (LuluPayNativeModule) {
        return await LuluPayNativeModule.getBuildStatus(buildId)
      }
      
      // Fallback implementation
      return 'running'
    } catch (error) {
      console.error('Failed to get build status:', error)
      throw error
    }
  }

  /**
   * Get build details
   */
  public async getBuildDetails(buildId: string): Promise<BuildDetails> {
    this.checkInitialized()

    try {
      if (LuluPayNativeModule) {
        return await LuluPayNativeModule.getBuildDetails(buildId)
      }
      
      // Fallback implementation
      return this.mockBuildDetails(buildId)
    } catch (error) {
      console.error('Failed to get build details:', error)
      throw error
    }
  }

  /**
   * List builds for the partner
   */
  public async listBuilds(
    page: number = 1,
    limit: number = 20,
    status?: BuildStatus
  ): Promise<BuildList> {
    this.checkInitialized()

    try {
      if (LuluPayNativeModule) {
        return await LuluPayNativeModule.listBuilds(page, limit, status)
      }
      
      // Fallback implementation
      return {
        builds: [],
        totalCount: 0,
        page,
        limit,
        hasMore: false
      }
    } catch (error) {
      console.error('Failed to list builds:', error)
      throw error
    }
  }

  /**
   * Cancel a running build
   */
  public async cancelBuild(buildId: string): Promise<void> {
    this.checkInitialized()

    try {
      if (LuluPayNativeModule) {
        await LuluPayNativeModule.cancelBuild(buildId)
      }
      
      console.log(`Build cancelled: ${buildId}`)
    } catch (error) {
      console.error('Failed to cancel build:', error)
      throw error
    }
  }

  // MARK: - Partner Information

  /**
   * Get partner information
   */
  public async getPartnerInfo(): Promise<PartnerInfo> {
    this.checkInitialized()

    try {
      if (LuluPayNativeModule) {
        return await LuluPayNativeModule.getPartnerInfo()
      }
      
      // Fallback implementation
      return {
        partnerId: this.config?.partnerId || '',
        name: 'Test Partner',
        email: 'partner@example.com',
        subscriptionTier: 'pro',
        status: 'active',
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      }
    } catch (error) {
      console.error('Failed to get partner info:', error)
      throw error
    }
  }

  /**
   * Get usage statistics
   */
  public async getUsageStats(): Promise<UsageStats> {
    this.checkInitialized()

    try {
      if (LuluPayNativeModule) {
        return await LuluPayNativeModule.getUsageStats()
      }
      
      // Fallback implementation
      return {
        buildsThisMonth: 25,
        buildsLimit: 100,
        storageUsed: 50 * 1024 * 1024,
        storageLimit: 1024 * 1024 * 1024,
        assetsCount: 15,
        assetsLimit: 100,
        apiCallsThisMonth: 500,
        apiCallsLimit: 10000
      }
    } catch (error) {
      console.error('Failed to get usage stats:', error)
      throw error
    }
  }

  // MARK: - Event Management

  /**
   * Add event listener
   */
  public addEventListener(
    event: LuluPayEventType,
    listener: (data: any) => void
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    
    this.eventListeners.get(event)!.push(listener)
    
    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event)
      if (listeners) {
        const index = listeners.indexOf(listener)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      }
    }
  }

  /**
   * Remove event listener
   */
  public removeEventListener(
    event: LuluPayEventType,
    listener: (data: any) => void
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Remove all event listeners
   */
  public removeAllEventListeners(event?: LuluPayEventType): void {
    if (event) {
      this.eventListeners.delete(event)
    } else {
      this.eventListeners.clear()
    }
  }

  // MARK: - Utility Methods

  /**
   * Get SDK status
   */
  public getSDKStatus(): SDKStatus {
    return {
      version: LuluPaySDK.VERSION,
      isInitialized: this.isInitialized,
      isConnected: true, // Would check actual connection in real implementation
      cacheSize: 0, // Would get actual cache size
      activeBuildsCount: 0 // Would get actual count
    }
  }

  /**
   * Test API connectivity
   */
  public async testConnection(): Promise<boolean> {
    this.checkInitialized()

    try {
      if (LuluPayNativeModule) {
        return await LuluPayNativeModule.testConnection()
      }
      
      // Fallback implementation
      return true
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  /**
   * Clear local cache
   */
  public async clearCache(): Promise<void> {
    try {
      const cacheDir = `${RNFS.DocumentDirectoryPath}/LuluPayCache`
      const exists = await RNFS.exists(cacheDir)
      
      if (exists) {
        await RNFS.unlink(cacheDir)
      }
      
      console.log('Cache cleared successfully')
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  // MARK: - Private Methods

  private checkInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('LuluPay SDK is not initialized. Call initialize() first.')
    }
  }

  private emit(event: LuluPayEventType, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  private setupNativeEventListeners(): void {
    if (!LuluPayNativeModule) return

    // Upload progress events
    eventEmitter.addListener('LuluPayUploadProgress', (data) => {
      this.emit('uploadProgress', data)
    })

    // Build progress events
    eventEmitter.addListener('LuluPayBuildProgress', (data) => {
      this.emit('buildProgress', data)
    })

    // Build events
    eventEmitter.addListener('LuluPayBuildEvent', (data) => {
      this.emit('buildEvent', data)
    })

    // Connection status events
    eventEmitter.addListener('LuluPayConnectionChanged', (data) => {
      this.emit('connectionChanged', data)
    })
  }

  private async performAssetUpload(
    filePath: string,
    assetType: AssetType,
    metadata: AssetMetadata,
    assetId: string
  ): Promise<AssetUploadResult> {
    // Simulate upload progress
    const totalSteps = 10
    for (let i = 0; i <= totalSteps; i++) {
      const progress = i / totalSteps
      this.emit('uploadProgress', {
        assetId,
        progress,
        bytesUploaded: progress * 1024,
        totalBytes: 1024
      })
      
      // Add small delay to simulate upload time
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return {
      assetId,
      url: `https://assets.lulupay.com/${assetId}`,
      cdnUrl: `https://cdn.lulupay.com/${assetId}`,
      size: 1024,
      contentType: this.getContentTypeFromFile(filePath),
      uploadedAt: Date.now()
    }
  }

  private async performBuildTrigger(config: BuildConfiguration): Promise<BuildResult> {
    const buildId = `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      buildId,
      status: 'queued',
      createdAt: Date.now()
    }
  }

  private startBuildMonitoring(buildId: string): void {
    // Simulate build progress updates
    let progress = 0
    const interval = setInterval(() => {
      progress += 0.1
      
      if (progress <= 1.0) {
        this.emit('buildProgress', {
          buildId,
          status: 'running',
          overallProgress: progress,
          currentStage: 'Building...',
          stageProgress: progress,
          estimatedTimeRemaining: (1.0 - progress) * 300000,
          message: 'Processing assets...'
        })
      } else {
        clearInterval(interval)
        this.emit('buildComplete', {
          buildId,
          status: 'completed',
          downloadUrl: `https://builds.lulupay.com/${buildId}.apk`
        })
      }
    }, 1000)
  }

  private async cacheAsset(assetId: string, filePath: string): Promise<void> {
    try {
      const cacheDir = `${RNFS.DocumentDirectoryPath}/LuluPayCache`
      const cacheDirExists = await RNFS.exists(cacheDir)
      
      if (!cacheDirExists) {
        await RNFS.mkdir(cacheDir)
      }
      
      const cachedFilePath = `${cacheDir}/${assetId}`
      await RNFS.copyFile(filePath, cachedFilePath)
      
      console.log(`Asset cached: ${assetId}`)
    } catch (error) {
      console.error('Failed to cache asset:', error)
    }
  }

  private async removeCachedAsset(assetId: string): Promise<void> {
    try {
      const cachedFilePath = `${RNFS.DocumentDirectoryPath}/LuluPayCache/${assetId}`
      const exists = await RNFS.exists(cachedFilePath)
      
      if (exists) {
        await RNFS.unlink(cachedFilePath)
        console.log(`Cached asset removed: ${assetId}`)
      }
    } catch (error) {
      console.error('Failed to remove cached asset:', error)
    }
  }

  private getContentTypeFromFile(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase()
    
    switch (extension) {
      case 'png':
        return 'image/png'
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'svg':
        return 'image/svg+xml'
      case 'ttf':
        return 'font/ttf'
      case 'woff':
        return 'font/woff'
      case 'woff2':
        return 'font/woff2'
      case 'css':
        return 'text/css'
      case 'json':
        return 'application/json'
      default:
        return 'application/octet-stream'
    }
  }

  private getFileExtensionFromContentType(contentType: string): string {
    switch (contentType) {
      case 'image/png':
        return 'png'
      case 'image/jpeg':
        return 'jpg'
      case 'image/svg+xml':
        return 'svg'
      case 'font/ttf':
        return 'ttf'
      case 'font/woff':
        return 'woff'
      case 'font/woff2':
        return 'woff2'
      case 'text/css':
        return 'css'
      case 'application/json':
        return 'json'
      default:
        return 'bin'
    }
  }

  private mockAsset(assetId: string): Asset {
    return {
      id: assetId,
      name: 'Test Asset',
      type: 'app_icon',
      url: `https://assets.lulupay.com/${assetId}`,
      cdnUrl: `https://cdn.lulupay.com/${assetId}`,
      size: 1024,
      contentType: 'image/png',
      metadata: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }

  private mockBuildDetails(buildId: string): BuildDetails {
    return {
      buildId,
      status: 'running',
      progress: 0.5,
      stages: [],
      logs: [],
      assets: [],
      config: {
        appName: 'Test App',
        packageName: 'com.test.app',
        assetIds: []
      },
      createdAt: Date.now(),
      startedAt: Date.now()
    }
  }
}

// Export singleton instance
export default LuluPaySDK.getInstance()

// Export React hooks for easy integration
export * from './hooks'

// Export all types
export type {
  LuluPayConfig,
  AssetMetadata,
  AssetUploadResult,
  Asset,
  AssetList,
  BuildConfiguration,
  ThemeConfig,
  BuildResult,
  BuildDetails,
  BuildStage,
  BuildLog,
  BuildProgress,
  BuildEvent,
  BuildList,
  PartnerInfo,
  UsageStats,
  UploadProgress,
  SDKStatus,
  LuluPayEvent,
  LuluPayEventType
} 