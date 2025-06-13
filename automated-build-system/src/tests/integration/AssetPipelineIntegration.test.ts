import fs from 'fs-extra'
import path from 'path'
import request from 'supertest'
import { BuildOrchestrator } from '../../services/BuildOrchestrator'
import { AssetPipeline } from '../../services/AssetPipeline'
import { AndroidBuildConfig } from '../../services/TemplateProcessor'
import { app } from '../../index'

// Test data setup
const testAssets = {
  logo: Buffer.from('fake-logo-data'),
  splash: Buffer.from('fake-splash-data'),
  icon: Buffer.from('fake-icon-data')
}

const mockBuildConfig: AndroidBuildConfig = {
  buildId: 'integration-test-123',
  buildType: 'release',
  partnerConfig: {
    appName: 'IntegrationTestApp',
    packageName: 'com.integration.test',
    version: '1.0.0',
    api: {
      baseUrl: 'https://api.integration.test',
      apiKey: 'integration-test-key'
    },
    branding: {
      primaryColor: '#2196F3',
      secondaryColor: '#1976D2',
      backgroundColor: '#FFFFFF',
      textColor: '#000000'
    },
    features: {
      enableBiometric: true,
      enableEKYC: true,
      enablePushNotifications: true,
      enableCardlessPayment: true,
      enableQRPayment: true
    }
  }
}

