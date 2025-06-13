import Foundation
import Combine
import Network

/**
 * LuluPay iOS SDK for mobile asset management and build monitoring
 *
 * Features:
 * - Asset upload and management with Progress tracking
 * - Real-time build monitoring with Combine publishers
 * - Build trigger and configuration
 * - Offline asset caching with Core Data
 * - Modern Swift async/await API
 * - SwiftUI integration support
 *
 * @author LuluPay SDK Team
 * @version 4.0.0
 */
@available(iOS 13.0, *)
public final class LuluPaySDK: ObservableObject {
    
    // MARK: - Properties
    
    public static let version = "4.0.0"
    
    private let config: LuluPayConfig
    private let apiService: APIService
    private let assetManager: AssetManager
    private let buildMonitor: BuildMonitor
    private let cacheManager: CacheManager
    
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Published Properties for SwiftUI
    
    @Published public private(set) var isConnected: Bool = false
    @Published public private(set) var activeBuilds: [BuildProgress] = []
    @Published public private(set) var uploadProgress: [String: Float] = [:]
    
    // MARK: - Singleton
    
    public static var shared: LuluPaySDK? {
        return _shared
    }
    
    private static var _shared: LuluPaySDK?
    
    // MARK: - Initialization
    
    private init(config: LuluPayConfig) {
        self.config = config
        self.apiService = APIService(config: config)
        self.assetManager = AssetManager(apiService: apiService)
        self.buildMonitor = BuildMonitor(apiService: apiService)
        self.cacheManager = CacheManager()
        
        setupNetworkMonitoring()
        setupBuildStreaming()
    }
    
    /**
     * Initialize the LuluPay SDK
     */
    public static func initialize(config: LuluPayConfig) throws {
        guard _shared == nil else {
            throw LuluPayError.alreadyInitialized
        }
        
        _shared = LuluPaySDK(config: config)
        
        print("LuluPay iOS SDK v\(version) initialized")
    }
    
    // MARK: - Asset Management
    
    /**
     * Upload asset to LuluPay platform
     */
    public func uploadAsset(
        fileURL: URL,
        assetType: AssetType,
        metadata: AssetMetadata = AssetMetadata()
    ) async throws -> AssetUploadResult {
        
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            throw LuluPayError.fileNotFound
        }
        
        let assetId = UUID().uuidString
        
