#!/usr/bin/env python3
"""
LuluPay Partner App Generator
Simple script to generate branded remittance apps
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from datetime import datetime

def load_config(config_file):
    """Load partner configuration from JSON file"""
    with open(config_file, 'r') as f:
        return json.load(f)

def validate_config(config):
    """Validate partner configuration"""
    required_fields = ['partnerId', 'partnerName', 'appName', 'packageName', 'primaryColor']
    for field in required_fields:
        if field not in config:
            print(f"❌ Missing required field: {field}")
            return False
    return True

def generate_app(config_file):
    """Generate partner app from configuration"""
    print("🚀 LuluPay Partner App Generator")
    
    # Load and validate configuration
    config = load_config(config_file)
    if not validate_config(config):
        return False
    
    print(f"✅ Generating app for: {config['partnerName']}")
    
    # Create workspace
    workspace = Path(f"output/partner_{config['partnerId']}")
    workspace.mkdir(parents=True, exist_ok=True)
    
    # Copy base app
    base_files = ['app', 'lulupay', 'build.gradle.kts', 'settings.gradle.kts']
    for item in base_files:
        if Path(item).exists():
            if Path(item).is_dir():
                shutil.copytree(item, workspace / item, dirs_exist_ok=True)
            else:
                shutil.copy2(item, workspace / item)
    
    # Update build.gradle.kts
    build_gradle = f"""
plugins {{
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}}

android {{
    namespace = "{config['packageName']}"
    compileSdk = 35
    
    defaultConfig {{
        applicationId = "{config['packageName']}"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
        
        buildConfigField("String", "PARTNER_ID", "\\"{config['partnerId']}\\"")
        resValue("string", "app_name", "{config['appName']}")
        resValue("color", "partner_primary", "{config['primaryColor']}")
    }}
    
    buildFeatures {{
        buildConfig = true
    }}
}}

dependencies {{
    implementation(project(":lulupay"))
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
}}
    """.strip()
    
    (workspace / "app" / "build.gradle.kts").write_text(build_gradle)
    
    print(f"✅ Partner app generated in: {workspace}")
    return True

def create_sample_config():
    """Create sample configuration"""
    sample = {
        "partnerId": "sample_bank",
        "partnerName": "Sample Bank",
        "appName": "Sample Bank Remittance",
        "packageName": "com.samplebank.remittance",
        "primaryColor": "#1E3A8A",
        "secondaryColor": "#F59E0B"
    }
    
    with open("sample_config.json", 'w') as f:
        json.dump(sample, f, indent=2)
    
    print("✅ Sample configuration created: sample_config.json")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--sample":
        create_sample_config()
    elif len(sys.argv) > 1:
        generate_app(sys.argv[1])
    else:
        print("Usage: python generate-partner-app.py <config.json>")
        print("       python generate-partner-app.py --sample") 