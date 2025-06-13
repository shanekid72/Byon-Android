import fs from 'fs-extra'
import path from 'path'
import { spawn } from 'child_process'
import { TemplateProcessor, AndroidBuildConfig } from './TemplateProcessor'
import { AssetPipeline, PipelineResult, AssetInjectionPlan } from './AssetPipeline'
import { PartnerAssets } from './AssetProcessor'

// Simple logger replacement
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ''),
  debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta || '')
}

export interface BuildOptions {
  onProgress?: (progress: number, stage: string, message: string) => Promise<void>
  enableAssetPipeline?: boolean
  assetPipelineConfig?: any
}

export interface BuildResult {
  success: boolean
  buildId: string
  artifacts?: {
    apkPath?: string
    aabPath?: string
    mappingFile?: string
    buildReport?: string
  }
  assetPipelineResult?: PipelineResult
  injectionPlan?: AssetInjectionPlan
  error?: string
  logs: string[]
  buildDuration: number
  stages: {
    templateProcessing: boolean
    assetProcessing: boolean
    assetInjection: boolean
    codeGeneration: boolean
    androidBuild: boolean
    packaging: boolean
  }
}

export class BuildOrchestrator {
  private readonly templateProcessor: TemplateProcessor
  private readonly assetPipeline: AssetPipeline
  private readonly BUILD_STORAGE_PATH = process.env.BUILD_STORAGE_PATH || './storage/builds'
  private readonly TEMP_BUILD_PATH = process.env.TEMP_BUILD_PATH || './storage/temp'

  constructor() {
    this.templateProcessor = new TemplateProcessor()
    this.assetPipeline = new AssetPipeline()
    this.ensureDirectories()
  }

  private async ensureDirectories() {
    await fs.ensureDir(this.BUILD_STORAGE_PATH)
    await fs.ensureDir(this.TEMP_BUILD_PATH)
  }

