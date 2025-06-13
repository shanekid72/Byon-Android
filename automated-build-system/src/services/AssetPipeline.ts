import fs from 'fs-extra'
import path from 'path'
import { AssetProcessor, AssetProcessingResult, PartnerAssets } from './AssetProcessor'
import { AndroidBuildConfig } from './TemplateProcessor'

// Simple logger replacement
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ''),
  debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta || '')
}

export interface AssetPipelineConfig {
  enableOptimization: boolean
  qualityThreshold: number
  maxProcessingTime: number
  outputFormats: string[]
  compressionLevel: number
}

export interface PipelineResult {
  success: boolean
  processedAssets: ProcessedPipelineAsset[]
  errors: string[]
  warnings: string[]
  processingTime: number
  qualityScore: number
}

export interface ProcessedPipelineAsset {
  assetId: string
  type: string
  originalPath: string
  outputPaths: string[]
  formats: string[]
  sizes: { [key: string]: { width: number; height: number } }
  optimization: {
    originalSize: number
    finalSize: number
    compressionRatio: number
    qualityScore: number
  }
  metadata: any
}

export interface AssetInjectionPlan {
  buildId: string
  partnerId: string
  targetPath: string
  assets: {
    logos: ProcessedPipelineAsset[]
    splash: ProcessedPipelineAsset[]
    icons: ProcessedPipelineAsset[]
    brand: ProcessedPipelineAsset[]
    custom: ProcessedPipelineAsset[]
  }
  injectionPoints: InjectionPoint[]
}

export interface InjectionPoint {
  type: 'resource' | 'manifest' | 'code' | 'gradle'
  targetFile: string
  action: 'replace' | 'append' | 'insert'
  content: string
  placeholder?: string
}

export class AssetPipeline {
  private readonly assetProcessor: AssetProcessor
  private readonly config: AssetPipelineConfig

  constructor(config: Partial<AssetPipelineConfig> = {}) {
    this.assetProcessor = new AssetProcessor()
    this.config = {
      enableOptimization: true,
      qualityThreshold: 85,
      maxProcessingTime: 120000, // 2 minutes
      outputFormats: ['png', 'webp'],
      compressionLevel: 9,
      ...config
    }
  }

  /**
   * Execute complete asset processing pipeline
   */
  async processPipeline(
    buildPath: string,
    buildConfig: AndroidBuildConfig,
    partnerAssets: PartnerAssets
  ): Promise<PipelineResult> {
    const startTime = Date.now()
    logger.info('Starting asset processing pipeline', { 
      buildId: buildConfig.buildId,
      partnerId: buildConfig.partnerConfig.appName 
    })

    const result: PipelineResult = {
      success: true,
      processedAssets: [],
      errors: [],
      warnings: [],
      processingTime: 0,
      qualityScore: 0
    }

    try {
      // Phase 1: Asset Processing
      const processingResult = await this.assetProcessor.processPartnerAssets(
        buildPath,
        buildConfig,
        partnerAssets
      )

      if (!processingResult.success) {
        result.success = false
        result.errors.push(...processingResult.errors)
        return result
      }

      // Phase 2: Pipeline Optimization
      const pipelineAssets = await this.optimizePipelineAssets(
        processingResult.processedAssets,
        buildConfig
      )

      // Phase 3: Quality Validation
      const qualityResults = await this.validateAssetQuality(pipelineAssets)
      
      // Phase 4: Format Conversion
      const convertedAssets = await this.convertAssetFormats(pipelineAssets, buildConfig)

      // Phase 5: Final Optimization
      if (this.config.enableOptimization) {
        await this.optimizeAssets(convertedAssets)
      }

      result.processedAssets = convertedAssets
      result.qualityScore = qualityResults.averageQuality
      result.warnings.push(...qualityResults.warnings)

      result.processingTime = Date.now() - startTime
      logger.info('Asset pipeline completed successfully', {
        duration: result.processingTime,
        assetsProcessed: result.processedAssets.length,
        qualityScore: result.qualityScore
      })

    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Pipeline processing failed')
      logger.error('Asset pipeline failed:', error)
    }

    return result
  }

