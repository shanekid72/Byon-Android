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
     * Launches the remittance flow with automatic eKYC verification
     * Partners call this when user wants to send money
     */
    fun launchRemittanceFlow(
        context: Context,
        options: RemittanceOptions = RemittanceOptions()
    ): Intent {
        requireInitialized()
        
        // Check if customer needs eKYC verification first
        val customerNumber = options.prefilledData?.senderPhone ?: "GUEST_${System.currentTimeMillis()}"
        
        return if (needsEKYCVerification(customerNumber)) {
            // Launch eKYC flow first
            Intent(context, com.sdk.lulupay.activity.EKYCActivity::class.java).apply {
                putExtra("CUSTOMER_NUMBER", customerNumber)
                putExtra("RETURN_TO_REMITTANCE", true)
                putExtra("SDK_MODE", true)
                putExtra("PARTNER_ID", SessionManager.partnerId)
                putExtra("USE_PARTNER_THEME", options.usePartnerTheme)
                
                // Store remittance options for after eKYC completion
                putExtra("REMITTANCE_OPTIONS_JSON", serializeRemittanceOptions(options))
            }
        } else {
            // Customer is KYC verified, proceed with remittance
            Intent(context, RemittanceScreen::class.java).apply {
                putExtra("SDK_MODE", true)
                putExtra("PARTNER_ID", SessionManager.partnerId)
                putExtra("RETURN_TO_PARTNER", true)
                putExtra("USE_PARTNER_THEME", options.usePartnerTheme)
                putExtra("SHOW_BACK_BUTTON", options.showBackButton)
                putExtra("AUTO_FINISH_ON_COMPLETE", options.autoFinishOnComplete)
                putExtra("ENABLE_TRANSACTION_HISTORY", options.enableTransactionHistory)
                putExtra("ENABLE_SUPPORT", options.enableSupport)
                putExtra("CUSTOMER_NUMBER", customerNumber)
                putExtra("KYC_STATUS", "APPROVED")
                
                // Add prefilled data if provided
                options.prefilledData?.let { data ->
                    putExtra("PREFILLED_DATA", data)
                }
            }
        }
    }
    
    /**
     * Check if customer needs eKYC verification
     */
    private fun needsEKYCVerification(customerNumber: String): Boolean {
        // In real implementation, this would check with backend
        // For now, simulate: customers with "VERIFIED_" prefix are already verified
        return !customerNumber.startsWith("VERIFIED_") && !isCustomerKYCApproved(customerNumber)
    }
    
    /**
     * Check if customer is already KYC approved
     */
    private fun isCustomerKYCApproved(customerNumber: String): Boolean {
        // In real implementation, check with eKYC service
        // For demo purposes, simulate some verified customers
        val verifiedCustomers = setOf("admin", "test@lulupay.com", "+971501234567")
        return verifiedCustomers.contains(customerNumber)
    }
    
    /**
     * Launch eKYC verification for existing customer
     */
    fun launchCustomerVerification(
        context: Context,
        customerNumber: String
    ): Intent {
        requireInitialized()
        
        return Intent(context, com.sdk.lulupay.activity.EKYCActivity::class.java).apply {
            putExtra("CUSTOMER_NUMBER", customerNumber)
            putExtra("RETURN_TO_REMITTANCE", false)
            putExtra("SDK_MODE", true)
            putExtra("PARTNER_ID", SessionManager.partnerId)
        }
    }
    
    /**
     * Serialize remittance options to JSON string
     */
    private fun serializeRemittanceOptions(options: RemittanceOptions): String {
        // Simple serialization - in production use Gson or kotlinx.serialization
        return """
        {
            "usePartnerTheme": ${options.usePartnerTheme},
            "showBackButton": ${options.showBackButton},
            "autoFinishOnComplete": ${options.autoFinishOnComplete},
            "enableTransactionHistory": ${options.enableTransactionHistory},
            "enableSupport": ${options.enableSupport},
            "prefilledData": ${if (options.prefilledData != null) serializePrefilledData(options.prefilledData) else "null"}
        }
        """.trimIndent()
    }
    
    /**
     * Serialize prefilled data to JSON
     */
    private fun serializePrefilledData(data: PrefilledData): String {
        return """
        {
            "senderName": "${data.senderName ?: ""}",
            "senderPhone": "${data.senderPhone ?: ""}",
            "receiverName": "${data.receiverName ?: ""}",
            "receiverPhone": "${data.receiverPhone ?: ""}",
            "amount": ${data.amount ?: 0.0},
            "currency": "${data.currency ?: ""}",
            "purpose": "${data.purpose ?: ""}"
        }
        """.trimIndent()
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