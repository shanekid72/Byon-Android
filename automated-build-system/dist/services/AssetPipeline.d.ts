import { PartnerAssets } from './AssetProcessor';
import { AndroidBuildConfig } from './TemplateProcessor';
export interface AssetPipelineConfig {
    enableOptimization: boolean;
    qualityThreshold: number;
    maxProcessingTime: number;
    outputFormats: string[];
    compressionLevel: number;
}
export interface PipelineResult {
    success: boolean;
    processedAssets: ProcessedPipelineAsset[];
    errors: string[];
    warnings: string[];
    processingTime: number;
    qualityScore: number;
}
export interface ProcessedPipelineAsset {
    assetId: string;
    type: string;
    originalPath: string;
    outputPaths: string[];
    formats: string[];
    sizes: {
        [key: string]: {
            width: number;
            height: number;
        };
    };
    optimization: {
        originalSize: number;
        finalSize: number;
        compressionRatio: number;
        qualityScore: number;
    };
    metadata: any;
}
export interface AssetInjectionPlan {
    buildId: string;
    partnerId: string;
    targetPath: string;
    assets: {
        logos: ProcessedPipelineAsset[];
        splash: ProcessedPipelineAsset[];
        icons: ProcessedPipelineAsset[];
        brand: ProcessedPipelineAsset[];
        custom: ProcessedPipelineAsset[];
    };
    injectionPoints: InjectionPoint[];
}
export interface InjectionPoint {
    type: 'resource' | 'manifest' | 'code' | 'gradle';
    targetFile: string;
    action: 'replace' | 'append' | 'insert';
    content: string;
    placeholder?: string;
}
export declare class AssetPipeline {
    private readonly assetProcessor;
    private readonly config;
    constructor(config?: Partial<AssetPipelineConfig>);
    processPipeline(buildPath: string, buildConfig: AndroidBuildConfig, partnerAssets: PartnerAssets): Promise<PipelineResult>;
    createInjectionPlan(buildId: string, partnerId: string, buildPath: string, pipelineResult: PipelineResult): Promise<AssetInjectionPlan>;
    injectAssets(injectionPlan: AssetInjectionPlan): Promise<boolean>;
    private optimizePipelineAssets;
    private validateAssetQuality;
    private convertAssetFormats;
    private optimizeAssets;
    private generateInjectionPoints;
    private executeInjectionPoint;
    getPipelineStats(pipelineResult: PipelineResult): Promise<any>;
}
export default AssetPipeline;
//# sourceMappingURL=AssetPipeline.d.ts.map