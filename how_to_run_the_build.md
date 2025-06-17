# LuluPay Android - Build Execution Guide

## 🎯 **Overview**
This guide provides step-by-step instructions to successfully build the LuluPay Android application from source code.

---

## 📋 **Prerequisites**

### **Required Software**
1. **Java Development Kit (JDK) 11 or higher**
   ```bash
   java -version  # Should show version 11+
   ```

2. **Android SDK** (via Android Studio or command line tools)
   - Android SDK Build Tools
   - Android API Level 24+ (Android 7.0)
   - Target API Level 35 (Android 14)

3. **Git** (for version control)

4. **Windows PowerShell** (for Windows users)

### **System Requirements**
- **RAM**: Minimum 8GB, Recommended 16GB
- **Storage**: At least 5GB free space
- **OS**: Windows 10/11, macOS 10.15+, or Linux

---

## 🔧 **Environment Setup**

### **Step 1: Verify Android SDK Installation**
```powershell
# Check if Android SDK is installed
Test-Path "C:\Users\[USERNAME]\AppData\Local\Android\Sdk"

# If not found, install Android Studio or standalone SDK
```

### **Step 2: Set Environment Variables**
```powershell
# Set ANDROID_HOME environment variable
$env:ANDROID_HOME = "C:/Users/786000726/AppData/Local/Android/Sdk"

# Verify environment variable
echo $env:ANDROID_HOME
```

### **Step 3: Verify Java Installation**
```powershell
java -version
javac -version

# Should show Java 11 or higher
```

---

## 📁 **Project Setup**

### **Step 1: Navigate to Project Directory**
```powershell
# Change to the clean project directory
cd "C:\Users\786000726\Downloads\LuluPay_Android-main (1)\LuluPay_Clean"

# Verify you're in the correct directory
Get-ChildItem -Name "build.gradle.kts", "settings.gradle.kts"
```

### **Step 2: Verify Project Structure**
```powershell
# Check main directories exist
Test-Path "app"          # Should return True
Test-Path "lulupay"      # Should return True
Test-Path "gradle"       # Should return True
```

### **Step 3: Check local.properties**
```powershell
# Verify local.properties exists and has correct SDK path
Get-Content local.properties

# Should show: sdk.dir=C:/Users/786000726/AppData/Local/Android/Sdk
```

---

## 🚀 **Build Commands**

### **Quick Build Verification**
```powershell
# Clean and verify Gradle wrapper
./gradlew --version

# Expected output should show Gradle version 8.10.2
```

### **Step 1: Clean Build**
```powershell
# Clean all previous build artifacts
./gradlew clean

# Expected: BUILD SUCCESSFUL
```

### **Step 2: Compile Only (Fast Check)**
```powershell
# Compile Kotlin files without full build
./gradlew compileDebugKotlin

# This is fastest way to check for compilation errors
# Expected: BUILD SUCCESSFUL in ~10-15 seconds
```

### **Step 3: Build Debug APK**
```powershell
# Generate debug APK
./gradlew assembleDebug

# Expected: BUILD SUCCESSFUL in ~30-45 seconds
# Output: app/build/outputs/apk/debug/app-debug.apk
```

### **Step 4: Build Release APK** 
```powershell
# Generate release APK (unsigned)
./gradlew assembleRelease

# Expected: BUILD SUCCESSFUL in ~30-45 seconds  
# Output: app/build/outputs/apk/release/app-release-unsigned.apk
```

### **Step 5: Full Build (All Modules)**
```powershell
# Build everything (skip lint to avoid warnings)
./gradlew build -x lintDebug -x lintRelease

# Expected: BUILD SUCCESSFUL in ~45-60 seconds
# Builds both app and lulupay library modules
```

---

## 📱 **Build Outputs**

### **Debug Builds**
```powershell
# Debug APK location
app/build/outputs/apk/debug/app-debug.apk

# Debug AAR library
lulupay/build/outputs/aar/lulupay-debug.aar
```

### **Release Builds**
```powershell
# Release APK location (unsigned)
app/build/outputs/apk/release/app-release-unsigned.apk

# Release AAR library
lulupay/build/outputs/aar/lulupay-release.aar
```

### **Verify Build Outputs**
```powershell
# Check APK files were generated
Get-ChildItem -Path "app\build\outputs\apk" -Recurse -Filter "*.apk"

# Check AAR files were generated
Get-ChildItem -Path "lulupay\build\outputs\aar" -Recurse -Filter "*.aar"
```

