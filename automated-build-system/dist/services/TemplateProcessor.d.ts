export interface AndroidBuildConfig {
    buildId: string;
    partnerConfig: {
        appName: string;
        packageName: string;
        version: string;
        versionCode: number;
        description?: string;
        branding: {
            primaryColor: string;
            secondaryColor: string;
            backgroundColor?: string;
            textColor?: string;
            logo?: string;
            splashScreen?: string;
            supportDarkMode?: boolean;
            darkModeColors?: {
                primaryColor: string;
                backgroundColor: string;
                surfaceColor: string;
                textColor: string;
                textColorSecondary: string;
            };
        };
        features: {
            [key: string]: boolean;
        };
        api: {
            baseUrl: string;
            prodBaseUrl: string;
            devBaseUrl: string;
            apiKey: string;
            environment: string;
        };
        deepLinking?: {
            scheme: string;
            host: string;
        };
        signing?: {
            keystorePath: string;
            keystorePassword: string;
            keyAlias: string;
            keyPassword: string;
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
export declare class TemplateProcessor {
    private readonly TEMPLATE_DIR;
    private readonly LULUPAY_SDK_VERSION;
    constructor();
    private ensureTemplateDirectory;
    processAndroidTemplate(buildPath: string, config: AndroidBuildConfig): Promise<void>;
    private createTemplateContext;
    private copyTemplateFiles;
    private processTemplateFiles;
    private findTemplateFiles;
    private processTemplateFile;
    private processTemplate;
    private processConditionalBlocks;
    private createPackageDirectories;
    private generateAdditionalFiles;
    private generateGradleWrapper;
    private generateProguardRules;
    private generateNetworkSecurityConfig;
    private sanitizeName;
    private generatePartnerId;
    private calculateColors;
    private darkenColor;
    private lightenColor;
    private addAlpha;
    private getContrastColor;
}
//# sourceMappingURL=TemplateProcessor.d.ts.map