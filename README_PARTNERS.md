# 🏦 **LuluPay Partner Integration Guide**

Welcome to LuluPay's White-Label App Generator and SDK Integration Platform! This guide explains how partners can create branded remittance apps or integrate remittance features into existing applications.

## 🎯 **Two Integration Approaches**

### **Approach 1: White-Label App Generation** 
Clone our repository and generate a completely new branded app

### **Approach 2: SDK Integration**
Add remittance features to your existing mobile application

---

## 🚀 **Quick Start Options**

### **Option A: IDE Integration (Recommended)**
Connect your IDE (like Cursor AI) to generate apps interactively

### **Option B: Git Clone & Build**
Clone repository and build using command-line tools

### **Option C: Web-Based Generator** 
Use our online partner portal (coming soon)

---

## 📋 **Option A: IDE Integration (Cursor AI Style)**

### **Step 1: Connect Your IDE**

If you're using **Cursor AI** or similar IDE:

1. **Connect to our repository:**
   ```bash
   git clone https://github.com/lulupay/white-label-platform.git
   cd white-label-platform
   ```

2. **Open in your IDE and configure:**
   ```json
   {
     "partnerId": "your_bank_id",
     "partnerName": "Your Bank Name",
     "appName": "Your Bank Remittance",
     "packageName": "com.yourbank.remittance",
     "primaryColor": "#1E3A8A",
     "secondaryColor": "#F59E0B"
   }
   ```

3. **Ask your AI assistant:**
   > "Generate a white-label remittance app using the configuration above"

### **Step 2: Live Development**

Your AI assistant will:
- ✅ Generate branded app structure
- ✅ Apply your colors and branding
- ✅ Create custom MainActivity and layouts
- ✅ Configure build scripts
- ✅ Provide real-time preview

### **Step 3: Deploy**

```bash
# Build your branded app
./gradlew assembleRelease

# Install for testing
./gradlew installDebug
```

---

## 📁 **Option B: Git Clone & Manual Build**

### **Step 1: Clone Repository**

```bash
# Clone the LuluPay platform
git clone https://github.com/lulupay/LuluPay_Android-main.git
cd LuluPay_Android-main

# Make scripts executable
chmod +x scripts/generate-partner-app.py
```

### **Step 2: Create Configuration**

```bash
# Generate sample configuration
python scripts/generate-partner-app.py --sample
```

This creates `sample_config.json`:
```json
{
  "partnerId": "sample_bank",
  "partnerName": "Sample Bank", 
  "appName": "Sample Bank Remittance",
  "packageName": "com.samplebank.remittance",
  "primaryColor": "#1E3A8A",
  "secondaryColor": "#F59E0B"
}
```

### **Step 3: Customize Configuration**

Edit the JSON file with your details:

```json
{
  "partnerId": "first_national_bank",
  "partnerName": "First National Bank",
  "appName": "First National Money Transfer", 
  "packageName": "com.firstnational.remittance",
  "primaryColor": "#2563EB",
  "secondaryColor": "#DC2626",
  "logoBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "apiKey": "your_api_key_here",
  "baseUrl": "https://api.lulupay.com"
}
```

### **Step 4: Generate Your App**

```bash
# Generate branded app
python scripts/generate-partner-app.py your_config.json

# Navigate to generated app
cd output/partner_first_national_bank/

# Build the app
./gradlew assembleDebug
```

### **Step 5: Test Your App**

```bash
# Install on device/emulator
./gradlew installDebug

# Or build release APK
./gradlew assembleRelease
```

---

## 📱 **Option C: SDK Integration for Existing Apps**

If you have an existing app and want to add remittance features:

### **Step 1: Add LuluPay SDK**

Add to your `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.lulupay:sdk:1.0.0")
    // Or include as local module
    implementation(project(":lulupay"))
}
```

### **Step 2: Initialize SDK**

In your `Application` class:

```kotlin
class YourApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        val partnerConfig = PartnerSDKConfig(
            partnerId = "your_bank_id",
            partnerName = "Your Bank",
            primaryColor = "#1E3A8A",
            secondaryColor = "#F59E0B",
            companyName = "Your Bank",
            apiKey = "your_api_key"
        )
        
        LuluPaySDK.initialize(this, "your_bank_id", partnerConfig)
    }
}
```

### **Step 3: Add Send Money Feature**

In your activity where you want to add remittance:

