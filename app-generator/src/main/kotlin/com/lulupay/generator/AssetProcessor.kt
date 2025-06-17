package com.lulupay.generator

import com.lulupay.generator.models.*
import java.awt.Color
import java.awt.Graphics2D
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.*
import javax.imageio.ImageIO
import kotlin.math.min

/**
 * Processes and generates assets for partner apps
 * Handles logo resizing, color generation, and resource file creation
 */
class AssetProcessor {
    
    /**
     * Processes all partner assets and generates resources
     */
    fun generatePartnerAssets(config: PartnerAppConfig): ProcessedAssets {
        return ProcessedAssets(
            appIcons = generateAppIcons(config.brandConfig.appIcon),
            splashScreens = generateSplashScreens(config.brandConfig.splashLogo),
            headerLogos = generateHeaderLogos(config.brandConfig.headerLogo),
            colorResources = generateColorResources(config.brandConfig),
            stringResources = generateStringResources(config),
            themeResources = generateThemeResources(config),
            manifestUpdates = generateManifestUpdates(config)
        )
    }
    
    /**
     * Generates app icons in different densities
     */
    private fun generateAppIcons(logoBase64: String): Map<String, String> {
        val iconSizes = mapOf(
            "mipmap-mdpi" to 48,
            "mipmap-hdpi" to 72,
            "mipmap-xhdpi" to 96,
            "mipmap-xxhdpi" to 144,
            "mipmap-xxxhdpi" to 192
        )
        
        return iconSizes.mapValues { (density, size) ->
            resizeImageBase64(logoBase64, size, size)
        }
    }
    
    /**
     * Generates splash screen logos
     */
    private fun generateSplashScreens(logoBase64: String): Map<String, String> {
        val splashSizes = mapOf(
            "drawable-mdpi" to 200,
            "drawable-hdpi" to 300,
            "drawable-xhdpi" to 400,
            "drawable-xxhdpi" to 600,
            "drawable-xxxhdpi" to 800
        )
        
        return splashSizes.mapValues { (density, size) ->
            resizeImageBase64(logoBase64, size, (size * 0.6).toInt())
        }
    }
    
    /**
     * Generates header logos for navigation
     */
    private fun generateHeaderLogos(logoBase64: String): Map<String, String> {
        val headerSizes = mapOf(
            "drawable-mdpi" to Pair(120, 40),
            "drawable-hdpi" to Pair(180, 60),
            "drawable-xhdpi" to Pair(240, 80),
            "drawable-xxhdpi" to Pair(360, 120),
            "drawable-xxxhdpi" to Pair(480, 160)
        )
        
        return headerSizes.mapValues { (density, dimensions) ->
            resizeImageBase64(logoBase64, dimensions.first, dimensions.second)
        }
    }
    
    /**
     * Resizes a base64 image to specified dimensions
     */
    private fun resizeImageBase64(base64Image: String, width: Int, height: Int): String {
        try {
            // Decode base64 to image
            val imageBytes = Base64.getDecoder().decode(base64Image.removePrefix("data:image/png;base64,"))
            val originalImage = ImageIO.read(ByteArrayInputStream(imageBytes))
            
            // Create resized image
            val resizedImage = BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB)
            val graphics = resizedImage.createGraphics()
            
            // Enable high-quality rendering
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR)
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
            
            // Calculate aspect ratio and center the image
            val originalWidth = originalImage.width
            val originalHeight = originalImage.height
            val aspectRatio = originalWidth.toDouble() / originalHeight.toDouble()
            
            val (drawWidth, drawHeight) = if (aspectRatio > width.toDouble() / height.toDouble()) {
                Pair(width, (width / aspectRatio).toInt())
            } else {
                Pair((height * aspectRatio).toInt(), height)
            }
            
            val x = (width - drawWidth) / 2
            val y = (height - drawHeight) / 2
            
            graphics.drawImage(originalImage, x, y, drawWidth, drawHeight, null)
            graphics.dispose()
            
