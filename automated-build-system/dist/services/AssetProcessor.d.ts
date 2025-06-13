import { AndroidBuildConfig } from './TemplateProcessor';
export interface AssetConfig {
    iconDensities: {
        [key: string]: {
            size: number;
            folder: string;
        };
    };
    supportedFormats: string[];
    quality: {
        png: number;
        jpg: number;
        webp: number;
    };
    maxFileSize: number;
    maxDimensions: {
        width: number;
        height: number;
    };
}
export interface AssetProcessingResult {
    success: boolean;
    processedAssets: ProcessedAsset[];
    errors: string[];
    warnings: string[];
    processingTime: number;
}
export interface ProcessedAsset {
    type: 'icon' | 'splash' | 'image' | 'vector';
    originalPath: string;
    outputPath: string;
    density?: string;
    size?: {
        width: number;
        height: number;
    };
    fileSize: number;
    format: string;
    optimized: boolean;
}
export interface PartnerAssets {
    logo?: string;
    logoSquare?: string;
    splashBackground?: string;
    brandIcon?: string;
    favicon?: string;
    customImages?: {
        [key: string]: string;
    };
}
export declare class AssetProcessor {
    private readonly config;
    private readonly TEMP_DIR;
    private readonly OUTPUT_DIR;
    constructor();
    private ensureDirectories;
    processPartnerAssets(buildPath: string, buildConfig: AndroidBuildConfig, assets: PartnerAssets): Promise<AssetProcessingResult>;
    private processAppIcons;
    private generateDefaultIcons;
    private processSplashScreen;
    private processBrandAssets;
    private processCustomImages;
    private generateAdaptiveIcons;
    private resizeImage;
    private resizeImageWithRoundMask;
    private generateTextIcon;
    private generateTextIconWithSvg;
    private generateNotificationIcon;
    private processAndOptimizeImage;
    private optimizeAssets;
    private optimizeSingleAsset;
    private getImageInfo;
    private processSvgToRaster;
    private getContrastColor;
    private createAdaptiveIconLayers;
    private generateSolidColorImage;
    private hexToRgb;
    private getFileSize;
    private getAppInitials;
    private generateSplashScreenXml;
    private generateAdaptiveIconXml;
    private generateAdaptiveIconRoundXml;
    validateAsset(assetPath: string): Promise<{
        valid: boolean;
        errors: string[];
    }>;
}
//# sourceMappingURL=AssetProcessor.d.ts.map