---

## 🔍 **Troubleshooting**

### **Common Issues & Solutions**

#### **Issue 1: SDK Location Not Found**
```powershell
# Error: SDK location not found
# Solution: Create/fix local.properties
echo "sdk.dir=C:/Users/786000726/AppData/Local/Android/Sdk" > local.properties

# Set environment variable
$env:ANDROID_HOME = "C:/Users/786000726/AppData/Local/Android/Sdk"
```

#### **Issue 2: Path Contains Spaces**
```powershell
# Error: Build fails due to spaces in path
# Solution: Use the clean directory without spaces
# Current clean path: LuluPay_Clean (no spaces or special characters)
```

#### **Issue 3: Java Version Issues**
```powershell
# Error: Unsupported Java version
# Solution: Verify Java 11+
java -version

# If wrong version, update JAVA_HOME
$env:JAVA_HOME = "C:\Program Files\Java\jdk-11.0.x"
```

#### **Issue 4: Gradle Daemon Issues**
```powershell
# If build hangs or fails mysteriously
./gradlew --stop    # Stop all daemons
./gradlew clean     # Clean build
./gradlew build -x lintDebug -x lintRelease    # Rebuild
```

#### **Issue 5: Memory Issues**
```powershell
# If OutOfMemory errors occur
# Edit gradle.properties and add:
# org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m
```

### **Debug Commands**
```powershell
# Verbose build output
./gradlew build --info

# Debug level output
./gradlew build --debug

# Show dependency tree
./gradlew app:dependencies

# Show available tasks
./gradlew tasks --all
```

---

## ⚡ **Quick Build Workflow**

### **For Development (Fastest)**
```powershell
# 1. Quick compilation check (5-10 seconds)
./gradlew compileDebugKotlin

# 2. If successful, build debug APK (20-30 seconds)
./gradlew assembleDebug
```

### **For Testing (Complete)**
```powershell
# 1. Clean build everything (45-60 seconds)
./gradlew clean build -x lintDebug -x lintRelease

# 2. Generate both APK variants
./gradlew assembleDebug assembleRelease
```

### **For Production**
```powershell
# 1. Clean build
./gradlew clean

# 2. Build release APK
./gradlew assembleRelease

# 3. Sign APK (additional step needed)
# Use Android Studio or jarsigner to sign the release APK
```

---

## 🎯 **Build Performance Tips**

### **Speed Optimization**
1. **Use Gradle Daemon**: Enabled by default, speeds up subsequent builds
2. **Incremental Builds**: Only rebuild changed modules
3. **Skip Lint**: Use `-x lintDebug -x lintRelease` for faster builds
4. **Parallel Builds**: Gradle automatically uses multiple cores

### **Build Time Expectations**
- **First build**: 2-3 minutes (downloads dependencies)
- **Clean build**: 45-60 seconds
- **Incremental build**: 5-15 seconds
- **Compile only**: 5-10 seconds

---

## ✅ **Success Indicators**

### **Successful Build Output**
```
BUILD SUCCESSFUL in Xs
X actionable tasks: X executed, X up-to-date
```

### **Generated Files Check**
```powershell
# Verify APK size and existence
Get-ChildItem app\build\outputs\apk\debug\app-debug.apk | Select-Object Name, Length
# Expected: ~10-11 MB

Get-ChildItem app\build\outputs\apk\release\app-release-unsigned.apk | Select-Object Name, Length  
# Expected: ~8-9 MB
```

### **Installation Test**
```powershell
# Install debug APK on connected device/emulator
adb install app\build\outputs\apk\debug\app-debug.apk

# Expected: Success message
```

---

## 📞 **Support & Next Steps**

### **If Build Succeeds**
1. ✅ APK is ready for testing
2. ✅ Install on device/emulator 
3. ✅ Run automated tests if needed
4. ✅ Sign release APK for distribution

### **If Build Fails**
1. 🔍 Check error message carefully
2. 🔧 Apply relevant troubleshooting steps above
3. 🧹 Try clean build: `./gradlew clean build`
4. 📋 Verify all prerequisites are met

### **Additional Resources**
- **Gradle Documentation**: https://gradle.org/docs/
- **Android Build Documentation**: https://developer.android.com/build
- **Project README**: Check for project-specific instructions

---

*Follow these steps in order for a guaranteed successful build of the LuluPay Android application.* 