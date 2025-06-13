#!/bin/bash

# LuluPay Android White-label App Builder Script
# Enhanced for Docker environment and production builds
# Designed for containerized Android builds with Docker integration

set -euo pipefail

# Script metadata
SCRIPT_NAME="LuluPay Android Builder"
SCRIPT_VERSION="2.0.0"
BUILD_START_TIME=$(date +%s)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Environment variables with defaults
BUILD_ID="${BUILD_ID:-$(date +%Y%m%d_%H%M%S)}"
BUILD_TYPE="${BUILD_TYPE:-debug}"
APP_NAME="${APP_NAME:-LuluPayApp}"
PACKAGE_NAME="${PACKAGE_NAME:-com.lulupay.app}"
VERSION="${VERSION:-1.0.0}"
VERSION_CODE="${VERSION_CODE:-1}"
PARTNER_ID="${PARTNER_ID:-default}"
OUTPUT_DIR="${OUTPUT_DIR:-/workspace/outputs}"
GRADLE_CACHE_DIR="${GRADLE_USER_HOME:-/gradle-cache}"
ENABLE_PARALLEL_BUILD="${ENABLE_PARALLEL_BUILD:-true}"
ENABLE_BUILD_CACHE="${ENABLE_BUILD_CACHE:-true}"
SIGNING_ENABLED="${SIGNING_ENABLED:-false}"

# Build configuration
GRADLE_OPTS="-Xmx4g -Xms1g -XX:MaxMetaspaceSize=1g -XX:+UseG1GC"
GRADLE_ARGS="--no-daemon --stacktrace"

if [ "$ENABLE_PARALLEL_BUILD" = "true" ]; then
    GRADLE_ARGS="$GRADLE_ARGS --parallel"
fi

if [ "$ENABLE_BUILD_CACHE" = "true" ]; then
    GRADLE_ARGS="$GRADLE_ARGS --build-cache"
fi

# Function to display help
show_help() {
    cat << EOF
${SCRIPT_NAME} v${SCRIPT_VERSION}

USAGE:
    $0 [OPTIONS] [COMMAND]

COMMANDS:
    build           Build APK/AAB (default)
    clean           Clean build artifacts
    test            Run tests
    validate        Validate project structure
    help            Show this help message

OPTIONS:
    --build-type TYPE       Build type: debug|release (default: debug)
    --app-name NAME         Application name (default: LuluPayApp)
    --package-name PKG      Package name (default: com.lulupay.app)
    --version VER           Version name (default: 1.0.0)
    --version-code CODE     Version code (default: 1)
    --partner-id ID         Partner identifier (default: default)
    --output-dir DIR        Output directory (default: /workspace/outputs)
    --signing-enabled       Enable APK signing
    --no-parallel           Disable parallel builds
    --no-cache              Disable build cache
    --verbose               Enable verbose output

ENVIRONMENT VARIABLES:
    BUILD_ID                Unique build identifier
    BUILD_TYPE              Build type (debug/release)
    APP_NAME                Application name
    PACKAGE_NAME            Android package name
    VERSION                 Version name
    VERSION_CODE            Version code
    PARTNER_ID              Partner identifier
    OUTPUT_DIR              Build output directory
    KEYSTORE_PATH           Path to signing keystore
    KEYSTORE_PASSWORD       Keystore password
    KEY_ALIAS               Key alias for signing
    KEY_PASSWORD            Key password

EXAMPLES:
    $0 build --build-type release --app-name "MyBank App"
    $0 build --package-name com.mybank.app --signing-enabled
    $0 clean
    $0 validate

EOF
}

# Function to parse command line arguments
parse_args() {
    COMMAND="build"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            build|clean|test|validate|help)
                COMMAND="$1"
                shift
                ;;
            --build-type)
                BUILD_TYPE="$2"
                shift 2
                ;;
            --app-name)
                APP_NAME="$2"
                shift 2
                ;;
            --package-name)
                PACKAGE_NAME="$2"
                shift 2
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            --version-code)
                VERSION_CODE="$2"
                shift 2
                ;;
            --partner-id)
                PARTNER_ID="$2"
                shift 2
                ;;
            --output-dir)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            --signing-enabled)
                SIGNING_ENABLED="true"
                shift
                ;;
            --no-parallel)
                ENABLE_PARALLEL_BUILD="false"
                shift
                ;;
            --no-cache)
                ENABLE_BUILD_CACHE="false"
                shift
                ;;
            --verbose)
                set -x
                GRADLE_ARGS="$GRADLE_ARGS --info"
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Function to validate environment
validate_environment() {
    log_step "Validating build environment"
    
    # Check required tools
    local tools=("gradle" "java" "adb")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed or not in PATH"
            exit 1
        fi
    done
    
    # Check Android SDK
    if [ -z "${ANDROID_SDK_ROOT:-}" ]; then
        log_error "ANDROID_SDK_ROOT is not set"
        exit 1
    fi
    
    if [ ! -d "$ANDROID_SDK_ROOT" ]; then
        log_error "Android SDK directory does not exist: $ANDROID_SDK_ROOT"
        exit 1
    fi
    
    # Check workspace
    if [ ! -d "/workspace" ]; then
        log_error "Workspace directory not found"
        exit 1
    fi
    
    # Validate build type
    if [[ "$BUILD_TYPE" != "debug" && "$BUILD_TYPE" != "release" ]]; then
        log_error "Invalid build type: $BUILD_TYPE (must be debug or release)"
        exit 1
    fi
    
    log_success "Environment validation passed"
}

