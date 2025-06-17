package com.lulupay.generator.models

import kotlinx.serialization.Serializable
import java.util.*

/**
 * Main configuration for partner app generation
 * Contains all necessary information to generate a branded app
 */
@Serializable
data class PartnerAppConfig(
    val partnerId: String,
    val partnerName: String,
    val packageName: String,           // e.g., "com.firstbank.remittance"
    val appName: String,              // e.g., "First Bank Money Transfer"
    val brandConfig: BrandConfiguration,
    val apiConfig: ApiConfiguration,
    val features: List<String> = listOf("remittance", "history", "support"),
    val complianceConfig: ComplianceConfiguration = ComplianceConfiguration(),
    val buildConfig: BuildConfiguration = BuildConfiguration(),
    val createdAt: Long = System.currentTimeMillis(),
    val version: String = "1.0.0"
)

/**
 * Brand-specific configuration for visual customization
 */
@Serializable
data class BrandConfiguration(
    val primaryColor: String,         // e.g., "#1E3A8A"
    val secondaryColor: String,       // e.g., "#F59E0B"
    val backgroundColor: String = "#FFFFFF",
    val surfaceColor: String = "#FFFFFF",
    val textColor: String = "#000000",
    val textColorSecondary: String = "#666666",
    val errorColor: String = "#F44336",
    val successColor: String = "#4CAF50",
    val warningColor: String = "#FF9800",
    
    // Logo assets (Base64 encoded)
    val appIcon: String,             // App launcher icon
    val splashLogo: String,          // Splash screen logo
    val headerLogo: String,          // Header/navigation logo
    val watermarkLogo: String? = null, // Optional watermark
    
    // Typography
    val fontFamily: String = "default",
    val buttonRadius: String = "8dp",
    val cardRadius: String = "12dp",
    val cardElevation: String = "4dp",
    
    // Dark mode support
    val supportDarkMode: Boolean = true,
    val darkModeColors: DarkModeColors? = null
)

/**
 * Dark mode color configuration
 */
@Serializable
data class DarkModeColors(
    val primaryColor: String = "#64B5F6",
    val backgroundColor: String = "#121212",
    val surfaceColor: String = "#1E1E1E",
    val textColor: String = "#FFFFFF",
    val textColorSecondary: String = "#CCCCCC"
)

/**
 * API and backend configuration
 */
@Serializable
data class ApiConfiguration(
    val baseUrl: String = "https://api.lulupay.com",
    val apiKey: String,
    val clientId: String,
    val clientSecret: String,
    val grantType: String = "client_credentials",
    val scope: String = "remittance",
    val timeout: Long = 30000, // milliseconds
    val retryCount: Int = 3,
    val customHeaders: Map<String, String> = emptyMap()
)

/**
 * Compliance and regulatory configuration
 */
@Serializable
data class ComplianceConfiguration(
    val kycRequired: Boolean = true,
    val amlEnabled: Boolean = true,
    val dataPrivacyCompliance: List<String> = listOf("GDPR", "CCPA"),
    val supportedCountries: List<String> = listOf("AE", "IN", "PK", "PH"),
    val restrictedCountries: List<String> = emptyList(),
    val maxTransactionAmount: Double = 10000.0,
    val dailyTransactionLimit: Double = 50000.0,
    val monthlyTransactionLimit: Double = 200000.0
)

/**
 * Build and deployment configuration
 */
@Serializable
data class BuildConfiguration(
    val targetSdk: Int = 35,
    val minSdk: Int = 24,
    val versionCode: Int = 1,
    val versionName: String = "1.0.0",
    val debuggable: Boolean = false,
    val minifyEnabled: Boolean = true,
    val useR8: Boolean = true,
    val generateSignedApk: Boolean = true,
    val keystoreConfig: KeystoreConfiguration? = null
)

/**
 * Keystore configuration for app signing
 */
@Serializable
data class KeystoreConfiguration(
    val keystorePath: String,
    val keystorePassword: String,
    val keyAlias: String,
    val keyPassword: String
)

/**
 * SDK-specific configuration for existing app integration
 */
@Serializable
data class PartnerSDKConfig(
    val partnerId: String,
    val partnerName: String,
    val primaryColor: String,
    val secondaryColor: String,
    val logoUrl: String? = null,
    val companyName: String,
    val apiKey: String,
    val baseUrl: String = "https://api.lulupay.com",
    val enableBiometric: Boolean = true,
    val enableDarkMode: Boolean = true,
    val customTheme: Map<String, String> = emptyMap()
)

/**
 * Options for launching remittance flow in SDK mode
 */
@Serializable
data class RemittanceOptions(
    val usePartnerTheme: Boolean = true,
    val showBackButton: Boolean = true,
    val autoFinishOnComplete: Boolean = true,
    val enableTransactionHistory: Boolean = true,
    val enableSupport: Boolean = true,
    val prefilledData: PrefilledData? = null
)

/**
 * Pre-filled data for remittance flow
 */
@Serializable
data class PrefilledData(
    val senderName: String? = null,
    val senderPhone: String? = null,
    val receiverName: String? = null,
    val receiverPhone: String? = null,
    val amount: Double? = null,
    val currency: String? = null,
    val purpose: String? = null
)

/**
 * Result of app generation process
 */
@Serializable
data class GenerationResult(
    val success: Boolean,
    val partnerId: String? = null,
    val downloadUrls: Map<String, String> = emptyMap(),
    val error: String? = null,
    val warnings: List<String> = emptyList(),
    val buildLogs: List<String> = emptyList(),
    val generatedAt: Long = System.currentTimeMillis()
)

/**
 * Asset processing result
 */
@Serializable
data class ProcessedAssets(
    val appIcons: Map<String, String>, // density -> base64
    val splashScreens: Map<String, String>,
    val headerLogos: Map<String, String>,
    val colorResources: String,
    val stringResources: String,
    val themeResources: String,
    val manifestUpdates: Map<String, String>
)

/**
 * Build progress tracking
 */
@Serializable
data class BuildProgress(
    val partnerId: String,
    val stage: BuildStage,
    val progress: Int, // 0-100
    val message: String,
    val estimatedTimeRemaining: Long? = null,
    val updatedAt: Long = System.currentTimeMillis()
)

/**
 * Build stages for progress tracking
 */
enum class BuildStage {
    INITIALIZING,
    CLONING_BASE_APP,
    APPLYING_BRANDING,
    GENERATING_ASSETS,
    UPDATING_CONFIGURATION,
    BUILDING_APK,
    TESTING,
    UPLOADING,
    COMPLETED,
    FAILED
}

/**
 * Interface for result callbacks in SDK integration
 */
interface RemittanceResultListener {
    fun onRemittanceSuccess(transactionId: String, amount: Double, recipient: String)
    fun onRemittanceFailure(error: String)
    fun onRemittanceCancelled()
    fun onRemittanceProgress(stage: String, progress: Int)
}

/**
 * Partner app validation result
 */
@Serializable
data class ValidationResult(
    val isValid: Boolean,
    val errors: List<ValidationError> = emptyList(),
    val warnings: List<ValidationWarning> = emptyList()
)

@Serializable
data class ValidationError(
    val field: String,
    val message: String,
    val code: String
)

@Serializable
data class ValidationWarning(
    val field: String,
    val message: String,
    val code: String
) 