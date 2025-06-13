#!/bin/bash

# LuluPay Build Utilities
# Common functions for Android build operations

# Version and metadata
UTILS_VERSION="1.0.0"

# Colors for output (reusable)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Utility logging functions
util_log() {
    echo -e "${CYAN}[UTIL $(date +'%H:%M:%S')] $1${NC}"
}

util_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

util_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

util_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

util_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate Android SDK installation
validate_android_sdk() {
    local sdk_root="${1:-$ANDROID_SDK_ROOT}"
    
    if [ -z "$sdk_root" ]; then
        util_error "Android SDK root not specified"
        return 1
    fi
    
    if [ ! -d "$sdk_root" ]; then
        util_error "Android SDK directory not found: $sdk_root"
        return 1
    fi
    
    # Check for essential SDK components
    local essential_paths=(
        "platform-tools/adb"
        "build-tools"
        "platforms"
        "cmdline-tools"
    )
    
    for path in "${essential_paths[@]}"; do
        if [ ! -e "$sdk_root/$path" ]; then
            util_warning "SDK component missing or incomplete: $path"
        fi
    done
    
    util_success "Android SDK validation passed: $sdk_root"
    return 0
}

# Function to get Android SDK build tools version
get_build_tools_version() {
    local sdk_root="${1:-$ANDROID_SDK_ROOT}"
    local build_tools_dir="$sdk_root/build-tools"
    
    if [ ! -d "$build_tools_dir" ]; then
        echo ""
        return 1
    fi
    
    # Get the latest version
    local latest_version=$(ls -1v "$build_tools_dir" | tail -n 1)
    echo "$latest_version"
}

# Function to get available Android platforms
get_android_platforms() {
    local sdk_root="${1:-$ANDROID_SDK_ROOT}"
    local platforms_dir="$sdk_root/platforms"
    
    if [ ! -d "$platforms_dir" ]; then
        echo ""
        return 1
    fi
    
    ls -1 "$platforms_dir" | grep "^android-" | sort -V
}

# Function to validate Gradle installation
validate_gradle() {
    if ! command_exists gradle; then
        util_error "Gradle is not installed or not in PATH"
        return 1
    fi
    
    local gradle_version=$(gradle --version | grep "Gradle" | head -n1)
    util_success "Gradle validation passed: $gradle_version"
    return 0
}

# Function to validate Java installation
validate_java() {
    if ! command_exists java; then
        util_error "Java is not installed or not in PATH"
        return 1
    fi
    
    local java_version=$(java -version 2>&1 | head -n1)
    util_success "Java validation passed: $java_version"
    return 0
}

# Function to calculate file hash
calculate_file_hash() {
    local file_path="$1"
    local hash_type="${2:-sha256}"
    
    if [ ! -f "$file_path" ]; then
        util_error "File not found: $file_path"
        return 1
    fi
    
    case "$hash_type" in
        md5)
            md5sum "$file_path" | cut -d' ' -f1
            ;;
        sha1)
            sha1sum "$file_path" | cut -d' ' -f1
            ;;
        sha256)
            sha256sum "$file_path" | cut -d' ' -f1
            ;;
        *)
            util_error "Unsupported hash type: $hash_type"
            return 1
            ;;
    esac
}

# Function to get file size in human readable format
get_file_size() {
    local file_path="$1"
    local format="${2:-human}"
    
    if [ ! -f "$file_path" ]; then
        echo "0"
        return 1
    fi
    
    case "$format" in
        bytes)
            stat -c%s "$file_path"
            ;;
        human)
            du -h "$file_path" | cut -f1
            ;;
        *)
            stat -c%s "$file_path"
            ;;
    esac
}