# Function to setup build environment
setup_build_environment() {
    log_step "Setting up build environment"
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Create gradle cache directory
    mkdir -p "$GRADLE_CACHE_DIR"
    
    # Set Gradle environment
    export GRADLE_OPTS="$GRADLE_OPTS"
    export GRADLE_USER_HOME="$GRADLE_CACHE_DIR"
    
    # Create build info file
    cat > "/workspace/build-info.json" << EOF
{
    "buildId": "$BUILD_ID",
    "buildType": "$BUILD_TYPE",
    "appName": "$APP_NAME",
    "packageName": "$PACKAGE_NAME",
    "version": "$VERSION",
    "versionCode": $VERSION_CODE,
    "partnerId": "$PARTNER_ID",
    "timestamp": "$(date -Iseconds)",
    "environment": {
        "androidSdkRoot": "$ANDROID_SDK_ROOT",
        "gradleVersion": "$(gradle --version | head -n 1)",
        "javaVersion": "$(java -version 2>&1 | head -n 1)"
    }
}
EOF
    
    log_success "Build environment setup complete"
}

# Function to validate project structure
validate_project() {
    log_step "Validating project structure"
    
    local required_files=(
        "build.gradle"
        "settings.gradle"
        "app/build.gradle"
        "app/src/main/AndroidManifest.xml"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "/workspace/$file" ]; then
            log_error "Required file missing: $file"
            exit 1
        fi
    done
    
    # Check if it's a valid Android project
    if ! grep -q "com.android.application" "/workspace/app/build.gradle"; then
        log_error "Not a valid Android application project"
        exit 1
    fi
    
    log_success "Project structure validation passed"
}

# Function to clean build artifacts
clean_build() {
    log_step "Cleaning build artifacts"
    
    cd /workspace
    
    # Run Gradle clean
    ./gradlew clean $GRADLE_ARGS
    
    # Remove additional build artifacts
    find . -name "*.apk" -delete
    find . -name "*.aab" -delete
    find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
    
    log_success "Build artifacts cleaned"
}

# Function to run tests
run_tests() {
    log_step "Running tests"
    
    cd /workspace
    
    # Run unit tests
    ./gradlew test$BUILD_TYPE $GRADLE_ARGS
    
    # Run lint checks
    ./gradlew lint$BUILD_TYPE $GRADLE_ARGS
    
    log_success "Tests completed"
}