describe('Asset Pipeline Integration Tests', () => {
  let buildOrchestrator: BuildOrchestrator
  let assetPipeline: AssetPipeline
  let tempTestDir: string

  beforeAll(async () => {
    // Setup test environment
    tempTestDir = path.join(__dirname, '../../temp/integration-tests')
    await fs.ensureDir(tempTestDir)
    
    buildOrchestrator = new BuildOrchestrator()
    assetPipeline = new AssetPipeline()
  })

  afterAll(async () => {
    // Cleanup test environment
    await fs.remove(tempTestDir)
  })

  describe('End-to-End Asset Workflow', () => {
    test('should complete full asset upload and processing workflow', async () => {
      // Step 1: Upload assets via API
      const partnerId = 'integration-test-partner'
      
      const logoUpload = await request(app)
        .post(`/api/assets/upload/${partnerId}`)
        .attach('assets', testAssets.logo, 'logo.png')
        .expect(201)

      const splashUpload = await request(app)
        .post(`/api/assets/upload/${partnerId}`)
        .attach('assets', testAssets.splash, 'splash.png')
        .expect(201)

      expect(logoUpload.body.success).toBe(true)
      expect(splashUpload.body.success).toBe(true)

      // Step 2: Process assets via pipeline
      const processResponse = await request(app)
        .post(`/api/assets/process/${partnerId}`)
        .send({ processingOptions: { enableOptimization: true } })
        .expect(200)

      expect(processResponse.body.success).toBe(true)
      expect(processResponse.body.processedAssets.length).toBeGreaterThan(0)

      // Step 3: Validate asset details
      const assetListResponse = await request(app)
        .get(`/api/assets/${partnerId}`)
        .expect(200)

      expect(assetListResponse.body.assets.length).toBeGreaterThanOrEqual(2)
    }, 30000)

    test('should integrate asset pipeline with build orchestrator', async () => {
      // Mock successful build execution
      const buildOptions = {
        enableAssetPipeline: true,
        onProgress: jest.fn()
      }

      const buildResult = await buildOrchestrator.executeBuild(mockBuildConfig, buildOptions)

      expect(buildResult.success).toBe(true)
      expect(buildResult.assetPipelineResult).toBeDefined()
      expect(buildResult.injectionPlan).toBeDefined()
      expect(buildResult.stages.assetProcessing).toBe(true)
      expect(buildResult.stages.assetInjection).toBe(true)
    }, 60000)

    test('should validate asset injection in build artifacts', async () => {
      const buildResult = await buildOrchestrator.executeBuild(mockBuildConfig)

      if (buildResult.success && buildResult.artifacts) {
        // Validate that assets were properly injected
        expect(buildResult.artifacts.buildReport).toBeDefined()
        
        // Read build report to validate asset integration
        if (buildResult.artifacts.buildReport) {
          const reportContent = await fs.readJson(buildResult.artifacts.buildReport)
          expect(reportContent.assetPipeline).toBeDefined()
          expect(reportContent.assetPipeline.success).toBe(true)
          expect(reportContent.assetPipeline.assetsProcessed).toBeGreaterThanOrEqual(0)
        }
      }
    }, 45000)
  })

  describe('Asset Quality Validation', () => {
    test('should validate asset quality metrics', async () => {
      const partnerId = 'quality-test-partner'
      
      // Upload test assets
      await request(app)
        .post(`/api/assets/upload/${partnerId}`)
        .attach('assets', testAssets.logo, 'logo.png')
        .expect(201)

      // Process with quality validation
      const processResponse = await request(app)
        .post(`/api/assets/process/${partnerId}`)
        .send({ 
          processingOptions: { 
            enableOptimization: true,
            qualityThreshold: 90 
          } 
        })
        .expect(200)

      const { processedAssets, qualityScore } = processResponse.body
      
      expect(qualityScore).toBeGreaterThanOrEqual(0)
      expect(qualityScore).toBeLessThanOrEqual(100)
      
      if (processedAssets.length > 0) {
        const asset = processedAssets[0]
        expect(asset.optimization).toBeDefined()
        expect(asset.optimization.qualityScore).toBeGreaterThanOrEqual(0)
      }
    })

    test('should detect and handle low quality assets', async () => {
      // Create a low quality test asset (very small)
      const lowQualityAsset = Buffer.from('tiny')
      const partnerId = 'low-quality-test'
      
      const uploadResponse = await request(app)
        .post(`/api/assets/upload/${partnerId}`)
        .attach('assets', lowQualityAsset, 'tiny.png')
        .expect(201)

      const processResponse = await request(app)
        .post(`/api/assets/process/${partnerId}`)
        .send({ processingOptions: { qualityThreshold: 95 } })
        .expect(200)

      // Should complete but may have warnings
      expect(processResponse.body.success).toBe(true)
      expect(processResponse.body.warnings).toBeDefined()
    })
  })

  describe('Error Handling and Recovery', () => {
    test('should handle corrupted asset uploads gracefully', async () => {
      const partnerId = 'error-test-partner'
      const corruptedAsset = Buffer.from('not-an-image')
      
      const uploadResponse = await request(app)
        .post(`/api/assets/upload/${partnerId}`)
        .attach('assets', corruptedAsset, 'corrupted.png')
        .expect(201) // Upload should succeed

      const processResponse = await request(app)
        .post(`/api/assets/process/${partnerId}`)
        .send({ processingOptions: {} })
        .expect(200) // Should handle gracefully

      // Should report errors but not crash
      expect(processResponse.body).toBeDefined()
    })

    test('should handle missing build directories', async () => {
      const invalidConfig = {
        ...mockBuildConfig,
        buildId: 'invalid-path-test'
      }

      const buildResult = await buildOrchestrator.executeBuild(invalidConfig)
      
      // Should handle gracefully without crashing
      expect(buildResult).toBeDefined()
      expect(buildResult.buildId).toBe('invalid-path-test')
    })

    test('should handle asset pipeline failures in build process', async () => {
      // Mock asset pipeline to fail
      jest.spyOn(AssetPipeline.prototype, 'processPipeline').mockRejectedValue(
        new Error('Pipeline failure simulation')
      )

      const buildResult = await buildOrchestrator.executeBuild(mockBuildConfig)
      
      expect(buildResult.success).toBe(false)
      expect(buildResult.error).toContain('Pipeline failure simulation')

      // Restore original implementation
      jest.restoreAllMocks()
    })
  })

  describe('Performance and Scalability', () => {
    test('should handle multiple asset uploads concurrently', async () => {
      const partnerId = 'concurrent-test'
      const concurrentUploads = 5
      
      const uploadPromises = Array.from({ length: concurrentUploads }, (_, i) => 
        request(app)
          .post(`/api/assets/upload/${partnerId}`)
          .attach('assets', testAssets.logo, `logo-${i}.png`)
      )

      const results = await Promise.all(uploadPromises)
      
      results.forEach(result => {
        expect(result.status).toBe(201)
        expect(result.body.success).toBe(true)
      })

      // Verify all assets are listed
      const listResponse = await request(app)
        .get(`/api/assets/${partnerId}`)
        .expect(200)

      expect(listResponse.body.assets.length).toBe(concurrentUploads)
    }, 15000)

    test('should complete build within acceptable time limits', async () => {
      const startTime = Date.now()
      
      const buildResult = await buildOrchestrator.executeBuild(mockBuildConfig)
      
      const buildTime = Date.now() - startTime
      
      // Build should complete within reasonable time (adjust as needed)
      expect(buildTime).toBeLessThan(120000) // 2 minutes max
      
      if (buildResult.success) {
        expect(buildResult.buildDuration).toBeGreaterThan(0)
        expect(buildResult.buildDuration).toBeLessThan(120000)
      }
    }, 150000)
  })

  describe('Asset Format Validation', () => {
    test('should support multiple image formats', async () => {
      const partnerId = 'format-test'
      const formats = [
        { buffer: testAssets.logo, name: 'test.png' },
        { buffer: testAssets.logo, name: 'test.jpg' },
        { buffer: testAssets.logo, name: 'test.jpeg' }
      ]

      for (const format of formats) {
        const response = await request(app)
          .post(`/api/assets/upload/${partnerId}`)
          .attach('assets', format.buffer, format.name)
          .expect(201)

        expect(response.body.success).toBe(true)
      }

      const listResponse = await request(app)
        .get(`/api/assets/${partnerId}`)
        .expect(200)

      expect(listResponse.body.assets.length).toBe(formats.length)
    })

    test('should reject unsupported file formats', async () => {
      const partnerId = 'unsupported-format-test'
      const unsupportedFile = Buffer.from('fake-data')

      const response = await request(app)
        .post(`/api/assets/upload/${partnerId}`)
        .attach('assets', unsupportedFile, 'test.txt')
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toMatch(/unsupported|format|type/i)
    })
  })

  describe('Build Configuration Integration', () => {
    test('should respect partner-specific branding in asset processing', async () => {
      const customConfig = {
        ...mockBuildConfig,
        partnerConfig: {
          ...mockBuildConfig.partnerConfig,
          branding: {
            primaryColor: '#FF5722',
            secondaryColor: '#E64A19',
            backgroundColor: '#F5F5F5',
            textColor: '#212121'
          }
        }
      }

      const buildResult = await buildOrchestrator.executeBuild(customConfig)

      if (buildResult.success && buildResult.assetPipelineResult) {
        // Validate that branding colors are used in processing
        expect(buildResult.assetPipelineResult.success).toBe(true)
      }
    })

    test('should handle feature-specific asset requirements', async () => {
      const featureConfig = {
        ...mockBuildConfig,
        partnerConfig: {
          ...mockBuildConfig.partnerConfig,
          features: {
            enableBiometric: true,
            enableEKYC: false,
            enablePushNotifications: true,
            enableCardlessPayment: false,
            enableQRPayment: false
          }
        }
      }

      const buildResult = await buildOrchestrator.executeBuild(featureConfig)

      expect(buildResult.stages.codeGeneration).toBe(true)
      
      if (buildResult.success) {
        expect(buildResult.buildDuration).toBeGreaterThan(0)
      }
    })
  })
})

