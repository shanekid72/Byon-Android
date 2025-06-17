package com.lulupay.generator

import com.lulupay.generator.models.*
import org.springframework.stereotype.Service
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import kotlinx.coroutines.*
import java.util.concurrent.Executors

/**
 * Main service for generating partner apps
 * Orchestrates the entire process from configuration to deployable APK
 */
@Service
class AppGeneratorService {
    
    private val buildConfigGenerator = BuildConfigGenerator()
    private val assetProcessor = AssetProcessor()
    private val executorService = Executors.newFixedThreadPool(4)
    private val coroutineScope = CoroutineScope(executorService.asCoroutineDispatcher())
    
    /**
     * Generates a complete partner app
     */
    suspend fun generateApp(config: PartnerAppConfig): GenerationResult {
        val workspaceDir = createWorkspace(config.partnerId)
        val buildLogs = mutableListOf<String>()
        val warnings = mutableListOf<String>()
        
        try {
            buildLogs.add("Starting app generation for partner: ${config.partnerName}")
            
            // Step 1: Validate configuration
            val validationResult = validateConfiguration(config)
            if (!validationResult.isValid) {
                return GenerationResult(
                    success = false,
                    partnerId = config.partnerId,
                    error = validationResult.errors.joinToString(", ") { it.message },
                    warnings = validationResult.warnings.map { it.message }
                )
            }
            warnings.addAll(validationResult.warnings.map { it.message })
            
            // Step 2: Clone base application
            buildLogs.add("Cloning base application...")
            cloneBaseApplication(workspaceDir)
            
            // Step 3: Apply partner configuration
            buildLogs.add("Applying partner branding...")
            applyPartnerBranding(workspaceDir, config)
            
            // Step 4: Generate assets
            buildLogs.add("Generating partner assets...")
            generatePartnerAssets(workspaceDir, config)
            
            // Step 5: Update configuration files
            buildLogs.add("Updating configuration files...")
            updateConfigurationFiles(workspaceDir, config)
            
            // Step 6: Build APK
            buildLogs.add("Building partner APK...")
            val apkPath = buildPartnerApp(workspaceDir, config)
            
            // Step 7: Create source code package
            buildLogs.add("Creating source code package...")
            val sourceCodePath = createSourceCodePackage(workspaceDir, config)
            
            // Step 8: Upload artifacts
            buildLogs.add("Uploading artifacts...")
            val downloadUrls = uploadAppArtifacts(apkPath, sourceCodePath, config)
            
            buildLogs.add("App generation completed successfully!")
            
            return GenerationResult(
                success = true,
                partnerId = config.partnerId,
                downloadUrls = downloadUrls,
                warnings = warnings,
                buildLogs = buildLogs
            )
            
        } catch (e: Exception) {
            buildLogs.add("Error: ${e.message}")
            return GenerationResult(
                success = false,
                partnerId = config.partnerId,
                error = e.message,
                warnings = warnings,
                buildLogs = buildLogs
            )
        } finally {
            // Cleanup workspace
            cleanupWorkspace(workspaceDir)
        }
    }
    
    /**
     * Validates partner configuration
     */
    private fun validateConfiguration(config: PartnerAppConfig): ValidationResult {
        val errors = mutableListOf<ValidationError>()
        val warnings = mutableListOf<ValidationWarning>()
        
        // Validate required fields
        if (config.partnerId.isBlank()) {
            errors.add(ValidationError("partnerId", "Partner ID cannot be blank", "MISSING_PARTNER_ID"))
        }
        
        if (config.partnerName.isBlank()) {
            errors.add(ValidationError("partnerName", "Partner name cannot be blank", "MISSING_PARTNER_NAME"))
        }
        
        if (config.appName.isBlank()) {
            errors.add(ValidationError("appName", "App name cannot be blank", "MISSING_APP_NAME"))
        }
        
        // Validate package name
        val packageNameRegex = Regex("^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)*$")
        if (!config.packageName.matches(packageNameRegex)) {
            errors.add(ValidationError("packageName", "Invalid package name format", "INVALID_PACKAGE_NAME"))
        }
        
        // Validate colors
        val colorRegex = Regex("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$")
        if (!config.brandConfig.primaryColor.matches(colorRegex)) {
            errors.add(ValidationError("primaryColor", "Invalid primary color format", "INVALID_COLOR"))
        }
        
        if (!config.brandConfig.secondaryColor.matches(colorRegex)) {
            errors.add(ValidationError("secondaryColor", "Invalid secondary color format", "INVALID_COLOR"))
        }
        
        // Validate logo assets
        if (config.brandConfig.appIcon.isBlank()) {
            errors.add(ValidationError("appIcon", "App icon is required", "MISSING_APP_ICON"))
        }
        
        // Warnings for best practices
        if (config.appName.length > 30) {
            warnings.add(ValidationWarning("appName", "App name is longer than 30 characters", "LONG_APP_NAME"))
        }
        
        if (config.brandConfig.primaryColor == config.brandConfig.secondaryColor) {
            warnings.add(ValidationWarning("colors", "Primary and secondary colors are the same", "SAME_COLORS"))
        }
        
        return ValidationResult(
            isValid = errors.isEmpty(),
            errors = errors,
            warnings = warnings
        )
    }
    
