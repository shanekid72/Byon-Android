package com.lulupay.generator

import com.lulupay.generator.models.*
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption

/**
 * Generates build configuration files for partner apps
 * Creates customized build.gradle.kts, AndroidManifest.xml, and other configuration files
 */
class BuildConfigGenerator {
    
    /**
     * Generates a complete build.gradle.kts file for a partner app
     */
    fun generatePartnerBuildGradle(config: PartnerAppConfig): String {
        return """
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "${config.packageName}"
    compileSdk = ${config.buildConfig.targetSdk}

    defaultConfig {
        applicationId = "${config.packageName}"
        minSdk = ${config.buildConfig.minSdk}
        targetSdk = ${config.buildConfig.targetSdk}
        versionCode = ${config.buildConfig.versionCode}
        versionName = "${config.buildConfig.versionName}"
        
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        
        // Partner-specific manifest placeholders
        manifestPlaceholders = [
            appName: "${config.appName}",
            partnerId: "${config.partnerId}",
            partnerName: "${config.partnerName}"
        ]
        
        // Build config fields for runtime access
        buildConfigField("String", "PARTNER_ID", "\"${config.partnerId}\"")
        buildConfigField("String", "PARTNER_NAME", "\"${config.partnerName}\"")
        buildConfigField("String", "API_BASE_URL", "\"${config.apiConfig.baseUrl}\"")
        
        // Resource values for theme colors
        resValue("string", "app_name", "${config.appName}")
        resValue("color", "partner_primary", "${config.brandConfig.primaryColor}")
        resValue("color", "partner_secondary", "${config.brandConfig.secondaryColor}")
    }

    buildTypes {
        release {
            isMinifyEnabled = ${config.buildConfig.minifyEnabled}
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    
    buildFeatures {
        buildConfig = true
    }
    
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    
    kotlinOptions {
        jvmTarget = "11"
    }
}

dependencies {
    implementation(project(":lulupay"))
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}
        """.trimIndent()
    }
    
    /**
     * Generates AndroidManifest.xml for partner app
     */
    fun generateAndroidManifest(config: PartnerAppConfig): String {
        return """
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="${config.packageName}">

    <!-- Internet permissions for API calls -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Camera for KYC document capture -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    
    <!-- Biometric authentication -->
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />
    <uses-feature android:name="android.hardware.fingerprint" android:required="false" />
    
    <!-- Storage for document caching -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" 
        android:maxSdkVersion="28" />
    
    <!-- Notifications -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    
    <!-- Phone state for fraud detection (optional) -->
    <uses-permission android:name="android.permission.READ_PHONE_STATE" 
        tools:node="remove" />

    <application
        android:name=".${config.partnerName.replace(" ", "")}Application"
        android:allowBackup="false"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.${config.partnerName.replace(" ", "")}"
        android:networkSecurityConfig="@xml/network_security_config"
        android:usesCleartextTraffic="false"
        tools:targetApi="31">

        <!-- Main Activity -->
        <activity
            android:name=".activities.MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            
            <!-- Deep link support for partner integrations -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https"
                    android:host="${config.partnerId}.lulupay.com" />
            </intent-filter>
        </activity>

        <!-- LuluPay SDK Activities -->
        <activity
            android:name="com.sdk.lulupay.activity.RemittanceScreen"
            android:configChanges="orientation|screenSize|keyboardHidden|smallestScreenSize|screenLayout"
            android:exported="false"
            android:hardwareAccelerated="true"
            android:screenOrientation="portrait"
            android:supportsPictureInPicture="false"
            android:windowSoftInputMode="stateHidden|adjustResize" />
            
        <activity
            android:name="com.sdk.lulupay.activity.LoginScreen"
            android:configChanges="orientation|screenSize|keyboardHidden|smallestScreenSize|screenLayout"
            android:exported="false"
            android:hardwareAccelerated="true"
            android:screenOrientation="portrait"
            android:supportsPictureInPicture="false"
            android:windowSoftInputMode="stateHidden|adjustResize" />
            
        <activity
            android:name="com.sdk.lulupay.activity.AddNewReceipient"
            android:configChanges="orientation|screenSize|keyboardHidden|smallestScreenSize|screenLayout"
            android:exported="false"
            android:hardwareAccelerated="true"
            android:screenOrientation="portrait"
            android:supportsPictureInPicture="false"
            android:windowSoftInputMode="stateHidden|adjustResize" />

        <!-- File Provider for sharing files -->
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${config.packageName}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>

        <!-- Partner-specific metadata -->
        <meta-data
            android:name="com.lulupay.PARTNER_ID"
            android:value="${config.partnerId}" />
        <meta-data
            android:name="com.lulupay.PARTNER_NAME"
            android:value="${config.partnerName}" />
        <meta-data
            android:name="com.lulupay.API_BASE_URL"
            android:value="${config.apiConfig.baseUrl}" />

        <!-- Firebase Configuration (if analytics enabled) -->
        <service
            android:name=".services.PartnerFirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>

    </application>
</manifest>
        """.trimIndent()
    }
    
