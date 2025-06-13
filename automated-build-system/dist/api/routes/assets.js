"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const uuid_1 = require("uuid");
const sharp_1 = __importDefault(require("sharp"));
const AssetProcessor_1 = require("../../services/AssetProcessor");
const error_middleware_1 = require("../middleware/error.middleware");
const temp_utils_1 = require("../../utils/temp-utils");
const router = (0, express_1.Router)();
exports.assetRoutes = router;
const assetProcessor = new AssetProcessor_1.AssetProcessor();
const UPLOAD_DIR = './storage/uploads/assets';
const PROCESSED_DIR = './storage/processed-assets';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
fs_extra_1.default.ensureDirSync(UPLOAD_DIR);
fs_extra_1.default.ensureDirSync(PROCESSED_DIR);
const storage = multer_1.default.diskStorage({
    destination: (req, _file, cb) => {
        const partnerId = req.params.partnerId || 'default';
        const partnerDir = path_1.default.join(UPLOAD_DIR, partnerId);
        fs_extra_1.default.ensureDirSync(partnerDir);
        cb(null, partnerDir);
    },
    filename: (_req, file, cb) => {
        const assetId = (0, uuid_1.v4)();
        const extension = path_1.default.extname(file.originalname).toLowerCase();
        const filename = `${assetId}_${Date.now()}${extension}`;
        cb(null, filename);
    }
});
const fileFilter = (_req, file, cb) => {
    const extension = path_1.default.extname(file.originalname).toLowerCase().slice(1);
    if (ALLOWED_FORMATS.includes(extension)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Invalid file format. Allowed formats: ${ALLOWED_FORMATS.join(', ')}`));
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 10
    }
});
const assetMetadataStore = new Map();
router.post('/:partnerId/upload', upload.single('asset'), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { partnerId } = req.params;
    const { type = 'custom', description } = req.body;
    const file = req.file;
    if (!file) {
        res.status(400).json({
            success: false,
            error: 'No file provided'
        });
        return;
    }
    try {
        const validation = await assetProcessor.validateAsset(file.path);
        if (!validation.valid) {
            await fs_extra_1.default.remove(file.path);
            res.status(400).json({
                success: false,
                error: 'Invalid asset',
                details: validation.errors
            });
            return;
        }
        const imageInfo = await getImageMetadata(file.path);
        const assetMetadata = {
            id: (0, uuid_1.v4)(),
            partnerId,
            type,
            originalName: file.originalname,
            filename: file.filename,
            filepath: file.path,
            size: file.size,
            mimeType: file.mimetype,
            format: path_1.default.extname(file.originalname).toLowerCase().slice(1),
            uploadedAt: new Date(),
            status: 'uploaded',
            metadata: {
                description,
                colorSpace: imageInfo?.colorSpace,
                hasAlpha: imageInfo?.hasAlpha
            }
        };
        if (imageInfo) {
            assetMetadata.dimensions = { width: imageInfo.width, height: imageInfo.height };
        }
        assetMetadataStore.set(assetMetadata.id, assetMetadata);
        temp_utils_1.logger.info('Asset uploaded successfully', {
            assetId: assetMetadata.id,
            partnerId,
            filename: file.originalname
        });
        res.status(201).json({
            success: true,
            data: {
                assetId: assetMetadata.id,
                partnerId,
                type: assetMetadata.type,
                originalName: assetMetadata.originalName,
                size: assetMetadata.size,
                format: assetMetadata.format,
                dimensions: assetMetadata.dimensions,
                uploadedAt: assetMetadata.uploadedAt,
                status: assetMetadata.status
            },
            message: 'Asset uploaded successfully'
        });
    }
    catch (error) {
        if (file?.path) {
            await fs_extra_1.default.remove(file.path).catch(() => { });
        }
        temp_utils_1.logger.error('Asset upload failed:', error);
        throw error;
    }
}));
router.post('/:partnerId/upload-multiple', upload.array('assets', 10), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { partnerId } = req.params;
    const { types = [], descriptions = [] } = req.body;
    const files = req.files;
    if (!files || files.length === 0) {
        res.status(400).json({
            success: false,
            error: 'No files provided'
        });
        return;
    }
    const uploadResults = [];
    const failedUploads = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const type = types[i] || 'custom';
        const description = descriptions[i] || '';
        try {
            const validation = await assetProcessor.validateAsset(file.path);
            if (!validation.valid) {
                await fs_extra_1.default.remove(file.path);
                failedUploads.push({
                    filename: file.originalname,
                    error: 'Invalid asset',
                    details: validation.errors
                });
                continue;
            }
            const imageInfo = await getImageMetadata(file.path);
            const assetMetadata = {
                id: (0, uuid_1.v4)(),
                partnerId,
                type,
                originalName: file.originalname,
                filename: file.filename,
                filepath: file.path,
                size: file.size,
                mimeType: file.mimetype,
                format: path_1.default.extname(file.originalname).toLowerCase().slice(1),
                uploadedAt: new Date(),
                status: 'uploaded',
                metadata: {
                    description,
                    colorSpace: imageInfo?.colorSpace,
                    hasAlpha: imageInfo?.hasAlpha
                }
            };
            if (imageInfo) {
                assetMetadata.dimensions = { width: imageInfo.width, height: imageInfo.height };
            }
            assetMetadataStore.set(assetMetadata.id, assetMetadata);
            uploadResults.push({
                assetId: assetMetadata.id,
                originalName: assetMetadata.originalName,
                size: assetMetadata.size,
                format: assetMetadata.format,
                dimensions: assetMetadata.dimensions,
                status: 'uploaded'
            });
        }
        catch (error) {
            await fs_extra_1.default.remove(file.path).catch(() => { });
            failedUploads.push({
                filename: file.originalname,
                error: error instanceof Error ? error.message : 'Upload failed'
            });
        }
    }
    temp_utils_1.logger.info('Multiple assets upload completed', {
        partnerId,
        successful: uploadResults.length,
        failed: failedUploads.length
    });
    res.status(201).json({
        success: true,
        data: {
            partnerId,
            uploadedAssets: uploadResults,
            failedUploads,
            summary: {
                total: files.length,
                successful: uploadResults.length,
                failed: failedUploads.length
            }
        },
        message: `${uploadResults.length} assets uploaded successfully`
    });
}));
router.post('/:partnerId/assets/:assetId/process', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { partnerId, assetId } = req.params;
    const { processingOptions = {} } = req.body;
    const assetMetadata = assetMetadataStore.get(assetId);
    if (!assetMetadata || assetMetadata.partnerId !== partnerId) {
        res.status(404).json({
            success: false,
            error: 'Asset not found'
        });
        return;
    }
    if (assetMetadata.status === 'processing') {
        res.status(409).json({
            success: false,
            error: 'Asset is already being processed'
        });
        return;
    }
    try {
        assetMetadata.status = 'processing';
        assetMetadataStore.set(assetId, assetMetadata);
        let processedAssets = [];
        if (assetMetadata.type === 'logo') {
            processedAssets = await processLogoAsset(assetMetadata);
        }
        else if (assetMetadata.type === 'splash') {
            processedAssets = await processSplashAsset(assetMetadata);
        }
        else if (assetMetadata.type === 'icon') {
            processedAssets = await processIconAsset(assetMetadata);
        }
        else {
            processedAssets = await processGenericAsset(assetMetadata);
        }
        assetMetadata.status = 'processed';
        assetMetadata.processedAt = new Date();
        assetMetadata.processedAssets = processedAssets;
        assetMetadataStore.set(assetId, assetMetadata);
        temp_utils_1.logger.info('Asset processed successfully', { assetId, partnerId, type: assetMetadata.type });
        res.status(200).json({
            success: true,
            data: {
                assetId,
                partnerId,
                originalName: assetMetadata.originalName,
                type: assetMetadata.type,
                status: assetMetadata.status,
                processedAt: assetMetadata.processedAt,
                processedAssets: processedAssets.map(asset => ({
                    density: asset.density,
                    size: asset.size,
                    format: asset.format,
                    outputPath: asset.outputPath.replace(PROCESSED_DIR, '')
                }))
            },
            message: 'Asset processed successfully'
        });
    }
    catch (error) {
        assetMetadata.status = 'failed';
        assetMetadataStore.set(assetId, assetMetadata);
        temp_utils_1.logger.error('Asset processing failed:', error);
        throw error;
    }
}));
router.get('/:partnerId/assets/:assetId', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { partnerId, assetId } = req.params;
    const assetMetadata = assetMetadataStore.get(assetId);
    if (!assetMetadata || assetMetadata.partnerId !== partnerId) {
        res.status(404).json({
            success: false,
            error: 'Asset not found'
        });
        return;
    }
    res.status(200).json({
        success: true,
        data: {
            ...assetMetadata,
            filepath: undefined,
            processedAssets: assetMetadata.processedAssets?.map(asset => ({
                ...asset,
                outputPath: asset.outputPath?.replace(PROCESSED_DIR, '')
            }))
        }
    });
}));
router.get('/:partnerId/assets', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { partnerId } = req.params;
    const { type, status, limit = 20, offset = 0 } = req.query;
    const partnerAssets = Array.from(assetMetadataStore.values())
        .filter(asset => {
        if (asset.partnerId !== partnerId)
            return false;
        if (type && asset.type !== type)
            return false;
        if (status && asset.status !== status)
            return false;
        return true;
    })
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    const total = partnerAssets.length;
    const paginatedAssets = partnerAssets.slice(Number(offset), Number(offset) + Number(limit));
    res.status(200).json({
        success: true,
        data: {
            partnerId,
            assets: paginatedAssets.map(asset => ({
                id: asset.id,
                type: asset.type,
                originalName: asset.originalName,
                size: asset.size,
                format: asset.format,
                dimensions: asset.dimensions,
                uploadedAt: asset.uploadedAt,
                status: asset.status,
                processedAt: asset.processedAt
            })),
            pagination: {
                total,
                limit: Number(limit),
                offset: Number(offset),
                hasMore: Number(offset) + Number(limit) < total
            }
        }
    });
}));
router.delete('/:partnerId/assets/:assetId', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { partnerId, assetId } = req.params;
    const assetMetadata = assetMetadataStore.get(assetId);
    if (!assetMetadata || assetMetadata.partnerId !== partnerId) {
        res.status(404).json({
            success: false,
            error: 'Asset not found'
        });
        return;
    }
    try {
        if (await fs_extra_1.default.pathExists(assetMetadata.filepath)) {
            await fs_extra_1.default.remove(assetMetadata.filepath);
        }
        if (assetMetadata.processedAssets) {
            for (const processedAsset of assetMetadata.processedAssets) {
                if (processedAsset.outputPath && await fs_extra_1.default.pathExists(processedAsset.outputPath)) {
                    await fs_extra_1.default.remove(processedAsset.outputPath);
                }
            }
        }
        assetMetadataStore.delete(assetId);
        temp_utils_1.logger.info('Asset deleted successfully', { assetId, partnerId });
        res.status(200).json({
            success: true,
            message: 'Asset deleted successfully'
        });
    }
    catch (error) {
        temp_utils_1.logger.error('Asset deletion failed:', error);
        throw error;
    }
}));
router.get('/:partnerId/assets/:assetId/download/:density?', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { partnerId, assetId, density } = req.params;
    const assetMetadata = assetMetadataStore.get(assetId);
    if (!assetMetadata || assetMetadata.partnerId !== partnerId) {
        res.status(404).json({
            success: false,
            error: 'Asset not found'
        });
        return;
    }
    if (assetMetadata.status !== 'processed') {
        res.status(400).json({
            success: false,
            error: 'Asset not processed yet'
        });
        return;
    }
    try {
        let assetToDownload = assetMetadata.processedAssets?.[0];
        if (density && assetMetadata.processedAssets) {
            const specificAsset = assetMetadata.processedAssets.find(asset => asset.density === density);
            if (specificAsset) {
                assetToDownload = specificAsset;
            }
        }
        if (!assetToDownload || !await fs_extra_1.default.pathExists(assetToDownload.outputPath)) {
            res.status(404).json({
                success: false,
                error: 'Processed asset file not found'
            });
            return;
        }
        const filename = path_1.default.basename(assetToDownload.outputPath);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', `image/${assetToDownload.format}`);
        const fileStream = fs_extra_1.default.createReadStream(assetToDownload.outputPath);
        fileStream.pipe(res);
    }
    catch (error) {
        temp_utils_1.logger.error('Asset download failed:', error);
        throw error;
    }
}));
async function getImageMetadata(imagePath) {
    try {
        const metadata = await (0, sharp_1.default)(imagePath).metadata();
        return {
            width: metadata.width || 0,
            height: metadata.height || 0,
            format: metadata.format || 'unknown',
            hasAlpha: metadata.hasAlpha || false,
            colorSpace: metadata.space || undefined
        };
    }
    catch (error) {
        temp_utils_1.logger.error('Failed to get image metadata:', error);
        return null;
    }
}
async function processLogoAsset(assetMetadata) {
    const outputDir = path_1.default.join(PROCESSED_DIR, assetMetadata.partnerId, 'logos');
    await fs_extra_1.default.ensureDir(outputDir);
    const processedAssets = [];
    const densities = [
        { name: 'mdpi', size: 48 },
        { name: 'hdpi', size: 72 },
        { name: 'xhdpi', size: 96 },
        { name: 'xxhdpi', size: 144 },
        { name: 'xxxhdpi', size: 192 }
    ];
    for (const density of densities) {
        const outputPath = path_1.default.join(outputDir, `logo_${density.name}.png`);
        await (0, sharp_1.default)(assetMetadata.filepath)
            .resize(density.size, density.size, { fit: 'contain', background: 'transparent' })
            .png({ quality: 90, compressionLevel: 9 })
            .toFile(outputPath);
        const stats = await fs_extra_1.default.stat(outputPath);
        processedAssets.push({
            type: 'logo',
            density: density.name,
            size: { width: density.size, height: density.size },
            fileSize: stats.size,
            format: 'png',
            outputPath
        });
    }
    return processedAssets;
}
async function processSplashAsset(assetMetadata) {
    const outputDir = path_1.default.join(PROCESSED_DIR, assetMetadata.partnerId, 'splash');
    await fs_extra_1.default.ensureDir(outputDir);
    const outputPath = path_1.default.join(outputDir, 'splash_background.png');
    await (0, sharp_1.default)(assetMetadata.filepath)
        .resize(1080, 1920, { fit: 'cover' })
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outputPath);
    const stats = await fs_extra_1.default.stat(outputPath);
    return [{
            type: 'splash',
            size: { width: 1080, height: 1920 },
            fileSize: stats.size,
            format: 'png',
            outputPath
        }];
}
async function processIconAsset(assetMetadata) {
    const outputDir = path_1.default.join(PROCESSED_DIR, assetMetadata.partnerId, 'icons');
    await fs_extra_1.default.ensureDir(outputDir);
    const processedAssets = [];
    const sizes = [24, 32, 48, 64, 128, 256];
    for (const size of sizes) {
        const outputPath = path_1.default.join(outputDir, `icon_${size}x${size}.png`);
        await (0, sharp_1.default)(assetMetadata.filepath)
            .resize(size, size, { fit: 'contain', background: 'transparent' })
            .png({ quality: 90, compressionLevel: 9 })
            .toFile(outputPath);
        const stats = await fs_extra_1.default.stat(outputPath);
        processedAssets.push({
            type: 'icon',
            size: { width: size, height: size },
            fileSize: stats.size,
            format: 'png',
            outputPath
        });
    }
    return processedAssets;
}
async function processGenericAsset(assetMetadata) {
    const outputDir = path_1.default.join(PROCESSED_DIR, assetMetadata.partnerId, 'custom');
    await fs_extra_1.default.ensureDir(outputDir);
    const outputPath = path_1.default.join(outputDir, `${path_1.default.parse(assetMetadata.filename).name}_optimized.png`);
    await (0, sharp_1.default)(assetMetadata.filepath)
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outputPath);
    const stats = await fs_extra_1.default.stat(outputPath);
    return [{
            type: 'custom',
            fileSize: stats.size,
            format: 'png',
            outputPath
        }];
}
//# sourceMappingURL=assets.js.map