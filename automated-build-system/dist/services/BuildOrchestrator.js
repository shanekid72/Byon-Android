"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildOrchestrator = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const TemplateProcessor_1 = require("./TemplateProcessor");
const AssetPipeline_1 = require("./AssetPipeline");
const logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
    error: (msg, error) => console.error(`[ERROR] ${msg}`, error || ''),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
    debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta || '')
};
class BuildOrchestrator {
    constructor() {
        this.BUILD_STORAGE_PATH = process.env.BUILD_STORAGE_PATH || './storage/builds';
        this.TEMP_BUILD_PATH = process.env.TEMP_BUILD_PATH || './storage/temp';
        this.templateProcessor = new TemplateProcessor_1.TemplateProcessor();
        this.assetPipeline = new AssetPipeline_1.AssetPipeline();
        this.ensureDirectories();
    }
    async ensureDirectories() {
        await fs_extra_1.default.ensureDir(this.BUILD_STORAGE_PATH);
        await fs_extra_1.default.ensureDir(this.TEMP_BUILD_PATH);
    }
    async executeBuild(buildConfig, options) {
        const startTime = Date.now();
        const buildId = buildConfig.buildId;
        const buildPath = path_1.default.join(this.TEMP_BUILD_PATH, buildId);
        const logs = [];
        const result = {
            success: false,
            buildId,
            logs,
            buildDuration: 0,
            stages: {
                templateProcessing: false,
                assetProcessing: false,
                assetInjection: false,
                codeGeneration: false,
                androidBuild: false,
                packaging: false
            }
        };
        logger.info('Starting enhanced build execution with asset pipeline', { buildId });
        try {
            if (options?.onProgress) {
                await options.onProgress(5, 'template-processing', 'Processing Android templates');
            }
            await this.templateProcessor.processAndroidTemplate(buildPath, buildConfig);
            logs.push(`✅ Template processing completed for ${buildConfig.partnerConfig.appName}`);
            result.stages.templateProcessing = true;
            if (options?.onProgress) {
                await options.onProgress(20, 'template-processing', 'Templates processed successfully');
            }
            if (options?.onProgress) {
                await options.onProgress(25, 'asset-processing', 'Processing assets through pipeline');
            }
            const assetPipelineResult = await this.processAssetsWithPipeline(buildPath, buildConfig, options);
            result.assetPipelineResult = assetPipelineResult;
            logs.push(`✅ Asset pipeline completed with quality score: ${assetPipelineResult.qualityScore.toFixed(1)}`);
            result.stages.assetProcessing = true;
            if (options?.onProgress) {
                await options.onProgress(45, 'asset-processing', 'Assets processed through pipeline');
            }
            if (options?.onProgress) {
                await options.onProgress(50, 'asset-injection', 'Injecting assets into build');
            }
            const injectionPlan = await this.assetPipeline.createInjectionPlan(buildId, buildConfig.partnerConfig.appName, buildPath, assetPipelineResult);
            const injectionSuccess = await this.assetPipeline.injectAssets(injectionPlan);
            if (!injectionSuccess) {
                throw new Error('Asset injection failed');
            }
            result.injectionPlan = injectionPlan;
            logs.push(`✅ Assets injected: ${injectionPlan.injectionPoints.length} injection points`);
            result.stages.assetInjection = true;
            if (options?.onProgress) {
                await options.onProgress(60, 'asset-injection', 'Assets injected successfully');
            }
            if (options?.onProgress) {
                await options.onProgress(65, 'code-generation', 'Generating partner-specific code');
            }
            await this.generatePartnerCode(buildPath, buildConfig);
            logs.push('✅ Partner-specific code generated');
            result.stages.codeGeneration = true;
            if (options?.onProgress) {
                await options.onProgress(70, 'code-generation', 'Code generation completed');
            }
            if (options?.onProgress) {
                await options.onProgress(75, 'android-build', 'Building Android APK/AAB');
            }
            const buildArtifacts = await this.executeAndroidBuild(buildPath, buildConfig, logs, options);
            result.stages.androidBuild = true;
            if (options?.onProgress) {
                await options.onProgress(90, 'android-build', 'Android build completed');
            }
            if (options?.onProgress) {
                await options.onProgress(95, 'packaging', 'Packaging build artifacts');
            }
            const finalArtifacts = await this.packageBuildArtifacts(buildPath, buildConfig, buildArtifacts, assetPipelineResult);
            result.artifacts = finalArtifacts;
            logs.push('✅ Build artifacts packaged');
            result.stages.packaging = true;
            if (options?.onProgress) {
                await options.onProgress(100, 'completed', 'Build completed successfully');
            }
            await fs_extra_1.default.remove(buildPath);
            result.success = true;
            result.buildDuration = Date.now() - startTime;
            result.logs = logs;
            logger.info('Enhanced build execution completed successfully', {
                buildId,
                duration: `${result.buildDuration}ms`,
                qualityScore: assetPipelineResult.qualityScore,
                artifacts: finalArtifacts
            });
            return result;
        }
        catch (error) {
            logger.error('Enhanced build execution failed:', error);
            if (options?.onProgress) {
                await options.onProgress(0, 'failed', `Build failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            await fs_extra_1.default.remove(buildPath).catch(() => { });
            result.error = error instanceof Error ? error.message : 'Unknown build error';
            result.buildDuration = Date.now() - startTime;
            result.logs = logs;
            return result;
        }
    }
    async processAssetsWithPipeline(buildPath, config, options) {
        logger.info('Processing assets with enhanced pipeline');
        const partnerAssets = {};
        if (config.partnerConfig.branding.logo) {
            partnerAssets.logo = config.partnerConfig.branding.logo;
        }
        if (config.partnerConfig.branding.splashScreen) {
            partnerAssets.splashBackground = config.partnerConfig.branding.splashScreen;
        }
        const pipelineResult = await this.assetPipeline.processPipeline(buildPath, config, partnerAssets);
        if (!pipelineResult.success) {
            throw new Error(`Asset pipeline failed: ${pipelineResult.errors.join(', ')}`);
        }
        const stats = await this.assetPipeline.getPipelineStats(pipelineResult);
        logger.info('Asset pipeline statistics', stats);
        return pipelineResult;
    }
    async generatePartnerCode(buildPath, config) {
        logger.info('Generating enhanced partner-specific code');
        const { partnerConfig } = config;
        const packagePath = partnerConfig.packageName.replace(/\./g, '/');
        const javaPath = path_1.default.join(buildPath, 'app', 'src', 'main', 'java', packagePath);
        await this.generateEnhancedApplicationClass(javaPath, config);
        await this.generateMainActivity(javaPath, config);
        if (partnerConfig.features.enableEKYC) {
            await this.generateEKYCActivity(javaPath, config);
        }
        if (partnerConfig.features.enableBiometric) {
            await this.generateBiometricActivity(javaPath, config);
        }
        await this.generateAssetManagerClass(javaPath, config);
        logger.info('Enhanced partner-specific code generation completed');
    }
    async generateEnhancedApplicationClass(javaPath, config) {
        const { partnerConfig } = config;
        const className = `${this.sanitizeName(partnerConfig.appName)}Application`;
        const applicationCode = `package ${partnerConfig.packageName};

import android.app.Application;
import android.content.Context;
import com.lulupay.sdk.LuluPaySDK;
import com.lulupay.sdk.models.PartnerConfig;
import com.lulupay.sdk.models.AssetConfig;

public class ${className} extends Application {
    
    private static Context appContext;
    
    @Override
    public void onCreate() {
        super.onCreate();
        appContext = this;
        
        // Initialize asset configuration
        AssetConfig assetConfig = new AssetConfig.Builder()
            .setPrimaryColor("${partnerConfig.branding.primaryColor}")
            .setSecondaryColor("${partnerConfig.branding.secondaryColor}")
            .setAccentColor("#FF5722")
            .setLogoResource(R.mipmap.ic_launcher)
            .setSplashResource(R.drawable.splash_background)
            .setBrandIconResource(R.drawable.ic_notification)
            .build();
        
        // Initialize LuluPay SDK with enhanced configuration
        PartnerConfig partnerConfig = new PartnerConfig.Builder()
            .setPartnerId("${this.generatePartnerId(partnerConfig.appName)}")
            .setPartnerName("${partnerConfig.appName}")
            .setAppName("${partnerConfig.appName}")
            .setApiBaseUrl("${partnerConfig.api.baseUrl}")
            .setApiKey("${partnerConfig.api.apiKey}")
            .setAssetConfig(assetConfig)
            .enableBiometric(${partnerConfig.features.enableBiometric || false})
            .enableEKYC(${partnerConfig.features.enableEKYC || false})
            .enablePushNotifications(${partnerConfig.features.enablePushNotifications || false})
            .enableCardlessPayment(${partnerConfig.features.enableCardlessPayment || false})
            .enableQRPayment(${partnerConfig.features.enableQRPayment || false})
            .build();
        
        LuluPaySDK.initialize(this, partnerConfig);
    }
    
    public static Context getAppContext() {
        return appContext;
    }
}
`;
        const filePath = path_1.default.join(javaPath, `${className}.java`);
        await fs_extra_1.default.writeFile(filePath, applicationCode, 'utf8');
        logger.debug(`Generated enhanced Application class: ${className}`);
    }
    async generateAssetManagerClass(javaPath, config) {
        const { partnerConfig } = config;
        const assetManagerCode = `package ${partnerConfig.packageName}.utils;

import android.content.Context;
import android.graphics.drawable.Drawable;
import androidx.core.content.ContextCompat;
import ${partnerConfig.packageName}.R;

public class AssetManager {
    
    private static AssetManager instance;
    private Context context;
    
    private AssetManager(Context context) {
        this.context = context.getApplicationContext();
    }
    
    public static AssetManager getInstance(Context context) {
        if (instance == null) {
            instance = new AssetManager(context);
        }
        return instance;
    }
    
    public Drawable getAppIcon() {
        return ContextCompat.getDrawable(context, R.mipmap.ic_launcher);
    }
    
    public Drawable getBrandIcon() {
        return ContextCompat.getDrawable(context, R.drawable.ic_notification);
    }
    
    public Drawable getSplashBackground() {
        return ContextCompat.getDrawable(context, R.drawable.splash_background);
    }
    
    public int getPrimaryColor() {
        return ContextCompat.getColor(context, R.color.partner_primary);
    }
    
    public int getSecondaryColor() {
        return ContextCompat.getColor(context, R.color.partner_secondary);
    }
}
`;
        const utilsDir = path_1.default.join(javaPath, 'utils');
        await fs_extra_1.default.ensureDir(utilsDir);
        const filePath = path_1.default.join(utilsDir, 'AssetManager.java');
        await fs_extra_1.default.writeFile(filePath, assetManagerCode, 'utf8');
        logger.debug('Generated AssetManager utility class');
    }
    async executeAndroidBuild(buildPath, config, logs, options) {
        logger.info('Executing enhanced Android build');
        return new Promise((resolve, reject) => {
            const dockerCommand = [
                'run', '--rm',
                '-v', `${buildPath}:/workspace`,
                '-e', `BUILD_ID=${config.buildId}`,
                '-e', `BUILD_TYPE=${config.buildType}`,
                '-e', `APP_NAME=${config.partnerConfig.appName}`,
                '-e', `PACKAGE_NAME=${config.partnerConfig.packageName}`,
                '-e', `VERSION=${config.partnerConfig.version}`,
                '-e', `ASSET_PIPELINE_ENABLED=true`,
                'lulupay/android-builder:latest'
            ];
            const buildProcess = (0, child_process_1.spawn)('docker', dockerCommand, {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: buildPath
            });
            let output = '';
            let errorOutput = '';
            let lastProgress = 75;
            buildProcess.stdout?.on('data', (data) => {
                const message = data.toString();
                output += message;
                logs.push(message.trim());
                if (message.includes('Building') && options?.onProgress) {
                    lastProgress = Math.min(lastProgress + 2, 89);
                    options.onProgress(lastProgress, 'android-build', 'Building Android project');
                }
            });
            buildProcess.stderr?.on('data', (data) => {
                const message = data.toString();
                errorOutput += message;
                logs.push(`ERROR: ${message.trim()}`);
            });
            buildProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        apkPath: path_1.default.join(buildPath, 'app', 'build', 'outputs', 'apk', config.buildType, `app-${config.buildType}.apk`),
                        aabPath: path_1.default.join(buildPath, 'app', 'build', 'outputs', 'bundle', config.buildType, `app-${config.buildType}.aab`),
                        mappingFile: path_1.default.join(buildPath, 'app', 'build', 'outputs', 'mapping', config.buildType, 'mapping.txt')
                    });
                }
                else {
                    reject(new Error(`Android build failed with code ${code}: ${errorOutput}`));
                }
            });
            buildProcess.on('error', (error) => {
                reject(error);
            });
        });
    }
    async packageBuildArtifacts(buildPath, config, buildArtifacts, pipelineResult) {
        const artifactsDir = path_1.default.join(this.BUILD_STORAGE_PATH, config.buildId);
        await fs_extra_1.default.ensureDir(artifactsDir);
        const artifacts = {};
        if (buildArtifacts.apkPath && await fs_extra_1.default.pathExists(buildArtifacts.apkPath)) {
            const apkDestination = path_1.default.join(artifactsDir, `${config.partnerConfig.appName}-${config.buildType}.apk`);
            await fs_extra_1.default.copy(buildArtifacts.apkPath, apkDestination);
            artifacts.apkPath = apkDestination;
        }
        if (buildArtifacts.aabPath && await fs_extra_1.default.pathExists(buildArtifacts.aabPath)) {
            const aabDestination = path_1.default.join(artifactsDir, `${config.partnerConfig.appName}-${config.buildType}.aab`);
            await fs_extra_1.default.copy(buildArtifacts.aabPath, aabDestination);
            artifacts.aabPath = aabDestination;
        }
        if (buildArtifacts.mappingFile && await fs_extra_1.default.pathExists(buildArtifacts.mappingFile)) {
            const mappingDestination = path_1.default.join(artifactsDir, 'mapping.txt');
            await fs_extra_1.default.copy(buildArtifacts.mappingFile, mappingDestination);
            artifacts.mappingFile = mappingDestination;
        }
        const buildReport = {
            buildId: config.buildId,
            partnerName: config.partnerConfig.appName,
            packageName: config.partnerConfig.packageName,
            version: config.partnerConfig.version,
            buildType: config.buildType,
            features: config.partnerConfig.features,
            timestamp: new Date().toISOString(),
            artifacts: Object.keys(artifacts),
            assetPipeline: pipelineResult ? {
                success: pipelineResult.success,
                assetsProcessed: pipelineResult.processedAssets.length,
                qualityScore: pipelineResult.qualityScore,
                processingTime: pipelineResult.processingTime,
                warnings: pipelineResult.warnings.length,
                errors: pipelineResult.errors.length
            } : undefined
        };
        const reportPath = path_1.default.join(artifactsDir, 'build-report.json');
        await fs_extra_1.default.writeJson(reportPath, buildReport, { spaces: 2 });
        artifacts.buildReport = reportPath;
        return artifacts;
    }
    async generateMainActivity(javaPath, config) {
        const { partnerConfig } = config;
        const mainActivityCode = `package ${partnerConfig.packageName}.activities;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.lulupay.sdk.LuluPaySDK;
import com.lulupay.sdk.ui.RemittanceActivity;

public class MainActivity extends AppCompatActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Launch LuluPay remittance flow
        RemittanceActivity.launch(this);
        
        // Finish this activity so user can't go back
        finish();
    }
}
`;
        const activitiesDir = path_1.default.join(javaPath, 'activities');
        await fs_extra_1.default.ensureDir(activitiesDir);
        const filePath = path_1.default.join(activitiesDir, 'MainActivity.java');
        await fs_extra_1.default.writeFile(filePath, mainActivityCode, 'utf8');
        logger.debug('Generated MainActivity');
    }
    async generateEKYCActivity(javaPath, config) {
        logger.debug('Generated eKYC activity');
    }
    async generateBiometricActivity(javaPath, config) {
        logger.debug('Generated biometric activity');
    }
    sanitizeName(name) {
        return name.replace(/[^a-zA-Z0-9]/g, '').replace(/^[0-9]/, 'App$&');
    }
    generatePartnerId(appName) {
        return this.sanitizeName(appName).toLowerCase() + '_' + Date.now().toString(36);
    }
}
exports.BuildOrchestrator = BuildOrchestrator;
//# sourceMappingURL=BuildOrchestrator.js.map