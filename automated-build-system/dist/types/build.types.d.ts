export interface PartnerConfig {
    id?: string;
    name: string;
    companyName: string;
    email: string;
    phone: string;
    website?: string;
    branding: BrandingConfig;
    appConfig: AppConfig;
    features: FeatureConfig;
    apiConfig: ApiConfig;
    createdAt?: Date;
    updatedAt?: Date;
    status: 'draft' | 'generating' | 'ready' | 'deployed';
}
export interface BrandingConfig {
    logo?: string;
    logoUrl?: string;
    icon?: string;
    iconUrl?: string;
    splashScreen?: string;
    splashScreenUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    screenshots: string[];
    appStoreIcon?: string;
    appStoreIconUrl?: string;
}
export interface AppConfig {
    appName: string;
    packageName: string;
    bundleId: string;
    version: string;
    versionCode: number;
    description: string;
    shortDescription: string;
    keywords: string[];
    category: string;
    permissions: Permission[];
    supportedCountries: string[];
    supportedLanguages: string[];
}
export interface FeatureConfig {
    remittance: boolean;
    billPayment: boolean;
    mobileRecharge: boolean;
    cardServices: boolean;
    biometricAuth: boolean;
    pushNotifications: boolean;
    chatSupport: boolean;
    loyaltyProgram: boolean;
    referralProgram: boolean;
    documentUpload: boolean;
    facialVerification: boolean;
    livenessDetection: boolean;
    bankTransfer: boolean;
    cardPayment: boolean;
    digitalWallet: boolean;
    cryptocurrency: boolean;
}
export interface ApiConfig {
    baseUrl: string;
    apiKey: string;
    partnerId: string;
    environment: 'sandbox' | 'production';
    rateLimits: {
        requestsPerMinute: number;
        requestsPerHour: number;
        requestsPerDay: number;
    };
    webhookUrl?: string;
    webhookSecret?: string;
}
export interface Permission {
    name: string;
    description: string;
    required: boolean;
    category: 'security' | 'communication' | 'storage' | 'location' | 'camera' | 'other';
}
export interface BuildRequest {
    id?: string;
    partnerId: string;
    partnerConfig: PartnerConfig;
    priority: number;
    requestedBy: string;
    requestedAt: Date;
    buildType: 'apk' | 'aab' | 'both';
    signedBuild: boolean;
    debugMode: boolean;
}
export interface BuildJob {
    id: string;
    buildRequest: BuildRequest;
    status: BuildStatus;
    progress: number;
    logs: BuildLog[];
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
    result?: BuildResult;
}
/**
 * Build status enum
 */
