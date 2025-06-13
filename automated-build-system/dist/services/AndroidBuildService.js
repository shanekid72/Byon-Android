"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AndroidBuildService = void 0;
const child_process_1 = require("child_process");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const temp_utils_1 = require("../utils/temp-utils");
const Build_model_1 = require("../models/Build.model");
class AndroidBuildService {
    constructor() {
        this.BUILD_DIR = process.env.BUILD_STORAGE_PATH || './storage/builds';
        this.TEMP_DIR = process.env.TEMP_BUILD_PATH || './storage/temp';
        this.TEMPLATE_DIR = './templates/android-base';
        this.DOCKER_IMAGE = 'lulupay/android-builder:latest';
        this.ensureDirectories();
    }
    async ensureDirectories() {
        await fs_extra_1.default.ensureDir(this.BUILD_DIR);
        await fs_extra_1.default.ensureDir(this.TEMP_DIR);
        await fs_extra_1.default.ensureDir(path_1.default.join(this.BUILD_DIR, 'artifacts'));
        await fs_extra_1.default.ensureDir(path_1.default.join(this.BUILD_DIR, 'logs'));
    }
    async buildAndroidApp(config) {
        const startTime = Date.now();
        const buildPath = path_1.default.join(this.TEMP_DIR, config.buildId);
        try {
            temp_utils_1.logger.info(`Starting Android build: ${config.buildId}`);
            await this.updateBuildProgress(config.buildId, 5, 'Preparing build environment');
            await this.prepareBuildDirectory(buildPath, config);
            await this.updateBuildProgress(config.buildId, 25, 'Build environment ready');
            await this.processTemplate(buildPath, config);
            await this.updateBuildProgress(config.buildId, 45, 'Template processing complete');
            await this.processAssets(buildPath, config);
            await this.updateBuildProgress(config.buildId, 65, 'Assets processed and injected');
            const buildResult = await this.executeAndroidBuild(buildPath, config);
            await this.updateBuildProgress(config.buildId, 85, 'Android compilation complete');
            const artifacts = await this.packageArtifacts(buildPath, config);
            await this.updateBuildProgress(config.buildId, 100, 'Build completed successfully');
            await fs_extra_1.default.remove(buildPath);
            const buildDuration = Date.now() - startTime;
            temp_utils_1.logger.info(`Android build completed: ${config.buildId}`, {
                duration: `${buildDuration}ms`,
                artifacts
            });
            return {
                success: true,
                buildId: config.buildId,
                artifacts,
                buildDuration
            };
        }
        catch (error) {
            temp_utils_1.logger.error(`Android build failed: ${config.buildId}`, error);
            await fs_extra_1.default.remove(buildPath).catch(() => { });
            return {
                success: false,
                buildId: config.buildId,
                error: error instanceof Error ? error.message : 'Unknown build error',
                buildDuration: Date.now() - startTime
            };
        }
    }
    async prepareBuildDirectory(buildPath, config) {
        await fs_extra_1.default.ensureDir(buildPath);
        await this.createBasicAndroidProject(buildPath, config);
        temp_utils_1.logger.info(`Android project created: ${buildPath}`);
    }
    async createBasicAndroidProject(buildPath, config) {
        const { appName, packageName, version } = config.partnerConfig;
        const gradleWrapperScript = `#!/bin/bash
exec java -jar gradlew.jar "$@"`;
        await fs_extra_1.default.writeFile(path_1.default.join(buildPath, 'gradlew'), gradleWrapperScript);
        await fs_extra_1.default.writeFile(path_1.default.join(buildPath, 'gradlew.bat'), '@echo off\njava -jar gradlew.jar %*');
        const buildGradle = `
allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
`;
        await fs_extra_1.default.writeFile(path_1.default.join(buildPath, 'build.gradle'), buildGradle);
        await fs_extra_1.default.writeFile(path_1.default.join(buildPath, 'settings.gradle'), `include ':app'`);
    }
    async processTemplate(buildPath, config) {
        temp_utils_1.logger.info(`Processing template for: ${config.partnerConfig.appName}`);
    }
    async processAssets(buildPath, config) {
        if (config.assets && config.assets.length > 0) {
            temp_utils_1.logger.info(`Processing ${config.assets.length} assets`);
        }
    }
    async executeAndroidBuild(buildPath, config) {
        return new Promise((resolve, reject) => {
            const dockerCommand = [
                'run', '--rm',
                '-v', `${buildPath}:/workspace`,
                '-e', `BUILD_ID=${config.buildId}`,
                '-e', `BUILD_TYPE=${config.buildType}`,
                '-e', `APP_NAME=${config.partnerConfig.appName}`,
                '-e', `PACKAGE_NAME=${config.partnerConfig.packageName}`,
                '-e', `VERSION=${config.partnerConfig.version}`,
                this.DOCKER_IMAGE
            ];
            const buildProcess = (0, child_process_1.spawn)('docker', dockerCommand, {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            let output = '';
            let errorOutput = '';
            buildProcess.stdout?.on('data', (data) => {
                output += data.toString();
            });
            buildProcess.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });
            buildProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, output });
                }
                else {
                    reject(new Error(`Docker build failed with code ${code}: ${errorOutput}`));
                }
            });
            buildProcess.on('error', (error) => {
                reject(error);
            });
        });
    }
    async packageArtifacts(buildPath, config) {
        const artifactsDir = path_1.default.join(this.BUILD_DIR, 'artifacts', config.buildId);
        await fs_extra_1.default.ensureDir(artifactsDir);
        const artifacts = {};
        const buildReport = {
            buildId: config.buildId,
            appName: config.partnerConfig.appName,
            packageName: config.partnerConfig.packageName,
            version: config.partnerConfig.version,
            buildType: config.buildType,
            timestamp: new Date().toISOString()
        };
        const reportPath = path_1.default.join(artifactsDir, 'build-report.json');
        await fs_extra_1.default.writeJson(reportPath, buildReport, { spaces: 2 });
        artifacts.buildReport = reportPath;
        return artifacts;
    }
    async updateBuildProgress(buildId, progress, currentStep) {
        try {
            await Build_model_1.Build.findByIdAndUpdate(buildId, {
                progress,
                currentStep,
                updatedAt: new Date()
            });
        }
        catch (error) {
            temp_utils_1.logger.error('Failed to update build progress:', error);
        }
    }
}
exports.AndroidBuildService = AndroidBuildService;
//# sourceMappingURL=AndroidBuildService.js.map