            // Convert back to base64
            val outputStream = ByteArrayOutputStream()
            ImageIO.write(resizedImage, "PNG", outputStream)
            return Base64.getEncoder().encodeToString(outputStream.toByteArray())
            
        } catch (e: Exception) {
            throw RuntimeException("Failed to resize image: ${e.message}", e)
        }
    }
    
    /**
     * Generates color resources XML
     */
    private fun generateColorResources(brandConfig: BrandConfiguration): String {
        return """
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Partner Brand Colors -->
    <color name="partner_primary">${brandConfig.primaryColor}</color>
    <color name="partner_primary_variant">${darkenColor(brandConfig.primaryColor, 0.2f)}</color>
    <color name="partner_secondary">${brandConfig.secondaryColor}</color>
    <color name="partner_secondary_variant">${darkenColor(brandConfig.secondaryColor, 0.2f)}</color>
    
    <!-- Background Colors -->
    <color name="partner_background">${brandConfig.backgroundColor}</color>
    <color name="partner_surface">${brandConfig.surfaceColor}</color>
    
    <!-- Text Colors -->
    <color name="partner_on_primary">${getContrastingTextColor(brandConfig.primaryColor)}</color>
    <color name="partner_on_secondary">${getContrastingTextColor(brandConfig.secondaryColor)}</color>
    <color name="partner_on_background">${brandConfig.textColor}</color>
    <color name="partner_on_surface">${brandConfig.textColor}</color>
    <color name="partner_text_secondary">${brandConfig.textColorSecondary}</color>
    
    <!-- Status Colors -->
    <color name="partner_error">${brandConfig.errorColor}</color>
    <color name="partner_success">${brandConfig.successColor}</color>
    <color name="partner_warning">${brandConfig.warningColor}</color>
    
    ${if (brandConfig.supportDarkMode && brandConfig.darkModeColors != null) {
        """
    <!-- Dark Mode Colors -->
    <color name="partner_primary_dark">${brandConfig.darkModeColors.primaryColor}</color>
    <color name="partner_background_dark">${brandConfig.darkModeColors.backgroundColor}</color>
    <color name="partner_surface_dark">${brandConfig.darkModeColors.surfaceColor}</color>
    <color name="partner_text_dark">${brandConfig.darkModeColors.textColor}</color>
    <color name="partner_text_secondary_dark">${brandConfig.darkModeColors.textColorSecondary}</color>
        """.trimIndent()
    } else ""}
    
    <!-- Calculated Colors -->
    <color name="partner_ripple">${addAlpha(brandConfig.primaryColor, 0.12f)}</color>
    <color name="partner_divider">${addAlpha(brandConfig.textColor, 0.12f)}</color>
    <color name="partner_disabled">${addAlpha(brandConfig.textColor, 0.38f)}</color>
    
    <!-- Standard Material Colors (fallback) -->
    <color name="purple_200">#FFBB86FC</color>
    <color name="purple_500">#FF6200EE</color>
    <color name="purple_700">#FF3700B3</color>
    <color name="teal_200">#FF03DAC5</color>
    <color name="teal_700">#FF018786</color>
    <color name="black">#FF000000</color>
    <color name="white">#FFFFFFFF</color>
    <color name="gray">#FF666666</color>
</resources>
        """.trimIndent()
    }
    
    /**
     * Generates string resources XML
     */
    private fun generateStringResources(config: PartnerAppConfig): String {
        return """
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- App Information -->
    <string name="app_name">${config.appName}</string>
    <string name="partner_name">${config.partnerName}</string>
    <string name="partner_id">${config.partnerId}</string>
    
    <!-- Welcome Messages -->
    <string name="welcome_message">Welcome to ${config.appName}</string>
    <string name="welcome_subtitle">Fast, secure, and reliable money transfers</string>
    <string name="powered_by">Powered by ${config.partnerName}</string>
    
    <!-- Main Navigation -->
    <string name="send_money">Send Money</string>
    <string name="transaction_history">Transaction History</string>
    <string name="support">Support</string>
    <string name="profile">Profile</string>
    <string name="settings">Settings</string>
    
    <!-- Remittance Flow -->
    <string name="start_transfer">Start Transfer</string>
    <string name="choose_recipient">Choose Recipient</string>
    <string name="enter_amount">Enter Amount</string>
    <string name="review_transfer">Review Transfer</string>
    <string name="confirm_transfer">Confirm Transfer</string>
    <string name="transfer_successful">Transfer Successful</string>
    
    <!-- Common Actions -->
    <string name="continue_action">Continue</string>
    <string name="cancel">Cancel</string>
    <string name="back">Back</string>
    <string name="next">Next</string>
    <string name="finish">Finish</string>
    <string name="retry">Retry</string>
    <string name="close">Close</string>
    
    <!-- Error Messages -->
    <string name="error_generic">Something went wrong. Please try again.</string>
    <string name="error_network">Network error. Please check your connection.</string>
    <string name="error_invalid_amount">Please enter a valid amount</string>
    <string name="error_insufficient_balance">Insufficient balance</string>
    
    <!-- Success Messages -->
    <string name="success_transfer_initiated">Transfer initiated successfully</string>
    <string name="success_transfer_completed">Transfer completed successfully</string>
    
    <!-- Loading Messages -->
    <string name="loading">Loading...</string>
    <string name="processing">Processing...</string>
    <string name="please_wait">Please wait</string>
    
    <!-- Compliance & Security -->
    <string name="kyc_required">Identity verification required</string>
    <string name="secure_transfer">Your transfer is secured with bank-level encryption</string>
    <string name="compliance_notice">All transfers are monitored for regulatory compliance</string>
    
    <!-- Partner-specific -->
    <string name="contact_support">Contact ${config.partnerName} Support</string>
    <string name="terms_and_conditions">${config.partnerName} Terms and Conditions</string>
    <string name="privacy_policy">${config.partnerName} Privacy Policy</string>
    
    <!-- Accessibility -->
    <string name="content_description_logo">${config.partnerName} logo</string>
    <string name="content_description_back_button">Go back</string>
    <string name="content_description_menu">Menu</string>
</resources>
        """.trimIndent()
    }
    
    /**
     * Generates theme resources XML
     */
    private fun generateThemeResources(config: PartnerAppConfig): String {
        val partnerThemeName = "Theme.${config.partnerName.replace(" ", "").replace("-", "")}"
        
        return """
<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools">
    
    <!-- Base Partner Theme -->
    <style name="$partnerThemeName" parent="Theme.Material3.DayNight.NoActionBar">
        <!-- Primary colors -->
        <item name="colorPrimary">@color/partner_primary</item>
        <item name="colorPrimaryVariant">@color/partner_primary_variant</item>
        <item name="colorOnPrimary">@color/partner_on_primary</item>
        
        <!-- Secondary colors -->
        <item name="colorSecondary">@color/partner_secondary</item>
        <item name="colorSecondaryVariant">@color/partner_secondary_variant</item>
        <item name="colorOnSecondary">@color/partner_on_secondary</item>
        
        <!-- Background colors -->
        <item name="android:colorBackground">@color/partner_background</item>
        <item name="colorSurface">@color/partner_surface</item>
        <item name="colorOnBackground">@color/partner_on_background</item>
        <item name="colorOnSurface">@color/partner_on_surface</item>
        
        <!-- Status colors -->
        <item name="colorError">@color/partner_error</item>
        <item name="colorOnError">@color/white</item>
        
        <!-- System UI -->
        <item name="android:statusBarColor">@color/partner_primary</item>
        <item name="android:navigationBarColor">@color/partner_background</item>
        <item name="android:windowLightStatusBar">false</item>
        
        <!-- Custom attributes -->
        <item name="elevationOverlayEnabled">true</item>
        <item name="android:enforceNavigationBarContrast" tools:targetApi="q">false</item>
    </style>
    
    <!-- Toolbar Theme -->
    <style name="$partnerThemeName.Toolbar" parent="Widget.Material3.Toolbar">
        <item name="android:background">@color/partner_primary</item>
        <item name="titleTextColor">@color/partner_on_primary</item>
        <item name="subtitleTextColor">@color/partner_on_primary</item>
        <item name="android:theme">@style/$partnerThemeName.ThemeOverlay.Toolbar</item>
    </style>
    
    <style name="$partnerThemeName.ThemeOverlay.Toolbar" parent="ThemeOverlay.Material3.Dark">
        <item name="colorControlNormal">@color/partner_on_primary</item>
        <item name="colorControlHighlight">@color/partner_ripple</item>
    </style>
    
    <!-- Button Styles -->
    <style name="$partnerThemeName.Button" parent="Widget.Material3.Button">
        <item name="backgroundTint">@color/partner_primary</item>
        <item name="android:textColor">@color/partner_on_primary</item>
        <item name="cornerRadius">${config.brandConfig.buttonRadius}</item>
        <item name="rippleColor">@color/partner_ripple</item>
    </style>
    
    <style name="$partnerThemeName.Button.Outlined" parent="Widget.Material3.Button.OutlinedButton">
        <item name="strokeColor">@color/partner_primary</item>
        <item name="android:textColor">@color/partner_primary</item>
        <item name="cornerRadius">${config.brandConfig.buttonRadius}</item>
        <item name="rippleColor">@color/partner_ripple</item>
    </style>
    
    <!-- Card Styles -->
    <style name="$partnerThemeName.Card" parent="Widget.Material3.CardView.Elevated">
        <item name="cardBackgroundColor">@color/partner_surface</item>
        <item name="cardCornerRadius">${config.brandConfig.cardRadius}</item>
        <item name="cardElevation">${config.brandConfig.cardElevation}</item>
        <item name="rippleColor">@color/partner_ripple</item>
    </style>
    
    <!-- Text Input Styles -->
    <style name="$partnerThemeName.TextInputLayout" parent="Widget.Material3.TextInputLayout.OutlinedBox">
        <item name="boxStrokeColor">@color/partner_primary</item>
        <item name="hintTextColor">@color/partner_text_secondary</item>
        <item name="android:textColorHint">@color/partner_text_secondary</item>
    </style>
    
    <!-- Dialog Theme -->
    <style name="$partnerThemeName.Dialog" parent="ThemeOverlay.Material3.Dialog">
        <item name="colorSurface">@color/partner_surface</item>
        <item name="colorOnSurface">@color/partner_on_surface</item>
    </style>
    
    <!-- Bottom Sheet Theme -->
    <style name="$partnerThemeName.BottomSheet" parent="Widget.Material3.BottomSheet">
        <item name="backgroundTint">@color/partner_surface</item>
    </style>
    
    ${if (config.brandConfig.supportDarkMode) {
        """
    <!-- Dark Theme Variant -->
    <style name="$partnerThemeName.Dark" parent="Theme.Material3.Dark.NoActionBar">
        <item name="colorPrimary">@color/partner_primary_dark</item>
        <item name="android:colorBackground">@color/partner_background_dark</item>
        <item name="colorSurface">@color/partner_surface_dark</item>
        <item name="colorOnBackground">@color/partner_text_dark</item>
        <item name="colorOnSurface">@color/partner_text_dark</item>
        <item name="android:statusBarColor">@color/partner_background_dark</item>
        <item name="android:navigationBarColor">@color/partner_background_dark</item>
    </style>
        """.trimIndent()
    } else ""}
    
</resources>
        """.trimIndent()
    }
    
    /**
     * Generates manifest updates
     */
    private fun generateManifestUpdates(config: PartnerAppConfig): Map<String, String> {
        return mapOf(
            "application_name" to "${config.partnerName.replace(" ", "")}Application",
            "theme_name" to "Theme.${config.partnerName.replace(" ", "").replace("-", "")}",
            "app_name" to config.appName,
            "partner_id" to config.partnerId,
            "package_name" to config.packageName
        )
    }
    
    /**
     * Utility functions for color manipulation
     */
    private fun darkenColor(hexColor: String, factor: Float): String {
        val color = Color.decode(hexColor)
        val r = (color.red * (1 - factor)).toInt().coerceIn(0, 255)
        val g = (color.green * (1 - factor)).toInt().coerceIn(0, 255)
        val b = (color.blue * (1 - factor)).toInt().coerceIn(0, 255)
        return String.format("#%02X%02X%02X", r, g, b)
    }
    
    private fun addAlpha(hexColor: String, alpha: Float): String {
        val color = Color.decode(hexColor)
        val alphaInt = (alpha * 255).toInt().coerceIn(0, 255)
        return String.format("#%02X%02X%02X%02X", alphaInt, color.red, color.green, color.blue)
    }
    
    private fun getContrastingTextColor(hexColor: String): String {
        val color = Color.decode(hexColor)
        val luminance = (0.299 * color.red + 0.587 * color.green + 0.114 * color.blue) / 255
        return if (luminance > 0.5) "#000000" else "#FFFFFF"
    }
} 