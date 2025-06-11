package com.sdk.lulupay.security

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
import com.sdk.lulupay.listeners.SecurityReportListener
import com.sdk.lulupay.report.SecurityReport
import java.io.File
import java.security.MessageDigest
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import kotlin.system.exitProcess

class SecurityCheck(private val sdkContext: Context) {
    private var context: Context = sdkContext

    private val handler = Handler(Looper.getMainLooper())
    private val sdkPackageName = "com.sdk.lulupay" // SDK's package name
    private var securityCheckInterval: Long = 5000 // Security check interval in milliseconds
    private var reportMsg: String = ""

    init {
        startSecurityLoop()
    }

    companion object {
        lateinit var reportListeners: SecurityReportListener
        fun setSecurityReportListener(reportListener: SecurityReportListener) {
            reportListeners = reportListener
        }
    }

    fun startSecurityLoop() {
        handler.postDelayed(object : Runnable {
            override fun run() {
                if (!isSecurityCheckSuccessful()) {
                    report()
                    exitProcess(0)
                }
                handler.postDelayed(this, securityCheckInterval)
            }
        }, securityCheckInterval)
    }

    // Perform the security check and return whether it's successful
    private fun isSecurityCheckSuccessful(): Boolean {

        if (isDeviceRooted()) {
            return false
        }
        if (isMemoryTampered()) {
            return false
        }
//       if (isSignatureInvalid()) {
//            return false
//        }
        //if (isPackageNameModified()) {
            //return false
        //}

        return true
    }

    private fun isDeviceRooted(): Boolean {
        val paths = arrayOf(
            "/system/app/Superuser.apk",
            "/system/xbin/su",
            "/system/bin/su"
        )
        return paths.any { path -> File(path).exists() }
    }

    private fun isMemoryTampered(): Boolean {
        val suspiciousProcesses = listOf("frida", "xposed", "magisk")
        val processList = Runtime.getRuntime().exec("ps").inputStream.bufferedReader().readText()
        return suspiciousProcesses.any { processList.contains(it, ignoreCase = true) }
    }

    private fun isSignatureInvalid(): Boolean {
        // Replace with the actual app signature hash
        val sha256Signature = "F8:6D:36:33:51:79:9C:D7:7E:56:B7:00:A6:8F:F5:A6:09:A3:1B:CC:4A:C7:A7:90:7F:A3:B0:AF:BF:4A:21:87"
        val sha1Signature = " 94:F9:AF:18:D5:DC:F9:B3:58:F1:AD:9B:23:E4:1C:0B:AF:52:B2:23"
        Log.d("Hi sinature", getSHA1Signature(context).toString())
        return getSHA256Signature(context) != sha256Signature || getSHA1Signature(context) != sha1Signature
    }

    private fun getSHA1Signature(context: Context): String? {
        return getSignatureDigest(context, "SHA1")
    }

    private fun getSHA256Signature(context: Context): String? {
        return getSignatureDigest(context, "SHA-256")
    }

    private fun getSignatureDigest(context: Context, algorithm: String): String? {
        return try {
            val packageName = context.packageName
            val packageManager = context.packageManager

            val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                // API 28+
                val packageInfo = packageManager.getPackageInfo(
                    packageName,
                    PackageManager.GET_SIGNING_CERTIFICATES
                )
                packageInfo.signingInfo?.apkContentsSigners
            } else {
                // API 24–27
                val packageInfo = packageManager.getPackageInfo(
                    packageName,
                    PackageManager.GET_SIGNATURES
                )
                packageInfo.signatures
            }

            if (signatures.isNullOrEmpty()) return null

            val certFactory = CertificateFactory.getInstance("X.509")
            val cert = certFactory.generateCertificate(
                signatures[0]?.toByteArray()?.inputStream()
            ) as X509Certificate
            val md = MessageDigest.getInstance(algorithm)
            val publicKey = md.digest(cert.encoded)

            // Return colon-separated hex format: AA:BB:CC...
            publicKey.joinToString(":") { byte -> "%02X".format(byte) }
        } catch (e: Exception) {
            Log.e("AppSignature", "$algorithm error: ${e.message}")
            null
        }
    }


    private fun isPackageNameModified(): Boolean {
        val expectedPackageName = SecurityCheck::class.java.`package`?.name ?: return true
        val isModified = !expectedPackageName.contains( sdkPackageName)
        Log.d("SecurityCheck", "Expected: $expectedPackageName, Configured: $sdkPackageName")
        return isModified
    }

    private fun report() {
        reportListeners.onReportMsg(reportMsg)
    }
}