        // Start tracking upload progress
        await MainActor.run {
            uploadProgress[assetId] = 0.0
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            assetManager.uploadAsset(
                fileURL: fileURL,
                assetType: assetType,
                metadata: metadata
            ) { [weak self] progress in
                Task { @MainActor in
                    self?.uploadProgress[assetId] = progress
                }
            } completion: { result in
                Task { @MainActor in
                    self.uploadProgress.removeValue(forKey: assetId)
                }
                
                switch result {
                case .success(let uploadResult):
                    // Cache the asset locally
                    self.cacheManager.cacheAsset(uploadResult.assetId, fileURL: fileURL)
                    continuation.resume(returning: uploadResult)
                case .failure(let error):
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    /**
     * Get asset information
     */
    public func getAsset(assetId: String) async throws -> Asset {
        return try await assetManager.getAsset(assetId: assetId)
    }
    
    /**
     * List all assets for the partner
     */
    public func listAssets(
        page: Int = 1,
        limit: Int = 50,
        assetType: AssetType? = nil
    ) async throws -> AssetList {
        return try await assetManager.listAssets(page: page, limit: limit, assetType: assetType)
    }
    
    /**
     * Delete asset
     */
    public func deleteAsset(assetId: String) async throws {
        try await assetManager.deleteAsset(assetId: assetId)
        cacheManager.removeCachedAsset(assetId: assetId)
    }
    
    /**
     * Download asset to local cache
     */
    public func downloadAsset(
        assetId: String,
        progressHandler: @escaping (Float) -> Void = { _ in }
    ) async throws -> URL {
        return try await assetManager.downloadAsset(assetId: assetId, progressHandler: progressHandler)
    }
    
    // MARK: - Build Management
    
    /**
     * Trigger a new build
     */
    public func triggerBuild(
        buildConfig: BuildConfiguration
    ) async throws -> BuildResult {
        
        print("Triggering build with config: \(buildConfig.buildType)")
        
        let buildResult = try await buildMonitor.triggerBuild(config: buildConfig)
        
        // Start monitoring build progress
        startMonitoringBuild(buildId: buildResult.buildId)
        
        return buildResult
    }
    
    /**
     * Get build status
     */
    public func getBuildStatus(buildId: String) async throws -> BuildStatus {
        return try await buildMonitor.getBuildStatus(buildId: buildId)
    }
    
    /**
     * Get build details
     */
    public func getBuildDetails(buildId: String) async throws -> BuildDetails {
        return try await buildMonitor.getBuildDetails(buildId: buildId)
    }
    
    /**
     * List builds for the partner
     */
    public func listBuilds(
        page: Int = 1,
        limit: Int = 20,
        status: BuildStatus? = nil
    ) async throws -> BuildList {
        return try await buildMonitor.listBuilds(page: page, limit: limit, status: status)
    }
    
    /**
     * Cancel a running build
     */
    public func cancelBuild(buildId: String) async throws {
        try await buildMonitor.cancelBuild(buildId: buildId)
        
        // Remove from active builds
        await MainActor.run {
            activeBuilds.removeAll { $0.buildId == buildId }
        }
    }
    
    // MARK: - Real-time Monitoring
    
    /**
     * Get build progress publisher for real-time updates
     */
    public func buildProgressPublisher(buildId: String) -> AnyPublisher<BuildProgress, Error> {
        return buildMonitor.buildProgressPublisher(buildId: buildId)
    }
    
    /**
     * Get global build events stream
     */
    public func buildEventsPublisher() -> AnyPublisher<BuildEvent, Never> {
        return buildMonitor.buildEventsPublisher()
    }
    
    private func startMonitoringBuild(buildId: String) {
        buildProgressPublisher(buildId: buildId)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    switch completion {
                    case .finished:
                        break
                    case .failure(let error):
                        print("Build monitoring error: \(error)")
                    }
                },
                receiveValue: { [weak self] progress in
                    self?.updateActiveBuildProgress(progress)
                }
            )
            .store(in: &cancellables)
    }
    
    private func updateActiveBuildProgress(_ progress: BuildProgress) {
        if let index = activeBuilds.firstIndex(where: { $0.buildId == progress.buildId }) {
            activeBuilds[index] = progress
        } else {
            activeBuilds.append(progress)
        }
        
        // Remove completed builds after a delay
        if progress.status == .completed || progress.status == .failed {
            DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) { [weak self] in
                self?.activeBuilds.removeAll { $0.buildId == progress.buildId }
            }
        }
    }
    
    // MARK: - Partner Information
    
    /**
     * Get partner information
     */
    public func getPartnerInfo() async throws -> PartnerInfo {
        return try await apiService.getPartnerInfo()
    }
    
    /**
     * Get usage statistics
     */
    public func getUsageStats() async throws -> UsageStats {
        return try await apiService.getUsageStats()
    }
    
    /**
     * Update partner profile
     */
    public func updatePartnerProfile(profile: PartnerProfile) async throws -> PartnerInfo {
        return try await apiService.updatePartnerProfile(profile: profile)
    }
    
    // MARK: - Configuration Management
    
    /**
     * Get current SDK configuration
     */
    public func getConfig() -> LuluPayConfig {
        return config
    }
    
    /**
     * Test API connectivity
     */
    public func testConnection() async throws -> Bool {
        return try await apiService.testConnection()
    }
    
    /**
     * Get SDK health status
     */
    public func getHealthStatus() -> SDKHealthStatus {
        return SDKHealthStatus(
            version: Self.version,
            isConnected: isConnected,
            cacheSize: cacheManager.getCacheSize(),
            activeBuildsCount: activeBuilds.count,
            configurationValid: config.isValid
        )
    }
    