export declare enum BuildStatus {
    QUEUED = "queued",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export interface BuildConfig {
    partnerId: string;
    partnerName: string;
    appName: string;
    packageName: string;
    primaryColor: string;
    secondaryColor: string;
    logoBase64?: string;
    features?: {
        transactionHistory?: boolean;
        customerSupport?: boolean;
        pushNotifications?: boolean;
        biometricLogin?: boolean;
        multiLanguage?: boolean;
        darkMode?: boolean;
    };
    apiConfig?: {
        baseUrl?: string;
        apiKey?: string;
        timeout?: number;
    };
}
export interface Build {
    id: string;
    partnerId: string;
    config: BuildConfig;
    status: BuildStatus;
    progress: number;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    failureReason?: string;
    downloadUrl?: string;
}
export interface BuildQuery {
    partnerId?: string;
    status?: BuildStatus;
    page?: number;
    limit?: number;
}
export interface BuildLog {
    id: string;
    buildId: string;
    timestamp: Date;
    level: 'info' | 'warning' | 'error' | 'debug';
    message: string;
    details?: any;
    stage: string;
}
export interface BuildResult {
    buildId: string;
    status: 'success' | 'failed';
    artifacts: BuildArtifact[];
    buildTime: number;
    size: number;
    logs: BuildLog[];
    downloadUrls: {
        apk?: string;
        aab?: string;
        mapping?: string;
        logs?: string;
    };
    metadata: {
        compileSdkVersion: string;
        targetSdkVersion: string;
        minSdkVersion: string;
        buildToolsVersion: string;
        gradleVersion: string;
    };
}
export interface BuildArtifact {
    name: string;
    type: 'apk' | 'aab' | 'mapping' | 'logs' | 'resources';
    path: string;
    size: number;
    checksum: string;
    downloadUrl: string;
}
export interface TemplateContext {
    package: {
        name: string;
        path: string;
    };
    app: {
        name: string;
        displayName: string;
        version: string;
        versionCode: number;
        description: string;
    };
    branding: {
        colors: {
            primary: string;
            secondary: string;
            accent: string;
            background: string;
            text: string;
        };
        fonts: {
            primary: string;
        };
    };
    features: FeatureConfig;
    api: {
        baseUrl: string;
        endpoints: Record<string, string>;
    };
    permissions: string[];
    assets: {
        logo: string;
        icon: string;
        splash: string;
        screenshots: string[];
    };
}
export interface ProcessedTemplate {
    sources: GeneratedFile[];
    resources: GeneratedFile[];
    assets: GeneratedFile[];
    manifest: string;
    buildScript: string;
}
export interface GeneratedFile {
    path: string;
    content: string | Buffer;
    type: 'source' | 'resource' | 'asset' | 'config';
}
export interface AssetBundle {
    logo: Buffer;
    icon: Buffer;
    splash?: Buffer;
    screenshots: Buffer[];
    additionalAssets: Record<string, Buffer>;
}
export interface ProcessedAssets {
    icons: IconSet;
    splash: Buffer;
    screenshots: Buffer[];
    optimizedAssets: Record<string, Buffer>;
}
export interface IconSet {
    [key: string]: Buffer;
}
export interface BuildEnvironment {
    dockerImage: string;
    containerName: string;
    workspaceVolume: string;
    outputVolume: string;
    environment: Record<string, string>;
    timeout: number;
}
export interface DockerBuildConfig {
    image: string;
    containerName: string;
    volumes: Array<{
        host: string;
        container: string;
        readonly?: boolean;
    }>;
    environment: Record<string, string>;
    workingDir: string;
    command: string[];
    timeout: number;
}
export interface StorageConfig {
    provider: 'local' | 's3' | 'gcs';
    basePath: string;
    bucketName?: string;
    region?: string;
    credentials?: any;
}
export interface StoredFile {
    id: string;
    name: string;
    path: string;
    size: number;
    mimeType: string;
    checksum: string;
    uploadedAt: Date;
    downloadUrl: string;
    expiresAt?: Date;
}
export interface QueueConfig {
    redis: {
        host: string;
        port: number;
        password?: string;
        db?: number;
    };
    concurrency: number;
    attempts: number;
    backoffType: 'fixed' | 'exponential';
    backoffDelay: number;
}
export interface JobOptions {
    priority: number;
    delay: number;
    attempts: number;
    backoff?: {
        type: 'fixed' | 'exponential';
        delay: number;
    };
    removeOnComplete: number;
    removeOnFail: number;
}
export interface BuildUpdateMessage {
    type: 'build-update';
    buildId: string;
    data: {
        status: BuildStatus;
        progress: number;
        stage: string;
        message: string;
        logs?: BuildLog[];
        error?: string;
    };
}
export interface WebSocketConnection {
    id: string;
    buildId: string;
    socket: any;
    connectedAt: Date;
    lastPing: Date;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    errors?: ValidationError[];
    timestamp: string;
    requestId: string;
}
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
export interface DatabaseConfig {
    mongodb: {
        uri: string;
        dbName: string;
        options: Record<string, any>;
    };
    redis: {
        uri: string;
        options: Record<string, any>;
    };
}
export interface SystemConfig {
    server: {
        port: number;
        host: string;
        corsOrigins: string[];
    };
    database: DatabaseConfig;
    storage: StorageConfig;
    queue: QueueConfig;
    docker: {
        host: string;
        socketPath: string;
        buildImage: string;
        maxConcurrentBuilds: number;
        buildTimeout: number;
    };
    build: {
        maxFileSize: number;
        allowedImageTypes: string[];
        outputFormats: ('apk' | 'aab')[];
        signingEnabled: boolean;
        defaultKeystore: string;
    };
    security: {
        jwtSecret: string;
        jwtExpiry: string;
        bcryptRounds: number;
        rateLimitWindow: number;
        rateLimitMax: number;
    };
    logging: {
        level: string;
        file: string;
        console: boolean;
    };
}
export declare class BuildError extends Error {
    readonly code: string;
    readonly buildId?: string;
    readonly stage?: string;
    readonly details?: any;
    constructor(message: string, code: string, buildId?: string, stage?: string, details?: any);
}
export interface ErrorCode {
    INVALID_CONFIG: 'INVALID_CONFIG';
    TEMPLATE_PROCESSING_FAILED: 'TEMPLATE_PROCESSING_FAILED';
    ASSET_PROCESSING_FAILED: 'ASSET_PROCESSING_FAILED';
    BUILD_FAILED: 'BUILD_FAILED';
    SIGNING_FAILED: 'SIGNING_FAILED';
    STORAGE_FAILED: 'STORAGE_FAILED';
    DOCKER_ERROR: 'DOCKER_ERROR';
    QUEUE_ERROR: 'QUEUE_ERROR';
    TIMEOUT: 'TIMEOUT';
    RESOURCE_LIMIT: 'RESOURCE_LIMIT';
}
//# sourceMappingURL=build.types.d.ts.map