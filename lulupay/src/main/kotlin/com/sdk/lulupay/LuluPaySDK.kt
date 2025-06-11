package com.sdk.lulupay

import android.content.Context
import android.content.Intent
import com.sdk.lulupay.activity.RemittanceScreen
import com.sdk.lulupay.models.*
import com.sdk.lulupay.session.SessionManager
import com.sdk.lulupay.theme.ThemeManager
import com.sdk.lulupay.storage.SecureLoginStorage

/**
 * Main entry point for LuluPay SDK integration
 * Allows partners to integrate remittance functionality into their existing apps
 */
object LuluPaySDK {
    
    private var isInitialized = false
    private var partnerConfig: PartnerSDKConfig? = null
    private var resultListener: RemittanceResultListener? = null
    
    /**
     * Initializes the LuluPay SDK with partner configuration
     * Should be called once in the partner app's Application.onCreate()
     */
    fun initialize(
        context: Context,
        partnerId: String,
        partnerConfig: PartnerSDKConfig? = null
    ) {
        if (isInitialized) {
            return
        }
        
        // Store partner configuration
        SessionManager.partnerId = partnerId
        this.partnerConfig = partnerConfig
        
        // Apply partner branding if provided
        partnerConfig?.let { config ->
            applyPartnerBranding(context, config)
        }
        
        isInitialized = true
    }
    
    /**
     * Launches the remittance flow
     * Partners call this when user wants to send money
     */
    fun launchRemittanceFlow(
        context: Context,
        options: RemittanceOptions = RemittanceOptions()
    ): Intent {
        requireInitialized()
        
        return Intent(context, RemittanceScreen::class.java).apply {
            putExtra("SDK_MODE", true)
            putExtra("PARTNER_ID", SessionManager.partnerId)
            putExtra("RETURN_TO_PARTNER", true)
            putExtra("USE_PARTNER_THEME", options.usePartnerTheme)
            putExtra("SHOW_BACK_BUTTON", options.showBackButton)
            putExtra("AUTO_FINISH_ON_COMPLETE", options.autoFinishOnComplete)
            putExtra("ENABLE_TRANSACTION_HISTORY", options.enableTransactionHistory)
            putExtra("ENABLE_SUPPORT", options.enableSupport)
            
            // Add prefilled data if provided
            options.prefilledData?.let { data ->
                putExtra("PREFILLED_DATA", data)
            }
        }
    }
    
    /**
     * Launches remittance with auto-login
     * For partners who want to pass user credentials directly
     */
    fun launchRemittanceWithAuth(
        context: Context,
        username: String,
        password: String,
        options: RemittanceOptions = RemittanceOptions()
    ): Intent {
        requireInitialized()
        
        return Intent(context, RemittanceScreen::class.java).apply {
            putExtra("SDK_MODE", true)
            putExtra("PARTNER_ID", SessionManager.partnerId)
            putExtra("ISAUTOLOGIN", true)
            putExtra("USERNAME", username)
            putExtra("PASSWORD", password)
            putExtra("USE_PARTNER_THEME", options.usePartnerTheme)
            putExtra("SHOW_BACK_BUTTON", options.showBackButton)
            putExtra("AUTO_FINISH_ON_COMPLETE", options.autoFinishOnComplete)
            
            options.prefilledData?.let { data ->
                putExtra("PREFILLED_DATA", data)
            }
        }
    }
    
    /**
     * Sets the result listener for remittance callbacks
     */
    fun setResultListener(listener: RemittanceResultListener) {
        resultListener = listener
        RemittanceResultManager.setListener(listener)
    }
    
    /**
     * Clears stored credentials and session data
     */
    fun logout(context: Context) {
        SessionManager.clearSession()
        SecureLoginStorage.clearLoginDetails(context)
    }
    
    /**
     * Checks if user is logged in
     */
    fun isLoggedIn(context: Context): Boolean {
        val (username, password) = SecureLoginStorage.getLoginDetails(context)
        return username != null && password != null
    }
    
    /**
     * Gets current partner configuration
     */
    fun getPartnerConfig(): PartnerSDKConfig? {
        return partnerConfig
    }
    
    /**
     * Updates partner configuration at runtime
     */
    fun updatePartnerConfig(context: Context, config: PartnerSDKConfig) {
        this.partnerConfig = config
        applyPartnerBranding(context, config)
    }
    
    /**
     * Gets the current SDK version
     */
    fun getSDKVersion(): String {
        return BuildConfig.VERSION_NAME
    }
    
    /**
     * Applies partner branding to the SDK
     */
    private fun applyPartnerBranding(context: Context, config: PartnerSDKConfig) {
        // Apply partner colors to theme
        ThemeManager.setPartnerColors(
            primary = config.primaryColor,
            secondary = config.secondaryColor,
            darkModeEnabled = config.enableDarkMode
        )
        
        // Store API configuration
        SessionManager.apply {
            partnerName = config.partnerName
            clientId = config.apiKey
            grantType = "client_credentials"
            scope = "remittance"
        }
        
        // Cache partner logo if provided
        config.logoUrl?.let { logoUrl ->
            LogoManager.cachePartnerLogo(context, logoUrl)
        }
    }
    
    /**
     * Ensures SDK is initialized before use
     */
    private fun requireInitialized() {
        if (!isInitialized) {
            throw IllegalStateException("LuluPaySDK must be initialized before use. Call LuluPaySDK.initialize() first.")
        }
    }
}

/**
 * Configuration for SDK integration in partner apps
 */
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
 * Options for launching remittance flow
 */
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
 * Interface for remittance result callbacks
 */
interface RemittanceResultListener {
    fun onRemittanceSuccess(transactionId: String, amount: Double, recipient: String)
    fun onRemittanceFailure(error: String)
    fun onRemittanceCancelled()
    fun onRemittanceProgress(stage: String, progress: Int)
}

/**
 * Manages remittance result callbacks
 */
object RemittanceResultManager {
    private var listener: RemittanceResultListener? = null
    
    fun setListener(listener: RemittanceResultListener) {
        this.listener = listener
    }
    
    fun notifySuccess(transactionId: String, amount: Double, recipient: String) {
        listener?.onRemittanceSuccess(transactionId, amount, recipient)
    }
    
    fun notifyFailure(error: String) {
        listener?.onRemittanceFailure(error)
    }
    
    fun notifyCancelled() {
        listener?.onRemittanceCancelled()
    }
    
    fun notifyProgress(stage: String, progress: Int) {
        listener?.onRemittanceProgress(stage, progress)
    }
}

/**
 * Manages partner logo caching and loading
 */
object LogoManager {
    fun cachePartnerLogo(context: Context, logoUrl: String) {
        // Implementation for caching partner logo
        // Could use Glide, Picasso, or custom implementation
    }
    
    fun getPartnerLogo(context: Context): String? {
        // Return cached partner logo
        return null
    }
} 