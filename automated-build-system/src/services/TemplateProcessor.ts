import fs from 'fs-extra'
import path from 'path'
import { logger } from '../utils/logger'

// Handlebars-like template engine interface (will use mustache.js)
interface TemplateContext {
  // Partner Information
  PARTNER_ID: string
  PARTNER_NAME: string
  APP_NAME: string
  PACKAGE_NAME: string
  PACKAGE_PATH: string
  VERSION_NAME: string
  VERSION_CODE: number
  
  // Branding
  PRIMARY_COLOR: string
  PRIMARY_COLOR_VARIANT: string
  SECONDARY_COLOR: string
  SECONDARY_COLOR_VARIANT: string
  BACKGROUND_COLOR: string
  SURFACE_COLOR: string
  SURFACE_COLOR_VARIANT: string
  TEXT_COLOR: string
  TEXT_COLOR_SECONDARY: string
  
  // Calculated Colors
  ON_PRIMARY_TEXT_COLOR: string
  ON_SECONDARY_TEXT_COLOR: string
  RIPPLE_COLOR: string
  DIVIDER_COLOR: string
  DISABLED_COLOR: string
  DISABLED_TEXT_COLOR: string
  
  // Status Colors
  ERROR_COLOR: string
  ERROR_COLOR_VARIANT: string
  SUCCESS_COLOR: string
  WARNING_COLOR: string
  INFO_COLOR: string
  
  // Transaction Colors
  TRANSACTION_PENDING_COLOR: string
  TRANSACTION_PROCESSING_COLOR: string
  TRANSACTION_COMPLETED_COLOR: string
  TRANSACTION_FAILED_COLOR: string
  TRANSACTION_CANCELLED_COLOR: string
  
  // Gradient Colors
  GRADIENT_START_COLOR: string
  GRADIENT_END_COLOR: string
  
  // Notification Colors
  NOTIFICATION_BACKGROUND_COLOR: string
  
  // Dark Mode Colors (optional)
  SUPPORT_DARK_MODE: boolean
  DARK_PRIMARY_COLOR?: string
  DARK_BACKGROUND_COLOR?: string
  DARK_SURFACE_COLOR?: string
  DARK_TEXT_COLOR?: string
  DARK_TEXT_COLOR_SECONDARY?: string
  
  // API Configuration
  API_BASE_URL: string
  PROD_API_BASE_URL: string
  DEV_API_BASE_URL: string
  API_KEY: string
  ENVIRONMENT: string
  
  // Feature Flags
  ENABLE_BIOMETRIC: boolean
  ENABLE_EKYC: boolean
  ENABLE_PUSH_NOTIFICATIONS: boolean
  ENABLE_CARD_PAYMENTS: boolean
  ENABLE_BANK_TRANSFER: boolean
  ENABLE_CRYPTO: boolean
  ENABLE_MULTI_CURRENCY: boolean
  ENABLE_OFFLINE_MODE: boolean
  
  // Signing Configuration (optional)
  SIGNING_CONFIG: boolean
  KEYSTORE_PATH?: string
  KEYSTORE_PASSWORD?: string
  KEY_ALIAS?: string
  KEY_PASSWORD?: string
  
  // Deep Linking
  PARTNER_SCHEME: string
  PARTNER_HOST: string
  
  // Theme Configuration
  THEME_NAME: string
  
  // SDK Version
  LULUPAY_SDK_VERSION: string
  
  // Partner Config JSON
  PARTNER_CONFIG_JSON: string
}

