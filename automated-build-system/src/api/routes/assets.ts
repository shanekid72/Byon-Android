import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs-extra'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { AssetProcessor } from '../../services/AssetProcessor'
import { asyncHandler } from '../middleware/error.middleware'
import { logger } from '../../utils/temp-utils'

const router = Router()
const assetProcessor = new AssetProcessor()

// Asset upload configuration
const UPLOAD_DIR = './storage/uploads/assets'
const PROCESSED_DIR = './storage/processed-assets'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'svg']

// Ensure upload directories exist
fs.ensureDirSync(UPLOAD_DIR)
fs.ensureDirSync(PROCESSED_DIR)

// Multer configuration for asset uploads
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const partnerId = req.params.partnerId || 'default'
    const partnerDir = path.join(UPLOAD_DIR, partnerId)
    fs.ensureDirSync(partnerDir)
    cb(null, partnerDir)
  },
  filename: (_req, file, cb) => {
    const assetId = uuidv4()
    const extension = path.extname(file.originalname).toLowerCase()
    const filename = `${assetId}_${Date.now()}${extension}`
    cb(null, filename)
  }
})

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const extension = path.extname(file.originalname).toLowerCase().slice(1)
  
  if (ALLOWED_FORMATS.includes(extension)) {
    cb(null, true)
  } else {
    cb(new Error(`Invalid file format. Allowed formats: ${ALLOWED_FORMATS.join(', ')}`))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10 // Maximum 10 files per upload
  }
})

// Asset metadata interface
interface AssetMetadata {
  id: string
  partnerId: string
  type: 'logo' | 'splash' | 'icon' | 'brand' | 'custom'
  originalName: string
  filename: string
  filepath: string
  size: number
  mimeType: string
  format: string
  dimensions?: { width: number; height: number }
  uploadedAt: Date
  processedAt?: Date
  status: 'uploaded' | 'processing' | 'processed' | 'failed'
  processedAssets?: any[]
  metadata?: any
}

// In-memory storage for asset metadata (in production, use database)
const assetMetadataStore = new Map<string, AssetMetadata>()

/**
 * Upload single asset
 */
router.post('/:partnerId/upload', upload.single('asset'), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { partnerId } = req.params
  const { type = 'custom', description } = req.body
  const file = req.file

  if (!file) {
    res.status(400).json({
      success: false,
      error: 'No file provided'
    })
    return
  }

  try {
    // Validate asset
    const validation = await assetProcessor.validateAsset(file.path)
    if (!validation.valid) {
      // Clean up invalid file
      await fs.remove(file.path)
      res.status(400).json({
        success: false,
        error: 'Invalid asset',
        details: validation.errors
      })
      return
    }

    // Get image metadata
    const imageInfo = await getImageMetadata(file.path)
    
    // Create asset metadata with proper type handling
    const assetMetadata: AssetMetadata = {
      id: uuidv4(),
      partnerId,
      type,
      originalName: file.originalname,
      filename: file.filename,
      filepath: file.path,
      size: file.size,
      mimeType: file.mimetype,
      format: path.extname(file.originalname).toLowerCase().slice(1),
      uploadedAt: new Date(),
      status: 'uploaded',
      metadata: {
        description,
        colorSpace: imageInfo?.colorSpace,
        hasAlpha: imageInfo?.hasAlpha
      }
    }

    // Add dimensions only if imageInfo exists
    if (imageInfo) {
      assetMetadata.dimensions = { width: imageInfo.width, height: imageInfo.height }
    }

    // Store metadata
    assetMetadataStore.set(assetMetadata.id, assetMetadata)

    logger.info('Asset uploaded successfully', { 
      assetId: assetMetadata.id, 
      partnerId, 
      filename: file.originalname 
    })

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
    })

  } catch (error) {
    // Clean up file on error
    if (file?.path) {
      await fs.remove(file.path).catch(() => {})
    }
    
    logger.error('Asset upload failed:', error)
    throw error
  }
}))

/**
 * Upload multiple assets
 */