# Function to configure signing
configure_signing() {
    if [ "$SIGNING_ENABLED" = "true" ] && [ "$BUILD_TYPE" = "release" ]; then
        log_step "Configuring APK signing"
        
        # Check signing configuration
        if [ -z "${KEYSTORE_PATH:-}" ] || [ -z "${KEYSTORE_PASSWORD:-}" ]; then
            log_warning "Signing enabled but keystore configuration missing"
            return
        fi
        
        if [ ! -f "$KEYSTORE_PATH" ]; then
            log_warning "Keystore file not found: $KEYSTORE_PATH"
            return
        fi
        
        # Add signing configuration to build.gradle
        cat >> "/workspace/app/build.gradle" << EOF

// Auto-generated signing configuration
android {
    signingConfigs {
        release {
            storeFile file('$KEYSTORE_PATH')
            storePassword '$KEYSTORE_PASSWORD'
            keyAlias '${KEY_ALIAS:-release}'
            keyPassword '${KEY_PASSWORD:-$KEYSTORE_PASSWORD}'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
EOF
        
        log_success "Signing configuration added"
    fi
}

# Function to build APK/AAB
build_app() {
    log_step "Building Android application"
    
    cd /workspace
    
    # Configure signing if needed
    configure_signing
    
    # Build APK
    log_info "Building APK ($BUILD_TYPE)"
    ./gradlew assemble$BUILD_TYPE $GRADLE_ARGS
    
    # Build AAB for release builds
    if [ "$BUILD_TYPE" = "release" ]; then
        log_info "Building AAB (Android App Bundle)"
        ./gradlew bundle$BUILD_TYPE $GRADLE_ARGS
    fi
    
    log_success "Application build completed"
}

# Function to collect build artifacts
collect_artifacts() {
    log_step "Collecting build artifacts"
    
    local apk_dir="/workspace/app/build/outputs/apk/$BUILD_TYPE"
    local aab_dir="/workspace/app/build/outputs/bundle/$BUILD_TYPE"
    local mapping_dir="/workspace/app/build/outputs/mapping/$BUILD_TYPE"
    
    # Find and copy APK files
    if [ -d "$apk_dir" ]; then
        find "$apk_dir" -name "*.apk" -exec cp {} "$OUTPUT_DIR/" \;
        log_info "APK files copied to $OUTPUT_DIR"
    fi
    
    # Find and copy AAB files (release builds)
    if [ -d "$aab_dir" ]; then
        find "$aab_dir" -name "*.aab" -exec cp {} "$OUTPUT_DIR/" \;
        log_info "AAB files copied to $OUTPUT_DIR"
    fi
    
    # Copy ProGuard mapping files (release builds)
    if [ -d "$mapping_dir" ] && [ "$BUILD_TYPE" = "release" ]; then
        find "$mapping_dir" -name "mapping.txt" -exec cp {} "$OUTPUT_DIR/proguard-mapping.txt" \;
        log_info "ProGuard mapping file copied"
    fi
    
    # Copy build reports
    if [ -d "/workspace/app/build/reports" ]; then
        cp -r "/workspace/app/build/reports" "$OUTPUT_DIR/"
        log_info "Build reports copied"
    fi
    
    # Copy build info
    cp "/workspace/build-info.json" "$OUTPUT_DIR/"
    
    # Generate artifact summary
    cat > "$OUTPUT_DIR/artifacts.json" << EOF
{
    "buildId": "$BUILD_ID",
    "buildType": "$BUILD_TYPE",
    "artifacts": [
$(find "$OUTPUT_DIR" -name "*.apk" -o -name "*.aab" | while read -r file; do
    echo "        {\"type\": \"$(basename "$file" | cut -d. -f2)\", \"path\": \"$(basename "$file")\", \"size\": $(stat -c%s "$file")},"
done | sed '$ s/,$//')
    ],
    "timestamp": "$(date -Iseconds)"
}
EOF
    
    log_success "Build artifacts collected in $OUTPUT_DIR"
}

# Function to display build summary
show_build_summary() {
    local build_end_time=$(date +%s)
    local build_duration=$((build_end_time - BUILD_START_TIME))
    local minutes=$((build_duration / 60))
    local seconds=$((build_duration % 60))
    
    log_step "Build Summary"
    echo
    echo "  Build ID:        $BUILD_ID"
    echo "  Build Type:      $BUILD_TYPE"
    echo "  App Name:        $APP_NAME"
    echo "  Package Name:    $PACKAGE_NAME"
    echo "  Version:         $VERSION ($VERSION_CODE)"
    echo "  Partner ID:      $PARTNER_ID"
    echo "  Duration:        ${minutes}m ${seconds}s"
    echo "  Output Dir:      $OUTPUT_DIR"
    echo
    
    # List generated artifacts
    if [ -d "$OUTPUT_DIR" ]; then
        echo "  Generated Artifacts:"
        find "$OUTPUT_DIR" -name "*.apk" -o -name "*.aab" | while read -r file; do
            local size=$(stat -c%s "$file" 2>/dev/null || echo "0")
            local size_mb=$((size / 1024 / 1024))
            echo "    $(basename "$file") (${size_mb}MB)"
        done
    fi
    echo
}

# Main execution function
main() {
    # Display banner
    echo
    log "🚀 $SCRIPT_NAME v$SCRIPT_VERSION"
    log "Building Android white-label application"
    echo
    
    # Parse command line arguments
    parse_args "$@"
    
    # Execute command
    case $COMMAND in
        build)
            validate_environment
            setup_build_environment
            validate_project
            build_app
            collect_artifacts
            show_build_summary
            ;;
        clean)
            clean_build
            ;;
        test)
            validate_environment
            validate_project
            run_tests
            ;;
        validate)
            validate_environment
            validate_project
            log_success "Project validation completed"
            ;;
        help)
            show_help
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
    
    log_success "✅ Build operation completed successfully"
}

# Error handling
trap 'log_error "Build failed with exit code $?"; exit 1' ERR

# Execute main function with all arguments
main "$@" 