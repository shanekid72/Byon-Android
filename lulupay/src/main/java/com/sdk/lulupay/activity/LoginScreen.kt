package com.sdk.lulupay.activity

import android.os.Bundle
import android.widget.EditText
import android.widget.Toast
import android.content.Intent
import android.media.Image
import android.widget.ImageView
import androidx.activity.ComponentActivity
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton
import com.sdk.lulupay.R
import com.sdk.lulupay.requestId.RequestId
import com.sdk.lulupay.session.SessionManager
import com.google.android.material.textfield.TextInputEditText
import androidx.lifecycle.lifecycleScope
import com.sdk.lulupay.token.AccessToken
import com.sdk.lulupay.storage.SecureLoginStorage
import kotlinx.coroutines.launch
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.sdk.lulupay.authentication.BiometricHelper
import com.sdk.lulupay.preference.PreferencesHelper
import com.sdk.lulupay.theme.ThemeManager
import kotlin.properties.Delegates

/**
 * LoginScreen Activity
 * Handles user authentication and login flow
 * - Displays login form with username/password fields
 * - Validates credentials
 * - Gets access token
 * - Stores session data
 * - Redirects to main app screen on success
 */
class LoginScreen : AppCompatActivity() {

    private lateinit var dialog: AlertDialog
    private var logoResId by Delegates.notNull<Int>()
    private lateinit var errorDialog: AlertDialog
    private lateinit var login_btn: MaterialButton
    private lateinit var username_edittext: EditText
    private lateinit var logo: ImageView
    private lateinit var password_edittext: TextInputEditText