    /**
     * Creates a temporary workspace for building
     */
    private fun createWorkspace(partnerId: String): File {
        val tempDir = System.getProperty("java.io.tmpdir")
        val workspaceDir = File(tempDir, "lulupay-partner-$partnerId-${System.currentTimeMillis()}")
        workspaceDir.mkdirs()
        return workspaceDir
    }
    
    /**
     * Clones the base LuluPay application
     */
    private fun cloneBaseApplication(workspaceDir: File) {
        // Get the base app directory
        val baseAppDir = File("LuluPay_Android-main")
        if (!baseAppDir.exists()) {
            throw RuntimeException("Base application directory not found: ${baseAppDir.absolutePath}")
        }
        
        // Copy the entire base application structure
        copyDirectory(baseAppDir, workspaceDir)
    }
    
    /**
     * Applies partner-specific branding
     */
    private fun applyPartnerBranding(workspaceDir: File, config: PartnerAppConfig) {
        // Update build.gradle.kts
        val buildGradleContent = buildConfigGenerator.generatePartnerBuildGradle(config)
        val buildGradleFile = File(workspaceDir, "app/build.gradle.kts")
        buildGradleFile.writeText(buildGradleContent)
        
        // Update AndroidManifest.xml
        val manifestContent = buildConfigGenerator.generateAndroidManifest(config)
        val manifestFile = File(workspaceDir, "app/src/main/AndroidManifest.xml")
        manifestFile.writeText(manifestContent)
        
        // Create Application class
        val applicationContent = buildConfigGenerator.generateApplicationClass(config)
        val applicationDir = File(workspaceDir, "app/src/main/java/${config.packageName.replace(".", "/")}")
        applicationDir.mkdirs()
        val applicationFile = File(applicationDir, "${config.partnerName.replace(" ", "")}Application.kt")
        applicationFile.writeText(applicationContent)
        
        // Create MainActivity
        val mainActivityContent = buildConfigGenerator.generateMainActivity(config)
        val activitiesDir = File(applicationDir, "activities")
        activitiesDir.mkdirs()
        val mainActivityFile = File(activitiesDir, "MainActivity.kt")
        mainActivityFile.writeText(mainActivityContent)
    }
    
    /**
     * Generates partner-specific assets
     */
    private fun generatePartnerAssets(workspaceDir: File, config: PartnerAppConfig) {
        val assets = assetProcessor.generatePartnerAssets(config)
        
        // Create res directories
        val resDir = File(workspaceDir, "app/src/main/res")
        resDir.mkdirs()
        
        // Write color resources
        val valuesDir = File(resDir, "values")
        valuesDir.mkdirs()
        File(valuesDir, "colors.xml").writeText(assets.colorResources)
        File(valuesDir, "strings.xml").writeText(assets.stringResources)
        File(valuesDir, "themes.xml").writeText(assets.themeResources)
        
        // Generate app icons
        assets.appIcons.forEach { (density, iconData) ->
            val iconDir = File(resDir, density)
            iconDir.mkdirs()
            // Save icon data (base64 to file conversion would be implemented here)
            File(iconDir, "ic_launcher.png").writeText("<!-- Icon data: $iconData -->")
        }
    }
    
