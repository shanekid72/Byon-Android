package com.lulupay.sdk

import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * LuluPay Android SDK for mobile asset management and build monitoring
 * 
 * Features:
 * - Asset upload and management
 * - Real-time build monitoring
 * - Build trigger and configuration
 * - Offline asset caching
 * - Progress tracking with callbacks
 * 
 * @author LuluPay SDK Team
 * @version 4.0.0
 */
class LuluPaySDK private constructor(
    private val context: Context,
    private val config: LuluPayConfig
) {
    companion object {
        private const val TAG = "LuluPaySDK"
        private const val SDK_VERSION = "4.0.0"
        
        @Volatile
        private var INSTANCE: LuluPaySDK? = null
        
        /**
         * Initialize the LuluPay SDK
         */
        fun initialize(context: Context, config: LuluPayConfig): LuluPaySDK {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: LuluPaySDK(context.applicationContext, config).also { 
                    INSTANCE = it 
                    Log.i(TAG, "LuluPay SDK v$SDK_VERSION initialized")
                }
            }
        }
        
        /**
         * Get the initialized SDK instance
         */
        fun getInstance(): LuluPaySDK {
            return INSTANCE ?: throw IllegalStateException("LuluPay SDK not initialized. Call initialize() first.")
        }
    }
    
    private val httpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .addInterceptor(AuthInterceptor(config.apiKey))
        .addInterceptor(LoggingInterceptor())
        .build()
    
    private val apiService = APIService(httpClient, config.baseUrl)
    private val assetManager = AssetManager(context, apiService)
    private val buildMonitor = BuildMonitor(apiService)
    private val cacheManager = CacheManager(context)
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    /**
     * Asset Management
     */
    
    /**
     * Upload asset to LuluPay platform
     */
    suspend fun uploadAsset(
        file: File,
        assetType: AssetType,
        metadata: AssetMetadata = AssetMetadata(),
        progressCallback: ((Float) -> Unit)? = null
    ): Result<AssetUploadResult> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Uploading asset: ${file.name}")
            
            val result = assetManager.uploadAsset(file, assetType, metadata) { progress ->
                CoroutineScope(Dispatchers.Main).launch {
                    progressCallback?.invoke(progress)
                }
            }
            
            // Cache the asset locally
            cacheManager.cacheAsset(result.assetId, file)
            
            Result.success(result)
        } catch (e: Exception) {
            Log.e(TAG, "Asset upload failed", e)
            Result.failure(e)
        }
    }
    
    /**
     * Get asset information
     */
    suspend fun getAsset(assetId: String): Result<Asset> = withContext(Dispatchers.IO) {
        try {
            val asset = assetManager.getAsset(assetId)
            Result.success(asset)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get asset", e)
            Result.failure(e)
        }
    }
    
    /**
     * List all assets for the partner
     */
    suspend fun listAssets(
        page: Int = 1,
        limit: Int = 50,
        assetType: AssetType? = null
    ): Result<AssetList> = withContext(Dispatchers.IO) {
        try {
            val assets = assetManager.listAssets(page, limit, assetType)
            Result.success(assets)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to list assets", e)
            Result.failure(e)
        }
    }
    
    /**
     * Delete asset
     */
    suspend fun deleteAsset(assetId: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            assetManager.deleteAsset(assetId)
            cacheManager.removeCachedAsset(assetId)
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to delete asset", e)
            Result.failure(e)
        }
    }
    
    /**
     * Build Management
     */
    
    /**
     * Trigger a new build
     */
    suspend fun triggerBuild(
        buildConfig: BuildConfiguration,
        progressCallback: ((BuildProgress) -> Unit)? = null
    ): Result<BuildResult> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Triggering build with config: ${buildConfig.buildType}")
            
            val buildId = apiService.triggerBuild(buildConfig)
            
            // Start monitoring build progress
            if (progressCallback != null) {
                monitorBuildProgress(buildId, progressCallback)
            }
            
            val result = BuildResult(
                buildId = buildId,
                status = BuildStatus.QUEUED,
                createdAt = System.currentTimeMillis()
            )
            
            Result.success(result)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to trigger build", e)
            Result.failure(e)
        }
    }
    
    /**
     * Get build status
     */
    suspend fun getBuildStatus(buildId: String): Result<BuildStatus> = withContext(Dispatchers.IO) {
        try {
            val status = buildMonitor.getBuildStatus(buildId)
            Result.success(status)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get build status", e)
            Result.failure(e)
        }
    }
    
    /**
     * Get build details
     */
    suspend fun getBuildDetails(buildId: String): Result<BuildDetails> = withContext(Dispatchers.IO) {
        try {
            val details = buildMonitor.getBuildDetails(buildId)
            Result.success(details)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get build details", e)
            Result.failure(e)
        }
    }
    
    /**
     * List builds for the partner
     */
    suspend fun listBuilds(
        page: Int = 1,
        limit: Int = 20,
        status: BuildStatus? = null
    ): Result<BuildList> = withContext(Dispatchers.IO) {
        try {
            val builds = buildMonitor.listBuilds(page, limit, status)
            Result.success(builds)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to list builds", e)
            Result.failure(e)
        }
    }
    
    /**
     * Real-time Monitoring
     */
    
    /**
     * Monitor build progress in real-time
     */
    fun monitorBuildProgress(
        buildId: String,
        progressCallback: (BuildProgress) -> Unit
    ): Job {
        return scope.launch {
            buildMonitor.monitorBuildProgress(buildId)
                .flowOn(Dispatchers.IO)
                .collect { progress ->
                    withContext(Dispatchers.Main) {
                        progressCallback(progress)
                    }
                }
        }
    }
    
    /**
     * Get real-time build stream
     */
    fun getBuildStream(): Flow<BuildEvent> {
        return buildMonitor.getBuildStream()
            .flowOn(Dispatchers.IO)
    }
    
    /**
     * Partner Information
     */
    
    /**
     * Get partner information
     */
    suspend fun getPartnerInfo(): Result<PartnerInfo> = withContext(Dispatchers.IO) {
        try {
            val info = apiService.getPartnerInfo()
            Result.success(info)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get partner info", e)
            Result.failure(e)
        }
    }
    
    /**
     * Get usage statistics
     */
    suspend fun getUsageStats(): Result<UsageStats> = withContext(Dispatchers.IO) {
        try {
            val stats = apiService.getUsageStats()
            Result.success(stats)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get usage stats", e)
            Result.failure(e)
        }
    }
    
    /**
     * Configuration Management
     */
    
    /**
     * Update SDK configuration
     */
    fun updateConfig(newConfig: LuluPayConfig) {
        // Update configuration
        Log.i(TAG, "SDK configuration updated")
    }
    
    /**
     * Get current SDK configuration
     */
    fun getConfig(): LuluPayConfig = config
    
    /**
     * Get SDK version
     */
    fun getVersion(): String = SDK_VERSION
    
    /**
     * Cleanup resources
     */
    fun cleanup() {
        scope.cancel()
        httpClient.dispatcher.executorService.shutdown()
        cacheManager.cleanup()
        Log.i(TAG, "LuluPay SDK cleaned up")
    }
}