    // MARK: - Network Monitoring
    
    private func setupNetworkMonitoring() {
        let monitor = NWPathMonitor()
        let queue = DispatchQueue(label: "NetworkMonitor")
        
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
            }
        }
        
        monitor.start(queue: queue)
    }
    
    private func setupBuildStreaming() {
        // Setup real-time build event streaming
        buildEventsPublisher()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] event in
                self?.handleBuildEvent(event)
            }
            .store(in: &cancellables)
    }
    
    private func handleBuildEvent(_ event: BuildEvent) {
        // Handle global build events
        print("Build event: \(event.event) for build \(event.buildId)")
    }
    
    // MARK: - Cleanup
    
    deinit {
        cancellables.removeAll()
        cacheManager.cleanup()
    }
}

// MARK: - Configuration

public struct LuluPayConfig {
    public let apiKey: String
    public let partnerId: String
    public let baseURL: URL
    public let enableLogging: Bool
    public let enableCaching: Bool
    public let cacheMaxSize: Int64
    public let requestTimeout: TimeInterval
    public let enableRealTimeUpdates: Bool
    
    public init(
        apiKey: String,
        partnerId: String,
        baseURL: URL = URL(string: "https://api.lulupay.com")!,
        enableLogging: Bool = false,
        enableCaching: Bool = true,
        cacheMaxSize: Int64 = 100 * 1024 * 1024, // 100MB
        requestTimeout: TimeInterval = 60.0,
        enableRealTimeUpdates: Bool = true
    ) {
        self.apiKey = apiKey
        self.partnerId = partnerId
        self.baseURL = baseURL
        self.enableLogging = enableLogging
        self.enableCaching = enableCaching
        self.cacheMaxSize = cacheMaxSize
        self.requestTimeout = requestTimeout
        self.enableRealTimeUpdates = enableRealTimeUpdates
    }
    
    var isValid: Bool {
        return !apiKey.isEmpty && !partnerId.isEmpty
    }
}

// MARK: - Models

public enum AssetType: String, CaseIterable, Codable {
    case appIcon = "app_icon"
    case splashScreen = "splash_screen"
    case logo = "logo"
    case backgroundImage = "background_image"
    case buttonImage = "button_image"
    case customFont = "custom_font"
    case colorScheme = "color_scheme"
    case themeConfig = "theme_config"
    case other = "other"
}

public struct AssetMetadata: Codable {
    public let name: String
    public let description: String
    public let tags: [String]
    public let category: String
    public let version: String
    public let customProperties: [String: String]
    
    public init(
        name: String = "",
        description: String = "",
        tags: [String] = [],
        category: String = "",
        version: String = "1.0.0",
        customProperties: [String: String] = [:]
    ) {
        self.name = name
        self.description = description
        self.tags = tags
        self.category = category
        self.version = version
        self.customProperties = customProperties
    }
}

public struct AssetUploadResult: Codable {
    public let assetId: String
    public let url: String
    public let cdnUrl: String?
    public let size: Int64
    public let contentType: String
    public let uploadedAt: Date
}

public struct Asset: Codable, Identifiable {
    public let id: String
    public let name: String
    public let type: AssetType
    public let url: String
    public let cdnUrl: String?
    public let size: Int64
    public let contentType: String
    public let metadata: AssetMetadata
    public let createdAt: Date
    public let updatedAt: Date
}

public struct AssetList: Codable {
    public let assets: [Asset]
    public let totalCount: Int
    public let page: Int
    public let limit: Int
    public let hasMore: Bool
}

public struct BuildConfiguration: Codable {
    public let buildType: String
    public let appName: String
    public let packageName: String
    public let versionName: String
    public let versionCode: Int
    public let assetIds: [String]
    public let themeConfig: ThemeConfig?
    public let features: [String]
    public let customProperties: [String: String]
    
