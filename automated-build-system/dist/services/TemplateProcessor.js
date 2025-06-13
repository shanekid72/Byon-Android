"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateProcessor = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
class TemplateProcessor {
    constructor() {
        this.TEMPLATE_DIR = './templates/android-base';
        this.LULUPAY_SDK_VERSION = '1.0.0';
        this.ensureTemplateDirectory();
    }
    async ensureTemplateDirectory() {
        if (!await fs_extra_1.default.pathExists(this.TEMPLATE_DIR)) {
            throw new Error(`Template directory not found: ${this.TEMPLATE_DIR}`);
        }
    }
    async processAndroidTemplate(buildPath, config) {
        logger_1.logger.info(`Processing Android template for ${config.partnerConfig.appName}`);
        try {
            const context = this.createTemplateContext(config);
            await this.copyTemplateFiles(buildPath);
            await this.processTemplateFiles(buildPath, context);
            await this.createPackageDirectories(buildPath, context.PACKAGE_PATH);
            await this.generateAdditionalFiles(buildPath, context);
            logger_1.logger.info(`Template processing completed for ${config.partnerConfig.appName}`);
        }
        catch (error) {
            logger_1.logger.error('Template processing failed:', error);
            throw error;
        }
    }
    createTemplateContext(config) {
        const { partnerConfig } = config;
        const packagePath = partnerConfig.packageName.replace(/\./g, '/');
        const themeName = this.sanitizeName(partnerConfig.appName);
        const colors = this.calculateColors(partnerConfig.branding);
        return {
            PARTNER_ID: this.generatePartnerId(partnerConfig.appName),
            PARTNER_NAME: partnerConfig.appName,
            APP_NAME: partnerConfig.appName,
            PACKAGE_NAME: partnerConfig.packageName,
            PACKAGE_PATH: packagePath,
            VERSION_NAME: partnerConfig.version,
            VERSION_CODE: partnerConfig.versionCode || 1,
            PRIMARY_COLOR: partnerConfig.branding.primaryColor,
            PRIMARY_COLOR_VARIANT: colors.primaryVariant,
            SECONDARY_COLOR: partnerConfig.branding.secondaryColor,
            SECONDARY_COLOR_VARIANT: colors.secondaryVariant,
            BACKGROUND_COLOR: partnerConfig.branding.backgroundColor || '#FFFFFF',
            SURFACE_COLOR: colors.surface,
            SURFACE_COLOR_VARIANT: colors.surfaceVariant,
            TEXT_COLOR: partnerConfig.branding.textColor || '#000000',
            TEXT_COLOR_SECONDARY: colors.textSecondary,
            ON_PRIMARY_TEXT_COLOR: colors.onPrimary,
            ON_SECONDARY_TEXT_COLOR: colors.onSecondary,
            RIPPLE_COLOR: colors.ripple,
            DIVIDER_COLOR: colors.divider,
            DISABLED_COLOR: colors.disabled,
            DISABLED_TEXT_COLOR: colors.disabledText,
            ERROR_COLOR: colors.error,
            ERROR_COLOR_VARIANT: colors.errorVariant,
            SUCCESS_COLOR: colors.success,
            WARNING_COLOR: colors.warning,
            INFO_COLOR: colors.info,
            TRANSACTION_PENDING_COLOR: '#FF9800',
            TRANSACTION_PROCESSING_COLOR: '#2196F3',
            TRANSACTION_COMPLETED_COLOR: colors.success,
            TRANSACTION_FAILED_COLOR: colors.error,
            TRANSACTION_CANCELLED_COLOR: '#757575',
            GRADIENT_START_COLOR: partnerConfig.branding.primaryColor,
            GRADIENT_END_COLOR: colors.primaryVariant,
            NOTIFICATION_BACKGROUND_COLOR: colors.surface,
            SUPPORT_DARK_MODE: partnerConfig.branding.supportDarkMode || false,
            DARK_PRIMARY_COLOR: partnerConfig.branding.darkModeColors?.primaryColor,
            DARK_BACKGROUND_COLOR: partnerConfig.branding.darkModeColors?.backgroundColor,
            DARK_SURFACE_COLOR: partnerConfig.branding.darkModeColors?.surfaceColor,
            DARK_TEXT_COLOR: partnerConfig.branding.darkModeColors?.textColor,
            DARK_TEXT_COLOR_SECONDARY: partnerConfig.branding.darkModeColors?.textColorSecondary,
            API_BASE_URL: partnerConfig.api.baseUrl,
            PROD_API_BASE_URL: partnerConfig.api.prodBaseUrl,
            DEV_API_BASE_URL: partnerConfig.api.devBaseUrl,
            API_KEY: partnerConfig.api.apiKey,
            ENVIRONMENT: partnerConfig.api.environment,
            ENABLE_BIOMETRIC: partnerConfig.features.enableBiometric || false,
            ENABLE_EKYC: partnerConfig.features.enableEKYC || false,
            ENABLE_PUSH_NOTIFICATIONS: partnerConfig.features.enablePushNotifications || false,
            ENABLE_CARD_PAYMENTS: partnerConfig.features.enableCardPayments || false,
            ENABLE_BANK_TRANSFER: partnerConfig.features.enableBankTransfer || true,
            ENABLE_CRYPTO: partnerConfig.features.enableCrypto || false,
            ENABLE_MULTI_CURRENCY: partnerConfig.features.enableMultiCurrency || false,
            ENABLE_OFFLINE_MODE: partnerConfig.features.enableOfflineMode || false,
            SIGNING_CONFIG: !!partnerConfig.signing,
            KEYSTORE_PATH: partnerConfig.signing?.keystorePath,
            KEYSTORE_PASSWORD: partnerConfig.signing?.keystorePassword,
            KEY_ALIAS: partnerConfig.signing?.keyAlias,
            KEY_PASSWORD: partnerConfig.signing?.keyPassword,
            PARTNER_SCHEME: partnerConfig.deepLinking?.scheme || `${this.sanitizeName(partnerConfig.appName).toLowerCase()}`,
            PARTNER_HOST: partnerConfig.deepLinking?.host || 'app.lulupay.com',
            THEME_NAME: themeName,
            LULUPAY_SDK_VERSION: this.LULUPAY_SDK_VERSION,
            PARTNER_CONFIG_JSON: JSON.stringify({
                partnerId: this.generatePartnerId(partnerConfig.appName),
                partnerName: partnerConfig.appName,
                appName: partnerConfig.appName,
                branding: partnerConfig.branding,
                features: partnerConfig.features,
                api: partnerConfig.api
            })
        };
    }
    async copyTemplateFiles(buildPath) {
        await fs_extra_1.default.copy(this.TEMPLATE_DIR, buildPath);
        logger_1.logger.info(`Template files copied to ${buildPath}`);
    }
    async processTemplateFiles(buildPath, context) {
        const templateFiles = await this.findTemplateFiles(buildPath);
        for (const templateFile of templateFiles) {
            await this.processTemplateFile(templateFile, context);
        }
    }
    async findTemplateFiles(dir) {
        const files = [];
        const items = await fs_extra_1.default.readdir(dir);
        for (const item of items) {
            const fullPath = path_1.default.join(dir, item);
            const stat = await fs_extra_1.default.stat(fullPath);
            if (stat.isDirectory()) {
                const subFiles = await this.findTemplateFiles(fullPath);
                files.push(...subFiles);
            }
            else if (item.endsWith('.template')) {
                files.push(fullPath);
            }
        }
        return files;
    }
    async processTemplateFile(templatePath, context) {
        try {
            const template = await fs_extra_1.default.readFile(templatePath, 'utf8');
            const processed = this.processTemplate(template, context);
            const outputPath = templatePath.replace('.template', '');
            await fs_extra_1.default.writeFile(outputPath, processed, 'utf8');
            await fs_extra_1.default.remove(templatePath);
            logger_1.logger.debug(`Processed template: ${path_1.default.basename(templatePath)}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to process template ${templatePath}:`, error);
            throw error;
        }
    }
    processTemplate(template, context) {
        let processed = template;
        Object.entries(context).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                processed = processed.replace(regex, String(value));
            }
        });
        processed = this.processConditionalBlocks(processed, context);
        return processed;
    }
    processConditionalBlocks(template, context) {
        const ifBlockRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
        return template.replace(ifBlockRegex, (match, variable, content) => {
            const value = context[variable];
            return (value === true || value === 'true') ? content : '';
        });
    }
    async createPackageDirectories(buildPath, packagePath) {
        const javaPath = path_1.default.join(buildPath, 'app', 'src', 'main', 'java', packagePath);
        const activitiesPath = path_1.default.join(javaPath, 'activities');
        const servicesPath = path_1.default.join(javaPath, 'services');
        const receiversPath = path_1.default.join(javaPath, 'receivers');
        const providersPath = path_1.default.join(javaPath, 'providers');
        await fs_extra_1.default.ensureDir(activitiesPath);
        await fs_extra_1.default.ensureDir(servicesPath);
        await fs_extra_1.default.ensureDir(receiversPath);
        await fs_extra_1.default.ensureDir(providersPath);
        logger_1.logger.info(`Created package directories for ${packagePath}`);
    }
    async generateAdditionalFiles(buildPath, context) {
        await this.generateGradleWrapper(buildPath);
        await this.generateProguardRules(buildPath);
        await this.generateNetworkSecurityConfig(buildPath);
        logger_1.logger.info('Generated additional configuration files');
    }
    async generateGradleWrapper(buildPath) {
        const gradlewScript = `#!/bin/bash
# Gradle Wrapper Script for LuluPay White-label App
exec java -jar "$(dirname "$0")/gradle/wrapper/gradle-wrapper.jar" "$@"
`;
        const gradlewBat = `@echo off
rem Gradle Wrapper Script for LuluPay White-label App
java -jar "%~dp0gradle\\wrapper\\gradle-wrapper.jar" %*
`;
        await fs_extra_1.default.writeFile(path_1.default.join(buildPath, 'gradlew'), gradlewScript);
        await fs_extra_1.default.writeFile(path_1.default.join(buildPath, 'gradlew.bat'), gradlewBat);
        try {
            await fs_extra_1.default.chmod(path_1.default.join(buildPath, 'gradlew'), 0o755);
        }
        catch (error) {
        }
    }
    async generateProguardRules(buildPath) {
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
`;
        await fs_extra_1.default.writeFile(path_1.default.join(buildPath, 'app', 'proguard-rules.pro'), proguardRules);
    }
    async generateNetworkSecurityConfig(buildPath) {
        const networkConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.lulupay.com</domain>
    </domain-config>
</network-security-config>`;
        const xmlDir = path_1.default.join(buildPath, 'app', 'src', 'main', 'res', 'xml');
        await fs_extra_1.default.ensureDir(xmlDir);
        await fs_extra_1.default.writeFile(path_1.default.join(xmlDir, 'network_security_config.xml'), networkConfig);
    }
    sanitizeName(name) {
        return name.replace(/[^a-zA-Z0-9]/g, '').replace(/^[0-9]/, 'App$&');
    }
    generatePartnerId(appName) {
        return this.sanitizeName(appName).toLowerCase() + '_' + Date.now().toString(36);
    }
    calculateColors(branding) {
        const primary = branding.primaryColor;
        const secondary = branding.secondaryColor;
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
        };
    }
    darkenColor(hex, factor) {
        return hex;
    }
    lightenColor(hex, factor) {
        return hex;
    }
    addAlpha(hex, alpha) {
        const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
        return hex + alphaHex;
    }
    getContrastColor(hex) {
        return '#FFFFFF';
    }
}
exports.TemplateProcessor = TemplateProcessor;
//# sourceMappingURL=TemplateProcessor.js.map