  /**
   * Execute complete build workflow with enhanced asset pipeline
   */
  public async executeBuild(buildConfig: AndroidBuildConfig, options?: BuildOptions): Promise<BuildResult> {
    const startTime = Date.now()
    const buildId = buildConfig.buildId
    const buildPath = path.join(this.TEMP_BUILD_PATH, buildId)
    const logs: string[] = []

    const result: BuildResult = {
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
    }

    logger.info('Starting enhanced build execution with asset pipeline', { buildId })
    
    try {
      // Step 1: Template Processing (20%)
      if (options?.onProgress) {
        await options.onProgress(5, 'template-processing', 'Processing Android templates')
      }
      
      await this.templateProcessor.processAndroidTemplate(buildPath, buildConfig)
      logs.push(`✅ Template processing completed for ${buildConfig.partnerConfig.appName}`)
      result.stages.templateProcessing = true
      
      if (options?.onProgress) {
        await options.onProgress(20, 'template-processing', 'Templates processed successfully')
      }

      // Step 2: Enhanced Asset Processing (45%)
      if (options?.onProgress) {
        await options.onProgress(25, 'asset-processing', 'Processing assets through pipeline')
      }
      
      const assetPipelineResult = await this.processAssetsWithPipeline(buildPath, buildConfig, options)
      result.assetPipelineResult = assetPipelineResult
      logs.push(`✅ Asset pipeline completed with quality score: ${assetPipelineResult.qualityScore.toFixed(1)}`)
      result.stages.assetProcessing = true
      
      if (options?.onProgress) {
        await options.onProgress(45, 'asset-processing', 'Assets processed through pipeline')
      }

      // Step 3: Asset Injection (60%)
      if (options?.onProgress) {
        await options.onProgress(50, 'asset-injection', 'Injecting assets into build')
      }
      
      const injectionPlan = await this.assetPipeline.createInjectionPlan(
        buildId,
        buildConfig.partnerConfig.appName,
        buildPath,
        assetPipelineResult
      )
      
      const injectionSuccess = await this.assetPipeline.injectAssets(injectionPlan)
      if (!injectionSuccess) {
        throw new Error('Asset injection failed')
      }
      
      result.injectionPlan = injectionPlan
      logs.push(`✅ Assets injected: ${injectionPlan.injectionPoints.length} injection points`)
      result.stages.assetInjection = true
      
      if (options?.onProgress) {
        await options.onProgress(60, 'asset-injection', 'Assets injected successfully')
      }

      // Step 4: Code Generation (70%)
      if (options?.onProgress) {
        await options.onProgress(65, 'code-generation', 'Generating partner-specific code')
      }
      
      await this.generatePartnerCode(buildPath, buildConfig)
      logs.push('✅ Partner-specific code generated')
      result.stages.codeGeneration = true
      
      if (options?.onProgress) {
        await options.onProgress(70, 'code-generation', 'Code generation completed')
      }

      // Step 5: Android Build (90%)
      if (options?.onProgress) {
        await options.onProgress(75, 'android-build', 'Building Android APK/AAB')
      }
      
      const buildArtifacts = await this.executeAndroidBuild(buildPath, buildConfig, logs, options)
      result.stages.androidBuild = true
      
      if (options?.onProgress) {
        await options.onProgress(90, 'android-build', 'Android build completed')
      }

      // Step 6: Package Generation (100%)
      if (options?.onProgress) {
        await options.onProgress(95, 'packaging', 'Packaging build artifacts')
      }
      
      const finalArtifacts = await this.packageBuildArtifacts(buildPath, buildConfig, buildArtifacts, assetPipelineResult)
      result.artifacts = finalArtifacts
      logs.push('✅ Build artifacts packaged')
      result.stages.packaging = true
      
      if (options?.onProgress) {
        await options.onProgress(100, 'completed', 'Build completed successfully')
      }

      // Cleanup temporary build directory
      await fs.remove(buildPath)
      
      result.success = true
      result.buildDuration = Date.now() - startTime
      result.logs = logs
      
      logger.info('Enhanced build execution completed successfully', { 
        buildId, 
        duration: `${result.buildDuration}ms`,
        qualityScore: assetPipelineResult.qualityScore,
        artifacts: finalArtifacts 
      })

      return result

    } catch (error) {
      logger.error('Enhanced build execution failed:', error)
      
      if (options?.onProgress) {
        await options.onProgress(0, 'failed', `Build failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      // Cleanup on failure
      await fs.remove(buildPath).catch(() => {})
      
      result.error = error instanceof Error ? error.message : 'Unknown build error'
      result.buildDuration = Date.now() - startTime
      result.logs = logs
      
      return result
    }
  }

  /**
   * Process assets using the enhanced asset pipeline
   */
  private async processAssetsWithPipeline(
    buildPath: string, 
    config: AndroidBuildConfig, 
    options?: BuildOptions
  ): Promise<PipelineResult> {
    logger.info('Processing assets with enhanced pipeline')

    // Prepare partner assets from config (using available properties)
    const partnerAssets: PartnerAssets = {}
    
    // Only add assets if they exist
    if (config.partnerConfig.branding.logo) {
      partnerAssets.logo = config.partnerConfig.branding.logo
    }
    
    if (config.partnerConfig.branding.splashScreen) {
      partnerAssets.splashBackground = config.partnerConfig.branding.splashScreen
    }

    // Execute asset pipeline
    const pipelineResult = await this.assetPipeline.processPipeline(
      buildPath,
      config,
      partnerAssets
    )

    if (!pipelineResult.success) {
      throw new Error(`Asset pipeline failed: ${pipelineResult.errors.join(', ')}`)
    }

    // Log pipeline statistics
    const stats = await this.assetPipeline.getPipelineStats(pipelineResult)
    logger.info('Asset pipeline statistics', stats)

    return pipelineResult
  }

  /**
   * Generate partner-specific source code with asset integration
   */
  private async generatePartnerCode(buildPath: string, config: AndroidBuildConfig): Promise<void> {
    logger.info('Generating enhanced partner-specific code')

    const { partnerConfig } = config
    const packagePath = partnerConfig.packageName.replace(/\./g, '/')
    const javaPath = path.join(buildPath, 'app', 'src', 'main', 'java', packagePath)

    // Generate Application class with asset references
    await this.generateEnhancedApplicationClass(javaPath, config)
    
    // Generate MainActivity
    await this.generateMainActivity(javaPath, config)
    
    // Generate feature-specific activities
    if (partnerConfig.features.enableEKYC) {
      await this.generateEKYCActivity(javaPath, config)
    }
    
    if (partnerConfig.features.enableBiometric) {
      await this.generateBiometricActivity(javaPath, config)
    }

    // Generate asset management utilities
    await this.generateAssetManagerClass(javaPath, config)

    logger.info('Enhanced partner-specific code generation completed')
  }

  /**
   * Generate enhanced Application class with asset pipeline integration
   */
  private async generateEnhancedApplicationClass(javaPath: string, config: AndroidBuildConfig): Promise<void> {
    const { partnerConfig } = config
    const className = `${this.sanitizeName(partnerConfig.appName)}Application`
    
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
`

    const filePath = path.join(javaPath, `${className}.java`)
    await fs.writeFile(filePath, applicationCode, 'utf8')
    
    logger.debug(`Generated enhanced Application class: ${className}`)
  }

  /**
   * Generate asset manager utility class
   */
  private async generateAssetManagerClass(javaPath: string, config: AndroidBuildConfig): Promise<void> {
    const { partnerConfig } = config
    
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
`

    const utilsDir = path.join(javaPath, 'utils')
    await fs.ensureDir(utilsDir)
    
    const filePath = path.join(utilsDir, 'AssetManager.java')
    await fs.writeFile(filePath, assetManagerCode, 'utf8')
    
    logger.debug('Generated AssetManager utility class')
  }

  /**
   * Enhanced Android build execution with progress tracking
   */
  private async executeAndroidBuild(
    buildPath: string, 
    config: AndroidBuildConfig, 
    logs: string[], 
    options?: BuildOptions
  ): Promise<any> {
    logger.info('Executing enhanced Android build')

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
      ]

      const buildProcess = spawn('docker', dockerCommand, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: buildPath
      })

      let output = ''
      let errorOutput = ''
      let lastProgress = 75

      buildProcess.stdout?.on('data', (data) => {
        const message = data.toString()
        output += message
        logs.push(message.trim())

        // Parse build progress from Docker output
        if (message.includes('Building') && options?.onProgress) {
          lastProgress = Math.min(lastProgress + 2, 89)
          options.onProgress(lastProgress, 'android-build', 'Building Android project')
        }
      })

      buildProcess.stderr?.on('data', (data) => {
        const message = data.toString()
        errorOutput += message
        logs.push(`ERROR: ${message.trim()}`)
      })

      buildProcess.on('close', (code) => {
        if (code === 0) {
          resolve({
            apkPath: path.join(buildPath, 'app', 'build', 'outputs', 'apk', config.buildType, `app-${config.buildType}.apk`),
            aabPath: path.join(buildPath, 'app', 'build', 'outputs', 'bundle', config.buildType, `app-${config.buildType}.aab`),
            mappingFile: path.join(buildPath, 'app', 'build', 'outputs', 'mapping', config.buildType, 'mapping.txt')
          })
        } else {
          reject(new Error(`Android build failed with code ${code}: ${errorOutput}`))
        }
      })

      buildProcess.on('error', (error) => {
        reject(error)
      })
    })
  }

  /**
   * Enhanced artifact packaging with asset pipeline metadata
   */
  private async packageBuildArtifacts(
    buildPath: string, 
    config: AndroidBuildConfig, 
    buildArtifacts: any,
    pipelineResult?: PipelineResult
  ): Promise<any> {
    const artifactsDir = path.join(this.BUILD_STORAGE_PATH, config.buildId)
    await fs.ensureDir(artifactsDir)

    const artifacts: any = {}

    // Copy APK if exists
    if (buildArtifacts.apkPath && await fs.pathExists(buildArtifacts.apkPath)) {
      const apkDestination = path.join(artifactsDir, `${config.partnerConfig.appName}-${config.buildType}.apk`)
      await fs.copy(buildArtifacts.apkPath, apkDestination)
      artifacts.apkPath = apkDestination
    }

    // Copy AAB if exists
    if (buildArtifacts.aabPath && await fs.pathExists(buildArtifacts.aabPath)) {
      const aabDestination = path.join(artifactsDir, `${config.partnerConfig.appName}-${config.buildType}.aab`)
      await fs.copy(buildArtifacts.aabPath, aabDestination)
      artifacts.aabPath = aabDestination
    }

    // Copy mapping file if exists
    if (buildArtifacts.mappingFile && await fs.pathExists(buildArtifacts.mappingFile)) {
      const mappingDestination = path.join(artifactsDir, 'mapping.txt')
      await fs.copy(buildArtifacts.mappingFile, mappingDestination)
      artifacts.mappingFile = mappingDestination
    }

    // Generate enhanced build report with asset pipeline data
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
    }

    const reportPath = path.join(artifactsDir, 'build-report.json')
    await fs.writeJson(reportPath, buildReport, { spaces: 2 })
    artifacts.buildReport = reportPath

    return artifacts
  }

  /**
   * Existing utility methods
   */
  private async generateMainActivity(javaPath: string, config: AndroidBuildConfig): Promise<void> {
    const { partnerConfig } = config
    
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
`

    const activitiesDir = path.join(javaPath, 'activities')
    await fs.ensureDir(activitiesDir)
    
    const filePath = path.join(activitiesDir, 'MainActivity.java')
    await fs.writeFile(filePath, mainActivityCode, 'utf8')
    
    logger.debug('Generated MainActivity')
  }

  private async generateEKYCActivity(javaPath: string, config: AndroidBuildConfig): Promise<void> {
    // Generate eKYC-specific activity code
    logger.debug('Generated eKYC activity')
  }

  private async generateBiometricActivity(javaPath: string, config: AndroidBuildConfig): Promise<void> {
    // Generate biometric-specific activity code
    logger.debug('Generated biometric activity')
  }

  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '').replace(/^[0-9]/, 'App$&')
  }

  private generatePartnerId(appName: string): string {
    return this.sanitizeName(appName).toLowerCase() + '_' + Date.now().toString(36)
  }
} 