    public init(
        buildType: String = "release",
        appName: String,
        packageName: String,
        versionName: String = "1.0.0",
        versionCode: Int = 1,
        assetIds: [String],
        themeConfig: ThemeConfig? = nil,
        features: [String] = [],
        customProperties: [String: String] = [:]
    ) {
        self.buildType = buildType
        self.appName = appName
        self.packageName = packageName
        self.versionName = versionName
        self.versionCode = versionCode
        self.assetIds = assetIds
        self.themeConfig = themeConfig
        self.features = features
        self.customProperties = customProperties
    }
}

public struct ThemeConfig: Codable {
    public let primaryColor: String
    public let secondaryColor: String
    public let backgroundColor: String
    public let textColor: String
    public let accentColor: String
    public let fontFamily: String
    public let borderRadius: Int
    public let customCSS: String
    
    public init(
        primaryColor: String,
        secondaryColor: String,
        backgroundColor: String,
        textColor: String,
        accentColor: String,
        fontFamily: String = "system",
        borderRadius: Int = 8,
        customCSS: String = ""
    ) {
        self.primaryColor = primaryColor
        self.secondaryColor = secondaryColor
        self.backgroundColor = backgroundColor
        self.textColor = textColor
        self.accentColor = accentColor
        self.fontFamily = fontFamily
        self.borderRadius = borderRadius
        self.customCSS = customCSS
    }
}

public enum BuildStatus: String, CaseIterable, Codable {
    case queued = "queued"
    case running = "running"
    case completed = "completed"
    case failed = "failed"
    case cancelled = "cancelled"
}

public struct BuildResult: Codable, Identifiable {
    public let id: String
    public let buildId: String
    public let status: BuildStatus
    public let createdAt: Date
    public let completedAt: Date?
    public let downloadURL: String?
    public let errorMessage: String?
}

public struct BuildDetails: Codable {
    public let buildId: String
    public let status: BuildStatus
    public let progress: Float
    public let stages: [BuildStage]
    public let logs: [BuildLog]
    public let assets: [Asset]
    public let config: BuildConfiguration
    public let createdAt: Date
    public let startedAt: Date?
    public let completedAt: Date?
    public let duration: TimeInterval?
    public let downloadURL: String?
    public let errorMessage: String?
}

public struct BuildStage: Codable, Identifiable {
    public let id = UUID()
    public let name: String
    public let status: BuildStatus
    public let startedAt: Date?
    public let completedAt: Date?
    public let duration: TimeInterval?
    public let progress: Float
}

public struct BuildLog: Codable, Identifiable {
    public let id = UUID()
    public let timestamp: Date
    public let level: String
    public let message: String
    public let stage: String?
}

public struct BuildProgress: Codable, Identifiable {
    public let id = UUID()
    public let buildId: String
    public let status: BuildStatus
    public let overallProgress: Float
    public let currentStage: String
    public let stageProgress: Float
    public let estimatedTimeRemaining: TimeInterval?
    public let message: String?
}

public struct BuildEvent: Codable {
    public let buildId: String
    public let event: String
    public let data: [String: String]?
    public let timestamp: Date
}

public struct BuildList: Codable {
    public let builds: [BuildResult]
    public let totalCount: Int
    public let page: Int
    public let limit: Int
    public let hasMore: Bool
}

public struct PartnerInfo: Codable {
    public let partnerId: String
    public let name: String
    public let email: String
    public let subscriptionTier: String
    public let status: String
    public let createdAt: Date
    public let lastLoginAt: Date?
}

public struct PartnerProfile: Codable {
    public let name: String
    public let email: String
    public let companyName: String?
    public let website: String?
    public let description: String?
}

public struct UsageStats: Codable {
    public let buildsThisMonth: Int
    public let buildsLimit: Int
    public let storageUsed: Int64
    public let storageLimit: Int64
    public let assetsCount: Int
    public let assetsLimit: Int
    public let apiCallsThisMonth: Int
    public let apiCallsLimit: Int
}

public struct SDKHealthStatus {
    public let version: String
    public let isConnected: Bool
    public let cacheSize: Int64
    public let activeBuildsCount: Int
    public let configurationValid: Bool
}

