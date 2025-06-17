# 🚀 LuluPay Android - Quick Start Guide

This guide provides the fastest way to get started with the LuluPay Android platform, whether you're creating a white-label app or integrating the SDK into your existing application.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Option A: Generate a White-Label App](#option-a-generate-a-white-label-app)
- [Option B: Integrate SDK into Existing App](#option-b-integrate-sdk-into-existing-app)
- [Testing Your Integration](#testing-your-integration)
- [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have:

- Android Studio Arctic Fox (2020.3.1) or later
- JDK 11 or later
- Android SDK with API level 34 (Android 14)
- Git installed
- Partner credentials from LuluPay (partnerId and API key)

## Option A: Generate a White-Label App

### Step 1: Clone the Repository

```bash
git clone https://github.com/shanekid72/LuluPay_Android-main.git
cd LuluPay_Android-main
```

### Step 2: Create Configuration File

Create a file named `partner_config.json` with your branding details:

```json
{
  "partnerId": "your_partner_id",
  "partnerName": "Your Company Name",
  "appName": "Your Money Transfer App",
  "packageName": "com.yourcompany.moneytransfer",
  "primaryColor": "#1E3A8A",
  "secondaryColor": "#F59E0B",
  "logoBase64": "data:image/png;base64,YOUR_BASE64_ENCODED_LOGO"
}
```

### Step 3: Generate Your App

Run the app generator script:

```bash
python scripts/generate-partner-app.py partner_config.json
```

### Step 4: Build and Run

```bash
cd output/your_partner_id_app
./gradlew installDebug
```

Your branded app will be installed on your connected device or emulator.

## Option B: Integrate SDK into Existing App

### Step 1: Add Dependencies

In your project's `build.gradle.kts` file:

```kotlin
repositories {
    mavenCentral()
    maven { url = uri("https://jitpack.io") }
}
```

In your app module's `build.gradle.kts` file:

```kotlin
dependencies {
    implementation("com.github.shanekid72:LuluPay-SDK:1.0.0")
}
```

### Step 2: Initialize the SDK

In your Application class:

```kotlin
class YourApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        val config = PartnerSDKConfig(
            partnerId = "your_partner_id",
            partnerName = "Your Company Name",
            primaryColor = "#1E3A8A",
            secondaryColor = "#F59E0B"
        )
        
        LuluPaySDK.initialize(this, config.partnerId, config)
    }
}
```

### Step 3: Launch Remittance Flow

In your Activity or Fragment:

```kotlin
// Auto Login Mode (credentials provided each time)
val intent = Intent(this, RemittanceScreen::class.java).apply {
    putExtra("ISAUTOLOGIN", true)
    putExtra("USERNAME", "your_username")
    putExtra("PASSWORD", "your_password")
}
startActivity(intent)

// OR

// Non-Auto Login Mode (credentials stored securely)
val intent = Intent(this, RemittanceScreen::class.java)
startActivity(intent)

// OR

// Using the SDK helper method
val options = RemittanceOptions(
    usePartnerTheme = true,
    showBackButton = true
)
val intent = LuluPaySDK.launchRemittanceFlow(this, options)
startActivity(intent)
```

## Testing Your Integration

### Test Credentials

Use these credentials for testing:

- **Username**: testagentae
- **Password**: Admin@123

### Test Scenarios

1. **Send Money Flow**: Complete a full remittance transaction
2. **KYC Verification**: Test the customer verification process
3. **Transaction History**: View past transactions
4. **Error Handling**: Test with invalid inputs

## Next Steps

After successful integration:

1. **Customize the UI**: Adjust colors, logos, and themes
2. **Configure Transaction Limits**: Set appropriate limits for your customers
3. **Set Up Analytics**: Monitor usage and transaction metrics
4. **Implement Marketing**: Promote your new money transfer service
5. **Contact Support**: Reach out to support@lulupay.com for any assistance

## Additional Resources

- [Complete Documentation](https://docs.lulupay.com)
- [API Reference](https://api.lulupay.com/docs)
- [Partner Portal](https://partners.lulupay.com)
- [Support Center](https://support.lulupay.com)

---

For technical support, contact: technical-support@lulupay.com 