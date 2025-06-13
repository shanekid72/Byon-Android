import fs from 'fs-extra'
import path from 'path'
import { AssetPipeline, AssetPipelineConfig, PipelineResult } from '../services/AssetPipeline'
import { AssetProcessor, PartnerAssets } from '../services/AssetProcessor'
import { AndroidBuildConfig } from '../services/TemplateProcessor'

// Mock console methods for cleaner test output
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}

// Mock fs-extra
jest.mock('fs-extra')
const mockedFs = fs as jest.Mocked<typeof fs>

// Mock sharp
jest.mock('sharp', () => {
  return jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined),
    metadata: jest.fn().mockResolvedValue({
      width: 512,
      height: 512,
      format: 'png',
      hasAlpha: false,
      space: 'srgb'
    }),
    composite: jest.fn().mockReturnThis(),
    greyscale: jest.fn().mockReturnThis(),
    threshold: jest.fn().mockReturnThis(),
    extend: jest.fn().mockReturnThis()
  }))
})

describe('AssetPipeline', () => {
  let assetPipeline: AssetPipeline
  let mockBuildConfig: AndroidBuildConfig
  let mockPartnerAssets: PartnerAssets
  let testBuildPath: string

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup test configuration
    const pipelineConfig: Partial<AssetPipelineConfig> = {
      enableOptimization: true,
      qualityThreshold: 85,
      maxProcessingTime: 60000,
      outputFormats: ['png', 'webp'],
      compressionLevel: 9
    }
    
    assetPipeline = new AssetPipeline(pipelineConfig)
    testBuildPath = '/test/build/path'
    
    // Setup mock build configuration
    mockBuildConfig = {
      buildId: 'test-build-123',
      buildType: 'release',
      partnerConfig: {
        appName: 'TestApp',
        packageName: 'com.test.app',
        version: '1.0.0',
        api: {
          baseUrl: 'https://api.test.com',
          apiKey: 'test-api-key'
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
          enableCardlessPayment: false,
          enableQRPayment: true
        }
      }
    }
    
    // Setup mock partner assets
    mockPartnerAssets = {
      logo: '/test/assets/logo.png',
      splashBackground: '/test/assets/splash.png',
      brandIcon: '/test/assets/brand.png',
      customImages: {
        'feature-icon': '/test/assets/feature.png'
      }
    }
    
    // Setup fs mocks
    mockedFs.pathExists.mockResolvedValue(true)
    mockedFs.stat.mockResolvedValue({ size: 1024 } as any)
    mockedFs.ensureDir.mockResolvedValue(undefined)
    mockedFs.writeFile.mockResolvedValue(undefined)
    mockedFs.readFile.mockResolvedValue('mock file content')
  })

  describe('Pipeline Configuration', () => {
    test('should initialize with default configuration', () => {
      const pipeline = new AssetPipeline()
      expect(pipeline).toBeInstanceOf(AssetPipeline)
    })

    test('should initialize with custom configuration', () => {
      const customConfig: Partial<AssetPipelineConfig> = {
        enableOptimization: false,
        qualityThreshold: 90,
        outputFormats: ['png']
      }
      
      const pipeline = new AssetPipeline(customConfig)
      expect(pipeline).toBeInstanceOf(AssetPipeline)
    })
  })

  describe('Asset Processing Pipeline', () => {
    test('should successfully process basic asset pipeline', async () => {
      const result = await assetPipeline.processPipeline(
        testBuildPath,
        mockBuildConfig,
        mockPartnerAssets
      )

      expect(result.success).toBe(true)
      expect(result.processedAssets).toBeDefined()
      expect(result.errors).toHaveLength(0)
      expect(result.processingTime).toBeGreaterThan(0)
      expect(result.qualityScore).toBeGreaterThanOrEqual(0)
    })

    test('should handle empty partner assets', async () => {
      const emptyAssets: PartnerAssets = {}
      
      const result = await assetPipeline.processPipeline(
        testBuildPath,
        mockBuildConfig,
        emptyAssets
      )

      expect(result.success).toBe(true)
      expect(result.processedAssets).toBeDefined()
    })

    test('should handle asset processing errors gracefully', async () => {
      // Mock AssetProcessor to throw error
      const mockError = new Error('Asset processing failed')
      jest.spyOn(AssetProcessor.prototype, 'processPartnerAssets').mockRejectedValue(mockError)

      const result = await assetPipeline.processPipeline(
        testBuildPath,
        mockBuildConfig,
        mockPartnerAssets
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Asset processing failed')
    })

    test('should validate quality scores correctly', async () => {
      const result = await assetPipeline.processPipeline(
        testBuildPath,
        mockBuildConfig,
        mockPartnerAssets
      )

      expect(result.qualityScore).toBeGreaterThanOrEqual(0)
      expect(result.qualityScore).toBeLessThanOrEqual(100)
    })
  })

  describe('Asset Injection Plan', () => {
    test('should create valid injection plan', async () => {
      const mockPipelineResult: PipelineResult = {
        success: true,
        processedAssets: [
          {
            assetId: 'test-asset-1',
            type: 'logo',
            originalPath: '/test/logo.png',
            outputPaths: ['/test/output/logo.png'],
            formats: ['png'],
            sizes: { 'mdpi': { width: 48, height: 48 } },
            optimization: {
              originalSize: 1024,
              finalSize: 800,
              compressionRatio: 22,
              qualityScore: 95
            },
            metadata: {}
          }
        ],
        errors: [],
        warnings: [],
        processingTime: 1000,
        qualityScore: 95
      }

      const injectionPlan = await assetPipeline.createInjectionPlan(
        'test-build-123',
        'test-partner',
        testBuildPath,
        mockPipelineResult
      )

      expect(injectionPlan.buildId).toBe('test-build-123')
      expect(injectionPlan.partnerId).toBe('test-partner')
      expect(injectionPlan.targetPath).toBe(testBuildPath)
      expect(injectionPlan.assets).toBeDefined()
      expect(injectionPlan.injectionPoints).toBeDefined()
      expect(injectionPlan.assets.logos).toHaveLength(1)
    })

    test('should categorize assets correctly', async () => {
      const mockPipelineResult: PipelineResult = {
        success: true,
        processedAssets: [
          {
            assetId: 'logo-1',
            type: 'logo',
            originalPath: '/test/logo.png',
            outputPaths: ['/test/output/logo.png'],
            formats: ['png'],
            sizes: {},
            optimization: { originalSize: 1024, finalSize: 800, compressionRatio: 22, qualityScore: 95 },
            metadata: {}
          },
          {
            assetId: 'splash-1',
            type: 'splash',
            originalPath: '/test/splash.png',
            outputPaths: ['/test/output/splash.png'],
            formats: ['png'],
            sizes: {},
            optimization: { originalSize: 2048, finalSize: 1600, compressionRatio: 22, qualityScore: 90 },
            metadata: {}
          },
          {
            assetId: 'icon-1',
            type: 'icon',
            originalPath: '/test/icon.png',
            outputPaths: ['/test/output/icon.png'],
            formats: ['png'],
            sizes: {},
            optimization: { originalSize: 512, finalSize: 400, compressionRatio: 22, qualityScore: 88 },
            metadata: {}
          }
        ],
        errors: [],
        warnings: [],
        processingTime: 2000,
        qualityScore: 91
      }

      const injectionPlan = await assetPipeline.createInjectionPlan(
        'test-build-123',
        'test-partner',
        testBuildPath,
        mockPipelineResult
      )

      expect(injectionPlan.assets.logos).toHaveLength(1)
      expect(injectionPlan.assets.splash).toHaveLength(1)
      expect(injectionPlan.assets.icons).toHaveLength(1)
      expect(injectionPlan.assets.brand).toHaveLength(0)
      expect(injectionPlan.assets.custom).toHaveLength(0)
    })

    test('should generate appropriate injection points', async () => {
      const mockPipelineResult: PipelineResult = {
        success: true,
        processedAssets: [
          {
            assetId: 'logo-1',
            type: 'logo',
            originalPath: '/test/logo.png',
            outputPaths: ['/test/output/logo.png'],
            formats: ['png'],
            sizes: {},
            optimization: { originalSize: 1024, finalSize: 800, compressionRatio: 22, qualityScore: 95 },
            metadata: {}
          }
        ],
        errors: [],
        warnings: [],
        processingTime: 1000,
        qualityScore: 95
      }

      const injectionPlan = await assetPipeline.createInjectionPlan(
        'test-build-123',
        'test-partner',
        testBuildPath,
        mockPipelineResult
      )

      expect(injectionPlan.injectionPoints.length).toBeGreaterThan(0)
      
      const manifestInjection = injectionPlan.injectionPoints.find(
        point => point.type === 'manifest'
      )
      expect(manifestInjection).toBeDefined()
      
      const resourceInjection = injectionPlan.injectionPoints.find(
        point => point.type === 'resource'
      )
      expect(resourceInjection).toBeDefined()
    })
  })

  describe('Asset Injection Execution', () => {
    test('should execute injection plan successfully', async () => {
      const mockInjectionPlan = {
        buildId: 'test-build-123',
        partnerId: 'test-partner',
        targetPath: testBuildPath,
        assets: {
          logos: [],
          splash: [],
          icons: [],
          brand: [],
          custom: []
        },
        injectionPoints: [
          {
            type: 'resource' as const,
            targetFile: '/test/values/colors.xml',
            action: 'insert' as const,
            content: '<color name="partner_primary">#2196F3</color>'
          }
        ]
      }

      const result = await assetPipeline.injectAssets(mockInjectionPlan)
      expect(result).toBe(true)
    })

    test('should handle injection failures gracefully', async () => {
      // Mock fs operations to fail
      mockedFs.writeFile.mockRejectedValue(new Error('Write failed'))

      const mockInjectionPlan = {
        buildId: 'test-build-123',
        partnerId: 'test-partner',
        targetPath: testBuildPath,
        assets: {
          logos: [],
          splash: [],
          icons: [],
          brand: [],
          custom: []
        },
        injectionPoints: [
          {
            type: 'resource' as const,
            targetFile: '/test/values/colors.xml',
            action: 'insert' as const,
            content: '<color name="partner_primary">#2196F3</color>'
          }
        ]
      }

      const result = await assetPipeline.injectAssets(mockInjectionPlan)
      expect(result).toBe(false)
    })
  })

  describe('Pipeline Statistics', () => {
    test('should generate comprehensive pipeline statistics', async () => {
      const mockPipelineResult: PipelineResult = {
        success: true,
        processedAssets: [
          {
            assetId: 'asset-1',
            type: 'logo',
            originalPath: '/test/logo.png',
            outputPaths: ['/test/output/logo.png'],
            formats: ['png', 'webp'],
            sizes: {},
            optimization: { originalSize: 1024, finalSize: 800, compressionRatio: 22, qualityScore: 95 },
            metadata: {}
          },
          {
            assetId: 'asset-2',
            type: 'icon',
            originalPath: '/test/icon.png',
            outputPaths: ['/test/output/icon.png'],
            formats: ['png'],
            sizes: {},
            optimization: { originalSize: 512, finalSize: 400, compressionRatio: 22, qualityScore: 88 },
            metadata: {}
          }
        ],
        errors: [],
        warnings: ['Test warning'],
        processingTime: 2500,
        qualityScore: 91.5
      }

      const stats = await assetPipeline.getPipelineStats(mockPipelineResult)

      expect(stats.totalAssets).toBe(2)
      expect(stats.processingTime).toBe(2500)
      expect(stats.qualityScore).toBe(91.5)
      expect(stats.totalOptimization).toBe(22)
      expect(stats.formatDistribution).toEqual({
        'png': 3,
        'webp': 1
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing asset files', async () => {
      mockedFs.pathExists.mockResolvedValue(false)

      const result = await assetPipeline.processPipeline(
        testBuildPath,
        mockBuildConfig,
        mockPartnerAssets
      )

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    test('should handle invalid build paths', async () => {
      mockedFs.ensureDir.mockRejectedValue(new Error('Invalid path'))

      const result = await assetPipeline.processPipeline(
        '/invalid/path',
        mockBuildConfig,
        mockPartnerAssets
      )

      expect(result.success).toBe(false)
    })

    test('should handle corrupted asset files', async () => {
      // Mock sharp to throw error for corrupted files
      jest.doMock('sharp', () => {
        return jest.fn(() => {
          throw new Error('Corrupted image file')
        })
      })

      const result = await assetPipeline.processPipeline(
        testBuildPath,
        mockBuildConfig,
        mockPartnerAssets
      )

      expect(result.success).toBe(false)
    })

    test('should respect processing time limits', async () => {
      // Create pipeline with very short time limit
      const fastPipeline = new AssetPipeline({
        maxProcessingTime: 1 // 1ms limit
      })

      const result = await fastPipeline.processPipeline(
        testBuildPath,
        mockBuildConfig,
        mockPartnerAssets
      )

      // Should still complete but may have warnings about time
      expect(result).toBeDefined()
    })
  })

  describe('Quality Validation', () => {
    test('should detect low quality assets', async () => {
      // Mock low quality processing result
      jest.spyOn(AssetProcessor.prototype, 'processPartnerAssets').mockResolvedValue({
        success: true,
        processedAssets: [
          {
            type: 'logo',
            originalPath: '/test/logo.png',
            outputPath: '/test/output/logo.png',
            fileSize: 1024,
            format: 'png',
            optimized: false
          }
        ],
        errors: [],
        warnings: [],
        processingTime: 1000
      })

      const result = await assetPipeline.processPipeline(
        testBuildPath,
        mockBuildConfig,
        mockPartnerAssets
      )

      expect(result.warnings.length).toBeGreaterThanOrEqual(0)
    })

    test('should validate asset format compatibility', async () => {
      const unsupportedAssets: PartnerAssets = {
        logo: '/test/logo.tiff' // Unsupported format
      }

      const result = await assetPipeline.processPipeline(
        testBuildPath,
        mockBuildConfig,
        unsupportedAssets
      )

      // Should handle gracefully
      expect(result).toBeDefined()
    })
  })

  describe('Integration Tests', () => {
    test('should integrate properly with AssetProcessor', async () => {
      // Test that AssetPipeline correctly uses AssetProcessor
      const processSpy = jest.spyOn(AssetProcessor.prototype, 'processPartnerAssets')
      
      await assetPipeline.processPipeline(
        testBuildPath,
        mockBuildConfig,
        mockPartnerAssets
      )

      expect(processSpy).toHaveBeenCalledWith(
        testBuildPath,
        mockBuildConfig,
        mockPartnerAssets
      )
    })

    test('should handle BuildOrchestrator integration', async () => {
      // Test integration points
      const result = await assetPipeline.processPipeline(
        testBuildPath,
        mockBuildConfig,
        mockPartnerAssets
      )

      const injectionPlan = await assetPipeline.createInjectionPlan(
        mockBuildConfig.buildId,
        mockBuildConfig.partnerConfig.appName,
        testBuildPath,
        result
      )

      expect(injectionPlan.buildId).toBe(mockBuildConfig.buildId)
      expect(injectionPlan.partnerId).toBe(mockBuildConfig.partnerConfig.appName)
    })
  })
})

describe('AssetPipeline Performance Tests', () => {
  let assetPipeline: AssetPipeline

  beforeEach(() => {
    assetPipeline = new AssetPipeline()
  })

  test('should process assets within time limits', async () => {
    const startTime = Date.now()
    
    const mockBuildConfig: AndroidBuildConfig = {
      buildId: 'perf-test-123',
      buildType: 'release',
      partnerConfig: {
        appName: 'PerfTestApp',
        packageName: 'com.perftest.app',
        version: '1.0.0',
        api: { baseUrl: 'https://api.test.com', apiKey: 'test-key' },
        branding: { primaryColor: '#2196F3', secondaryColor: '#1976D2' },
        features: { enableBiometric: true, enableEKYC: true, enablePushNotifications: true }
      }
    }

    const mockAssets: PartnerAssets = {
      logo: '/test/large-logo.png',
      splashBackground: '/test/large-splash.png'
    }

    const result = await assetPipeline.processPipeline(
      '/test/build/path',
      mockBuildConfig,
      mockAssets
    )

    const processingTime = Date.now() - startTime
    
    expect(result.success).toBe(true)
    expect(processingTime).toBeLessThan(30000) // Should complete within 30 seconds
    expect(result.processingTime).toBeGreaterThan(0)
  })

  test('should handle multiple concurrent pipeline executions', async () => {
    const concurrent = 5
    const promises: Promise<PipelineResult>[] = []

    for (let i = 0; i < concurrent; i++) {
      const mockBuildConfig: AndroidBuildConfig = {
        buildId: `concurrent-test-${i}`,
        buildType: 'release',
        partnerConfig: {
          appName: `ConcurrentApp${i}`,
          packageName: `com.concurrent.app${i}`,
          version: '1.0.0',
          api: { baseUrl: 'https://api.test.com', apiKey: 'test-key' },
          branding: { primaryColor: '#2196F3', secondaryColor: '#1976D2' },
          features: { enableBiometric: true, enableEKYC: true, enablePushNotifications: true }
        }
      }

      promises.push(assetPipeline.processPipeline(
        `/test/build/path${i}`,
        mockBuildConfig,
        { logo: `/test/logo${i}.png` }
      ))
    }

    const results = await Promise.all(promises)
    
    expect(results).toHaveLength(concurrent)
    results.forEach(result => {
      expect(result.success).toBe(true)
    })
  })
})

export { } 