export interface AndroidBuildConfig {
  buildId: string
  partnerConfig: {
    appName: string
    packageName: string
    version: string
    versionCode: number
    description?: string
    branding: {
      primaryColor: string
      secondaryColor: string
      backgroundColor?: string
      textColor?: string
      logo?: string
      splashScreen?: string
      supportDarkMode?: boolean
      darkModeColors?: {
        primaryColor: string
        backgroundColor: string
        surfaceColor: string
        textColor: string
        textColorSecondary: string
      }
    }
    features: { [key: string]: boolean }
    api: {
      baseUrl: string
      prodBaseUrl: string
      devBaseUrl: string
      apiKey: string
      environment: string
    }
    deepLinking?: {
      scheme: string
      host: string
    }
    signing?: {
      keystorePath: string
      keystorePassword: string
      keyAlias: string
      keyPassword: string
    }
  }
  buildType: 'debug' | 'release'
  assets: Array<{
    filename: string
    originalName: string
    path: string
    mimetype: string
  }>
}

export class TemplateProcessor {
  private readonly TEMPLATE_DIR = './templates/android-base'
  private readonly LULUPAY_SDK_VERSION = '1.0.0'

  constructor() {
    this.ensureTemplateDirectory()
  }

  private async ensureTemplateDirectory() {
    if (!await fs.pathExists(this.TEMPLATE_DIR)) {
      throw new Error(`Template directory not found: ${this.TEMPLATE_DIR}`)
    }
  }

  /**
   * Process Android project templates with partner configuration
   */
  async processAndroidTemplate(buildPath: string, config: AndroidBuildConfig): Promise<void> {
    logger.info(`Processing Android template for ${config.partnerConfig.appName}`)

    try {
      // Create template context from config
      const context = this.createTemplateContext(config)
      
      // Copy template directory to build path
      await this.copyTemplateFiles(buildPath)
      
      // Process all template files
      await this.processTemplateFiles(buildPath, context)
      
      // Create directory structure with proper package path
      await this.createPackageDirectories(buildPath, context.PACKAGE_PATH)
      
      // Generate additional files
      await this.generateAdditionalFiles(buildPath, context)

      logger.info(`Template processing completed for ${config.partnerConfig.appName}`)

    } catch (error) {
      logger.error('Template processing failed:', error)
      throw error
    }
  }

