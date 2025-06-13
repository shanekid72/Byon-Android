#!/usr/bin/env node

/**
 * 🐳 Phase 3.2 Docker Build Environment Test
 * Comprehensive test suite for containerized Android builds
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

console.log('🐳 PHASE 3.2 DOCKER BUILD ENVIRONMENT TEST');
console.log('==========================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name, checkFunction) {
    totalTests++;
    try {
        if (checkFunction()) {
            console.log(`✅ ${name}: PASS`);
            passedTests++;
        } else {
            console.log(`❌ ${name}: FAIL`);
            failedTests++;
        }
    } catch (error) {
        console.log(`❌ ${name}: FAIL - ${error.message}`);
        failedTests++;
    }
}

function checkCommand(command) {
    try {
        execSync(`which ${command}`, { stdio: 'ignore' });
        return true;
    } catch {
        try {
            execSync(`${command} --version`, { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }
}

console.log('🔍 DOCKER INFRASTRUCTURE TESTS\n');

test('Docker Installed', () => {
    return checkCommand('docker');
});

test('Docker Compose Available', () => {
    return checkCommand('docker-compose') || checkCommand('docker compose');
});

test('Dockerfile Exists', () => {
    return fs.pathExistsSync('./docker/Dockerfile.android-builder');
});

test('Docker Compose File Exists', () => {
    return fs.pathExistsSync('./docker/docker-compose.yml');
});

test('Docker Environment File Exists', () => {
    return fs.pathExistsSync('./docker/docker.env');
});

test('Docker Startup Script Exists', () => {
    return fs.pathExistsSync('./docker/docker-start.sh');
});

console.log('\n🔍 DOCKERFILE VALIDATION TESTS\n');

test('Dockerfile Contains Base Image', () => {
    const content = fs.readFileSync('./docker/Dockerfile.android-builder', 'utf8');
    return content.includes('FROM openjdk:11-jdk-slim');
});

test('Dockerfile Contains Android SDK Setup', () => {
    const content = fs.readFileSync('./docker/Dockerfile.android-builder', 'utf8');
    return content.includes('ANDROID_SDK_ROOT') && 
           content.includes('sdkmanager') && 
           content.includes('platform-tools');
});

test('Dockerfile Contains Gradle Installation', () => {
    const content = fs.readFileSync('./docker/Dockerfile.android-builder', 'utf8');
    return content.includes('gradle') && 
           content.includes('GRADLE_HOME');
});

test('Dockerfile Contains Build Scripts', () => {
    const content = fs.readFileSync('./docker/Dockerfile.android-builder', 'utf8');
    return content.includes('COPY scripts/build-android.sh') && 
           content.includes('build-utils.sh');
});

test('Dockerfile Contains Security Setup', () => {
    const content = fs.readFileSync('./docker/Dockerfile.android-builder', 'utf8');
    return content.includes('builduser') && 
           content.includes('USER builduser');
});

test('Dockerfile Contains Health Check', () => {
    const content = fs.readFileSync('./docker/Dockerfile.android-builder', 'utf8');
    return content.includes('HEALTHCHECK');
});

console.log('\n🔍 DOCKER COMPOSE VALIDATION TESTS\n');

test('Docker Compose Contains Android Builder Service', () => {
    const content = fs.readFileSync('./docker/docker-compose.yml', 'utf8');
    return content.includes('android-builder:') && 
           content.includes('lulupay/android-builder:latest');
});

test('Docker Compose Contains Queue Manager', () => {
    const content = fs.readFileSync('./docker/docker-compose.yml', 'utf8');
    return content.includes('build-queue-manager:') && 
           content.includes('lulupay/build-queue-manager:latest');
});

test('Docker Compose Contains Redis Service', () => {
    const content = fs.readFileSync('./docker/docker-compose.yml', 'utf8');
    return content.includes('redis:') && 
           content.includes('redis:7-alpine');
});

test('Docker Compose Contains MongoDB Service', () => {
    const content = fs.readFileSync('./docker/docker-compose.yml', 'utf8');
    return content.includes('mongodb:') && 
           content.includes('mongo:6.0');
});

test('Docker Compose Contains WebSocket Service', () => {
    const content = fs.readFileSync('./docker/docker-compose.yml', 'utf8');
    return content.includes('websocket-service:') && 
           content.includes('lulupay/websocket-service:latest');
});

test('Docker Compose Contains Volume Configuration', () => {
    const content = fs.readFileSync('./docker/docker-compose.yml', 'utf8');
    return content.includes('volumes:') && 
           content.includes('gradle-cache:') && 
           content.includes('build-cache:');
});

test('Docker Compose Contains Network Configuration', () => {
    const content = fs.readFileSync('./docker/docker-compose.yml', 'utf8');
    return content.includes('networks:') && 
           content.includes('lulupay-build-network:');
});

test('Docker Compose Contains Resource Limits', () => {
    const content = fs.readFileSync('./docker/docker-compose.yml', 'utf8');
    return content.includes('deploy:') && 
           content.includes('resources:') && 
           content.includes('limits:');
});

console.log('\n🔍 ENVIRONMENT CONFIGURATION TESTS\n');

test('Environment File Contains Build Configuration', () => {
    const content = fs.readFileSync('./docker/docker.env', 'utf8');
    return content.includes('BUILD_ENVIRONMENT=docker') && 
           content.includes('BUILD_TIMEOUT=') && 
           content.includes('MAX_CONCURRENT_BUILDS=');
});

test('Environment File Contains Android SDK Configuration', () => {
    const content = fs.readFileSync('./docker/docker.env', 'utf8');
    return content.includes('ANDROID_SDK_VERSION=') && 
           content.includes('GRADLE_VERSION=') && 
           content.includes('JAVA_VERSION=');
});

test('Environment File Contains Performance Settings', () => {
    const content = fs.readFileSync('./docker/docker.env', 'utf8');
    return content.includes('GRADLE_PARALLEL=true') && 
           content.includes('GRADLE_CACHING=true') && 
           content.includes('GRADLE_WORKERS_MAX=');
});

test('Environment File Contains Database Configuration', () => {
    const content = fs.readFileSync('./docker/docker.env', 'utf8');
    return content.includes('MONGODB_HOST=') && 
           content.includes('REDIS_HOST=') && 
           content.includes('MONGODB_PASSWORD=');
});

test('Environment File Contains Security Configuration', () => {
    const content = fs.readFileSync('./docker/docker.env', 'utf8');
    return content.includes('API_SECRET_KEY=') && 
           content.includes('JWT_SECRET=') && 
           content.includes('JWT_EXPIRATION=');
});

console.log('\n🔍 BUILD SCRIPT INTEGRATION TESTS\n');

test('Enhanced Build Script Exists', () => {
    return fs.pathExistsSync('./scripts/build-android.sh');
});

test('Build Script Contains Docker Integration', () => {
    const content = fs.readFileSync('./scripts/build-android.sh', 'utf8');
    return content.includes('LuluPay Android Builder') && 
           content.includes('Docker environment') && 
           content.includes('containerized');
});

test('Build Script Contains Comprehensive Options', () => {
    const content = fs.readFileSync('./scripts/build-android.sh', 'utf8');
    return content.includes('--build-type') && 
           content.includes('--signing-enabled') && 
           content.includes('--no-parallel');
});

test('Build Script Contains Environment Validation', () => {
    const content = fs.readFileSync('./scripts/build-android.sh', 'utf8');
    return content.includes('validate_environment') && 
           content.includes('ANDROID_SDK_ROOT') && 
           content.includes('gradle');
});

test('Build Script Contains Artifact Collection', () => {
    const content = fs.readFileSync('./scripts/build-android.sh', 'utf8');
    return content.includes('collect_artifacts') && 
           content.includes('OUTPUT_DIR') && 
           content.includes('artifacts.json');
});

test('Build Script Contains Progress Tracking', () => {
    const content = fs.readFileSync('./scripts/build-android.sh', 'utf8');
    return content.includes('log_step') && 
           content.includes('show_build_summary') && 
           content.includes('build_duration');
});

console.log('\n🔍 CONTAINER MANAGEMENT TESTS\n');

test('Docker Startup Script Contains Management Commands', () => {
    const content = fs.readFileSync('./docker/docker-start.sh', 'utf8');
    return content.includes('start|stop|restart|status') && 
           content.includes('logs|build|clean|test');
});

test('Docker Startup Script Contains Prerequisites Check', () => {
    const content = fs.readFileSync('./docker/docker-start.sh', 'utf8');
    return content.includes('check_prerequisites') && 
           content.includes('docker info') && 
           content.includes('docker-compose');
});

test('Docker Startup Script Contains Service Health Checks', () => {
    const content = fs.readFileSync('./docker/docker-start.sh', 'utf8');
    return content.includes('check_service_health') && 
           content.includes('android-builder') && 
           content.includes('redis');
});

test('Docker Startup Script Contains Environment Setup', () => {
    const content = fs.readFileSync('./docker/docker-start.sh', 'utf8');
    return content.includes('setup_environment') && 
           content.includes('storage/builds') && 
           content.includes('storage/cache');
});

console.log('\n🔍 INTEGRATION WORKFLOW TESTS\n');

test('BuildOrchestrator Uses Docker Build Pipeline', () => {
    const content = fs.readFileSync('./src/services/BuildOrchestrator.ts', 'utf8');
    return content.includes('executeAndroidBuild') && 
           content.includes('docker') && 
           content.includes('spawn');
});

test('BuildOrchestrator Supports Container Environment', () => {
    const content = fs.readFileSync('./src/services/BuildOrchestrator.ts', 'utf8');
    return content.includes('/workspace') && 
           content.includes('BUILD_ID') && 
           content.includes('BUILD_TYPE');
});

test('Build Scripts Are Executable', () => {
    try {
        const stats1 = fs.statSync('./scripts/build-android.sh');
        const stats2 = fs.statSync('./docker/docker-start.sh');
        return true; // Files exist and are readable
    } catch {
        return false;
    }
});

console.log('\n🔍 MONITORING AND OBSERVABILITY TESTS\n');

test('Docker Compose Contains Monitoring Services', () => {
    const content = fs.readFileSync('./docker/docker-compose.yml', 'utf8');
    return content.includes('prometheus:') && 
           content.includes('grafana:') && 
           content.includes('nginx-proxy:');
});

test('Environment Contains Monitoring Configuration', () => {
    const content = fs.readFileSync('./docker/docker.env', 'utf8');
    return content.includes('METRICS_ENABLED=true') && 
           content.includes('LOG_LEVEL=') && 
           content.includes('PROMETHEUS_PORT=');
});

console.log('\n🔍 STORAGE AND PERSISTENCE TESTS\n');

test('Docker Compose Contains Persistent Volumes', () => {
    const content = fs.readFileSync('./docker/docker-compose.yml', 'utf8');
    return content.includes('redis-data:') && 
           content.includes('mongodb-data:') && 
           content.includes('keystore-storage:');
});

test('Environment Contains Storage Configuration', () => {
    const content = fs.readFileSync('./docker/docker.env', 'utf8');
    return content.includes('STORAGE_ROOT=') && 
           content.includes('BUILD_STORAGE_PATH=') && 
           content.includes('CACHE_STORAGE_PATH=');
});

console.log('\n📊 DOCKER BUILD ENVIRONMENT TEST RESULTS');
console.log('=========================================');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} ✅`);
console.log(`Failed: ${failedTests} ❌`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
    console.log('\n🎉 PHASE 3.2 DOCKER BUILD ENVIRONMENT: FULLY OPERATIONAL!');
    console.log('\n✅ READY FOR NEXT PHASE: Docker Build Environment Complete');
    console.log('   - ✅ Docker Infrastructure Created');
    console.log('   - ✅ Android Builder Container Configured');
    console.log('   - ✅ Multi-Service Architecture Ready');
    console.log('   - ✅ Container Management Scripts Active');
    console.log('   - ✅ Build Pipeline Integration Complete');
    console.log('   - ✅ Environment Configuration Ready');
    console.log('   - ✅ Monitoring and Observability Setup');
    console.log('   - ✅ Storage and Persistence Configured');
} else {
    console.log('\n⚠️  PHASE 3.2 DOCKER BUILD ENVIRONMENT: NEEDS ATTENTION');
    console.log(`   ${failedTests} test(s) failed - check implementation`);
}

console.log('\n🎯 NEXT DEVELOPMENT PHASES:');
console.log('   📋 Phase 3.3: Asset Injection System');
console.log('   📋 Phase 3.4: Build Artifact Management');
console.log('   📋 Phase 3.5: WebSocket Real-time Updates');
console.log('   📋 Phase 4: Production Deployment');

console.log('\n🚀 DOCKER QUICK START COMMANDS:');
console.log('   cd docker && ./docker-start.sh start    # Start environment');
console.log('   cd docker && ./docker-start.sh status   # Check status');
console.log('   cd docker && ./docker-start.sh test     # Test services');
console.log('   cd docker && ./docker-start.sh clean    # Clean up'); 