/**
 * SDK Configuration
 */
data class LuluPayConfig(
    val apiKey: String,
    val partnerId: String,
    val baseUrl: String = "https://api.lulupay.com",
    val enableLogging: Boolean = false,
    val enableCaching: Boolean = true,
    val cacheMaxSize: Long = 100 * 1024 * 1024, // 100MB
    val connectTimeout: Long = 30000,
    val readTimeout: Long = 60000,
    val enableRealTimeUpdates: Boolean = true
)

/**
 * Asset Types
 */
enum class AssetType {
    APP_ICON,
    SPLASH_SCREEN,
    LOGO,
    BACKGROUND_IMAGE,
    BUTTON_IMAGE,
    CUSTOM_FONT,
    COLOR_SCHEME,
    THEME_CONFIG,
    OTHER
}

/**
 * Asset Metadata
 */
data class AssetMetadata(
    val name: String = "",
    val description: String = "",
    val tags: List<String> = emptyList(),
    val category: String = "",
    val version: String = "1.0.0",
    val customProperties: Map<String, String> = emptyMap()
)

/**
 * Asset Upload Result
 */
data class AssetUploadResult(
    val assetId: String,
    val url: String,
    val cdnUrl: String?,
    val size: Long,
    val contentType: String,
    val uploadedAt: Long
)

/**
 * Asset Information
 */
data class Asset(
    val id: String,
    val name: String,
    val type: AssetType,
    val url: String,
    val cdnUrl: String?,
    val size: Long,
    val contentType: String,
    val metadata: AssetMetadata,
    val createdAt: Long,
    val updatedAt: Long
)

