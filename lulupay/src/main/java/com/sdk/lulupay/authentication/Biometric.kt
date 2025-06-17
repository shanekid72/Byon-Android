package com.sdk.lulupay.authentication

import android.app.Activity
import android.content.Context
import android.content.DialogInterface
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat

object BiometricHelper {

    fun authenticate(
        title: String? = "Biometric Authentication",
        description: String? = "Use your fingerprint to authenticate",
        activity: AppCompatActivity,
        onSuccess: () -> Unit,
        onFailure: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        val biometricManager = BiometricManager.from(activity)

        val canAuthenticate = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL)

        when (canAuthenticate) {
            BiometricManager.BIOMETRIC_SUCCESS -> {
                showBiometricPrompt(activity, onSuccess, onFailure, onError)
            }
            else -> {
               onError("Biometric authentication is not available on this device.")
            }
        }
    }

    private fun showBiometricPrompt(
        activity: AppCompatActivity,
        onSuccess: () -> Unit,
        onFailure: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        val executor = ContextCompat.getMainExecutor(activity)
        val biometricPrompt = BiometricPrompt(activity, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    onSuccess()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    onError(errString.toString())
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    onFailure("Authentication Failed")
                }
            })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Biometric Authentication")
            .setSubtitle("Use your fingerprint to authenticate")
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL)
            .build()

        biometricPrompt.authenticate(promptInfo)
    }
}