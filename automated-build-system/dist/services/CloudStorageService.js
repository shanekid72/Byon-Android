"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudStorageService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const storage_blob_1 = require("@azure/storage-blob");
const storage_1 = require("@google-cloud/storage");
const events_1 = require("events");
const logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
    error: (msg, error) => console.error(`[ERROR] ${msg}`, error || ''),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
    debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta || '')
};
class CloudStorageService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.healthStatus = new Map();
        this.lastHealthCheck = new Map();
        this.initializeCloudClients();
        this.startHealthChecks();
    }
    initializeCloudClients() {
        logger.info('Initializing cloud storage clients');
        try {
            if (this.config.aws) {
                this.s3Client = new client_s3_1.S3Client({
                    region: this.config.aws.region,
                    credentials: {
                        accessKeyId: this.config.aws.accessKeyId,
                        secretAccessKey: this.config.aws.secretAccessKey
                    }
                });
                this.healthStatus.set('aws', true);
                logger.info('AWS S3 client initialized');
            }
            if (this.config.azure) {
                const credential = new storage_blob_1.StorageSharedKeyCredential(this.config.azure.accountName, this.config.azure.accountKey);
                this.azureBlobClient = new storage_blob_1.BlobServiceClient(`https://${this.config.azure.accountName}.blob.core.windows.net`, credential);
                this.healthStatus.set('azure', true);
                logger.info('Azure Blob Storage client initialized');
            }
            if (this.config.gcp) {
                this.gcpStorage = new storage_1.Storage({
                    projectId: this.config.gcp.projectId,
                    keyFilename: this.config.gcp.keyFilename
                });
                this.healthStatus.set('gcp', true);
                logger.info('Google Cloud Storage client initialized');
            }
        }
        catch (error) {
            logger.error('Failed to initialize cloud clients:', error);
            throw error;
        }
    }
    async uploadFile(key, buffer, contentType = 'application/octet-stream', metadata = {}) {
        logger.info(`Uploading file: ${key}`);
        try {
            let processedBuffer = buffer;
            if (this.config.compressionEnabled) {
                processedBuffer = await this.compressBuffer(buffer);
            }
            if (this.config.encryptionEnabled) {
                processedBuffer = await this.encryptBuffer(processedBuffer);
            }
            const primaryResult = await this.uploadToPrimary(key, processedBuffer, contentType, metadata);
            const replicas = [];
            if (this.config.enableMultiCloud && this.config.replicationFactor > 1) {
                const replicationResults = await this.replicateToSecondary(key, processedBuffer, contentType, metadata);
                replicas.push(...replicationResults);
            }
            const cdnUrl = this.config.enableCDN ? this.generateCDNUrl(key, this.config.primaryProvider) : undefined;
            const result = {
                key,
                url: primaryResult.url,
                cdnUrl,
                metadata: {
                    size: processedBuffer.length,
                    contentType,
                    etag: primaryResult.etag,
                    lastModified: new Date(),
                    provider: this.config.primaryProvider,
                    region: 'global',
                    cdn: cdnUrl,
                    compressed: this.config.compressionEnabled,
                    encrypted: this.config.encryptionEnabled
                },
                replicas
            };
            this.emit('fileUploaded', result);
            logger.info(`File uploaded successfully: ${key}`);
            return result;
        }
        catch (error) {
            logger.error(`Failed to upload file ${key}:`, error);
            throw error;
        }
    }
    async downloadFile(key, options = {}) {
        logger.info(`Downloading file: ${key}`);
        try {
            const provider = options.preferredProvider || this.selectOptimalProvider(options.preferredRegion);
            let buffer;
            if (options.useCDN && this.config.enableCDN) {
                try {
                    buffer = await this.downloadFromCDN(key, provider);
                    logger.debug(`File downloaded from CDN: ${key}`);
                }
                catch (error) {
                    logger.warn(`CDN download failed, falling back to origin: ${key}`);
                    buffer = await this.downloadFromProvider(key, provider);
                }
            }
            else {
                buffer = await this.downloadFromProvider(key, provider);
            }
            if (this.config.encryptionEnabled) {
                buffer = await this.decryptBuffer(buffer);
            }
            if (this.config.compressionEnabled) {
                buffer = await this.decompressBuffer(buffer);
            }
            this.emit('fileDownloaded', { key, provider, size: buffer.length });
            logger.info(`File downloaded successfully: ${key}`);
            return buffer;
        }
        catch (error) {
            logger.error(`Failed to download file ${key}:`, error);
            if (this.config.enableAutoFailover) {
                return this.downloadWithFailover(key, options);
            }
            throw error;
        }
    }
    async deleteFile(key) {
        logger.info(`Deleting file: ${key}`);
        const promises = [];
        if (this.s3Client && this.config.aws) {
            promises.push(this.deleteFromAWS(key));
        }
        if (this.azureBlobClient && this.config.azure) {
            promises.push(this.deleteFromAzure(key));
        }
        if (this.gcpStorage && this.config.gcp) {
            promises.push(this.deleteFromGCP(key));
        }
        try {
            await Promise.all(promises);
            this.emit('fileDeleted', { key });
            logger.info(`File deleted successfully: ${key}`);
        }
        catch (error) {
            logger.error(`Failed to delete file ${key}:`, error);
            throw error;
        }
    }
    async listFiles(prefix, maxKeys = 1000) {
        try {
            const provider = this.config.primaryProvider;
            switch (provider) {
                case 'aws':
                    return this.listFromAWS(prefix, maxKeys);
                case 'azure':
                    return this.listFromAzure(prefix, maxKeys);
                case 'gcp':
                    return this.listFromGCP(prefix, maxKeys);
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }
        }
        catch (error) {
            logger.error('Failed to list files:', error);
            throw error;
        }
    }
    async getSignedUrl(key, operation, expiresIn = 3600) {
        try {
            const provider = this.config.primaryProvider;
            switch (provider) {
                case 'aws':
                    return this.getAWSSignedUrl(key, operation, expiresIn);
                case 'azure':
                    return this.getAzureSignedUrl(key, operation, expiresIn);
                case 'gcp':
                    return this.getGCPSignedUrl(key, operation, expiresIn);
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }
        }
        catch (error) {
            logger.error(`Failed to generate signed URL for ${key}:`, error);
            throw error;
        }
    }
    async uploadToPrimary(key, buffer, contentType, metadata) {
        switch (this.config.primaryProvider) {
            case 'aws':
                return this.uploadToAWS(key, buffer, contentType, metadata);
            case 'azure':
                return this.uploadToAzure(key, buffer, contentType, metadata);
            case 'gcp':
                return this.uploadToGCP(key, buffer, contentType, metadata);
            default:
                throw new Error(`Unsupported primary provider: ${this.config.primaryProvider}`);
        }
    }
    async uploadToAWS(key, buffer, contentType, metadata) {
        if (!this.s3Client || !this.config.aws) {
            throw new Error('AWS S3 client not initialized');
        }
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.config.aws.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            Metadata: metadata
        });
        const result = await this.s3Client.send(command);
        return {
            url: `https://${this.config.aws.bucket}.s3.${this.config.aws.region}.amazonaws.com/${key}`,
            etag: result.ETag || ''
        };
    }
    async downloadFromAWS(key) {
        if (!this.s3Client || !this.config.aws) {
            throw new Error('AWS S3 client not initialized');
        }
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.config.aws.bucket,
            Key: key
        });
        const result = await this.s3Client.send(command);
        const chunks = [];
        if (result.Body) {
            const stream = result.Body;
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
        }
        return Buffer.concat(chunks);
    }
    async deleteFromAWS(key) {
        if (!this.s3Client || !this.config.aws)
            return;
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: this.config.aws.bucket,
            Key: key
        });
        await this.s3Client.send(command);
    }
    async listFromAWS(prefix, maxKeys = 1000) {
        if (!this.s3Client || !this.config.aws) {
            throw new Error('AWS S3 client not initialized');
        }
        const command = new client_s3_1.ListObjectsV2Command({
            Bucket: this.config.aws.bucket,
            Prefix: prefix,
            MaxKeys: maxKeys
        });
        const result = await this.s3Client.send(command);
        return (result.Contents || []).map(obj => ({
            key: obj.Key || '',
            metadata: {
                size: obj.Size || 0,
                contentType: 'application/octet-stream',
                etag: obj.ETag || '',
                lastModified: obj.LastModified || new Date(),
                provider: 'aws',
                region: 'global'
            }
        }));
    }
    async getAWSSignedUrl(key, operation, expiresIn) {
        return `https://${this.config.aws?.bucket}.s3.amazonaws.com/${key}?signed=true`;
    }
    async uploadToAzure(key, buffer, contentType, metadata) {
        if (!this.azureBlobClient || !this.config.azure) {
            throw new Error('Azure Blob client not initialized');
        }
        const containerClient = this.azureBlobClient.getContainerClient(this.config.azure.containerName);
        const blobClient = containerClient.getBlockBlobClient(key);
        await blobClient.upload(buffer, buffer.length, {
            blobHTTPHeaders: { blobContentType: contentType },
            metadata
        });
        return {
            url: blobClient.url,
            etag: 'azure-etag'
        };
    }
    async downloadFromAzure(key) {
        if (!this.azureBlobClient || !this.config.azure) {
            throw new Error('Azure Blob client not initialized');
        }
        const containerClient = this.azureBlobClient.getContainerClient(this.config.azure.containerName);
        const blobClient = containerClient.getBlockBlobClient(key);
        const response = await blobClient.download();
        const chunks = [];
        if (response.readableStreamBody) {
            for await (const chunk of response.readableStreamBody) {
                chunks.push(chunk);
            }
        }
        return Buffer.concat(chunks);
    }
    async deleteFromAzure(key) {
        if (!this.azureBlobClient || !this.config.azure)
            return;
        const containerClient = this.azureBlobClient.getContainerClient(this.config.azure.containerName);
        const blobClient = containerClient.getBlockBlobClient(key);
        await blobClient.delete();
    }
    async listFromAzure(prefix, maxKeys = 1000) {
        if (!this.azureBlobClient || !this.config.azure) {
            throw new Error('Azure Blob client not initialized');
        }
        const containerClient = this.azureBlobClient.getContainerClient(this.config.azure.containerName);
        const blobs = [];
        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
            if (blobs.length >= maxKeys)
                break;
            blobs.push({
                key: blob.name,
                metadata: {
                    size: blob.properties.contentLength || 0,
                    contentType: blob.properties.contentType || 'application/octet-stream',
                    etag: blob.properties.etag || '',
                    lastModified: blob.properties.lastModified || new Date(),
                    provider: 'azure',
                    region: 'global'
                }
            });
        }
        return blobs;
    }
    async getAzureSignedUrl(key, operation, expiresIn) {
        return `https://${this.config.azure?.accountName}.blob.core.windows.net/${this.config.azure?.containerName}/${key}?signed=true`;
    }
    async uploadToGCP(key, buffer, contentType, metadata) {
        if (!this.gcpStorage || !this.config.gcp) {
            throw new Error('Google Cloud Storage client not initialized');
        }
        const bucket = this.gcpStorage.bucket(this.config.gcp.bucket);
        const file = bucket.file(key);
        await file.save(buffer, {
            metadata: {
                contentType,
                metadata
            }
        });
        return {
            url: `https://storage.googleapis.com/${this.config.gcp.bucket}/${key}`,
            etag: 'gcp-etag'
        };
    }
    async downloadFromGCP(key) {
        if (!this.gcpStorage || !this.config.gcp) {
            throw new Error('Google Cloud Storage client not initialized');
        }
        const bucket = this.gcpStorage.bucket(this.config.gcp.bucket);
        const file = bucket.file(key);
        const [buffer] = await file.download();
        return buffer;
    }
    async deleteFromGCP(key) {
        if (!this.gcpStorage || !this.config.gcp)
            return;
        const bucket = this.gcpStorage.bucket(this.config.gcp.bucket);
        const file = bucket.file(key);
        await file.delete();
    }
    async listFromGCP(prefix, maxKeys = 1000) {
        if (!this.gcpStorage || !this.config.gcp) {
            throw new Error('Google Cloud Storage client not initialized');
        }
        const bucket = this.gcpStorage.bucket(this.config.gcp.bucket);
        const [files] = await bucket.getFiles({ prefix, maxResults: maxKeys });
        return files.map(file => ({
            key: file.name,
            metadata: {
                size: parseInt(file.metadata.size || '0'),
                contentType: file.metadata.contentType || 'application/octet-stream',
                etag: file.metadata.etag || '',
                lastModified: new Date(file.metadata.timeCreated || Date.now()),
                provider: 'gcp',
                region: 'global'
            }
        }));
    }
    async getGCPSignedUrl(key, operation, expiresIn) {
        return `https://storage.googleapis.com/${this.config.gcp?.bucket}/${key}?signed=true`;
    }
    async replicateToSecondary(key, buffer, contentType, metadata) {
        const replicas = [];
        const providers = ['aws', 'azure', 'gcp'].filter(p => p !== this.config.primaryProvider);
        for (const provider of providers.slice(0, this.config.replicationFactor - 1)) {
            try {
                let result;
                switch (provider) {
                    case 'aws':
                        if (this.s3Client && this.config.aws) {
                            result = await this.uploadToAWS(key, buffer, contentType, metadata);
                            replicas.push({ provider, region: 'global', url: result.url });
                        }
                        break;
                    case 'azure':
                        if (this.azureBlobClient && this.config.azure) {
                            result = await this.uploadToAzure(key, buffer, contentType, metadata);
                            replicas.push({ provider, region: 'global', url: result.url });
                        }
                        break;
                    case 'gcp':
                        if (this.gcpStorage && this.config.gcp) {
                            result = await this.uploadToGCP(key, buffer, contentType, metadata);
                            replicas.push({ provider, region: 'global', url: result.url });
                        }
                        break;
                }
            }
            catch (error) {
                logger.warn(`Failed to replicate to ${provider}:`, error);
            }
        }
        return replicas;
    }
    selectOptimalProvider(preferredRegion) {
        const healthyProviders = Array.from(this.healthStatus.entries())
            .filter(([_, healthy]) => healthy)
            .map(([provider]) => provider);
        if (healthyProviders.includes(this.config.primaryProvider)) {
            return this.config.primaryProvider;
        }
        return healthyProviders[0] || this.config.primaryProvider;
    }
    async downloadFromProvider(key, provider) {
        switch (provider) {
            case 'aws':
                return this.downloadFromAWS(key);
            case 'azure':
                return this.downloadFromAzure(key);
            case 'gcp':
                return this.downloadFromGCP(key);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }
    async downloadFromCDN(key, provider) {
        const cdnUrl = this.generateCDNUrl(key, provider);
        if (!cdnUrl)
            throw new Error('CDN not configured');
        const response = await fetch(cdnUrl);
        if (!response.ok)
            throw new Error(`CDN download failed: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
    async downloadWithFailover(key, options) {
        const providers = ['aws', 'azure', 'gcp'];
        for (const provider of providers) {
            if (this.healthStatus.get(provider)) {
                try {
                    return await this.downloadFromProvider(key, provider);
                }
                catch (error) {
                    logger.warn(`Failover attempt failed for ${provider}:`, error);
                }
            }
        }
        throw new Error('All providers failed during failover');
    }
    generateCDNUrl(key, provider) {
        switch (provider) {
            case 'aws':
                return this.config.aws?.cloudfrontDistribution
                    ? `https://${this.config.aws.cloudfrontDistribution}.cloudfront.net/${key}`
                    : undefined;
            case 'azure':
                return this.config.azure?.cdnEndpoint
                    ? `${this.config.azure.cdnEndpoint}/${key}`
                    : undefined;
            case 'gcp':
                return this.config.gcp?.cdnUrl
                    ? `${this.config.gcp.cdnUrl}/${key}`
                    : undefined;
            default:
                return undefined;
        }
    }
    async compressBuffer(buffer) {
        return buffer;
    }
    async decompressBuffer(buffer) {
        return buffer;
    }
    async encryptBuffer(buffer) {
        return buffer;
    }
    async decryptBuffer(buffer) {
        return buffer;
    }
    startHealthChecks() {
        setInterval(async () => {
            await this.performHealthChecks();
        }, 60000);
    }
    async performHealthChecks() {
        const providers = ['aws', 'azure', 'gcp'];
        for (const provider of providers) {
            try {
                await this.checkProviderHealth(provider);
                this.healthStatus.set(provider, true);
                this.lastHealthCheck.set(provider, new Date());
            }
            catch (error) {
                this.healthStatus.set(provider, false);
                logger.warn(`Health check failed for ${provider}:`, error);
            }
        }
    }
    async checkProviderHealth(provider) {
        switch (provider) {
            case 'aws':
                if (this.s3Client && this.config.aws) {
                    await this.listFromAWS(undefined, 1);
                }
                break;
            case 'azure':
                if (this.azureBlobClient && this.config.azure) {
                    await this.listFromAzure(undefined, 1);
                }
                break;
            case 'gcp':
                if (this.gcpStorage && this.config.gcp) {
                    await this.listFromGCP(undefined, 1);
                }
                break;
        }
    }
    getStatus() {
        return {
            config: {
                primaryProvider: this.config.primaryProvider,
                enableMultiCloud: this.config.enableMultiCloud,
                enableCDN: this.config.enableCDN,
                replicationFactor: this.config.replicationFactor
            },
            health: Object.fromEntries(this.healthStatus),
            lastHealthCheck: Object.fromEntries(Array.from(this.lastHealthCheck.entries()).map(([k, v]) => [k, v.toISOString()]))
        };
    }
}
exports.CloudStorageService = CloudStorageService;
exports.default = CloudStorageService;
//# sourceMappingURL=CloudStorageService.js.map