router.post('/:partnerId/upload-multiple', upload.array('assets', 10), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { partnerId } = req.params
  const { types = [], descriptions = [] } = req.body
  const files = req.files as Express.Multer.File[]

  if (!files || files.length === 0) {
    res.status(400).json({
      success: false,
      error: 'No files provided'
    })
    return
  }

  const uploadResults: any[] = []
  const failedUploads: any[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const type = types[i] || 'custom'
    const description = descriptions[i] || ''

    try {
      // Validate asset
      const validation = await assetProcessor.validateAsset(file.path)
      if (!validation.valid) {
        await fs.remove(file.path)
        failedUploads.push({
          filename: file.originalname,
          error: 'Invalid asset',
          details: validation.errors
        })
        continue
      }

      // Get image metadata
      const imageInfo = await getImageMetadata(file.path)
      
      // Create asset metadata with proper type handling
      const assetMetadata: AssetMetadata = {
        id: uuidv4(),
        partnerId,
        type,
        originalName: file.originalname,
        filename: file.filename,
        filepath: file.path,
        size: file.size,
        mimeType: file.mimetype,
        format: path.extname(file.originalname).toLowerCase().slice(1),
        uploadedAt: new Date(),
        status: 'uploaded',
        metadata: {
          description,
          colorSpace: imageInfo?.colorSpace,
          hasAlpha: imageInfo?.hasAlpha
        }
      }

      // Add dimensions only if imageInfo exists
      if (imageInfo) {
        assetMetadata.dimensions = { width: imageInfo.width, height: imageInfo.height }
      }

      // Store metadata
      assetMetadataStore.set(assetMetadata.id, assetMetadata)

      uploadResults.push({
        assetId: assetMetadata.id,
        originalName: assetMetadata.originalName,
        size: assetMetadata.size,
        format: assetMetadata.format,
        dimensions: assetMetadata.dimensions,
        status: 'uploaded'
      })

    } catch (error) {
      await fs.remove(file.path).catch(() => {})
      failedUploads.push({
        filename: file.originalname,
        error: error instanceof Error ? error.message : 'Upload failed'
      })
    }
  }

  logger.info('Multiple assets upload completed', { 
    partnerId, 
    successful: uploadResults.length, 
    failed: failedUploads.length 
  })

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
  })
}))

/**
 * Process uploaded asset
 */
router.post('/:partnerId/assets/:assetId/process', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { partnerId, assetId } = req.params
  const { processingOptions = {} } = req.body

  const assetMetadata = assetMetadataStore.get(assetId)
  
  if (!assetMetadata || assetMetadata.partnerId !== partnerId) {
    res.status(404).json({
      success: false,
      error: 'Asset not found'
    })
    return
  }

  if (assetMetadata.status === 'processing') {
    res.status(409).json({
      success: false,
      error: 'Asset is already being processed'
    })
    return
  }

  try {
    // Update status to processing
    assetMetadata.status = 'processing'
    assetMetadataStore.set(assetId, assetMetadata)

    // Process asset based on type
    let processedAssets: any[] = []
    
    if (assetMetadata.type === 'logo') {
      processedAssets = await processLogoAsset(assetMetadata)
    } else if (assetMetadata.type === 'splash') {
      processedAssets = await processSplashAsset(assetMetadata)
    } else if (assetMetadata.type === 'icon') {
      processedAssets = await processIconAsset(assetMetadata)
    } else {
      processedAssets = await processGenericAsset(assetMetadata)
    }

    // Update metadata with processed assets
    assetMetadata.status = 'processed'
    assetMetadata.processedAt = new Date()
    assetMetadata.processedAssets = processedAssets
    assetMetadataStore.set(assetId, assetMetadata)

    logger.info('Asset processed successfully', { assetId, partnerId, type: assetMetadata.type })

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
    })

  } catch (error) {
    // Update status to failed
    assetMetadata.status = 'failed'
    assetMetadataStore.set(assetId, assetMetadata)
    
    logger.error('Asset processing failed:', error)
    throw error
  }
}))

/**
 * Get asset details
 */
router.get('/:partnerId/assets/:assetId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { partnerId, assetId } = req.params

  const assetMetadata = assetMetadataStore.get(assetId)
  
  if (!assetMetadata || assetMetadata.partnerId !== partnerId) {
    res.status(404).json({
      success: false,
      error: 'Asset not found'
    })
    return
  }

  res.status(200).json({
    success: true,
    data: {
      ...assetMetadata,
      filepath: undefined, // Don't expose internal file paths
      processedAssets: assetMetadata.processedAssets?.map(asset => ({
        ...asset,
        outputPath: asset.outputPath?.replace(PROCESSED_DIR, '')
      }))
    }
  })
}))

/**
 * List partner assets
 */
router.get('/:partnerId/assets', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { partnerId } = req.params
  const { type, status, limit = 20, offset = 0 } = req.query

  const partnerAssets = Array.from(assetMetadataStore.values())
    .filter(asset => {
      if (asset.partnerId !== partnerId) return false
      if (type && asset.type !== type) return false
      if (status && asset.status !== status) return false
      return true
    })
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())

  const total = partnerAssets.length
  const paginatedAssets = partnerAssets.slice(Number(offset), Number(offset) + Number(limit))

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
  })
}))

/**
 * Delete asset
 */
router.delete('/:partnerId/assets/:assetId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { partnerId, assetId } = req.params

  const assetMetadata = assetMetadataStore.get(assetId)
  
  if (!assetMetadata || assetMetadata.partnerId !== partnerId) {
    res.status(404).json({
      success: false,
      error: 'Asset not found'
    })
    return
  }

  try {
    // Remove original file
    if (await fs.pathExists(assetMetadata.filepath)) {
      await fs.remove(assetMetadata.filepath)
    }

    // Remove processed assets
    if (assetMetadata.processedAssets) {
      for (const processedAsset of assetMetadata.processedAssets) {
        if (processedAsset.outputPath && await fs.pathExists(processedAsset.outputPath)) {
          await fs.remove(processedAsset.outputPath)
        }
      }
    }

    // Remove metadata
    assetMetadataStore.delete(assetId)

    logger.info('Asset deleted successfully', { assetId, partnerId })

    res.status(200).json({
      success: true,
      message: 'Asset deleted successfully'
    })

  } catch (error) {
    logger.error('Asset deletion failed:', error)
    throw error
  }
}))