  /**
   * Create asset injection plan for build integration
   */
  async createInjectionPlan(
    buildId: string,
    partnerId: string,
    buildPath: string,
    pipelineResult: PipelineResult
  ): Promise<AssetInjectionPlan> {
    logger.info('Creating asset injection plan', { buildId, partnerId })

    const plan: AssetInjectionPlan = {
      buildId,
      partnerId,
      targetPath: buildPath,
      assets: {
        logos: [],
        splash: [],
        icons: [],
        brand: [],
        custom: []
      },
      injectionPoints: []
    }

    // Categorize assets
    for (const asset of pipelineResult.processedAssets) {
      switch (asset.type) {
        case 'logo':
          plan.assets.logos.push(asset)
          break
        case 'splash':
          plan.assets.splash.push(asset)
          break
        case 'icon':
          plan.assets.icons.push(asset)
          break
        case 'brand':
          plan.assets.brand.push(asset)
          break
        default:
          plan.assets.custom.push(asset)
      }
    }

    // Generate injection points
    plan.injectionPoints = await this.generateInjectionPoints(plan, buildPath)

    return plan
  }

  /**
   * Execute asset injection into build project
   */
  async injectAssets(injectionPlan: AssetInjectionPlan): Promise<boolean> {
    logger.info('Executing asset injection', { 
      buildId: injectionPlan.buildId,
      injectionPoints: injectionPlan.injectionPoints.length 
    })

    try {
      for (const injectionPoint of injectionPlan.injectionPoints) {
        await this.executeInjectionPoint(injectionPoint)
      }

      logger.info('Asset injection completed successfully')
      return true
    } catch (error) {
      logger.error('Asset injection failed:', error)
      return false
    }
  }