```kotlin
class YourMainActivity : AppCompatActivity(), RemittanceResultListener {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Set result listener
        LuluPaySDK.setResultListener(this)
        
        // Add send money button
        sendMoneyButton.setOnClickListener {
            val options = RemittanceOptions(
                usePartnerTheme = true,
                showBackButton = true,
                autoFinishOnComplete = true
            )
            
            val intent = LuluPaySDK.launchRemittanceFlow(this, options)
            startActivity(intent)
        }
    }
    
    // Handle remittance results
    override fun onRemittanceSuccess(transactionId: String, amount: Double, recipient: String) {
        // Show success message, update UI, etc.
        showSuccessDialog("Transfer completed: $$amount to $recipient")
    }
    
    override fun onRemittanceFailure(error: String) {
        showErrorDialog("Transfer failed: $error")
    }
    
    override fun onRemittanceCancelled() {
        // Handle cancellation
    }
}
```

---

## 🎨 **Customization Options**

### **Branding Configuration**

```json
{
  "brandConfig": {
    "primaryColor": "#1E3A8A",
    "secondaryColor": "#F59E0B", 
    "backgroundColor": "#FFFFFF",
    "textColor": "#000000",
    "errorColor": "#DC2626",
    "successColor": "#16A34A",
    "supportDarkMode": true,
    "fontFamily": "Roboto",
    "buttonRadius": "8dp",
    "cardRadius": "12dp"
  }
}
```

### **Logo Assets**

```json
{
  "logoAssets": {
    "appIcon": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "splashLogo": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "headerLogo": "data:image/png;base64,iVBORw0KGgoAAAANS..."
  }
}
```

### **API Configuration**

```json
{
  "apiConfig": {
    "baseUrl": "https://api.lulupay.com",
    "apiKey": "your_api_key",
    "clientId": "your_client_id",
    "clientSecret": "your_client_secret",
    "timeout": 30000
  }
}
```

---

## 🔧 **Development Setup**

### **Prerequisites**

- **Android Studio** Arctic Fox or later
- **JDK 11** or later
- **Android SDK** API level 24+
- **Gradle 7.0** or later

### **Environment Setup**

```bash
# Set JAVA_HOME
export JAVA_HOME=/path/to/jdk11

# Set Android SDK
export ANDROID_HOME=/path/to/android-sdk

# Add to PATH
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### **Build Configurations**

#### **Debug Build**
```bash
./gradlew assembleDebug
```

#### **Release Build**
```bash
./gradlew assembleRelease
```

#### **Run Tests**
```bash
./gradlew test
./gradlew connectedAndroidTest
```

---

## 📋 **Integration Examples**

### **Example 1: Bank Integration**

```kotlin
// In your banking app
class BankingMainActivity : AppCompatActivity() {
    
    private fun setupRemittanceFeature() {
        // Initialize with bank branding
        val config = PartnerSDKConfig(
            partnerId = "national_bank_001",
            partnerName = "National Bank",
            primaryColor = "#003366", // Bank blue
            secondaryColor = "#FFD700", // Bank gold
            companyName = "National Bank",
            apiKey = BuildConfig.LULUPAY_API_KEY
        )
        
        LuluPaySDK.initialize(this, config.partnerId, config)
        
        // Add to existing navigation
        binding.btnInternationalTransfer.setOnClickListener {
            launchRemittance()
        }
    }
    
    private fun launchRemittance() {
        val prefilledData = PrefilledData(
            senderName = getCurrentUser().fullName,
            senderPhone = getCurrentUser().phoneNumber
        )
        
        val options = RemittanceOptions(
            usePartnerTheme = true,
            prefilledData = prefilledData
        )
        
        startActivity(LuluPaySDK.launchRemittanceFlow(this, options))
    }
}
```

### **Example 2: Fintech Integration**

```kotlin
// In your fintech app
class FintechWalletActivity : AppCompatActivity() {
    
    private fun addRemittanceToWallet() {
        // Quick integration with minimal setup
        LuluPaySDK.initialize(this, "fintech_startup_002")
        
        // Add as wallet feature
        binding.walletMenu.addRemittanceOption {
            val intent = LuluPaySDK.launchRemittanceWithAuth(
                context = this,
                username = userSession.username,
                password = userSession.remittanceToken,
                options = RemittanceOptions(autoFinishOnComplete = true)
            )
            startActivity(intent)
        }
    }
}
```

---

## 🔒 **Security & Compliance**

### **API Security**
- All communications use **HTTPS with TLS 1.2+**
- API keys are **encrypted and stored securely**
- **Certificate pinning** for additional security

### **Data Protection**
- **GDPR and CCPA** compliant by default
- **End-to-end encryption** for sensitive data
- **Local data encryption** using Android Keystore

### **Compliance Features**
- **KYC verification** built-in
- **AML monitoring** and screening
- **Transaction limits** and controls
- **Audit logging** for compliance reporting

### **Best Practices**

```kotlin
// Secure initialization
class SecureApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Initialize with security settings
        val config = PartnerSDKConfig(
            partnerId = "secure_bank",
            apiKey = getEncryptedApiKey(), // Never hardcode
            enableBiometric = true,
            customTheme = getSecureThemeConfig()
        )
        
        LuluPaySDK.initialize(this, config.partnerId, config)
    }
    
    private fun getEncryptedApiKey(): String {
        // Retrieve from secure storage
        return SecurePreferences.getApiKey(this)
    }
}
```

---

## 📚 **Testing Guide**

### **Automated Testing**

Create test configuration:
```kotlin
@RunWith(AndroidJUnit4::class)
class PartnerAppTest {
    