    /**
     * Generates the main Application class for the partner app
     */
    fun generateApplicationClass(config: PartnerAppConfig): String {
        val className = "${config.partnerName.replace(" ", "")}Application"
        return """
package ${config.packageName}

import android.app.Application
import android.util.Log
import com.sdk.lulupay.LuluPaySDK
import com.sdk.lulupay.models.PartnerSDKConfig

/**
 * Application class for ${config.partnerName}
 * Initializes LuluPay SDK with partner-specific configuration
 */
class $className : Application() {

    override fun onCreate() {
        super.onCreate()
        
        // Initialize LuluPay SDK
        initializeLuluPaySDK()
        
        // Initialize analytics
        initializeAnalytics()
        
        Log.d(TAG, "${config.appName} initialized successfully")
    }

    private fun initializeLuluPaySDK() {
        val partnerConfig = PartnerSDKConfig(
            partnerId = BuildConfig.PARTNER_ID,
            partnerName = BuildConfig.PARTNER_NAME,
            primaryColor = "${config.brandConfig.primaryColor}",
            secondaryColor = "${config.brandConfig.secondaryColor}",
            companyName = "${config.partnerName}",
            apiKey = BuildConfig.CLIENT_ID,
            baseUrl = BuildConfig.API_BASE_URL,
            enableBiometric = true,
            enableDarkMode = ${config.brandConfig.supportDarkMode}
        )
        
        LuluPaySDK.initialize(
            context = this,
            partnerId = BuildConfig.PARTNER_ID,
            partnerConfig = partnerConfig
        )
        
        Log.d(TAG, "LuluPay SDK initialized for partner: ${'$'}{BuildConfig.PARTNER_NAME}")
    }
    
    private fun initializeAnalytics() {
        // Initialize Firebase Analytics
        // Add any partner-specific analytics configuration here
        Log.d(TAG, "Analytics initialized")
    }

    companion object {
        private const val TAG = "${className}"
    }
}
        """.trimIndent()
    }
    
    /**
     * Generates the main activity for the partner app
     */
    fun generateMainActivity(config: PartnerAppConfig): String {
        return """
package ${config.packageName}.activities

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.sdk.lulupay.LuluPaySDK
import com.sdk.lulupay.models.RemittanceOptions
import com.sdk.lulupay.models.RemittanceResultListener
import ${config.packageName}.R
import ${config.packageName}.databinding.ActivityMainBinding
import ${config.packageName}.viewmodels.MainViewModel

/**
 * Main activity for ${config.appName}
 * Entry point for the partner-branded remittance application
 */
class MainActivity : AppCompatActivity(), RemittanceResultListener {

    private lateinit var binding: ActivityMainBinding
    private lateinit var viewModel: MainViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        viewModel = ViewModelProvider(this)[MainViewModel::class.java]
        
        setupUI()
        setupLuluPaySDK()
        observeViewModel()
    }

    private fun setupUI() {
        // Apply partner branding
        binding.toolbar.title = "${config.appName}"
        
        // Set up click listeners
        binding.btnSendMoney.setOnClickListener {
            launchRemittanceFlow()
        }
        
        binding.btnTransactionHistory.setOnClickListener {
            viewTransactionHistory()
        }
        
        binding.btnSupport.setOnClickListener {
            openSupport()
        }
    }

    private fun setupLuluPaySDK() {
        LuluPaySDK.setResultListener(this)
    }

    private fun launchRemittanceFlow() {
        val options = RemittanceOptions(
            usePartnerTheme = true,
            showBackButton = true,
            autoFinishOnComplete = true,
            enableTransactionHistory = true,
            enableSupport = true
        )
        
        val intent = LuluPaySDK.launchRemittanceFlow(this, options)
        startActivity(intent)
    }
    
    private fun viewTransactionHistory() {
        // Launch transaction history from SDK
        val intent = Intent(this, com.sdk.lulupay.activity.TransactionHistoryScreen::class.java)
        startActivity(intent)
    }
    
    private fun openSupport() {
        // Launch support screen from SDK
        // Implementation depends on SDK support features
    }

    private fun observeViewModel() {
        viewModel.loading.observe(this) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        }
        
        viewModel.error.observe(this) { error ->
            if (error != null) {
                // Show error message
                // Implementation for error handling
            }
        }
    }

    // RemittanceResultListener implementation
    override fun onRemittanceSuccess(transactionId: String, amount: Double, recipient: String) {
        // Handle successful remittance
        viewModel.onRemittanceSuccess(transactionId, amount, recipient)
    }

    override fun onRemittanceFailure(error: String) {
        // Handle remittance failure
        viewModel.onRemittanceFailure(error)
    }

    override fun onRemittanceCancelled() {
        // Handle remittance cancellation
        viewModel.onRemittanceCancelled()
    }
    
    override fun onRemittanceProgress(stage: String, progress: Int) {
        // Handle remittance progress updates
        viewModel.onRemittanceProgress(stage, progress)
    }

    companion object {
        private const val TAG = "MainActivity"
    }
}
        """.trimIndent()
    }
} 