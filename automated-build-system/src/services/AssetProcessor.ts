import fs from 'fs-extra'
import path from 'path'
import sharp from 'sharp'
import { AndroidBuildConfig } from './TemplateProcessor'

// Simple logger replacement
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ''),
  debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta || '')
}

// Conditional canvas import for text generation
let createCanvas: any
try {
  const canvas = require('canvas')
  createCanvas = canvas.createCanvas
} catch (error) {
  logger.warn('Canvas module not available. Text icon generation will use SVG fallback method.')
}

// Asset processing configuration
export interface AssetConfig {
  // Icon densities for Android
  iconDensities: {
    [key: string]: {
      size: number
      folder: string
    }
  }
  // Supported image formats
  supportedFormats: string[]
  // Quality settings
  quality: {
    png: number
    jpg: number
    webp: number
  }
  // Size limits
  maxFileSize: number
  maxDimensions: {
    width: number
    height: number
  }
}

export interface AssetProcessingResult {
  success: boolean
  processedAssets: ProcessedAsset[]
  errors: string[]
  warnings: string[]
  processingTime: number
}

export interface ProcessedAsset {
  type: 'icon' | 'splash' | 'image' | 'vector'
  originalPath: string
  outputPath: string
  density?: string
  size?: {
    width: number
    height: number
  }
  fileSize: number
  format: string
  optimized: boolean
}

export interface PartnerAssets {
  logo?: string
  logoSquare?: string
  splashBackground?: string
  brandIcon?: string
  favicon?: string
  customImages?: { [key: string]: string }
}

export class AssetProcessor {
  private readonly config: AssetConfig
  private readonly TEMP_DIR = './storage/temp/assets'
  private readonly OUTPUT_DIR = './storage/processed-assets'

  constructor() {
    this.config = {
      iconDensities: {
        'mipmap-mdpi': { size: 48, folder: 'mipmap-mdpi' },
        'mipmap-hdpi': { size: 72, folder: 'mipmap-hdpi' },
        'mipmap-xhdpi': { size: 96, folder: 'mipmap-xhdpi' },
        'mipmap-xxhdpi': { size: 144, folder: 'mipmap-xxhdpi' },
        'mipmap-xxxhdpi': { size: 192, folder: 'mipmap-xxxhdpi' }
      },
      supportedFormats: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
      quality: {
        png: 90,
        jpg: 85,
        webp: 90
      },
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxDimensions: {
        width: 4096,
        height: 4096
      }
    }
    
    this.ensureDirectories()
  }

  private async ensureDirectories() {
    await fs.ensureDir(this.TEMP_DIR)
    await fs.ensureDir(this.OUTPUT_DIR)
  }

  /**
   * Process all partner assets for Android project
   */
  async processPartnerAssets(
    buildPath: string, 
    buildConfig: AndroidBuildConfig,
    assets: PartnerAssets
  ): Promise<AssetProcessingResult> {
    const startTime = Date.now()
    logger.info('Starting asset processing for partner', { 
      partnerId: buildConfig.partnerConfig.appName,
      assets: Object.keys(assets) 
    })

    const result: AssetProcessingResult = {
      success: true,
      processedAssets: [],
      errors: [],
      warnings: [],
      processingTime: 0
    }

    try {
      // Process app icons
      if (assets.logo) {
        await this.processAppIcons(buildPath, assets.logo, result)
      } else {
        result.warnings.push('No logo provided, using default icons')
        await this.generateDefaultIcons(buildPath, buildConfig, result)
      }

      // Process splash screen assets
      if (assets.splashBackground) {
        await this.processSplashScreen(buildPath, assets.splashBackground, buildConfig, result)
      }

      // Process brand assets
      if (assets.brandIcon) {
        await this.processBrandAssets(buildPath, assets.brandIcon, result)
      }

      // Process custom images
      if (assets.customImages) {
        await this.processCustomImages(buildPath, assets.customImages, result)
      }

      // Generate adaptive icons (Android 8+)
      await this.generateAdaptiveIcons(buildPath, buildConfig, result)

      // Optimize all processed assets
      await this.optimizeAssets(result.processedAssets)

      result.processingTime = Date.now() - startTime
      logger.info('Asset processing completed', { 
        duration: result.processingTime,
        assetsProcessed: result.processedAssets.length 
      })

    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown asset processing error')
      logger.error('Asset processing failed:', error)
    }

    return result
  }

