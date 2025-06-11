package com.sdk.lulupay.application

import android.app.Activity
import android.app.Application
import android.app.AlertDialog
import android.os.Bundle
import android.util.Log
import com.sdk.lulupay.security.SecurityCheck
import com.sdk.lulupay.report.SecurityReport

class LulupayApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // Initialize SecurityCheck with the Application context
        val securityCheck: SecurityCheck = SecurityCheck(this)

        // Set the listener for security report events
        SecurityReport.setSecurityReportListener()

        // Start the security check loop
        securityCheck.startSecurityLoop()

        Log.d("LulupayApplication", "SecurityCheck initialized at app start")
    }
}
