export interface AndroidBuildConfig {
    buildId: string;
    partnerConfig: {
        appName: string;
        packageName: string;
        version: string;
        description?: string;
        branding: {
            primaryColor: string;
            secondaryColor: string;
            logo?: string;
            splashScreen?: string;
        };
        features: {
            [key: string]: boolean;
        };
    };
    buildType: 'debug' | 'release';
    assets: Array<{
        filename: string;
        originalName: string;
        path: string;
        mimetype: string;
    }>;
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
    error?: string;
    buildDuration: number;
}
export declare class AndroidBuildService {
    private readonly BUILD_DIR;
    private readonly TEMP_DIR;
    private readonly TEMPLATE_DIR;
    private readonly DOCKER_IMAGE;
    constructor();
    private ensureDirectories;
    buildAndroidApp(config: AndroidBuildConfig): Promise<BuildResult>;
    private prepareBuildDirectory;
    private createBasicAndroidProject;
    private processTemplate;
    private processAssets;
    private executeAndroidBuild;
    private packageArtifacts;
    private updateBuildProgress;
}
//# sourceMappingURL=AndroidBuildService.d.ts.map