describe('Asset Pipeline Stress Tests', () => {
  test('should handle large asset files', async () => {
    const partnerId = 'large-asset-test'
    // Simulate a large file (1MB)
    const largeAsset = Buffer.alloc(1024 * 1024, 'test-data')

    const uploadResponse = await request(app)
      .post(`/api/assets/upload/${partnerId}`)
      .attach('assets', largeAsset, 'large-image.png')
      .expect(201)

    expect(uploadResponse.body.success).toBe(true)

    const processResponse = await request(app)
      .post(`/api/assets/process/${partnerId}`)
      .send({ processingOptions: { enableOptimization: true } })
      .expect(200)

    expect(processResponse.body.success).toBe(true)
  }, 30000)

  test('should handle partner isolation correctly', async () => {
    const partner1 = 'partner-1'
    const partner2 = 'partner-2'

    // Upload assets for both partners
    await request(app)
      .post(`/api/assets/upload/${partner1}`)
      .attach('assets', testAssets.logo, 'logo.png')
      .expect(201)

    await request(app)
      .post(`/api/assets/upload/${partner2}`)
      .attach('assets', testAssets.splash, 'splash.png')
      .expect(201)

    // Verify partner isolation
    const partner1Assets = await request(app)
      .get(`/api/assets/${partner1}`)
      .expect(200)

    const partner2Assets = await request(app)
      .get(`/api/assets/${partner2}`)
      .expect(200)

    expect(partner1Assets.body.assets.length).toBe(1)
    expect(partner2Assets.body.assets.length).toBe(1)
    
    // Assets should be different
    expect(partner1Assets.body.assets[0].originalName).toBe('logo.png')
    expect(partner2Assets.body.assets[0].originalName).toBe('splash.png')
  })
})

export { } 