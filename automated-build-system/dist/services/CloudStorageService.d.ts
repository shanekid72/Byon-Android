import { EventEmitter } from 'events';
export type CloudProvider = 'aws' | 'azure' | 'gcp';
export type StorageRegion = 'us-east-1' | 'us-west-2' | 'eu-west-1' | 'ap-southeast-1' | 'global';
export interface CloudStorageConfig {
    primaryProvider: CloudProvider;
    enableMultiCloud: boolean;
    enableCDN: boolean;
    enableGeoDistribution: boolean;
    enableAutoFailover: boolean;
    replicationFactor: number;
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
    aws?: {
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
        bucket: string;
        cloudfrontDistribution?: string;
    };
    azure?: {
        accountName: string;
        accountKey: string;
        containerName: string;
        cdnEndpoint?: string;
    };
    gcp?: {
        projectId: string;
        keyFilename: string;
        bucket: string;
        cdnUrl?: string;
    };
}
export interface StorageMetadata {
    size: number;
    contentType: string;
    etag: string;
    lastModified: Date;
    provider: CloudProvider;
    region: StorageRegion;
    cdn?: string;
    compressed?: boolean;
    encrypted?: boolean;
}
export interface UploadResult {
    key: string;
    url: string;
    cdnUrl?: string;
    metadata: StorageMetadata;
    replicas: Array<{
        provider: CloudProvider;
        region: StorageRegion;
        url: string;
    }>;
}
export interface DownloadOptions {
    preferredProvider?: CloudProvider;
    preferredRegion?: StorageRegion;
    useCDN?: boolean;
    streaming?: boolean;
}
export declare class CloudStorageService extends EventEmitter {
    private config;
    private s3Client?;
    private azureBlobClient?;
    private gcpStorage?;
    private healthStatus;
    private lastHealthCheck;
    constructor(config: CloudStorageConfig);
    private initializeCloudClients;
    uploadFile(key: string, buffer: Buffer, contentType?: string, metadata?: Record<string, string>): Promise<UploadResult>;
    downloadFile(key: string, options?: DownloadOptions): Promise<Buffer>;
    deleteFile(key: string): Promise<void>;
    listFiles(prefix?: string, maxKeys?: number): Promise<Array<{
        key: string;
        metadata: StorageMetadata;
    }>>;
    getSignedUrl(key: string, operation: 'upload' | 'download', expiresIn?: number): Promise<string>;
    private uploadToPrimary;
    private uploadToAWS;
    private downloadFromAWS;
    private deleteFromAWS;
    private listFromAWS;
    private getAWSSignedUrl;
    private uploadToAzure;
    private downloadFromAzure;
    private deleteFromAzure;
    private listFromAzure;
    private getAzureSignedUrl;
    private uploadToGCP;
    private downloadFromGCP;
    private deleteFromGCP;
    private listFromGCP;
    private getGCPSignedUrl;
    private replicateToSecondary;
    private selectOptimalProvider;
    private downloadFromProvider;
    private downloadFromCDN;
    private downloadWithFailover;
    private generateCDNUrl;
    private compressBuffer;
    private decompressBuffer;
    private encryptBuffer;
    private decryptBuffer;
    private startHealthChecks;
    private performHealthChecks;
    private checkProviderHealth;
    getStatus(): {
        config: {
            primaryProvider: CloudProvider;
            enableMultiCloud: boolean;
            enableCDN: boolean;
            replicationFactor: number;
        };
        health: {
            [k: string]: boolean;
        };
        lastHealthCheck: {
            [k: string]: string;
        };
    };
}
export default CloudStorageService;
//# sourceMappingURL=CloudStorageService.d.ts.map