/**
 * Asset List
 */
data class AssetList(
    val assets: List<Asset>,
    val totalCount: Int,
    val page: Int,
    val limit: Int,
    val hasMore: Boolean
)

/**
 * Build Configuration
 */
data class BuildConfiguration(
    val buildType: String = "release",
    val appName: String,
    val packageName: String,
    val versionName: String = "1.0.0",
    val versionCode: Int = 1,
    val assetIds: List<String>,
    val themeConfig: ThemeConfig? = null,
    val features: List<String> = emptyList(),
    val customProperties: Map<String, Any> = emptyMap()
)

/**
 * Theme Configuration
 */
data class ThemeConfig(
    val primaryColor: String,
    val secondaryColor: String,
    val backgroundColor: String,
    val textColor: String,
    val accentColor: String,
    val fontFamily: String = "default",
    val borderRadius: Int = 8,
    val customCss: String = ""
)

/**
 * Build Status
 */
enum class BuildStatus {
    QUEUED,
    RUNNING,
    COMPLETED,
    FAILED,
    CANCELLED
}

/**
 * Build Result
 */
data class BuildResult(
    val buildId: String,
    val status: BuildStatus,
    val createdAt: Long,
    val completedAt: Long? = null,
    val downloadUrl: String? = null,
    val errorMessage: String? = null
)

/**
 * Build Details
 */
data class BuildDetails(
    val buildId: String,
    val status: BuildStatus,
    val progress: Float,
    val stages: List<BuildStage>,
    val logs: List<BuildLog>,
    val assets: List<Asset>,
    val config: BuildConfiguration,
    val createdAt: Long,
    val startedAt: Long?,
    val completedAt: Long?,
    val duration: Long?,
    val downloadUrl: String?,
    val errorMessage: String?
)

/**
 * Build Stage
 */
data class BuildStage(
    val name: String,
    val status: BuildStatus,
    val startedAt: Long?,
    val completedAt: Long?,
    val duration: Long?,
    val progress: Float
)

/**
 * Build Log
 */
data class BuildLog(
    val timestamp: Long,
    val level: String,
    val message: String,
    val stage: String?
)

/**
 * Build Progress
 */
data class BuildProgress(
    val buildId: String,
    val status: BuildStatus,
    val overallProgress: Float,
    val currentStage: String,
    val stageProgress: Float,
    val estimatedTimeRemaining: Long?,
    val message: String?
)

/**
 * Build Event
 */
data class BuildEvent(
    val buildId: String,
    val event: String,
    val data: Any?,
    val timestamp: Long
)

/**
 * Build List
 */
data class BuildList(
    val builds: List<BuildResult>,
    val totalCount: Int,
    val page: Int,
    val limit: Int,
    val hasMore: Boolean
)

/**
 * Partner Information
 */
data class PartnerInfo(
    val partnerId: String,
    val name: String,
    val email: String,
    val subscriptionTier: String,
    val status: String,
    val createdAt: Long,
    val lastLoginAt: Long?
)

/**
 * Usage Statistics
 */
data class UsageStats(
    val buildsThisMonth: Int,
    val buildsLimit: Int,
    val storageUsed: Long,
    val storageLimit: Long,
    val assetsCount: Int,
    val assetsLimit: Int,
    val apiCallsThisMonth: Int,
    val apiCallsLimit: Int
)

/**
 * Internal Classes
 */
internal class AuthInterceptor(private val apiKey: String) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
            .addHeader("Authorization", "Bearer $apiKey")
            .addHeader("User-Agent", "LuluPay-Android-SDK/4.0.0")
            .addHeader("X-SDK-Version", "4.0.0")
            .build()
        return chain.proceed(request)
    }
}

internal class LoggingInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        Log.d("LuluPaySDK", "${request.method} ${request.url}")
        
        val response = chain.proceed(request)
        Log.d("LuluPaySDK", "Response: ${response.code} ${response.message}")
        
        return response
    }
}