  /**
   * Create template context from build configuration
   */
  private createTemplateContext(config: AndroidBuildConfig): TemplateContext {
    const { partnerConfig } = config
    const packagePath = partnerConfig.packageName.replace(/\./g, '/')
    const themeName = this.sanitizeName(partnerConfig.appName)
    
    // Calculate derived colors
    const colors = this.calculateColors(partnerConfig.branding)

    return {
      // Partner Information
      PARTNER_ID: this.generatePartnerId(partnerConfig.appName),
      PARTNER_NAME: partnerConfig.appName,
      APP_NAME: partnerConfig.appName,
      PACKAGE_NAME: partnerConfig.packageName,
      PACKAGE_PATH: packagePath,
      VERSION_NAME: partnerConfig.version,
      VERSION_CODE: partnerConfig.versionCode || 1,
      
      // Branding Colors
      PRIMARY_COLOR: partnerConfig.branding.primaryColor,
      PRIMARY_COLOR_VARIANT: colors.primaryVariant,
      SECONDARY_COLOR: partnerConfig.branding.secondaryColor,
      SECONDARY_COLOR_VARIANT: colors.secondaryVariant,
      BACKGROUND_COLOR: partnerConfig.branding.backgroundColor || '#FFFFFF',
      SURFACE_COLOR: colors.surface,
      SURFACE_COLOR_VARIANT: colors.surfaceVariant,
      TEXT_COLOR: partnerConfig.branding.textColor || '#000000',
      TEXT_COLOR_SECONDARY: colors.textSecondary,
      
      // Calculated Colors
      ON_PRIMARY_TEXT_COLOR: colors.onPrimary,
      ON_SECONDARY_TEXT_COLOR: colors.onSecondary,
      RIPPLE_COLOR: colors.ripple,
      DIVIDER_COLOR: colors.divider,
      DISABLED_COLOR: colors.disabled,
      DISABLED_TEXT_COLOR: colors.disabledText,
      
      // Status Colors
      ERROR_COLOR: colors.error,
      ERROR_COLOR_VARIANT: colors.errorVariant,
      SUCCESS_COLOR: colors.success,
      WARNING_COLOR: colors.warning,
      INFO_COLOR: colors.info,
      
      // Transaction Colors
      TRANSACTION_PENDING_COLOR: '#FF9800',
      TRANSACTION_PROCESSING_COLOR: '#2196F3',
      TRANSACTION_COMPLETED_COLOR: colors.success,
      TRANSACTION_FAILED_COLOR: colors.error,
      TRANSACTION_CANCELLED_COLOR: '#757575',
      
      // Gradient Colors
      GRADIENT_START_COLOR: partnerConfig.branding.primaryColor,
      GRADIENT_END_COLOR: colors.primaryVariant,
      
      // Notification Colors
      NOTIFICATION_BACKGROUND_COLOR: colors.surface,
      
      // Dark Mode Support
      SUPPORT_DARK_MODE: partnerConfig.branding.supportDarkMode || false,
      DARK_PRIMARY_COLOR: partnerConfig.branding.darkModeColors?.primaryColor,
      DARK_BACKGROUND_COLOR: partnerConfig.branding.darkModeColors?.backgroundColor,
      DARK_SURFACE_COLOR: partnerConfig.branding.darkModeColors?.surfaceColor,
      DARK_TEXT_COLOR: partnerConfig.branding.darkModeColors?.textColor,
      DARK_TEXT_COLOR_SECONDARY: partnerConfig.branding.darkModeColors?.textColorSecondary,
      
      // API Configuration
      API_BASE_URL: partnerConfig.api.baseUrl,
      PROD_API_BASE_URL: partnerConfig.api.prodBaseUrl,
      DEV_API_BASE_URL: partnerConfig.api.devBaseUrl,
      API_KEY: partnerConfig.api.apiKey,
      ENVIRONMENT: partnerConfig.api.environment,
      
      // Feature Flags
      ENABLE_BIOMETRIC: partnerConfig.features.enableBiometric || false,
      ENABLE_EKYC: partnerConfig.features.enableEKYC || false,
      ENABLE_PUSH_NOTIFICATIONS: partnerConfig.features.enablePushNotifications || false,
      ENABLE_CARD_PAYMENTS: partnerConfig.features.enableCardPayments || false,
      ENABLE_BANK_TRANSFER: partnerConfig.features.enableBankTransfer || true,
      ENABLE_CRYPTO: partnerConfig.features.enableCrypto || false,
      ENABLE_MULTI_CURRENCY: partnerConfig.features.enableMultiCurrency || false,
      ENABLE_OFFLINE_MODE: partnerConfig.features.enableOfflineMode || false,
      
      // Signing Configuration
      SIGNING_CONFIG: !!partnerConfig.signing,
      KEYSTORE_PATH: partnerConfig.signing?.keystorePath,
      KEYSTORE_PASSWORD: partnerConfig.signing?.keystorePassword,
      KEY_ALIAS: partnerConfig.signing?.keyAlias,
      KEY_PASSWORD: partnerConfig.signing?.keyPassword,
      
      // Deep Linking
      PARTNER_SCHEME: partnerConfig.deepLinking?.scheme || `${this.sanitizeName(partnerConfig.appName).toLowerCase()}`,
      PARTNER_HOST: partnerConfig.deepLinking?.host || 'app.lulupay.com',
      
      // Theme
      THEME_NAME: themeName,
      
      // SDK Version
      LULUPAY_SDK_VERSION: this.LULUPAY_SDK_VERSION,
      
      // Partner Config JSON (for SDK)
      PARTNER_CONFIG_JSON: JSON.stringify({
        partnerId: this.generatePartnerId(partnerConfig.appName),
        partnerName: partnerConfig.appName,
        appName: partnerConfig.appName,
        branding: partnerConfig.branding,
        features: partnerConfig.features,
        api: partnerConfig.api
      })
    }
  }