// MARK: - Errors

public enum LuluPayError: Error, LocalizedError {
    case alreadyInitialized
    case notInitialized
    case invalidConfiguration
    case fileNotFound
    case networkError(String)
    case apiError(Int, String)
    case uploadFailed(String)
    case buildFailed(String)
    case unauthorized
    case rateLimited
    case invalidResponse
    
    public var errorDescription: String? {
        switch self {
        case .alreadyInitialized:
            return "LuluPay SDK is already initialized"
        case .notInitialized:
            return "LuluPay SDK is not initialized. Call initialize() first."
        case .invalidConfiguration:
            return "Invalid SDK configuration"
        case .fileNotFound:
            return "File not found"
        case .networkError(let message):
            return "Network error: \(message)"
        case .apiError(let code, let message):
            return "API error (\(code)): \(message)"
        case .uploadFailed(let message):
            return "Upload failed: \(message)"
        case .buildFailed(let message):
            return "Build failed: \(message)"
        case .unauthorized:
            return "Unauthorized. Check your API key."
        case .rateLimited:
            return "Rate limited. Please try again later."
        case .invalidResponse:
            return "Invalid response from server"
        }
    }
}

// MARK: - Internal Services

internal class APIService {
    private let config: LuluPayConfig
    private let session: URLSession
    
    init(config: LuluPayConfig) {
        self.config = config
        
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = config.requestTimeout
        configuration.timeoutIntervalForResource = config.requestTimeout * 2
        
        self.session = URLSession(configuration: configuration)
    }
    
    func getPartnerInfo() async throws -> PartnerInfo {
        // Implementation for getting partner info
        return PartnerInfo(
            partnerId: config.partnerId,
            name: "Test Partner",
            email: "partner@example.com",
            subscriptionTier: "pro",
            status: "active",
            createdAt: Date(),
            lastLoginAt: Date()
        )
    }
    
    func getUsageStats() async throws -> UsageStats {
        // Implementation for getting usage stats
        return UsageStats(
            buildsThisMonth: 25,
            buildsLimit: 100,
            storageUsed: 50 * 1024 * 1024,
            storageLimit: 1024 * 1024 * 1024,
            assetsCount: 15,
            assetsLimit: 100,
            apiCallsThisMonth: 500,
            apiCallsLimit: 10000
        )
    }
    
    func updatePartnerProfile(profile: PartnerProfile) async throws -> PartnerInfo {
        // Implementation for updating partner profile
        return PartnerInfo(
            partnerId: config.partnerId,
            name: profile.name,
            email: profile.email,
            subscriptionTier: "pro",
            status: "active",
            createdAt: Date(),
            lastLoginAt: Date()
        )
    }
    
    func testConnection() async throws -> Bool {
        // Implementation for testing connection
        return true
    }
}

internal class AssetManager {
    private let apiService: APIService
    
    init(apiService: APIService) {
        self.apiService = apiService
    }
    
    func uploadAsset(
        fileURL: URL,
        assetType: AssetType,
        metadata: AssetMetadata,
        progressHandler: @escaping (Float) -> Void,
        completion: @escaping (Result<AssetUploadResult, Error>) -> Void
    ) {
        // Implementation for asset upload with progress
        DispatchQueue.global().async {
            // Simulate upload progress
            for i in 0...10 {
                DispatchQueue.main.async {
                    progressHandler(Float(i) / 10.0)
                }
                Thread.sleep(forTimeInterval: 0.1)
            }
            
            let result = AssetUploadResult(
                assetId: UUID().uuidString,
                url: "https://assets.lulupay.com/asset-123",
                cdnUrl: "https://cdn.lulupay.com/asset-123",
                size: 1024,
                contentType: "image/png",
                uploadedAt: Date()
            )
            
            DispatchQueue.main.async {
                completion(.success(result))
            }
        }
    }
    