  /**
   * Pipeline optimization phase
   */
  private async optimizePipelineAssets(
    processedAssets: any[],
    buildConfig: AndroidBuildConfig
  ): Promise<ProcessedPipelineAsset[]> {
    logger.debug('Optimizing pipeline assets')

    const pipelineAssets: ProcessedPipelineAsset[] = []

    for (const asset of processedAssets) {
      const originalSize = asset.fileSize
      
      // Create pipeline asset
      const pipelineAsset: ProcessedPipelineAsset = {
        assetId: `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: asset.type,
        originalPath: asset.outputPath,
        outputPaths: [asset.outputPath],
        formats: [asset.format],
        sizes: asset.size ? { [asset.density || 'default']: asset.size } : {},
        optimization: {
          originalSize,
          finalSize: originalSize,
          compressionRatio: 0,
          qualityScore: 100
        },
        metadata: {
          density: asset.density,
          buildConfig: buildConfig.buildId
        }
      }

      pipelineAssets.push(pipelineAsset)
    }

    return pipelineAssets
  }

  /**
   * Quality validation phase
   */
  private async validateAssetQuality(
    assets: ProcessedPipelineAsset[]
  ): Promise<{ averageQuality: number; warnings: string[] }> {
    logger.debug('Validating asset quality')

    const warnings: string[] = []
    let totalQuality = 0

    for (const asset of assets) {
      let qualityScore = 100

      // Check file size optimization
      if (asset.optimization.compressionRatio < 10) {
        qualityScore -= 10
        warnings.push(`Asset ${asset.assetId} has low compression ratio`)
      }

      // Check format compatibility
      if (!this.config.outputFormats.includes(asset.formats[0])) {
        qualityScore -= 15
        warnings.push(`Asset ${asset.assetId} uses non-optimal format`)
      }

      // Update quality score
      asset.optimization.qualityScore = qualityScore
      totalQuality += qualityScore
    }

    const averageQuality = assets.length > 0 ? totalQuality / assets.length : 100

    if (averageQuality < this.config.qualityThreshold) {
      warnings.push(`Overall quality score ${averageQuality.toFixed(1)} below threshold ${this.config.qualityThreshold}`)
    }

    return { averageQuality, warnings }
  }

  /**
   * Format conversion phase
   */
  private async convertAssetFormats(
    assets: ProcessedPipelineAsset[],
    buildConfig: AndroidBuildConfig
  ): Promise<ProcessedPipelineAsset[]> {
    logger.debug('Converting asset formats')

    // For this implementation, we'll maintain the existing formats
    // In a full implementation, this would convert to WebP, AVIF, etc.
    return assets
  }

  /**
   * Asset optimization phase
   */
  private async optimizeAssets(assets: ProcessedPipelineAsset[]): Promise<void> {
    logger.debug('Final asset optimization')

    for (const asset of assets) {
      for (const outputPath of asset.outputPaths) {
        if (await fs.pathExists(outputPath)) {
          const originalStats = await fs.stat(outputPath)
          const originalSize = originalStats.size

          // Simulate optimization (in real implementation, use imagemin, etc.)
          const compressionRatio = Math.random() * 30 + 10 // 10-40% compression
          const finalSize = Math.floor(originalSize * (100 - compressionRatio) / 100)

          asset.optimization.finalSize = finalSize
          asset.optimization.compressionRatio = compressionRatio
        }
      }
    }
  }

  /**
   * Generate injection points for build integration
   */
  private async generateInjectionPoints(
    plan: AssetInjectionPlan,
    buildPath: string
  ): Promise<InjectionPoint[]> {
    const injectionPoints: InjectionPoint[] = []

    // App icons injection
    if (plan.assets.logos.length > 0) {
      injectionPoints.push({
        type: 'manifest',
        targetFile: path.join(buildPath, 'app/src/main/AndroidManifest.xml'),
        action: 'replace',
        content: 'android:icon="@mipmap/ic_launcher"',
        placeholder: 'android:icon="@mipmap/ic_launcher"'
      })
    }

    // Splash screen injection
    if (plan.assets.splash.length > 0) {
      injectionPoints.push({
        type: 'resource',
        targetFile: path.join(buildPath, 'app/src/main/res/values/styles.xml'),
        action: 'insert',
        content: `
          <style name="SplashTheme" parent="Theme.AppCompat.Light.NoActionBar">
            <item name="android:windowBackground">@drawable/splash_background</item>
          </style>
        `
      })
    }

    // Brand colors injection
    injectionPoints.push({
      type: 'resource',
      targetFile: path.join(buildPath, 'app/src/main/res/values/colors.xml'),
      action: 'replace',
      content: `
        <color name="partner_primary">${plan.assets.brand[0]?.metadata?.primaryColor || '#2196F3'}</color>
        <color name="partner_primary_dark">${plan.assets.brand[0]?.metadata?.primaryColorDark || '#1976D2'}</color>
      `,
      placeholder: '<!-- PARTNER_COLORS -->'
    })

    return injectionPoints
  }

  /**
   * Execute individual injection point
   */
  private async executeInjectionPoint(injectionPoint: InjectionPoint): Promise<void> {
    const { targetFile, action, content, placeholder } = injectionPoint

    logger.debug(`Executing injection: ${action} in ${targetFile}`)

    // Ensure target directory exists
    await fs.ensureDir(path.dirname(targetFile))

    switch (action) {
      case 'replace':
        if (await fs.pathExists(targetFile)) {
          let fileContent = await fs.readFile(targetFile, 'utf8')
          if (placeholder) {
            fileContent = fileContent.replace(placeholder, content)
          }
          await fs.writeFile(targetFile, fileContent)
        }
        break

      case 'append':
        await fs.appendFile(targetFile, `\n${content}`)
        break

      case 'insert':
        if (await fs.pathExists(targetFile)) {
          let fileContent = await fs.readFile(targetFile, 'utf8')
          // Insert before closing tag
          fileContent = fileContent.replace('</resources>', `${content}\n</resources>`)
          await fs.writeFile(targetFile, fileContent)
        } else {
          // Create new file with content
          await fs.writeFile(targetFile, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${content}\n</resources>`)
        }
        break
    }
  }

  /**
   * Get pipeline statistics
   */
  async getPipelineStats(pipelineResult: PipelineResult): Promise<any> {
    return {
      totalAssets: pipelineResult.processedAssets.length,
      processingTime: pipelineResult.processingTime,
      qualityScore: pipelineResult.qualityScore,
      totalOptimization: pipelineResult.processedAssets.reduce((acc, asset) => {
        return acc + asset.optimization.compressionRatio
      }, 0) / pipelineResult.processedAssets.length,
      formatDistribution: pipelineResult.processedAssets.reduce((acc, asset) => {
        asset.formats.forEach(format => {
          acc[format] = (acc[format] || 0) + 1
        })
        return acc
      }, {} as { [key: string]: number })
    }
  }
}

export default AssetPipeline 