    /**
     * Updates configuration files
     */
    private fun updateConfigurationFiles(workspaceDir: File, config: PartnerAppConfig) {
        // Update settings.gradle.kts
        val settingsFile = File(workspaceDir, "settings.gradle.kts")
        if (settingsFile.exists()) {
            val content = settingsFile.readText()
            val updatedContent = content.replace(
                "rootProject.name = \"Lulupay\"",
                "rootProject.name = \"${config.partnerName.replace(" ", "")}\""
            )
            settingsFile.writeText(updatedContent)
        }
    }
    
    /**
     * Builds the partner APK
     */
    private fun buildPartnerApp(workspaceDir: File, config: PartnerAppConfig): String {
        val gradlewFile = File(workspaceDir, if (isWindows()) "gradlew.bat" else "gradlew")
        
        if (!gradlewFile.exists()) {
            throw RuntimeException("Gradle wrapper not found")
        }
        
        // Make gradlew executable on Unix systems
        if (!isWindows()) {
            gradlewFile.setExecutable(true)
        }
        
        // Build the app
        val buildCommand = if (isWindows()) {
            listOf("cmd", "/c", "gradlew.bat", "assembleRelease")
        } else {
            listOf("./gradlew", "assembleRelease")
        }
        
        val processBuilder = ProcessBuilder(buildCommand)
        processBuilder.directory(workspaceDir)
        processBuilder.redirectErrorStream(true)
        
        val process = processBuilder.start()
        val exitCode = process.waitFor()
        
        if (exitCode != 0) {
            val output = process.inputStream.bufferedReader().readText()
            throw RuntimeException("Build failed with exit code $exitCode: $output")
        }
        
        // Find the generated APK
        val apkFile = File(workspaceDir, "app/build/outputs/apk/release/app-release.apk")
        if (!apkFile.exists()) {
            throw RuntimeException("APK file not found after build")
        }
        
        return apkFile.absolutePath
    }
    
    /**
     * Creates source code package
     */
    private fun createSourceCodePackage(workspaceDir: File, config: PartnerAppConfig): String {
        val zipFile = File(workspaceDir.parent, "${config.partnerId}-source.zip")
        
        ZipOutputStream(zipFile.outputStream()).use { zip ->
            workspaceDir.walkTopDown().forEach { file ->
                if (file.isFile && !file.name.endsWith(".zip")) {
                    val relativePath = workspaceDir.toPath().relativize(file.toPath()).toString()
                    zip.putNextEntry(ZipEntry(relativePath))
                    file.inputStream().use { it.copyTo(zip) }
                    zip.closeEntry()
                }
            }
        }
        
        return zipFile.absolutePath
    }
    
    /**
     * Uploads app artifacts to storage
     */
    private fun uploadAppArtifacts(apkPath: String, sourceCodePath: String, config: PartnerAppConfig): Map<String, String> {
        // In production, upload to cloud storage (S3, etc.)
        // For now, return local file paths
        return mapOf(
            "apk" to "file://$apkPath",
            "sourceCode" to "file://$sourceCodePath",
            "documentation" to generateDocumentationUrl(config)
        )
    }
    
    /**
     * Generates documentation URL
     */
    private fun generateDocumentationUrl(config: PartnerAppConfig): String {
        return "https://docs.lulupay.com/partners/${config.partnerId}"
    }
    
    /**
     * Cleans up workspace
     */
    private fun cleanupWorkspace(workspaceDir: File) {
        try {
            workspaceDir.deleteRecursively()
        } catch (e: Exception) {
            println("Warning: Failed to cleanup workspace: ${e.message}")
        }
    }
    
    /**
     * Utility function to copy directories
     */
    private fun copyDirectory(source: File, target: File) {
        if (source.isDirectory) {
            if (!target.exists()) {
                target.mkdirs()
            }
            
            source.listFiles()?.forEach { file ->
                val targetFile = File(target, file.name)
                if (file.isDirectory) {
                    copyDirectory(file, targetFile)
                } else {
                    Files.copy(file.toPath(), targetFile.toPath(), StandardCopyOption.REPLACE_EXISTING)
                }
            }
        }
    }
    
    /**
     * Checks if running on Windows
     */
    private fun isWindows(): Boolean {
        return System.getProperty("os.name").lowercase().contains("windows")
    }
} 