  /**
   * Process app icons for all densities
   */
  private async processAppIcons(
    buildPath: string, 
    logoPath: string, 
    result: AssetProcessingResult
  ): Promise<void> {
    logger.info('Processing app icons for all densities')

    // Validate source image
    if (!await fs.pathExists(logoPath)) {
      throw new Error(`Logo file not found: ${logoPath}`)
    }

    const sourceInfo = await this.getImageInfo(logoPath)
    if (!sourceInfo) {
      throw new Error('Invalid logo image format')
    }

    // Process each density
    for (const [densityKey, densityInfo] of Object.entries(this.config.iconDensities)) {
      const outputDir = path.join(buildPath, 'app', 'src', 'main', 'res', densityInfo.folder)
      await fs.ensureDir(outputDir)

      // Generate launcher icon
      const launcherIconPath = path.join(outputDir, 'ic_launcher.png')
      await this.resizeImage(logoPath, launcherIconPath, densityInfo.size, densityInfo.size)

      // Generate round launcher icon
      const roundIconPath = path.join(outputDir, 'ic_launcher_round.png')
      await this.resizeImageWithRoundMask(logoPath, roundIconPath, densityInfo.size, densityInfo.size)

      result.processedAssets.push({
        type: 'icon',
        originalPath: logoPath,
        outputPath: launcherIconPath,
        density: densityKey,
        size: { width: densityInfo.size, height: densityInfo.size },
        fileSize: await this.getFileSize(launcherIconPath),
        format: 'png',
        optimized: false
      })

      result.processedAssets.push({
        type: 'icon',
        originalPath: logoPath,
        outputPath: roundIconPath,
        density: densityKey,
        size: { width: densityInfo.size, height: densityInfo.size },
        fileSize: await this.getFileSize(roundIconPath),
        format: 'png',
        optimized: false
      })
    }

    logger.info(`Generated ${result.processedAssets.length} icon variants`)
  }

  /**
   * Generate default icons when no logo is provided
   */
  private async generateDefaultIcons(
    buildPath: string,
    buildConfig: AndroidBuildConfig,
    result: AssetProcessingResult
  ): Promise<void> {
    logger.info('Generating default icons')

    const primaryColor = buildConfig.partnerConfig.branding.primaryColor
    const appName = buildConfig.partnerConfig.appName

    for (const [densityKey, densityInfo] of Object.entries(this.config.iconDensities)) {
      const outputDir = path.join(buildPath, 'app', 'src', 'main', 'res', densityInfo.folder)
      await fs.ensureDir(outputDir)

      const launcherIconPath = path.join(outputDir, 'ic_launcher.png')
      const roundIconPath = path.join(outputDir, 'ic_launcher_round.png')

      // Generate simple colored icons with app initials
      await this.generateTextIcon(
        launcherIconPath,
        this.getAppInitials(appName),
        primaryColor,
        densityInfo.size,
        'square'
      )

      await this.generateTextIcon(
        roundIconPath,
        this.getAppInitials(appName),
        primaryColor,
        densityInfo.size,
        'round'
      )

      result.processedAssets.push({
        type: 'icon',
        originalPath: 'generated',
        outputPath: launcherIconPath,
        density: densityKey,
        size: { width: densityInfo.size, height: densityInfo.size },
        fileSize: await this.getFileSize(launcherIconPath),
        format: 'png',
        optimized: false
      })
    }
  }

  /**
   * Process splash screen assets
   */
  private async processSplashScreen(
    buildPath: string,
    splashPath: string,
    buildConfig: AndroidBuildConfig,
    result: AssetProcessingResult
  ): Promise<void> {
    logger.info('Processing splash screen assets')

    // Create splash screen drawable
    const drawableDir = path.join(buildPath, 'app', 'src', 'main', 'res', 'drawable')
    await fs.ensureDir(drawableDir)

    // Generate splash screen XML
    const splashXmlPath = path.join(drawableDir, 'splash_background.xml')
    const splashXml = this.generateSplashScreenXml(buildConfig.partnerConfig.branding)
    await fs.writeFile(splashXmlPath, splashXml)

    // Process splash background image if provided
    if (await fs.pathExists(splashPath)) {
      const splashImagePath = path.join(drawableDir, 'splash_image.png')
      await this.resizeImage(splashPath, splashImagePath, 1080, 1920) // Full HD portrait
      
      result.processedAssets.push({
        type: 'splash',
        originalPath: splashPath,
        outputPath: splashImagePath,
        size: { width: 1080, height: 1920 },
        fileSize: await this.getFileSize(splashImagePath),
        format: 'png',
        optimized: false
      })
    }

    result.processedAssets.push({
      type: 'splash',
      originalPath: 'generated',
      outputPath: splashXmlPath,
      fileSize: await this.getFileSize(splashXmlPath),
      format: 'xml',
      optimized: false
    })
  }

