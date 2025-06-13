"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetProcessor = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
    error: (msg, error) => console.error(`[ERROR] ${msg}`, error || ''),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
    debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta || '')
};
let createCanvas;
try {
    const canvas = require('canvas');
    createCanvas = canvas.createCanvas;
}
catch (error) {
    logger.warn('Canvas module not available. Text icon generation will use SVG fallback method.');
}
class AssetProcessor {
    constructor() {
        this.TEMP_DIR = './storage/temp/assets';
        this.OUTPUT_DIR = './storage/processed-assets';
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
            maxFileSize: 10 * 1024 * 1024,
            maxDimensions: {
                width: 4096,
                height: 4096
            }
        };
        this.ensureDirectories();
    }
    async ensureDirectories() {
        await fs_extra_1.default.ensureDir(this.TEMP_DIR);
        await fs_extra_1.default.ensureDir(this.OUTPUT_DIR);
    }
    async processPartnerAssets(buildPath, buildConfig, assets) {
        const startTime = Date.now();
        logger.info('Starting asset processing for partner', {
            partnerId: buildConfig.partnerConfig.appName,
            assets: Object.keys(assets)
        });
        const result = {
            success: true,
            processedAssets: [],
            errors: [],
            warnings: [],
            processingTime: 0
        };
        try {
            if (assets.logo) {
                await this.processAppIcons(buildPath, assets.logo, result);
            }
            else {
                result.warnings.push('No logo provided, using default icons');
                await this.generateDefaultIcons(buildPath, buildConfig, result);
            }
            if (assets.splashBackground) {
                await this.processSplashScreen(buildPath, assets.splashBackground, buildConfig, result);
            }
            if (assets.brandIcon) {
                await this.processBrandAssets(buildPath, assets.brandIcon, result);
            }
            if (assets.customImages) {
                await this.processCustomImages(buildPath, assets.customImages, result);
            }
            await this.generateAdaptiveIcons(buildPath, buildConfig, result);
            await this.optimizeAssets(result.processedAssets);
            result.processingTime = Date.now() - startTime;
            logger.info('Asset processing completed', {
                duration: result.processingTime,
                assetsProcessed: result.processedAssets.length
            });
        }
        catch (error) {
            result.success = false;
            result.errors.push(error instanceof Error ? error.message : 'Unknown asset processing error');
            logger.error('Asset processing failed:', error);
        }
        return result;
    }
    async processAppIcons(buildPath, logoPath, result) {
        logger.info('Processing app icons for all densities');
        if (!await fs_extra_1.default.pathExists(logoPath)) {
            throw new Error(`Logo file not found: ${logoPath}`);
        }
        const sourceInfo = await this.getImageInfo(logoPath);
        if (!sourceInfo) {
            throw new Error('Invalid logo image format');
        }
        for (const [densityKey, densityInfo] of Object.entries(this.config.iconDensities)) {
            const outputDir = path_1.default.join(buildPath, 'app', 'src', 'main', 'res', densityInfo.folder);
            await fs_extra_1.default.ensureDir(outputDir);
            const launcherIconPath = path_1.default.join(outputDir, 'ic_launcher.png');
            await this.resizeImage(logoPath, launcherIconPath, densityInfo.size, densityInfo.size);
            const roundIconPath = path_1.default.join(outputDir, 'ic_launcher_round.png');
            await this.resizeImageWithRoundMask(logoPath, roundIconPath, densityInfo.size, densityInfo.size);
            result.processedAssets.push({
                type: 'icon',
                originalPath: logoPath,
                outputPath: launcherIconPath,
                density: densityKey,
                size: { width: densityInfo.size, height: densityInfo.size },
                fileSize: await this.getFileSize(launcherIconPath),
                format: 'png',
                optimized: false
            });
            result.processedAssets.push({
                type: 'icon',
                originalPath: logoPath,
                outputPath: roundIconPath,
                density: densityKey,
                size: { width: densityInfo.size, height: densityInfo.size },
                fileSize: await this.getFileSize(roundIconPath),
                format: 'png',
                optimized: false
            });
        }
        logger.info(`Generated ${result.processedAssets.length} icon variants`);
    }
    async generateDefaultIcons(buildPath, buildConfig, result) {
        logger.info('Generating default icons');
        const primaryColor = buildConfig.partnerConfig.branding.primaryColor;
        const appName = buildConfig.partnerConfig.appName;
        for (const [densityKey, densityInfo] of Object.entries(this.config.iconDensities)) {
            const outputDir = path_1.default.join(buildPath, 'app', 'src', 'main', 'res', densityInfo.folder);
            await fs_extra_1.default.ensureDir(outputDir);
            const launcherIconPath = path_1.default.join(outputDir, 'ic_launcher.png');
            const roundIconPath = path_1.default.join(outputDir, 'ic_launcher_round.png');
            await this.generateTextIcon(launcherIconPath, this.getAppInitials(appName), primaryColor, densityInfo.size, 'square');
            await this.generateTextIcon(roundIconPath, this.getAppInitials(appName), primaryColor, densityInfo.size, 'round');
            result.processedAssets.push({
                type: 'icon',
                originalPath: 'generated',
                outputPath: launcherIconPath,
                density: densityKey,
                size: { width: densityInfo.size, height: densityInfo.size },
                fileSize: await this.getFileSize(launcherIconPath),
                format: 'png',
                optimized: false
            });
        }
    }
    async processSplashScreen(buildPath, splashPath, buildConfig, result) {
        logger.info('Processing splash screen assets');
        const drawableDir = path_1.default.join(buildPath, 'app', 'src', 'main', 'res', 'drawable');
        await fs_extra_1.default.ensureDir(drawableDir);
        const splashXmlPath = path_1.default.join(drawableDir, 'splash_background.xml');
        const splashXml = this.generateSplashScreenXml(buildConfig.partnerConfig.branding);
        await fs_extra_1.default.writeFile(splashXmlPath, splashXml);
        if (await fs_extra_1.default.pathExists(splashPath)) {
            const splashImagePath = path_1.default.join(drawableDir, 'splash_image.png');
            await this.resizeImage(splashPath, splashImagePath, 1080, 1920);
            result.processedAssets.push({
                type: 'splash',
                originalPath: splashPath,
                outputPath: splashImagePath,
                size: { width: 1080, height: 1920 },
                fileSize: await this.getFileSize(splashImagePath),
                format: 'png',
                optimized: false
            });
        }
        result.processedAssets.push({
            type: 'splash',
            originalPath: 'generated',
            outputPath: splashXmlPath,
            fileSize: await this.getFileSize(splashXmlPath),
            format: 'xml',
            optimized: false
        });
    }
    async processBrandAssets(buildPath, brandIconPath, result) {
        logger.info('Processing brand assets');
        const drawableDir = path_1.default.join(buildPath, 'app', 'src', 'main', 'res', 'drawable');
        await fs_extra_1.default.ensureDir(drawableDir);
        const notificationIconPath = path_1.default.join(drawableDir, 'ic_notification.png');
        await this.generateNotificationIcon(brandIconPath, notificationIconPath);
        result.processedAssets.push({
            type: 'icon',
            originalPath: brandIconPath,
            outputPath: notificationIconPath,
            size: { width: 24, height: 24 },
            fileSize: await this.getFileSize(notificationIconPath),
            format: 'png',
            optimized: false
        });
    }
    async processCustomImages(buildPath, customImages, result) {
        logger.info('Processing custom images', { count: Object.keys(customImages).length });
        const drawableDir = path_1.default.join(buildPath, 'app', 'src', 'main', 'res', 'drawable');
        await fs_extra_1.default.ensureDir(drawableDir);
        for (const [imageName, imagePath] of Object.entries(customImages)) {
            if (await fs_extra_1.default.pathExists(imagePath)) {
                const outputPath = path_1.default.join(drawableDir, `${imageName}.png`);
                await this.processAndOptimizeImage(imagePath, outputPath);
                result.processedAssets.push({
                    type: 'image',
                    originalPath: imagePath,
                    outputPath,
                    fileSize: await this.getFileSize(outputPath),
                    format: 'png',
                    optimized: false
                });
            }
            else {
                result.warnings.push(`Custom image not found: ${imagePath}`);
            }
        }
    }
    async generateAdaptiveIcons(buildPath, buildConfig, result) {
        logger.info('Generating adaptive icons');
        const adaptiveDir = path_1.default.join(buildPath, 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26');
        await fs_extra_1.default.ensureDir(adaptiveDir);
        const adaptiveIconXml = this.generateAdaptiveIconXml();
        const adaptiveIconRoundXml = this.generateAdaptiveIconRoundXml();
        const adaptiveIconPath = path_1.default.join(adaptiveDir, 'ic_launcher.xml');
        const adaptiveIconRoundPath = path_1.default.join(adaptiveDir, 'ic_launcher_round.xml');
        await fs_extra_1.default.writeFile(adaptiveIconPath, adaptiveIconXml);
        await fs_extra_1.default.writeFile(adaptiveIconRoundPath, adaptiveIconRoundXml);
        result.processedAssets.push({
            type: 'vector',
            originalPath: 'generated',
            outputPath: adaptiveIconPath,
            fileSize: await this.getFileSize(adaptiveIconPath),
            format: 'xml',
            optimized: false
        });
    }
    async resizeImage(inputPath, outputPath, width, height, options = {}) {
        const { fit = 'cover', background = 'transparent', quality = this.config.quality.png, format = 'png' } = options;
        logger.debug(`Resizing image: ${inputPath} -> ${outputPath} (${width}x${height})`);
        try {
            let pipeline = (0, sharp_1.default)(inputPath)
                .resize(width, height, {
                fit,
                background,
                withoutEnlargement: false
            });
            switch (format) {
                case 'png':
                    pipeline = pipeline.png({
                        quality: quality,
                        compressionLevel: 9,
                        adaptiveFiltering: true,
                        force: true
                    });
                    break;
                case 'jpg':
                    pipeline = pipeline.jpeg({
                        quality: quality,
                        progressive: true,
                        force: true
                    });
                    break;
                case 'webp':
                    pipeline = pipeline.webp({
                        quality: quality,
                        effort: 6,
                        force: true
                    });
                    break;
            }
            await pipeline.toFile(outputPath);
            logger.debug(`Successfully resized image to ${outputPath}`);
        }
        catch (error) {
            logger.error(`Failed to resize image: ${error}`);
            throw new Error(`Image resize failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async resizeImageWithRoundMask(inputPath, outputPath, width, height) {
        logger.debug(`Creating round icon: ${inputPath} -> ${outputPath}`);
        try {
            const maskSize = Math.min(width, height);
            const mask = Buffer.from(`<svg width="${maskSize}" height="${maskSize}" viewBox="0 0 ${maskSize} ${maskSize}">
          <circle cx="${maskSize / 2}" cy="${maskSize / 2}" r="${maskSize / 2}" fill="white"/>
        </svg>`);
            await (0, sharp_1.default)(inputPath)
                .resize(width, height, { fit: 'cover' })
                .composite([{ input: mask, blend: 'dest-in' }])
                .png({ quality: this.config.quality.png })
                .toFile(outputPath);
            logger.debug(`Successfully created round icon: ${outputPath}`);
        }
        catch (error) {
            logger.error(`Failed to create round icon: ${error}`);
            throw new Error(`Round icon creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async generateTextIcon(outputPath, text, backgroundColor, size, shape) {
        logger.debug(`Generating text icon: ${text} -> ${outputPath}`);
        try {
            if (createCanvas) {
                const canvas = createCanvas(size, size);
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = backgroundColor;
                if (shape === 'round') {
                    ctx.beginPath();
                    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
                    ctx.fill();
                }
                else {
                    ctx.fillRect(0, 0, size, size);
                }
                const fontSize = Math.floor(size * 0.4);
                ctx.font = `bold ${fontSize}px Arial, sans-serif`;
                ctx.fillStyle = this.getContrastColor(backgroundColor);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, size / 2, size / 2);
                const buffer = canvas.toBuffer('image/png');
                await fs_extra_1.default.writeFile(outputPath, buffer);
            }
            else {
                await this.generateTextIconWithSvg(outputPath, text, backgroundColor, size, shape);
            }
            logger.debug(`Successfully generated text icon: ${outputPath}`);
        }
        catch (error) {
            logger.error(`Failed to generate text icon: ${error}`);
            throw new Error(`Text icon generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async generateTextIconWithSvg(outputPath, text, backgroundColor, size, shape) {
        const fontSize = Math.floor(size * 0.4);
        const textColor = this.getContrastColor(backgroundColor);
        let svgContent;
        if (shape === 'round') {
            svgContent = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${backgroundColor}"/>
          <text x="${size / 2}" y="${size / 2}" font-family="Arial, sans-serif" font-size="${fontSize}" 
                font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${text}</text>
        </svg>
      `;
        }
        else {
            svgContent = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${size}" height="${size}" fill="${backgroundColor}"/>
          <text x="${size / 2}" y="${size / 2}" font-family="Arial, sans-serif" font-size="${fontSize}" 
                font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${text}</text>
        </svg>
      `;
        }
        await (0, sharp_1.default)(Buffer.from(svgContent))
            .png({ quality: this.config.quality.png })
            .toFile(outputPath);
    }
    async generateNotificationIcon(inputPath, outputPath) {
        logger.debug(`Generating notification icon: ${inputPath} -> ${outputPath}`);
        try {
            await (0, sharp_1.default)(inputPath)
                .resize(24, 24, { fit: 'contain', background: 'transparent' })
                .greyscale()
                .threshold(128)
                .png({ quality: this.config.quality.png })
                .toFile(outputPath);
            logger.debug(`Successfully generated notification icon: ${outputPath}`);
        }
        catch (error) {
            logger.error(`Failed to generate notification icon: ${error}`);
            throw new Error(`Notification icon generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async processAndOptimizeImage(inputPath, outputPath, maxWidth, maxHeight) {
        logger.debug(`Processing and optimizing image: ${inputPath} -> ${outputPath}`);
        try {
            const metadata = await (0, sharp_1.default)(inputPath).metadata();
            let pipeline = (0, sharp_1.default)(inputPath);
            if (maxWidth && maxHeight && metadata.width && metadata.height) {
                if (metadata.width > maxWidth || metadata.height > maxHeight) {
                    pipeline = pipeline.resize(maxWidth, maxHeight, {
                        fit: 'inside',
                        withoutEnlargement: false
                    });
                }
            }
            const format = path_1.default.extname(outputPath).toLowerCase().slice(1);
            switch (format) {
                case 'png':
                    pipeline = pipeline.png({
                        quality: this.config.quality.png,
                        compressionLevel: 9,
                        adaptiveFiltering: true
                    });
                    break;
                case 'jpg':
                case 'jpeg':
                    pipeline = pipeline.jpeg({
                        quality: this.config.quality.jpg,
                        progressive: true
                    });
                    break;
                case 'webp':
                    pipeline = pipeline.webp({
                        quality: this.config.quality.webp,
                        effort: 6
                    });
                    break;
            }
            await pipeline.toFile(outputPath);
            logger.debug(`Successfully processed and optimized image: ${outputPath}`);
        }
        catch (error) {
            logger.error(`Failed to process and optimize image: ${error}`);
            throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async optimizeAssets(assets) {
        logger.info(`Optimizing ${assets.length} processed assets`);
        const optimizationPromises = assets.map(async (asset) => {
            if (['png', 'jpg', 'jpeg', 'webp'].includes(asset.format)) {
                try {
                    const originalSize = asset.fileSize;
                    await this.optimizeSingleAsset(asset.outputPath, asset.format);
                    asset.fileSize = await this.getFileSize(asset.outputPath);
                    asset.optimized = true;
                    const compressionRatio = ((originalSize - asset.fileSize) / originalSize * 100).toFixed(1);
                    logger.debug(`Optimized ${asset.outputPath}: ${compressionRatio}% size reduction`);
                }
                catch (error) {
                    logger.warn(`Failed to optimize ${asset.outputPath}: ${error}`);
                }
            }
        });
        await Promise.all(optimizationPromises);
        logger.info('Asset optimization completed');
    }
    async optimizeSingleAsset(filePath, format) {
        const tempPath = `${filePath}.temp`;
        let pipeline = (0, sharp_1.default)(filePath);
        switch (format) {
            case 'png':
                pipeline = pipeline.png({
                    quality: 90,
                    compressionLevel: 9,
                    adaptiveFiltering: true,
                    palette: true
                });
                break;
            case 'jpg':
            case 'jpeg':
                pipeline = pipeline.jpeg({
                    quality: 85,
                    progressive: true,
                    mozjpeg: true
                });
                break;
            case 'webp':
                pipeline = pipeline.webp({
                    quality: 90,
                    effort: 6,
                    smartSubsample: true
                });
                break;
        }
        await pipeline.toFile(tempPath);
        await fs_extra_1.default.move(tempPath, filePath, { overwrite: true });
    }
    async getImageInfo(imagePath) {
        try {
            const metadata = await (0, sharp_1.default)(imagePath).metadata();
            const stats = await fs_extra_1.default.stat(imagePath);
            const result = {
                width: metadata.width || 0,
                height: metadata.height || 0,
                format: metadata.format || 'unknown',
                size: stats.size,
                hasAlpha: metadata.hasAlpha || false
            };
            if (metadata.density !== undefined) {
                result.density = metadata.density;
            }
            if (metadata.space !== undefined) {
                result.colorSpace = metadata.space;
            }
            return result;
        }
        catch (error) {
            console.error(`Failed to get image info for ${imagePath}: ${error}`);
            return null;
        }
    }
    async processSvgToRaster(svgPath, outputPath, width, height, backgroundColor = 'transparent') {
        logger.debug(`Converting SVG to raster: ${svgPath} -> ${outputPath}`);
        try {
            await (0, sharp_1.default)(svgPath)
                .resize(width, height, {
                fit: 'contain',
                background: backgroundColor
            })
                .png({ quality: this.config.quality.png })
                .toFile(outputPath);
            logger.debug(`Successfully converted SVG to raster: ${outputPath}`);
        }
        catch (error) {
            logger.error(`Failed to convert SVG: ${error}`);
            throw new Error(`SVG conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    getContrastColor(hexColor) {
        const color = hexColor.replace('#', '');
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }
    async createAdaptiveIconLayers(logoPath, outputDir, primaryColor) {
        const backgroundPath = path_1.default.join(outputDir, 'ic_launcher_background.png');
        await this.generateSolidColorImage(backgroundPath, primaryColor, 108, 108);
        const foregroundPath = path_1.default.join(outputDir, 'ic_launcher_foreground.png');
        await (0, sharp_1.default)(logoPath)
            .resize(72, 72, { fit: 'contain', background: 'transparent' })
            .extend({
            top: 18,
            bottom: 18,
            left: 18,
            right: 18,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
            .png({ quality: this.config.quality.png })
            .toFile(foregroundPath);
    }
    async generateSolidColorImage(outputPath, color, width, height) {
        const { r, g, b } = this.hexToRgb(color);
        await (0, sharp_1.default)({
            create: {
                width,
                height,
                channels: 3,
                background: { r, g, b }
            }
        })
            .png()
            .toFile(outputPath);
    }
    hexToRgb(hex) {
        const color = hex.replace('#', '');
        return {
            r: parseInt(color.substr(0, 2), 16),
            g: parseInt(color.substr(2, 2), 16),
            b: parseInt(color.substr(4, 2), 16)
        };
    }
    async getFileSize(filePath) {
        try {
            const stats = await fs_extra_1.default.stat(filePath);
            return stats.size;
        }
        catch {
            return 0;
        }
    }
    getAppInitials(appName) {
        return appName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    }
    generateSplashScreenXml(branding) {
        return `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/partner_primary"/>
    <item>
        <bitmap
            android:gravity="center"
            android:src="@drawable/splash_image"/>
    </item>
</layer-list>`;
    }
    generateAdaptiveIconXml() {
        return `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/partner_primary"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;
    }
    generateAdaptiveIconRoundXml() {
        return `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/partner_primary"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;
    }
    async validateAsset(assetPath) {
        const errors = [];
        if (!await fs_extra_1.default.pathExists(assetPath)) {
            errors.push('Asset file does not exist');
            return { valid: false, errors };
        }
        const stats = await fs_extra_1.default.stat(assetPath);
        if (stats.size > this.config.maxFileSize) {
            errors.push(`File size exceeds limit: ${stats.size} > ${this.config.maxFileSize}`);
        }
        const ext = path_1.default.extname(assetPath).toLowerCase().slice(1);
        if (!this.config.supportedFormats.includes(ext)) {
            errors.push(`Unsupported file format: ${ext}`);
        }
        return { valid: errors.length === 0, errors };
    }
}
exports.AssetProcessor = AssetProcessor;
//# sourceMappingURL=AssetProcessor.js.map