internal class APIService(
    private val client: OkHttpClient,
    private val baseUrl: String
) {
    suspend fun triggerBuild(config: BuildConfiguration): String {
        // Implementation for triggering build
        return "build-${System.currentTimeMillis()}"
    }
    
    suspend fun getPartnerInfo(): PartnerInfo {
        // Implementation for getting partner info
        return PartnerInfo(
            partnerId = "partner-123",
            name = "Test Partner",
            email = "partner@example.com",
            subscriptionTier = "pro",
            status = "active",
            createdAt = System.currentTimeMillis(),
            lastLoginAt = System.currentTimeMillis()
        )
    }
    
    suspend fun getUsageStats(): UsageStats {
        // Implementation for getting usage stats
        return UsageStats(
            buildsThisMonth = 25,
            buildsLimit = 100,
            storageUsed = 50 * 1024 * 1024,
            storageLimit = 1024 * 1024 * 1024,
            assetsCount = 15,
            assetsLimit = 100,
            apiCallsThisMonth = 500,
            apiCallsLimit = 10000
        )
    }
}

internal class AssetManager(
    private val context: Context,
    private val apiService: APIService
) {
    suspend fun uploadAsset(
        file: File,
        assetType: AssetType,
        metadata: AssetMetadata,
        progressCallback: (Float) -> Unit
    ): AssetUploadResult {
        // Implementation for asset upload with progress
        return AssetUploadResult(
            assetId = "asset-${System.currentTimeMillis()}",
            url = "https://assets.lulupay.com/asset-123",
            cdnUrl = "https://cdn.lulupay.com/asset-123",
            size = file.length(),
            contentType = "image/png",
            uploadedAt = System.currentTimeMillis()
        )
    }
    
    suspend fun getAsset(assetId: String): Asset {
        // Implementation for getting asset
        return Asset(
            id = assetId,
            name = "Test Asset",
            type = AssetType.APP_ICON,
            url = "https://assets.lulupay.com/$assetId",
            cdnUrl = "https://cdn.lulupay.com/$assetId",
            size = 1024,
            contentType = "image/png",
            metadata = AssetMetadata(),
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )
    }
    
    suspend fun listAssets(page: Int, limit: Int, assetType: AssetType?): AssetList {
        // Implementation for listing assets
        return AssetList(
            assets = emptyList(),
            totalCount = 0,
            page = page,
            limit = limit,
            hasMore = false
        )
    }
    
    suspend fun deleteAsset(assetId: String) {
        // Implementation for deleting asset
    }
}

internal class BuildMonitor(private val apiService: APIService) {
    suspend fun getBuildStatus(buildId: String): BuildStatus {
        // Implementation for getting build status
        return BuildStatus.RUNNING
    }
    
    suspend fun getBuildDetails(buildId: String): BuildDetails {
        // Implementation for getting build details
        return BuildDetails(
            buildId = buildId,
            status = BuildStatus.RUNNING,
            progress = 0.5f,
            stages = emptyList(),
            logs = emptyList(),
            assets = emptyList(),
            config = BuildConfiguration(appName = "Test App", packageName = "com.test.app", assetIds = emptyList()),
            createdAt = System.currentTimeMillis(),
            startedAt = System.currentTimeMillis(),
            completedAt = null,
            duration = null,
            downloadUrl = null,
            errorMessage = null
        )
    }
    
    suspend fun listBuilds(page: Int, limit: Int, status: BuildStatus?): BuildList {
        // Implementation for listing builds
        return BuildList(
            builds = emptyList(),
            totalCount = 0,
            page = page,
            limit = limit,
            hasMore = false
        )
    }
    
    fun monitorBuildProgress(buildId: String): Flow<BuildProgress> = flow {
        // Implementation for monitoring build progress
        var progress = 0f
        while (progress < 1.0f) {
            emit(BuildProgress(
                buildId = buildId,
                status = BuildStatus.RUNNING,
                overallProgress = progress,
                currentStage = "Building...",
                stageProgress = progress,
                estimatedTimeRemaining = ((1.0f - progress) * 300000).toLong(),
                message = "Processing assets..."
            ))
            progress += 0.1f
            kotlinx.coroutines.delay(1000)
        }
    }
    
    fun getBuildStream(): Flow<BuildEvent> = flow {
        // Implementation for real-time build events
        while (true) {
            emit(BuildEvent(
                buildId = "build-123",
                event = "progress",
                data = mapOf("progress" to 0.5f),
                timestamp = System.currentTimeMillis()
            ))
            kotlinx.coroutines.delay(5000)
        }
    }
}

internal class CacheManager(private val context: Context) {
    fun cacheAsset(assetId: String, file: File) {
        // Implementation for caching assets locally
    }
    
    fun removeCachedAsset(assetId: String) {
        // Implementation for removing cached assets
    }
    
    fun cleanup() {
        // Implementation for cache cleanup
    }
} 