  /**
   * Process brand assets (logos, icons for notifications, etc.)
   */
  private async processBrandAssets(
    buildPath: string,
    brandIconPath: string,
    result: AssetProcessingResult
  ): Promise<void> {
    logger.info('Processing brand assets')

    const drawableDir = path.join(buildPath, 'app', 'src', 'main', 'res', 'drawable')
    await fs.ensureDir(drawableDir)

    // Generate notification icon (small, monochrome)
    const notificationIconPath = path.join(drawableDir, 'ic_notification.png')
    await this.generateNotificationIcon(brandIconPath, notificationIconPath)

    result.processedAssets.push({
      type: 'icon',
      originalPath: brandIconPath,
      outputPath: notificationIconPath,
      size: { width: 24, height: 24 },
      fileSize: await this.getFileSize(notificationIconPath),
      format: 'png',
      optimized: false
    })
  }

  /**
   * Process custom images provided by partner
   */
  private async processCustomImages(
    buildPath: string,
    customImages: { [key: string]: string },
    result: AssetProcessingResult
  ): Promise<void> {
    logger.info('Processing custom images', { count: Object.keys(customImages).length })

    const drawableDir = path.join(buildPath, 'app', 'src', 'main', 'res', 'drawable')
    await fs.ensureDir(drawableDir)

    for (const [imageName, imagePath] of Object.entries(customImages)) {
      if (await fs.pathExists(imagePath)) {
        const outputPath = path.join(drawableDir, `${imageName}.png`)
        await this.processAndOptimizeImage(imagePath, outputPath)

        result.processedAssets.push({
          type: 'image',
          originalPath: imagePath,
          outputPath,
          fileSize: await this.getFileSize(outputPath),
          format: 'png',
          optimized: false
        })
      } else {
        result.warnings.push(`Custom image not found: ${imagePath}`)
      }
    }
  }