    /* private var isRemittance: Boolean = false
     private var isPayment: Boolean = false
     private val REMMITTANCE_INTENT_EXTRA: String = "ISREMITTANCE"
     private val PAYMENT_INTENT_EXTRA: String = "ISPAYMENT"
     private val AUTO_LOGIN: String = "ISAUTOLOGIN"
     private val USERNAME: String = "USERNAME"
     private val PASSWORD: String = "PASSWORD"
     private val GRANTTYPE: String = "GRANTTYPE"
     private val CLIENTID: String = "CLIENTID"
     private val SCOPE: String = "SCOPE"
     private val CLIENTSECRET: String = "CLIENTSECRET"*/
    private val MANUAL_LOGIN = "ISMANUALLOGIN"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.login)
        logoResId = intent.getIntExtra("LOGO_RES_ID", -1)
        setupViews()
    }

    /**
     * Handles user login authentication
     * - Gets access token using provided credentials
     * - Handles success/failure cases
     * - Saves login details securely
     * - Redirects on successful login
     * - Shows error messages on failure
     * @param username The username entered by user
     * @param password The password entered by user
     */
    private fun loginUser(username: String, password: String) {

        lifecycleScope.launch {
            try {
                // Get access token
                val result = AccessToken.getAccessToken(
                    username = username,
                    password = password,
                    requestId = "$username-${RequestId.generateRequestId()}",
                    grantType = "password",
                    clientId = "cdp_app",
                    scope = null,
                    clientSecret = "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y"
                )

                val error = result.exceptionOrNull()
                if (error != null) {
                    dismissDialog()
                    if (isLikelyJson(error.message ?: "Error occurred: ")) {
                        extractErrorMessageData(error.message ?: "Error occurred: ")
                    } else {
                        showMessage(error.message ?: "Error occurred: ")
                    }
                    return@launch
                }

                val newToken = result.getOrNull()?.access_token
                if (newToken.isNullOrEmpty()) {
                    dismissDialog()
                    showMessage("Access token is null or empty")
                    return@launch
                }

                showBiometricPrompt(username, password)
            } catch (e: Exception) {
                dismissDialog()
                showMessage(e.message ?: "An unexpected error occurred")
            }
        }
    }

    private fun showBiometricPrompt(username: String, password: String) {
        BiometricHelper.authenticate(
            "Login Confirmation",
            "Please authenticate to continue",
            this,
            onSuccess = {
                // Handle success (e.g., navigate to another screen)
                // Save it to session to be used for the entire app lifecycle
                addSession(
                    username = username,
                    password = password,
                    grantType = "password",
                    clientId = "cdp_app",
                    scope = null,
                    clientSecret = "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y"
                )

                // Save username and password securely to use for auto login
                SecureLoginStorage.saveLoginDetails(this@LoginScreen, username, password)
                redirect()
            },
            onFailure = {
                // Handle failure (e.g., show error message)
                showMessage("Biometric authentication failed")
            },
            onError = {
                // Handle error (e.g., show error message)
                dismissDialog()
                showErrorDialog(it)
            })

    }

    private fun showErrorDialog(message: String) {
        dialog = AlertDialog.Builder(this@LoginScreen)
            .setTitle("Biometric Authentication Failed")
            .setMessage(message)
            .setPositiveButton("Cancel") { dialog, _ ->
                dialog.dismiss()
            }
            .setCancelable(false)
            .create()

        dialog.setCanceledOnTouchOutside(false)
        dialog.show()
    }

    /**
     * Handles redirection after successful login
     * - Dismisses any showing dialogs
     * - Creates intent for RemittanceScreen
     * - Adds manual login flag to bundle
     * - Starts RemittanceScreen activity
     * - Finishes current activity
     */
    private fun redirect() {
        dismissDialog()
        val intent = Intent(this, RemittanceScreen::class.java)
        val bundle = Bundle() // Use 'val' and correct Kotlin syntax for instantiation
        bundle.putBoolean(MANUAL_LOGIN, true) // Key-value pair
        intent.putExtras(bundle)
        startActivity(intent)
        finish()
    }

    /**
     * Sets up UI views and click listeners
     * - Initializes login button and input fields
     * - Sets click listener on login button
     * - Validates input fields
     * - Triggers login process if validation passes
     */
    private fun setupViews() {
        login_btn = findViewById(R.id.login_btn)
        username_edittext = findViewById(R.id.username)
        logo = findViewById(R.id.logo)
        password_edittext = findViewById(R.id.password)

// Set the logo to the ImageView
        if (logoResId!=-1)
            logo.setImageResource(logoResId)

        login_btn.setOnClickListener {
            val username: String = username_edittext.text.toString()
            val password: String = password_edittext.text.toString()
            if (username.isNotEmpty()) {
                if (password.isNotEmpty()) {
                    showDialog()
                    loginUser(username, password)
                } else {
                    showMessage("Password is required!")
                }
            } else {
                showMessage("Username is required!")
            }
        }
    }

    /**
     * Shows a custom progress dialog
     * - Creates non-cancelable AlertDialog
     * - Uses custom transparent style
     * - Sets custom layout
     * - Prevents dismissal on outside touch
     */
    private fun showDialog() {
        // Build the AlertDialog
        dialog = AlertDialog.Builder(this, R.style.TransparentDialog)
            .setView(R.layout.custom_dialog) // Set custom layout as the dialog's content
            .setCancelable(false) // Disable back button dismiss
            .create()

        // Prevent dialog from dismissing on outside touch
        dialog.setCanceledOnTouchOutside(false)

        // Show the dialog
        dialog.show()
    }

    /**
     * Dismisses the progress dialog if showing
     * Checks if dialog is showing before attempting dismiss
     */
    private fun dismissDialog() {
        if (dialog.isShowing == true) {
            dialog.dismiss()
        }
    }

    /**
     * Checks if a string is likely JSON format
     * @param input String to check
     * @return Boolean indicating if string starts with { or [
     */
    private fun isLikelyJson(input: String): Boolean {
        return input.trimStart().startsWith('{') || input.trimStart().startsWith('[')
    }

    /**
     * Extracts error message from JSON response
     * - Parses JSON string into JsonObject
     * - Extracts message field
     * - Shows extracted message to user
     * @param errorMessage JSON string containing error details
     */
    private fun extractErrorMessageData(errorMessage: String) {
        val gson = Gson()

        // Parse the JSON string into a JsonObject
        val jsonObject = gson.fromJson(errorMessage, JsonObject::class.java)

        // Extract the "message" value
        val message = jsonObject.get("message").asString

        showMessage(message)
    }

    /**
     * Shows a toast message to the user
     * @param message Message to display
     */
    private fun showMessage(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    /**
     * Adds login session data to SessionManager
     * Stores credentials and OAuth details for app lifecycle
     * @param username User's username
     * @param password User's password
     * @param grantType OAuth grant type
     * @param clientId OAuth client ID
     * @param scope OAuth scope
     * @param clientSecret OAuth client secret
     */
    private fun addSession(
        username: String,
        password: String,
        grantType: String,
        clientId: String,
        scope: String?,
        clientSecret: String
    ) {
        SessionManager.username = username
        SessionManager.password = password
        SessionManager.grantType = grantType
        SessionManager.clientId = clientId
        SessionManager.scope = scope
        SessionManager.clientSecret = clientSecret
    }
}
