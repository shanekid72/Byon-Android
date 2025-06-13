import { AndroidBuildConfig } from './TemplateProcessor';
import { PipelineResult, AssetInjectionPlan } from './AssetPipeline';
export interface BuildOptions {
    onProgress?: (progress: number, stage: string, message: string) => Promise<void>;
    enableAssetPipeline?: boolean;
    assetPipelineConfig?: any;
}
export interface BuildResult {
    success: boolean;
    buildId: string;
    artifacts?: {
        apkPath?: string;
        aabPath?: string;
        mappingFile?: string;
        buildReport?: string;
    };
    assetPipelineResult?: PipelineResult;
    injectionPlan?: AssetInjectionPlan;
    error?: string;
    logs: string[];
    buildDuration: number;
    stages: {
        templateProcessing: boolean;
        assetProcessing: boolean;
        assetInjection: boolean;
        codeGeneration: boolean;
        androidBuild: boolean;
        packaging: boolean;
    };
}
export declare class BuildOrchestrator {
    private readonly templateProcessor;
    private readonly assetPipeline;
    private readonly BUILD_STORAGE_PATH;
    private readonly TEMP_BUILD_PATH;
    constructor();
    private ensureDirectories;
    executeBuild(buildConfig: AndroidBuildConfig, options?: BuildOptions): Promise<BuildResult>;
    private processAssetsWithPipeline;
    private generatePartnerCode;
    private generateEnhancedApplicationClass;
    private generateAssetManagerClass;
    private executeAndroidBuild;
    private packageBuildArtifacts;
    private generateMainActivity;
    private generateEKYCActivity;
    private generateBiometricActivity;
    private sanitizeName;
    private generatePartnerId;
}
//# sourceMappingURL=BuildOrchestrator.d.ts.map