    @Test
    fun testSDKInitialization() {
        val config = PartnerSDKConfig(
            partnerId = "test_partner",
            partnerName = "Test Bank",
            primaryColor = "#000000",
            secondaryColor = "#FFFFFF",
            companyName = "Test Bank",
            apiKey = "test_api_key"
        )
        
        LuluPaySDK.initialize(context, config.partnerId, config)
        
        assertTrue(LuluPaySDK.isInitialized())
        assertEquals("test_partner", LuluPaySDK.getPartnerConfig()?.partnerId)
    }
    
    @Test
    fun testRemittanceFlow() {
        // Test complete remittance flow
        val options = RemittanceOptions(usePartnerTheme = true)
        val intent = LuluPaySDK.launchRemittanceFlow(context, options)
        
        assertNotNull(intent)
        assertTrue(intent.hasExtra("SDK_MODE"))
    }
}
```

### **Manual Testing Checklist**

- [ ] App launches with partner branding
- [ ] Colors and logos display correctly
- [ ] Send money flow works end-to-end
- [ ] Transaction history displays
- [ ] Error handling works properly
- [ ] Back navigation functions correctly
- [ ] Result callbacks trigger properly

---

## 🚀 **Deployment**

### **App Store Submission**

1. **Build release APK:**
   ```bash
   ./gradlew assembleRelease
   ```

2. **Sign your APK:**
   ```bash
   # Configure signing in build.gradle.kts
   signingConfigs {
       release {
           storeFile file("your-keystore.jks")
           storePassword "your-store-password"
           keyAlias "your-key-alias"
           keyPassword "your-key-password"
       }
   }
   ```

3. **Upload to Google Play Console**

4. **Set up app listing with partner information**

### **Internal Distribution**

```bash
# Build and distribute internally
./gradlew assembleDebug
./gradlew uploadCrashlyticsMappingFileDebug

# Or use Firebase App Distribution
./gradlew appDistributionUploadDebug
```

---

## 📞 **Support & Documentation**

### **Technical Support**
- 📧 Email: `technical-support@lulupay.com`
- 💬 Discord: `https://discord.gg/lulupay-partners`
- 📖 Docs: `https://docs.lulupay.com`

### **Partner Portal**
- 🌐 Portal: `https://partners.lulupay.com`
- 📊 Analytics: View app performance and transactions
- ⚙️ Settings: Manage API keys and configurations
- 📈 Reports: Download compliance and financial reports

### **API Reference**
- 📚 Full API Docs: `https://api.lulupay.com/docs`
- 🔑 Authentication: `https://docs.lulupay.com/auth`
- 💰 Remittance APIs: `https://docs.lulupay.com/remittance`

---

## 🤝 **Partner Success Stories**

### **"From Integration to Launch in 24 Hours"**
> "Using LuluPay's SDK, we added international money transfer to our banking app in under a day. Our customers love the seamless experience!" 
> 
> — *Tech Lead, First Digital Bank*

### **"White-Label App Generated in Minutes"**
> "The AI-powered generator created our complete remittance app with our branding in just 10 minutes. Incredible!"
> 
> — *CTO, Regional Credit Union*

---

## 🔄 **Version History**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial release with white-label generation |
| 1.1.0 | 2024-02-01 | Added SDK integration support |
| 1.2.0 | 2024-02-15 | Enhanced theming and customization |
| 1.3.0 | 2024-03-01 | AI-powered app generation |

---

## 📄 **License & Terms**

This platform is available to licensed LuluPay partners under our Partner Agreement. For licensing information, contact our partnership team.

---

**Ready to get started?** Choose your integration approach and begin building! 🚀

For any questions, reach out to our partner success team at `partners@lulupay.com`. 