  /**
   * Generate adaptive icons for Android 8+
   */
  private async generateAdaptiveIcons(
    buildPath: string,
    buildConfig: AndroidBuildConfig,
    result: AssetProcessingResult
  ): Promise<void> {
    logger.info('Generating adaptive icons')

    // Create mipmap-anydpi-v26 directory
    const adaptiveDir = path.join(buildPath, 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26')
    await fs.ensureDir(adaptiveDir)

    // Generate adaptive icon XML files
    const adaptiveIconXml = this.generateAdaptiveIconXml()
    const adaptiveIconRoundXml = this.generateAdaptiveIconRoundXml()

    const adaptiveIconPath = path.join(adaptiveDir, 'ic_launcher.xml')
    const adaptiveIconRoundPath = path.join(adaptiveDir, 'ic_launcher_round.xml')

    await fs.writeFile(adaptiveIconPath, adaptiveIconXml)
    await fs.writeFile(adaptiveIconRoundPath, adaptiveIconRoundXml)

    result.processedAssets.push({
      type: 'vector',
      originalPath: 'generated',
      outputPath: adaptiveIconPath,
      fileSize: await this.getFileSize(adaptiveIconPath),
      format: 'xml',
      optimized: false
    })
  }

  /**
   * Enhanced image processing with Sharp.js
   */
  private async resizeImage(
    inputPath: string,
    outputPath: string,
    width: number,
    height: number,
    options: {
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
      background?: string
      quality?: number
      format?: 'png' | 'jpg' | 'webp'
    } = {}
  ): Promise<void> {
    const {
      fit = 'cover',
      background = 'transparent',
      quality = this.config.quality.png,
      format = 'png'
    } = options

    logger.debug(`Resizing image: ${inputPath} -> ${outputPath} (${width}x${height})`)
    
    try {
      let pipeline = sharp(inputPath)
        .resize(width, height, { 
          fit,
          background,
          withoutEnlargement: false
        })

      // Apply format-specific options
      switch (format) {
        case 'png':
          pipeline = pipeline.png({ 
            quality: quality,
            compressionLevel: 9,
            adaptiveFiltering: true,
            force: true
          })
          break
        case 'jpg':
          pipeline = pipeline.jpeg({ 
            quality: quality,
            progressive: true,
            force: true
          })
          break
        case 'webp':
          pipeline = pipeline.webp({ 
            quality: quality,
            effort: 6,
            force: true
          })
          break
      }

      await pipeline.toFile(outputPath)
      
      logger.debug(`Successfully resized image to ${outputPath}`)
    } catch (error) {
      logger.error(`Failed to resize image: ${error}`)
      throw new Error(`Image resize failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async resizeImageWithRoundMask(
    inputPath: string,
    outputPath: string,
    width: number,
    height: number
  ): Promise<void> {
    logger.debug(`Creating round icon: ${inputPath} -> ${outputPath}`)
    
    try {
      // Create circular mask
      const maskSize = Math.min(width, height)
      const mask = Buffer.from(
        `<svg width="${maskSize}" height="${maskSize}" viewBox="0 0 ${maskSize} ${maskSize}">
          <circle cx="${maskSize/2}" cy="${maskSize/2}" r="${maskSize/2}" fill="white"/>
        </svg>`
      )

      // Process image with circular mask
      await sharp(inputPath)
        .resize(width, height, { fit: 'cover' })
        .composite([{ input: mask, blend: 'dest-in' }])
        .png({ quality: this.config.quality.png })
        .toFile(outputPath)

      logger.debug(`Successfully created round icon: ${outputPath}`)
    } catch (error) {
      logger.error(`Failed to create round icon: ${error}`)
      throw new Error(`Round icon creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async generateTextIcon(
    outputPath: string,
    text: string,
    backgroundColor: string,
    size: number,
    shape: 'square' | 'round'
  ): Promise<void> {
    logger.debug(`Generating text icon: ${text} -> ${outputPath}`)
    
    try {
      if (createCanvas) {
        // Use canvas for text rendering
        const canvas = createCanvas(size, size)
        const ctx = canvas.getContext('2d')

        // Set background
        ctx.fillStyle = backgroundColor
        if (shape === 'round') {
          ctx.beginPath()
          ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI)
          ctx.fill()
        } else {
          ctx.fillRect(0, 0, size, size)
        }

        // Set text properties
        const fontSize = Math.floor(size * 0.4)
        ctx.font = `bold ${fontSize}px Arial, sans-serif`
        ctx.fillStyle = this.getContrastColor(backgroundColor)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Draw text
        ctx.fillText(text, size / 2, size / 2)

        // Convert canvas to PNG and save
        const buffer = canvas.toBuffer('image/png')
        await fs.writeFile(outputPath, buffer)
      } else {
        // Fallback: Generate text icon using Sharp.js with SVG
        await this.generateTextIconWithSvg(outputPath, text, backgroundColor, size, shape)
      }

      logger.debug(`Successfully generated text icon: ${outputPath}`)
    } catch (error) {
      logger.error(`Failed to generate text icon: ${error}`)
      throw new Error(`Text icon generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async generateTextIconWithSvg(
    outputPath: string,
    text: string,
    backgroundColor: string,
    size: number,
    shape: 'square' | 'round'
  ): Promise<void> {
    const fontSize = Math.floor(size * 0.4)
    const textColor = this.getContrastColor(backgroundColor)
    
    let svgContent: string
    
    if (shape === 'round') {
      svgContent = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${backgroundColor}"/>
          <text x="${size/2}" y="${size/2}" font-family="Arial, sans-serif" font-size="${fontSize}" 
                font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${text}</text>
        </svg>
      `
    } else {
      svgContent = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${size}" height="${size}" fill="${backgroundColor}"/>
          <text x="${size/2}" y="${size/2}" font-family="Arial, sans-serif" font-size="${fontSize}" 
                font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${text}</text>
        </svg>
      `
    }

    // Convert SVG to PNG using Sharp
    await sharp(Buffer.from(svgContent))
      .png({ quality: this.config.quality.png })
      .toFile(outputPath)
  }

  private async generateNotificationIcon(
    inputPath: string,
    outputPath: string
  ): Promise<void> {
    logger.debug(`Generating notification icon: ${inputPath} -> ${outputPath}`)
    
    try {
      // Create monochrome notification icon (24dp)
      await sharp(inputPath)
        .resize(24, 24, { fit: 'contain', background: 'transparent' })
        .greyscale()
        .threshold(128) // Convert to pure black/white
        .png({ quality: this.config.quality.png })
        .toFile(outputPath)

      logger.debug(`Successfully generated notification icon: ${outputPath}`)
    } catch (error) {
      logger.error(`Failed to generate notification icon: ${error}`)
      throw new Error(`Notification icon generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async processAndOptimizeImage(
    inputPath: string,
    outputPath: string,
    maxWidth?: number,
    maxHeight?: number
  ): Promise<void> {
    logger.debug(`Processing and optimizing image: ${inputPath} -> ${outputPath}`)
    
    try {
      const metadata = await sharp(inputPath).metadata()
      let pipeline = sharp(inputPath)

      // Resize if dimensions are specified and image is larger
      if (maxWidth && maxHeight && metadata.width && metadata.height) {
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          pipeline = pipeline.resize(maxWidth, maxHeight, { 
            fit: 'inside',
            withoutEnlargement: false
          })
        }
      }

      // Optimize based on format
      const format = path.extname(outputPath).toLowerCase().slice(1)
      switch (format) {
        case 'png':
          pipeline = pipeline.png({ 
            quality: this.config.quality.png,
            compressionLevel: 9,
            adaptiveFiltering: true
          })
          break
        case 'jpg':
        case 'jpeg':
          pipeline = pipeline.jpeg({ 
            quality: this.config.quality.jpg,
            progressive: true
          })
          break
        case 'webp':
          pipeline = pipeline.webp({ 
            quality: this.config.quality.webp,
            effort: 6
          })
          break
      }

      await pipeline.toFile(outputPath)
      
      logger.debug(`Successfully processed and optimized image: ${outputPath}`)
    } catch (error) {
      logger.error(`Failed to process and optimize image: ${error}`)
      throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async optimizeAssets(assets: ProcessedAsset[]): Promise<void> {
    logger.info(`Optimizing ${assets.length} processed assets`)
    
    const optimizationPromises = assets.map(async (asset) => {
      if (['png', 'jpg', 'jpeg', 'webp'].includes(asset.format)) {
        try {
          const originalSize = asset.fileSize
          await this.optimizeSingleAsset(asset.outputPath, asset.format)
          
          // Update file size after optimization
          asset.fileSize = await this.getFileSize(asset.outputPath)
          asset.optimized = true
          
          const compressionRatio = ((originalSize - asset.fileSize) / originalSize * 100).toFixed(1)
          logger.debug(`Optimized ${asset.outputPath}: ${compressionRatio}% size reduction`)
        } catch (error) {
          logger.warn(`Failed to optimize ${asset.outputPath}: ${error}`)
        }
      }
    })

    await Promise.all(optimizationPromises)
    logger.info('Asset optimization completed')
  }

  private async optimizeSingleAsset(filePath: string, format: string): Promise<void> {
    const tempPath = `${filePath}.temp`
    
    let pipeline = sharp(filePath)
    
    switch (format) {
      case 'png':
        pipeline = pipeline.png({ 
          quality: 90,
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: true // Use palette when beneficial
        })
        break
      case 'jpg':
      case 'jpeg':
        pipeline = pipeline.jpeg({ 
          quality: 85,
          progressive: true,
          mozjpeg: true // Use mozjpeg encoder when available
        })
        break
      case 'webp':
        pipeline = pipeline.webp({ 
          quality: 90,
          effort: 6,
          smartSubsample: true
        })
        break
    }

    await pipeline.toFile(tempPath)
    await fs.move(tempPath, filePath, { overwrite: true })
  }

  /**
   * Enhanced image validation and metadata extraction
   */
  private async getImageInfo(imagePath: string): Promise<{
    width: number
    height: number
    format: string
    size: number
    hasAlpha: boolean
    density?: number
    colorSpace?: string
  } | null> {
    try {
      const metadata = await sharp(imagePath).metadata()
      const stats = await fs.stat(imagePath)
      
      const result: {
        width: number
        height: number
        format: string
        size: number
        hasAlpha: boolean
        density?: number
        colorSpace?: string
      } = {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: stats.size,
        hasAlpha: metadata.hasAlpha || false
      }

      // Only add optional properties if they exist
      if (metadata.density !== undefined) {
        result.density = metadata.density
      }
      if (metadata.space !== undefined) {
        result.colorSpace = metadata.space
      }

      return result
    } catch (error) {
      console.error(`Failed to get image info for ${imagePath}: ${error}`)
      return null
    }
  }

  /**
   * SVG processing and conversion
   */
  private async processSvgToRaster(
    svgPath: string,
    outputPath: string,
    width: number,
    height: number,
    backgroundColor = 'transparent'
  ): Promise<void> {
    logger.debug(`Converting SVG to raster: ${svgPath} -> ${outputPath}`)
    
    try {
      await sharp(svgPath)
        .resize(width, height, { 
          fit: 'contain',
          background: backgroundColor
        })
        .png({ quality: this.config.quality.png })
        .toFile(outputPath)

      logger.debug(`Successfully converted SVG to raster: ${outputPath}`)
    } catch (error) {
      logger.error(`Failed to convert SVG: ${error}`)
      throw new Error(`SVG conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Utility methods for enhanced processing
   */
  private getContrastColor(hexColor: string): string {
    // Remove # if present
    const color = hexColor.replace('#', '')
    
    // Convert to RGB
    const r = parseInt(color.substr(0, 2), 16)
    const g = parseInt(color.substr(2, 2), 16)
    const b = parseInt(color.substr(4, 2), 16)
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    
    // Return black or white based on luminance
    return luminance > 0.5 ? '#000000' : '#FFFFFF'
  }

  private async createAdaptiveIconLayers(
    logoPath: string,
    outputDir: string,
    primaryColor: string
  ): Promise<void> {
    // Create background layer (108dp for adaptive icons)
    const backgroundPath = path.join(outputDir, 'ic_launcher_background.png')
    await this.generateSolidColorImage(backgroundPath, primaryColor, 108, 108)

    // Create foreground layer (108dp, but content should fit in 72dp safe area)
    const foregroundPath = path.join(outputDir, 'ic_launcher_foreground.png')
    await sharp(logoPath)
      .resize(72, 72, { fit: 'contain', background: 'transparent' })
      .extend({
        top: 18,
        bottom: 18,
        left: 18,
        right: 18,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: this.config.quality.png })
      .toFile(foregroundPath)
  }

  private async generateSolidColorImage(
    outputPath: string,
    color: string,
    width: number,
    height: number
  ): Promise<void> {
    // Create a solid color image using Sharp
    const { r, g, b } = this.hexToRgb(color)
    
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r, g, b }
      }
    })
    .png()
    .toFile(outputPath)
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const color = hex.replace('#', '')
    return {
      r: parseInt(color.substr(0, 2), 16),
      g: parseInt(color.substr(2, 2), 16),
      b: parseInt(color.substr(4, 2), 16)
    }
  }

  /**
   * Utility methods
   */
  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath)
      return stats.size
    } catch {
      return 0
    }
  }

  private getAppInitials(appName: string): string {
    return appName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  }

  /**
   * XML generation methods
   */
  private generateSplashScreenXml(branding: any): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/partner_primary"/>
    <item>
        <bitmap
            android:gravity="center"
            android:src="@drawable/splash_image"/>
    </item>
</layer-list>`
  }

  private generateAdaptiveIconXml(): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/partner_primary"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`
  }

  private generateAdaptiveIconRoundXml(): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/partner_primary"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`
  }

  /**
   * Validation methods
   */
  async validateAsset(assetPath: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    // Check if file exists
    if (!await fs.pathExists(assetPath)) {
      errors.push('Asset file does not exist')
      return { valid: false, errors }
    }

    // Check file size
    const stats = await fs.stat(assetPath)
    if (stats.size > this.config.maxFileSize) {
      errors.push(`File size exceeds limit: ${stats.size} > ${this.config.maxFileSize}`)
    }

    // Check file format
    const ext = path.extname(assetPath).toLowerCase().slice(1)
    if (!this.config.supportedFormats.includes(ext)) {
      errors.push(`Unsupported file format: ${ext}`)
    }

    return { valid: errors.length === 0, errors }
  }
} 