/**
 * Download processed asset
 */
router.get('/:partnerId/assets/:assetId/download/:density?', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { partnerId, assetId, density } = req.params

  const assetMetadata = assetMetadataStore.get(assetId)
  
  if (!assetMetadata || assetMetadata.partnerId !== partnerId) {
    res.status(404).json({
      success: false,
      error: 'Asset not found'
    })
    return
  }

  if (assetMetadata.status !== 'processed') {
    res.status(400).json({
      success: false,
      error: 'Asset not processed yet'
    })
    return
  }

  try {
    let assetToDownload = assetMetadata.processedAssets?.[0]

    // If density specified, find specific density
    if (density && assetMetadata.processedAssets) {
      const specificAsset = assetMetadata.processedAssets.find(asset => asset.density === density)
      if (specificAsset) {
        assetToDownload = specificAsset
      }
    }

    if (!assetToDownload || !await fs.pathExists(assetToDownload.outputPath)) {
      res.status(404).json({
        success: false,
        error: 'Processed asset file not found'
      })
      return
    }

    const filename = path.basename(assetToDownload.outputPath)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', `image/${assetToDownload.format}`)
    
    const fileStream = fs.createReadStream(assetToDownload.outputPath)
    fileStream.pipe(res)

  } catch (error) {
    logger.error('Asset download failed:', error)
    throw error
  }
}))

/**
 * Asset processing helper functions
 */
async function getImageMetadata(imagePath: string) {
  try {
    const metadata = await sharp(imagePath).metadata()
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      hasAlpha: metadata.hasAlpha || false,
      colorSpace: metadata.space || undefined
    }
  } catch (error) {
    logger.error('Failed to get image metadata:', error)
    return null
  }
}

async function processLogoAsset(assetMetadata: AssetMetadata) {
  const outputDir = path.join(PROCESSED_DIR, assetMetadata.partnerId, 'logos')
  await fs.ensureDir(outputDir)

  const processedAssets = []
  const densities = [
    { name: 'mdpi', size: 48 },
    { name: 'hdpi', size: 72 },
    { name: 'xhdpi', size: 96 },
    { name: 'xxhdpi', size: 144 },
    { name: 'xxxhdpi', size: 192 }
  ]

  for (const density of densities) {
    const outputPath = path.join(outputDir, `logo_${density.name}.png`)
    
    await sharp(assetMetadata.filepath)
      .resize(density.size, density.size, { fit: 'contain', background: 'transparent' })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(outputPath)

    const stats = await fs.stat(outputPath)
    processedAssets.push({
      type: 'logo',
      density: density.name,
      size: { width: density.size, height: density.size },
      fileSize: stats.size,
      format: 'png',
      outputPath
    })
  }

  return processedAssets
}

async function processSplashAsset(assetMetadata: AssetMetadata) {
  const outputDir = path.join(PROCESSED_DIR, assetMetadata.partnerId, 'splash')
  await fs.ensureDir(outputDir)

  const outputPath = path.join(outputDir, 'splash_background.png')
  
  await sharp(assetMetadata.filepath)
    .resize(1080, 1920, { fit: 'cover' })
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(outputPath)

  const stats = await fs.stat(outputPath)
  return [{
    type: 'splash',
    size: { width: 1080, height: 1920 },
    fileSize: stats.size,
    format: 'png',
    outputPath
  }]
}

async function processIconAsset(assetMetadata: AssetMetadata) {
  const outputDir = path.join(PROCESSED_DIR, assetMetadata.partnerId, 'icons')
  await fs.ensureDir(outputDir)

  const processedAssets = []
  const sizes = [24, 32, 48, 64, 128, 256]

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon_${size}x${size}.png`)
    
    await sharp(assetMetadata.filepath)
      .resize(size, size, { fit: 'contain', background: 'transparent' })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(outputPath)

    const stats = await fs.stat(outputPath)
    processedAssets.push({
      type: 'icon',
      size: { width: size, height: size },
      fileSize: stats.size,
      format: 'png',
      outputPath
    })
  }

  return processedAssets
}

async function processGenericAsset(assetMetadata: AssetMetadata) {
  const outputDir = path.join(PROCESSED_DIR, assetMetadata.partnerId, 'custom')
  await fs.ensureDir(outputDir)

  const outputPath = path.join(outputDir, `${path.parse(assetMetadata.filename).name}_optimized.png`)
  
  await sharp(assetMetadata.filepath)
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(outputPath)

  const stats = await fs.stat(outputPath)
  return [{
    type: 'custom',
    fileSize: stats.size,
    format: 'png',
    outputPath
  }]
}

export { router as assetRoutes } 