# Function to extract APK information
extract_apk_info() {
    local apk_path="$1"
    
    if [ ! -f "$apk_path" ]; then
        util_error "APK file not found: $apk_path"
        return 1
    fi
    
    # Use aapt to extract APK information
    local aapt_path="$ANDROID_SDK_ROOT/build-tools/$(get_build_tools_version)/aapt"
    
    if [ ! -f "$aapt_path" ]; then
        util_error "aapt tool not found in Android SDK"
        return 1
    fi
    
    util_info "Extracting APK information: $(basename "$apk_path")"
    
    # Extract package info
    local package_info=$("$aapt_path" dump badging "$apk_path" 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        util_error "Failed to extract APK information"
        return 1
    fi
    
    # Parse package information
    local package_name=$(echo "$package_info" | grep "package:" | sed "s/.*name='\([^']*\)'.*/\1/")
    local version_code=$(echo "$package_info" | grep "package:" | sed "s/.*versionCode='\([^']*\)'.*/\1/")
    local version_name=$(echo "$package_info" | grep "package:" | sed "s/.*versionName='\([^']*\)'.*/\1/")
    local min_sdk=$(echo "$package_info" | grep "sdkVersion:" | sed "s/.*'\([^']*\)'.*/\1/")
    local target_sdk=$(echo "$package_info" | grep "targetSdkVersion:" | sed "s/.*'\([^']*\)'.*/\1/")
    
    # Generate JSON output
    cat << EOF
{
    "packageName": "$package_name",
    "versionCode": "$version_code",
    "versionName": "$version_name",
    "minSdkVersion": "$min_sdk",
    "targetSdkVersion": "$target_sdk",
    "fileSize": $(stat -c%s "$apk_path"),
    "fileSizeHuman": "$(get_file_size "$apk_path" human)",
    "sha256": "$(calculate_file_hash "$apk_path" sha256)"
}
EOF
}

# Function to validate APK signature
validate_apk_signature() {
    local apk_path="$1"
    
    if [ ! -f "$apk_path" ]; then
        util_error "APK file not found: $apk_path"
        return 1
    fi
    
    # Use apksigner to validate signature
    local apksigner_path="$ANDROID_SDK_ROOT/build-tools/$(get_build_tools_version)/apksigner"
    
    if [ ! -f "$apksigner_path" ]; then
        util_error "apksigner tool not found in Android SDK"
        return 1
    fi
    
    util_info "Validating APK signature: $(basename "$apk_path")"
    
    if "$apksigner_path" verify "$apk_path" >/dev/null 2>&1; then
        util_success "APK signature is valid"
        return 0
    else
        util_error "APK signature validation failed"
        return 1
    fi
}

# Function to optimize APK using zipalign
optimize_apk() {
    local input_apk="$1"
    local output_apk="$2"
    
    if [ ! -f "$input_apk" ]; then
        util_error "Input APK file not found: $input_apk"
        return 1
    fi
    
    # Use zipalign to optimize APK
    local zipalign_path="$ANDROID_SDK_ROOT/build-tools/$(get_build_tools_version)/zipalign"
    
    if [ ! -f "$zipalign_path" ]; then
        util_error "zipalign tool not found in Android SDK"
        return 1
    fi
    
    util_info "Optimizing APK: $(basename "$input_apk")"
    
    if "$zipalign_path" -v 4 "$input_apk" "$output_apk" >/dev/null 2>&1; then
        util_success "APK optimization completed"
        return 0
    else
        util_error "APK optimization failed"
        return 1
    fi
}

# Function to create a simple keystore for signing
create_debug_keystore() {
    local keystore_path="$1"
    local keystore_password="${2:-android}"
    local key_alias="${3:-androiddebugkey}"
    local key_password="${4:-android}"
    
    util_info "Creating debug keystore: $keystore_path"
    
    # Create keystore directory if it doesn't exist
    mkdir -p "$(dirname "$keystore_path")"
    
    # Generate keystore
    keytool -genkeypair \
        -keystore "$keystore_path" \
        -alias "$key_alias" \
        -keypass "$key_password" \
        -storepass "$keystore_password" \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -dname "CN=LuluPay Debug, OU=Development, O=LuluPay, L=Dubai, ST=Dubai, C=AE" \
        >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        util_success "Debug keystore created successfully"
        return 0
    else
        util_error "Failed to create debug keystore"
        return 1
    fi
}

# Function to clean up temporary files
cleanup_temp_files() {
    local temp_dir="${1:-/tmp}"
    local pattern="${2:-lulupay-build-*}"
    
    util_info "Cleaning up temporary files: $temp_dir/$pattern"
    
    find "$temp_dir" -name "$pattern" -type f -mtime +1 -delete 2>/dev/null || true
    find "$temp_dir" -name "$pattern" -type d -empty -delete 2>/dev/null || true
    
    util_success "Temporary files cleanup completed"
}

# Function to check disk space
check_disk_space() {
    local path="${1:-/workspace}"
    local min_space_gb="${2:-2}"
    
    if [ ! -d "$path" ]; then
        util_error "Path does not exist: $path"
        return 1
    fi
    
    local available_space=$(df "$path" | awk 'NR==2 {print $4}')
    local available_space_gb=$((available_space / 1024 / 1024))
    
    if [ "$available_space_gb" -lt "$min_space_gb" ]; then
        util_error "Insufficient disk space: ${available_space_gb}GB available, ${min_space_gb}GB required"
        return 1
    fi
    
    util_success "Disk space check passed: ${available_space_gb}GB available"
    return 0
}

# Function to check memory usage
check_memory() {
    local min_memory_gb="${1:-2}"
    
    local total_memory=$(free -g | awk 'NR==2{print $2}')
    local available_memory=$(free -g | awk 'NR==2{print $7}')
    
    if [ -z "$available_memory" ]; then
        available_memory=$(free -g | awk 'NR==2{print $2-$3}')
    fi
    
    if [ "$available_memory" -lt "$min_memory_gb" ]; then
        util_warning "Low memory: ${available_memory}GB available, ${min_memory_gb}GB recommended"
        return 1
    fi
    
    util_success "Memory check passed: ${available_memory}GB available"
    return 0
}

# Function to setup environment variables
setup_android_env() {
    local sdk_root="${1:-$ANDROID_SDK_ROOT}"
    
    if [ -z "$sdk_root" ]; then
        util_error "Android SDK root not specified"
        return 1
    fi
    
    export ANDROID_SDK_ROOT="$sdk_root"
    export ANDROID_HOME="$sdk_root"
    export PATH="$PATH:$sdk_root/cmdline-tools/latest/bin"
    export PATH="$PATH:$sdk_root/platform-tools"
    export PATH="$PATH:$sdk_root/build-tools/$(get_build_tools_version)"
    
    util_success "Android environment variables configured"
}

# Function to generate build report
generate_build_report() {
    local build_id="$1"
    local output_dir="$2"
    local app_name="$3"
    local package_name="$4"
    local version="$5"
    local build_type="$6"
    
    local report_file="$output_dir/build-report.json"
    local build_time=$(date -Iseconds)
    
    cat > "$report_file" << EOF
{
    "buildId": "$build_id",
    "buildTime": "$build_time",
    "appName": "$app_name",
    "packageName": "$package_name",
    "version": "$version",
    "buildType": "$build_type",
    "environment": {
        "androidSdkRoot": "$ANDROID_SDK_ROOT",
        "buildToolsVersion": "$(get_build_tools_version)",
        "gradleVersion": "$(gradle --version | grep Gradle | head -n1 | cut -d' ' -f2)",
        "javaVersion": "$(java -version 2>&1 | head -n1 | cut -d'"' -f2)"
    },
    "artifacts": [
$(find "$output_dir" -name "*.apk" -o -name "*.aab" | while read -r file; do
    echo "        {"
    echo "            \"type\": \"$(basename "$file" | cut -d. -f2)\","
    echo "            \"path\": \"$(basename "$file")\","
    echo "            \"size\": $(stat -c%s "$file"),"
    echo "            \"sizeHuman\": \"$(get_file_size "$file" human)\","
    echo "            \"sha256\": \"$(calculate_file_hash "$file" sha256)\""
    echo "        },"
done | sed '$ s/,$//')
    ],
    "utils": {
        "version": "$UTILS_VERSION",
        "timestamp": "$build_time"
    }
}
EOF
    
    util_success "Build report generated: $report_file"
}

# Function to print system information
print_system_info() {
    util_info "System Information:"
    echo "  OS: $(uname -s) $(uname -r)"
    echo "  Architecture: $(uname -m)"
    echo "  CPU Cores: $(nproc)"
    echo "  Memory: $(free -h | awk 'NR==2{print $2}') total, $(free -h | awk 'NR==2{print $7}') available"
    echo "  Disk Space: $(df -h /workspace 2>/dev/null | awk 'NR==2{print $4}' || echo "N/A") available"
    echo "  Java: $(java -version 2>&1 | head -n1 | cut -d'"' -f2 2>/dev/null || echo "Not found")"
    echo "  Gradle: $(gradle --version 2>/dev/null | grep Gradle | head -n1 | cut -d' ' -f2 || echo "Not found")"
    echo "  Android SDK: ${ANDROID_SDK_ROOT:-"Not set"}"
    echo "  Build Tools: $(get_build_tools_version || echo "Not found")"
    echo
}

# Function to show utility help
show_utils_help() {
    cat << EOF
LuluPay Build Utilities v${UTILS_VERSION}

Available utility functions:
  validate_android_sdk [path]     - Validate Android SDK installation
  validate_gradle                 - Validate Gradle installation  
  validate_java                   - Validate Java installation
  get_build_tools_version [path]  - Get latest build tools version
  get_android_platforms [path]    - List available Android platforms
  extract_apk_info <apk_path>     - Extract APK metadata
  validate_apk_signature <apk>    - Validate APK signature
  optimize_apk <input> <output>   - Optimize APK with zipalign
  create_debug_keystore <path>    - Create debug keystore
  cleanup_temp_files [dir]        - Clean temporary files
  check_disk_space [path] [gb]    - Check available disk space
  check_memory [gb]               - Check available memory
  setup_android_env [sdk_path]    - Setup Android environment
  generate_build_report <args>    - Generate build report
  print_system_info               - Show system information

Usage:
  source build-utils.sh
  validate_android_sdk /opt/android-sdk
  extract_apk_info app-release.apk

EOF
}

# Auto-setup if sourced
if [ "${BASH_SOURCE[0]}" != "${0}" ]; then
    util_info "LuluPay Build Utilities v${UTILS_VERSION} loaded"
    print_system_info
fi 