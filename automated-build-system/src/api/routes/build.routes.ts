import { Router } from 'express'
import { logger } from '../../utils/logger'
import { BuildService } from '../../services/BuildService'
import { BuildValidator } from '../middleware/validation.middleware'
import { authMiddleware } from '../middleware/auth.middleware'
import { BuildStatus } from '../../types/build.types'
import { v4 as uuidv4 } from 'uuid'

const router = Router()
const buildService = new BuildService()

// Create a new build
router.post('/create', authMiddleware, BuildValidator.validateCreateBuild, async (req, res) => {
  try {
    logger.info('Build creation request received')
    
    const { partnerId, config } = req.body
    
    // Generate a unique build ID
    const buildId = `build-${uuidv4()}`
    
    // Create build record
    const build = await buildService.createBuild({
      id: buildId,
      partnerId,
      config,
      status: BuildStatus.QUEUED,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    // Add to queue for processing
    await buildService.queueBuild(build)
    
    logger.info(`Build ${buildId} created and queued for processing`)
    
    res.json({
      success: true,
      data: {
        buildId: build.id,
        status: build.status,
        message: 'Build job created successfully'
      }
    })
  } catch (error: unknown) {
    logger.error('Failed to create build job:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create build job',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get build status
router.get('/:id/status', authMiddleware, async (req, res) => {
  try {
    const buildId = req.params.id
    
    // Get build status from database
    const build = await buildService.getBuildById(buildId)
    
    if (!build) {
      return res.status(404).json({
        success: false,
        error: 'Build not found'
      })
    }
    
    // Check if user has access to this build
    if (req.user && (req.user.partnerId !== build.partnerId && !req.user.isAdmin)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      })
    }
    
    res.json({
      success: true,
      data: {
        buildId: build.id,
        status: build.status,
        progress: build.progress,
        createdAt: build.createdAt,
        updatedAt: build.updatedAt,
        estimatedTimeRemaining: buildService.calculateEstimatedTimeRemaining(build)
      }
    })
  } catch (error: unknown) {
    logger.error('Failed to get build status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get build status',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get build logs
router.get('/:id/logs', authMiddleware, async (req, res) => {
  try {
    const buildId = req.params.id
    
    // Get build from database
    const build = await buildService.getBuildById(buildId)
    
    if (!build) {
      return res.status(404).json({
        success: false,
        error: 'Build not found'
      })
    }
    
    // Check if user has access to this build
    if (req.user && (req.user.partnerId !== build.partnerId && !req.user.isAdmin)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      })
    }
    
    // Get logs for the build
    const logs = await buildService.getBuildLogs(buildId)
    
    res.json({
      success: true,
      data: {
        buildId,
        logs
      }
    })
  } catch (error: unknown) {
    logger.error('Failed to get build logs:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get build logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Download generated app
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const buildId = req.params.id
    
    // Get build from database
    const build = await buildService.getBuildById(buildId)
    
    if (!build) {
      return res.status(404).json({
        success: false,
        error: 'Build not found'
      })
    }
    
    // Check if user has access to this build
    if (req.user && (req.user.partnerId !== build.partnerId && !req.user.isAdmin)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      })
    }
    
    // Check if build is completed
    if (build.status !== BuildStatus.COMPLETED) {
      return res.status(400).json({
        success: false,
        error: 'Build is not completed yet',
        status: build.status,
        progress: build.progress
      })
    }
    
    // Get download URL for the build
    const downloadUrl = await buildService.getDownloadUrl(buildId)
    
    if (!downloadUrl) {
      return res.status(404).json({
        success: false,
        error: 'Build artifacts not found'
      })
    }
    
    res.json({
      success: true,
      data: {
        buildId,
        downloadUrl
      }
    })
  } catch (error: unknown) {
    logger.error('Failed to get download URL:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get download URL',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Cancel build
router.delete('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const buildId = req.params.id
    
    // Get build from database
    const build = await buildService.getBuildById(buildId)
    
    if (!build) {
      return res.status(404).json({
        success: false,
        error: 'Build not found'
      })
    }
    
    // Check if user has access to this build
    if (req.user && (req.user.partnerId !== build.partnerId && !req.user.isAdmin)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      })
    }
    
    // Check if build can be cancelled
    if (build.status !== BuildStatus.QUEUED && build.status !== BuildStatus.RUNNING) {
      return res.status(400).json({
        success: false,
        error: 'Build cannot be cancelled',
        status: build.status
      })
    }
    
    // Cancel the build
    await buildService.cancelBuild(buildId)
    
    res.json({
      success: true,
      data: {
        buildId,
        message: 'Build cancelled successfully'
      }
    })
  } catch (error: unknown) {
    logger.error('Failed to cancel build:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to cancel build',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// List all builds for a partner
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query
    const partnerId = req.user?.isAdmin ? req.query.partnerId : req.user?.partnerId
    
    // Get builds for the partner
    const builds = await buildService.getBuilds({
      partnerId: partnerId as string,
      status: status as BuildStatus,
      page: Number(page),
      limit: Number(limit)
    })
    
    res.json({
      success: true,
      data: builds
    })
  } catch (error: unknown) {
    logger.error('Failed to list builds:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to list builds',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export { router as buildRoutes } 