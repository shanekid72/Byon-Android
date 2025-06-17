plugins {
    id("com.android.library") // Apply the Android Library plugin
    id("org.jetbrains.kotlin.android") // Apply Kotlin Android plugin
    id("org.jetbrains.dokka") // Apply Dokka plugin
}

tasks.dokkaHtml.configure {
    outputDirectory.set(buildDir.resolve("dokka"))
    dokkaSourceSets {
        named("main") {
            noAndroidSdkLink.set(false)
            includeNonPublic.set(true)
            skipEmptyPackages.set(true)
            skipDeprecated.set(false)
            reportUndocumented.set(true)
        }
    }
}

android {
    namespace = "com.sdk.lulupay"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
        lint.targetSdk = 35

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("consumer-rules.pro")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = "11"
    }
}

dependencies {
    implementation(libs.androidx.constraintlayout)
    implementation(libs.androidx.sqlite)
    implementation(libs.androidx.sqlite.framework)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.appcompat.v161)
    implementation(libs.kotlin.stdlib)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.androidx.core.ktx.v1120)
    implementation(libs.retrofit)
    implementation(libs.converter.gson)
    implementation(libs.logging.interceptor)
    implementation(libs.tink.android)
    implementation(libs.material.v190)
    implementation(libs.androidx.preference.ktx)
    implementation(libs.androidx.core.ktx)
    implementation(libs.pdf.viewer)
    implementation(libs.androidx.activity)
    implementation (libs.androidx.biometric.ktx)
    implementation(libs.biometric.ktx)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit.v115)
    androidTestImplementation(libs.androidx.espresso.core.v351)
}