  /**
   * Copy template files to build directory
   */
  private async copyTemplateFiles(buildPath: string): Promise<void> {
    await fs.copy(this.TEMPLATE_DIR, buildPath)
    logger.info(`Template files copied to ${buildPath}`)
  }

  /**
   * Process all template files in the build directory
   */
  private async processTemplateFiles(buildPath: string, context: TemplateContext): Promise<void> {
    const templateFiles = await this.findTemplateFiles(buildPath)
    
    for (const templateFile of templateFiles) {
      await this.processTemplateFile(templateFile, context)
    }
  }

  /**
   * Find all .template files recursively
   */
  private async findTemplateFiles(dir: string): Promise<string[]> {
    const files: string[] = []
    
    const items = await fs.readdir(dir)
    
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = await fs.stat(fullPath)
      
      if (stat.isDirectory()) {
        const subFiles = await this.findTemplateFiles(fullPath)
        files.push(...subFiles)
      } else if (item.endsWith('.template')) {
        files.push(fullPath)
      }
    }
    
    return files
  }

  /**
   * Process a single template file
   */
  private async processTemplateFile(templatePath: string, context: TemplateContext): Promise<void> {
    try {
      // Read template content
      const template = await fs.readFile(templatePath, 'utf8')
      
      // Process template with context
      const processed = this.processTemplate(template, context)
      
      // Write processed content to new file (remove .template extension)
      const outputPath = templatePath.replace('.template', '')
      await fs.writeFile(outputPath, processed, 'utf8')
      
      // Remove original template file
      await fs.remove(templatePath)
      
      logger.debug(`Processed template: ${path.basename(templatePath)}`)
      
    } catch (error) {
      logger.error(`Failed to process template ${templatePath}:`, error)
      throw error
    }
  }

  /**
   * Simple template processing (mustache-like)
   */
  private processTemplate(template: string, context: TemplateContext): string {
    let processed = template

    // Replace all {{VARIABLE}} placeholders
    Object.entries(context).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        processed = processed.replace(regex, String(value))
      }
    })

    // Handle conditional blocks {{#if CONDITION}} ... {{/if}}
    processed = this.processConditionalBlocks(processed, context)

    return processed
  }

  /**
   * Process conditional template blocks
   */
  private processConditionalBlocks(template: string, context: TemplateContext): string {
    // Handle {{#if VARIABLE}} ... {{/if}} blocks
    const ifBlockRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g
    
    return template.replace(ifBlockRegex, (match, variable, content) => {
      const value = (context as any)[variable]
      return (value === true || value === 'true') ? content : ''
    })
  }

  /**
   * Create package directory structure
   */
  private async createPackageDirectories(buildPath: string, packagePath: string): Promise<void> {
    const javaPath = path.join(buildPath, 'app', 'src', 'main', 'java', packagePath)
    const activitiesPath = path.join(javaPath, 'activities')
    const servicesPath = path.join(javaPath, 'services')
    const receiversPath = path.join(javaPath, 'receivers')
    const providersPath = path.join(javaPath, 'providers')
    
    await fs.ensureDir(activitiesPath)
    await fs.ensureDir(servicesPath)
    await fs.ensureDir(receiversPath)
    await fs.ensureDir(providersPath)
    
    logger.info(`Created package directories for ${packagePath}`)
  }

  /**
   * Generate additional required files
   */
  private async generateAdditionalFiles(buildPath: string, context: TemplateContext): Promise<void> {
    // Generate gradle wrapper files
    await this.generateGradleWrapper(buildPath)
    
    // Generate proguard rules
    await this.generateProguardRules(buildPath)
    
    // Generate network security config
    await this.generateNetworkSecurityConfig(buildPath)
    
    logger.info('Generated additional configuration files')
  }

  /**
   * Generate Gradle Wrapper files
   */
  private async generateGradleWrapper(buildPath: string): Promise<void> {
    const gradlewScript = `#!/bin/bash
# Gradle Wrapper Script for LuluPay White-label App
exec java -jar "$(dirname "$0")/gradle/wrapper/gradle-wrapper.jar" "$@"
`

    const gradlewBat = `@echo off
rem Gradle Wrapper Script for LuluPay White-label App
java -jar "%~dp0gradle\\wrapper\\gradle-wrapper.jar" %*
`

    await fs.writeFile(path.join(buildPath, 'gradlew'), gradlewScript)
    await fs.writeFile(path.join(buildPath, 'gradlew.bat'), gradlewBat)
    
    // Make gradlew executable (if on Unix-like system)
    try {
      await fs.chmod(path.join(buildPath, 'gradlew'), 0o755)
    } catch (error) {
      // Ignore chmod errors on Windows
    }
  }

  /**
   * Generate ProGuard rules
   */
  private async generateProguardRules(buildPath: string): Promise<void> {
    const proguardRules = `# LuluPay SDK ProGuard Rules
-keep class com.lulupay.** { *; }
-keep class com.sdk.lulupay.** { *; }

# Partner-specific rules
-keepclassmembers class * {
    @com.lulupay.annotations.Keep *;
}

# Networking
-keep class retrofit2.** { *; }
-keep class okhttp3.** { *; }

# Gson
-keep class com.google.gson.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
`

    await fs.writeFile(path.join(buildPath, 'app', 'proguard-rules.pro'), proguardRules)
  }

  /**
   * Generate Network Security Config
   */
  private async generateNetworkSecurityConfig(buildPath: string): Promise<void> {
    const networkConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.lulupay.com</domain>
    </domain-config>
</network-security-config>`

    const xmlDir = path.join(buildPath, 'app', 'src', 'main', 'res', 'xml')
    await fs.ensureDir(xmlDir)
    await fs.writeFile(path.join(xmlDir, 'network_security_config.xml'), networkConfig)
  }

  /**
   * Utility methods
   */
  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '').replace(/^[0-9]/, 'App$&')
  }

  private generatePartnerId(appName: string): string {
    return this.sanitizeName(appName).toLowerCase() + '_' + Date.now().toString(36)
  }

  private calculateColors(branding: any): any {
    const primary = branding.primaryColor
    const secondary = branding.secondaryColor
    
    return {
      primaryVariant: this.darkenColor(primary, 0.2),
      secondaryVariant: this.darkenColor(secondary, 0.2),
      surface: branding.backgroundColor || '#FFFFFF',
      surfaceVariant: this.lightenColor(branding.backgroundColor || '#FFFFFF', 0.05),
      textSecondary: this.addAlpha(branding.textColor || '#000000', 0.6),
      onPrimary: this.getContrastColor(primary),
      onSecondary: this.getContrastColor(secondary),
      ripple: this.addAlpha(primary, 0.12),
      divider: this.addAlpha(branding.textColor || '#000000', 0.12),
      disabled: this.addAlpha(branding.textColor || '#000000', 0.38),
      disabledText: this.addAlpha(branding.textColor || '#000000', 0.38),
      error: '#F44336',
      errorVariant: '#D32F2F',
      success: '#4CAF50',
      warning: '#FF9800',
      info: '#2196F3'
    }
  }

  private darkenColor(hex: string, factor: number): string {
    // Simple color darkening - in production, use a proper color library
    return hex // Placeholder implementation
  }

  private lightenColor(hex: string, factor: number): string {
    // Simple color lightening - in production, use a proper color library
    return hex // Placeholder implementation
  }

  private addAlpha(hex: string, alpha: number): string {
    // Add alpha to hex color - in production, use a proper color library
    const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0')
    return hex + alphaHex
  }

  private getContrastColor(hex: string): string {
    // Calculate contrasting color (black or white) - simplified
    return '#FFFFFF' // Placeholder implementation
  }
} 