    func getAsset(assetId: String) async throws -> Asset {
        // Implementation for getting asset
        return Asset(
            id: assetId,
            name: "Test Asset",
            type: .appIcon,
            url: "https://assets.lulupay.com/\(assetId)",
            cdnUrl: "https://cdn.lulupay.com/\(assetId)",
            size: 1024,
            contentType: "image/png",
            metadata: AssetMetadata(),
            createdAt: Date(),
            updatedAt: Date()
        )
    }
    
    func listAssets(page: Int, limit: Int, assetType: AssetType?) async throws -> AssetList {
        // Implementation for listing assets
        return AssetList(
            assets: [],
            totalCount: 0,
            page: page,
            limit: limit,
            hasMore: false
        )
    }
    
    func deleteAsset(assetId: String) async throws {
        // Implementation for deleting asset
    }
    
    func downloadAsset(assetId: String, progressHandler: @escaping (Float) -> Void) async throws -> URL {
        // Implementation for downloading asset
        return URL(fileURLWithPath: "/tmp/asset")
    }
}

internal class BuildMonitor {
    private let apiService: APIService
    
    init(apiService: APIService) {
        self.apiService = apiService
    }
    
    func triggerBuild(config: BuildConfiguration) async throws -> BuildResult {
        // Implementation for triggering build
        return BuildResult(
            id: UUID().uuidString,
            buildId: "build-\(Date().timeIntervalSince1970)",
            status: .queued,
            createdAt: Date(),
            completedAt: nil,
            downloadURL: nil,
            errorMessage: nil
        )
    }
    
    func getBuildStatus(buildId: String) async throws -> BuildStatus {
        // Implementation for getting build status
        return .running
    }
    
    func getBuildDetails(buildId: String) async throws -> BuildDetails {
        // Implementation for getting build details
        return BuildDetails(
            buildId: buildId,
            status: .running,
            progress: 0.5,
            stages: [],
            logs: [],
            assets: [],
            config: BuildConfiguration(appName: "Test App", packageName: "com.test.app", assetIds: []),
            createdAt: Date(),
            startedAt: Date(),
            completedAt: nil,
            duration: nil,
            downloadURL: nil,
            errorMessage: nil
        )
    }
    
    func listBuilds(page: Int, limit: Int, status: BuildStatus?) async throws -> BuildList {
        // Implementation for listing builds
        return BuildList(
            builds: [],
            totalCount: 0,
            page: page,
            limit: limit,
            hasMore: false
        )
    }
    
    func cancelBuild(buildId: String) async throws {
        // Implementation for cancelling build
    }
    
    func buildProgressPublisher(buildId: String) -> AnyPublisher<BuildProgress, Error> {
        // Implementation for build progress publisher
        return Timer.publish(every: 1.0, on: .main, in: .common)
            .autoconnect()
            .map { _ in
                BuildProgress(
                    buildId: buildId,
                    status: .running,
                    overallProgress: Float.random(in: 0...1),
                    currentStage: "Building...",
                    stageProgress: Float.random(in: 0...1),
                    estimatedTimeRemaining: 300,
                    message: "Processing assets..."
                )
            }
            .setFailureType(to: Error.self)
            .eraseToAnyPublisher()
    }
    
    func buildEventsPublisher() -> AnyPublisher<BuildEvent, Never> {
        // Implementation for build events publisher
        return Timer.publish(every: 5.0, on: .main, in: .common)
            .autoconnect()
            .map { _ in
                BuildEvent(
                    buildId: "build-123",
                    event: "progress",
                    data: ["progress": "0.5"],
                    timestamp: Date()
                )
            }
            .eraseToAnyPublisher()
    }
}

internal class CacheManager {
    func cacheAsset(_ assetId: String, fileURL: URL) {
        // Implementation for caching assets locally
    }
    
    func removeCachedAsset(assetId: String) {
        // Implementation for removing cached assets
    }
    
    func getCacheSize() -> Int64 {
        // Implementation for getting cache size
        return 50 * 1024 * 1024 // 50MB
    }
    
    func cleanup() {
        // Implementation for cache cleanup
    }
} 