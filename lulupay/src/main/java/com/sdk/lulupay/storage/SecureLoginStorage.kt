package com.sdk.lulupay.storage

import android.content.Context
import android.util.Base64
import com.sdk.lulupay.storage.SecureStorage
import android.content.SharedPreferences
import androidx.preference.PreferenceManager

object SecureLoginStorage {
    private const val PREFS_NAME = "lulupay_secure_login_prefs"
    private const val KEY_USERNAME = "username"
    private const val KEY_PASSWORD = "password"
    private const val PASSWORD_KEY_IV = "password_iv"
    private const val USERNAME_KEY_IV = "username_iv"

    /**
     * Securely saves user login credentials
     * Encrypts password using SecureStorage and saves to SharedPreferences
     * @param context Android context
     * @param username User's username
     * @param password User's password to encrypt and store
     */
    fun saveLoginDetails(context: Context, username: String, password: String) {
        SecureStorage.generateKey()

        val (encryptedPassword, passwordIv) = SecureStorage.encryptData(password)
        val (encryptedUsername, usernameIv) = SecureStorage.encryptData(username)
        val sharedPreferences = PreferenceManager.getDefaultSharedPreferences(context)

        sharedPreferences.edit().apply {
            putString(KEY_USERNAME, Base64.encodeToString(encryptedUsername, Base64.DEFAULT))
            putString(KEY_PASSWORD, Base64.encodeToString(encryptedPassword, Base64.DEFAULT))
            putString(PASSWORD_KEY_IV, Base64.encodeToString(passwordIv, Base64.DEFAULT))
            putString(USERNAME_KEY_IV, Base64.encodeToString(usernameIv, Base64.DEFAULT))
            apply()
        }
    }

    /**
     * Retrieves stored login credentials
     * Decrypts password using stored IV and returns username/password pair
     * @param context Android context
     * @return Pair of username and decrypted password, null if not found
     */
    fun getLoginDetails(context: Context): Pair<String?, String?> {
        val sharedPreferences = PreferenceManager.getDefaultSharedPreferences(context)

        val encryptedUsernameBase64 = sharedPreferences.getString(KEY_USERNAME, null)
        val encryptedPasswordBase64 = sharedPreferences.getString(KEY_PASSWORD, null)

        val passwordIvBase64 = sharedPreferences.getString(PASSWORD_KEY_IV, null)
        val usernameIvBase64 = sharedPreferences.getString(USERNAME_KEY_IV, null)

        if (encryptedUsernameBase64 != null && encryptedPasswordBase64 != null && passwordIvBase64 != null && usernameIvBase64 != null) {
            val encryptedPassword = Base64.decode(encryptedPasswordBase64, Base64.DEFAULT)
            val encryptedUsername = Base64.decode(encryptedUsernameBase64, Base64.DEFAULT)

            val passwordIv = Base64.decode(passwordIvBase64, Base64.DEFAULT)
            val usernameIv = Base64.decode(usernameIvBase64, Base64.DEFAULT)

            val decryptedUsername = SecureStorage.decryptData(encryptedUsername, usernameIv)
            val decryptedPassword = SecureStorage.decryptData(encryptedPassword, passwordIv)
            return Pair(decryptedUsername, decryptedPassword)
        }

        return Pair(null, null)
    }

    /**
     * Removes all stored login credentials
     * Clears SharedPreferences containing encrypted login data
     * @param context Android context
     */
    fun clearLoginDetails(context: Context) {
        val sharedPreferences = PreferenceManager.getDefaultSharedPreferences(context)
        sharedPreferences.edit().clear().apply()
    }
}