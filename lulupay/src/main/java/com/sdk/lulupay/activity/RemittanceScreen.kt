package com.sdk.lulupay.activity

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.*
import androidx.recyclerview.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.sdk.lulupay.token.AccessToken
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.sdk.lulupay.R
import com.sdk.lulupay.database.*
import com.sdk.lulupay.listeners.*
import com.sdk.lulupay.model.response.*
import com.sdk.lulupay.session.SessionManager
import com.sdk.lulupay.remittance.Remittance
import com.sdk.lulupay.recyclerView.*
import com.sdk.lulupay.requestId.RequestId
import com.sdk.lulupay.singleton.ActivityCloseManager
import com.sdk.lulupay.storage.SecureLoginStorage
import kotlinx.coroutines.launch
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.sdk.lulupay.authentication.BiometricHelper
import com.sdk.lulupay.report.SecurityReport
import kotlin.properties.Delegates

/**
 * RemittanceScreen Activity
 * Main screen for managing remittance transactions:
 * - Displays list of recipients
 * - Handles user authentication
 * - Manages transaction history
 * - Provides navigation to other screens
 */
class RemittanceScreen : AppCompatActivity(), FinishActivityListener {

    private lateinit var errorDialog: AlertDialog
    private lateinit var dialog: AlertDialog

    private lateinit var luluPayDB: LuluPayDB

    private val AUTO_LOGIN: String = "ISAUTOLOGIN"
    private val MANUAL_LOGIN = "ISMANUALLOGIN"
    private val USERNAME: String = "USERNAME"
    private val PASSWORD: String = "PASSWORD"
    private val DARK_MODE: String = "ISDARKMODE"
    private var logoResId by Delegates.notNull<Int>()

    private lateinit var addNewReceipientFab: FloatingActionButton
    private lateinit var recyclerView: RecyclerView
    private lateinit var backButton: ImageButton

    /**
     * Initializes the activity:
     * - Sets up layout and views
     * - Initializes database
     * - Registers listeners
     * - Handles intent extras
     * - Sets up click listeners
     * - Loads remittance history
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.remittance)

        val useMainAppTheme = intent.getBooleanExtra("USE_MAIN_APP_THEME", false)
        logoResId = intent.getIntExtra("LOGO_RES_ID", -1)

        // Step 2: Apply theme conditionally
        if (useMainAppTheme) {
            Log.d("RemittanceScreen", "Using main app theme")
            // No need to set, as main app theme will automatically apply
        } else {
            Log.d("RemittanceScreen", "Using SDK theme")
            setTheme(R.style.Base_Theme_LuLuBanking)
        }
        luluPayDB = LuluPayDB(this)

        registerListeners()
        handleIntentExtras()
        setupViews()
        getHistoryRemittance()
        setClickListener()
    }


    /**
     * Registers activity close listener to handle activity cleanup
     */
    private fun registerListeners() {
        ActivityCloseManager.registerListener(this)
    }

    /**
     * Unregisters activity close listener to prevent memory leaks
     */
    private fun destroyListeners() {
        ActivityCloseManager.unregisterListener(this) // Avoid memory leaks
    }

    /**
     * Initializes view references from layout
     */
    private fun setupViews() {
        addNewReceipientFab = findViewById(R.id.fab)
        recyclerView = findViewById(R.id.recyclerView)
        backButton = findViewById(R.id.back_button)
    }

    /**
     * Sets up click listeners for views:
     * - FAB opens AddNewRecipient screen
     * - Back button finishes activity
     */
    private fun setClickListener() {
        addNewReceipientFab.setOnClickListener {
            val intent = Intent(this, AddNewReceipient::class.java)
            startActivity(intent)
        }

        backButton.setOnClickListener {
            finish()
        }
    }

    /**
     * Handles intent extras for different login scenarios:
     * - Manual login
     * - Auto login
     * - Stored credentials login
     * Redirects to login screen if no valid credentials
     */
    private fun handleIntentExtras() {
        val intent = getIntent()


        if (intent.getBooleanExtra(MANUAL_LOGIN, false)) {
            handleManualLogin()
            return
        }

        if (intent.getBooleanExtra(AUTO_LOGIN, false)) {
            handleAutoLogin(intent)
            return
        }

        // Retrieve stored credentials securely
        val (username, password) = SecureLoginStorage.getLoginDetails(this)
        if (username != null && password != null) {
            showBiometricPrompt(username, password)
        } else {
            // Redirect to login screen
            showMessage("Please login")
            redirectToLoginScreen()
        }
    }

    /**
     * Handles manual login validation:
     * - Checks if required session data exists
     * - Finishes activity if validation fails
     */
    private fun handleManualLogin() {
        if (SessionManager.username.isNullOrEmpty() ||
            SessionManager.password.isNullOrEmpty() ||
            SessionManager.grantType.isNullOrEmpty() ||
            SessionManager.clientId.isNullOrEmpty() ||
            SessionManager.clientSecret.isNullOrEmpty()
        ) {
            finish()
        }
    }

    /**
     * Handles automatic login:
     * - Validates username and password from intent
     * - Shows error if credentials missing
     * - Attempts login if credentials valid
     */
    private fun handleAutoLogin(intent: Intent) {
        val username = intent.getStringExtra(USERNAME)
        val password = intent.getStringExtra(PASSWORD)

        when {
            username.isNullOrEmpty() -> {
                showError(
                    "Error Occurred",
                    "Username intent bundle extra is null: When auto login is set to true the login credentials are required"
                )
            }

            password.isNullOrEmpty() -> {
                showError(
                    "Error Occurred",
                    "Password intent bundle extra is null: When auto login is set to true the login credentials are required"
                )
            }

            else -> {

                showBiometricPrompt(username, password)
            }
        }
    }

    /**
     * Shows action dialog for transaction:
     * - Send Money option
     * - View Receipt option
     * - Cancel option
     */
    private fun showAlertDialog(title: String, transactionRefNo: String) {
        val builder = AlertDialog.Builder(this)
        builder.setTitle(title)
        builder.setMessage("Please choose the action you want")

        // Positive Button (Send Money)
        builder.setPositiveButton("Send Money") { dialog, _ ->
            dialog.dismiss()
            showDialog()
            getEnquireTransaction(transactionRefNo)
        }

        // Neutral Button (View Details)
        builder.setNeutralButton("View Receipt") { dialog, _ ->
            dialog.dismiss()
            redirectToReceiptScreen(transactionRefNo)
        }

        // Negative Button (Cancel Transaction)
        builder.setNegativeButton("Cancel") { dialog, _ ->
            dialog.dismiss()
        }

        val dialog = builder.create()
        dialog.show()
    }

    /**
     * Navigates to receipt screen with transaction reference
     */
    private fun redirectToReceiptScreen(transactionRefNo: String) {
        val intent = Intent(this, RemittanceReceipt::class.java)
        intent.putExtra("TRANSACTION_REF_NO", transactionRefNo)
        startActivity(intent)
    }

    /**
     * Shows error dialog with title and message:
     * - Displays error details
     * - Closes activity on dismiss
     */
    private fun showError(title: String, errorMessage: String) {
        val builder = AlertDialog.Builder(this) // 'this' refers to the current activity context
        builder.setTitle(title)
        builder.setMessage(errorMessage)
        builder.setPositiveButton("Close") { dialog, _ ->
            dialog.dismiss()
            finish() // Close the dialog when "OK" is clicked
        }
        val dialog = builder.create()
        dialog.show()
    }

    /**
     * Loads remittance history from database:
     * - Fetches all records
     * - Sets up recycler view with data
     * - Shows error message on failure
     */
    private fun getHistoryRemittance() {
        lifecycleScope.launch {
            try {
                var remittanceList: List<RemittanceHistory>
                remittanceList = luluPayDB.getAllData()
                // Use the data (e.g., log it or display it in a RecyclerView)
                setupRecyclerViewRecipientsAdapter(remittanceList)
            } catch (e: Exception) {
                // Handle error
                showMessage(e.message ?: "An unexpected error occurred")
            }
        }
    }

    /**
     * Sets up recycler view adapter:
     * - Maps database records to UI model
     * - Configures click handlers
     * - Sets layout manager and adapter
     */
    private fun setupRecyclerViewRecipientsAdapter(receipient: List<RemittanceHistory>) {
        val receipients = receipient.map {
            Receipients(
                firstName = it.firstName,
                lastName = it.lastName,
                phoneNo = it.phoneNo,
                transactionRefNo = it.transactionRefNo
            )
        }
        val adapter = ReceipientsAdapter(
            receipients,
            onItemClick = { position, recipient ->
                // Handle normal click
                val selected = receipients[position]

                val transactionRefNo = selected.transactionRefNo
                val name = selected.firstName + selected.lastName

                showAlertDialog(name, transactionRefNo)
            },
            onItemLongClick = { position, recipient ->
                // Handle long click (e.g., show delete confirmation)
                val selected = receipients[position]

                val transactionRefNo = selected.transactionRefNo

                redirectToHistoryScreen(transactionRefNo)
            }
        )

        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter
    }

    /**
     * Navigates to transaction history screen
     */
    private fun redirectToHistoryScreen(transactionRefNo: String) {
        val intent = Intent(this@RemittanceScreen, TransactionHistoryScreen::class.java)
        intent.putExtra("TRANSACTION_REF_NO", transactionRefNo)
        startActivity(intent)
    }

    /**
     * Fetches transaction details:
     * - Makes API call to enquire transaction
     * - Handles success/failure responses
     */
    private fun getEnquireTransaction(transactionRefNo: String) {
        lifecycleScope.launch {
            Remittance.enquireTransaction(
                transactionRefNo = transactionRefNo,
                listener = object : EnquireTransactionListener {
                    override fun onSuccess(response: EnquireTransactionResponse) {
                        sortEnquireTransactionResponse(response)
                    }

                    override fun onFailed(errorMessage: String) {
                        dismissDialog()
                        if (isLikelyJson(errorMessage)) {
                            extractErrorMessageData(errorMessage)
                        } else {
                            showMessage(errorMessage)
                        }
                    }
                })
        }
    }

    /**
     * Processes enquire transaction response:
     * - Extracts transaction details
     * - Handles different receiving modes
     * - Gets service corridor data
     */
    private fun sortEnquireTransactionResponse(response: EnquireTransactionResponse) {

        // Extract data from the response
        val data = response.data

        var correspondent: String? = null
        var bankId: String? = null
        var branchId: String? = null

        val receivingMode: String = data.transaction.receiving_mode

        if (!receivingMode.equals("BANK")) {
            if (data.receiver.cashpickup_details?.correspondent != null) {
                correspondent = data.receiver.cashpickup_details?.correspondent
            } else if (data.receiver.mobilewallet_details?.correspondent != null) {
                correspondent = data.receiver.mobilewallet_details?.correspondent
            } else {
                correspondent = null
            }

            if (data.receiver.cashpickup_details?.correspondent_id != null) {
                bankId = data.receiver.cashpickup_details?.correspondent_id
            } else if (data.receiver.mobilewallet_details?.bank_id != null) {
                bankId = data.receiver.mobilewallet_details?.bank_id
            } else {
                bankId = null
            }

            if (data.receiver.cashpickup_details?.correspondent_location_id != null) {
                branchId = data.receiver.cashpickup_details?.correspondent_location_id
            } else if (data.receiver.mobilewallet_details?.branch_id != null) {
                branchId = data.receiver.mobilewallet_details?.branch_id
            } else {
                branchId = null
            }
        }

        val receivingCountryCode: String = data.transaction.receiving_country_code

        getServiceCorridor(
            data,
            correspondent,
            bankId,
            branchId,
            receivingMode,
            receivingCountryCode
        )
    }

    /**
     * Fetches service corridor details:
     * - Makes API call for service corridor
     * - Handles response mapping
     * - Navigates to input screen with data
     */
    private fun getServiceCorridor(
        data: TransactionData,
        correspondent: String?,
        bankId: String?,
        branchId: String?,
        receivingMode: String,
        receivingCountryCode: String
    ) {
        lifecycleScope.launch {
            Remittance.getServiceCorridor(
                partnerName = SessionManager.username ?: "",
                receiving_mode = receivingMode,
                receiving_country_code = receivingCountryCode,
                listener =
                object : ServiceCorridorListener {
                    override fun onSuccess(response: ServiceCorridorResponse) {
                        dismissDialog()

                        val remittanceDetail =
                            response.data.firstOrNull() ?: return // Safely handle empty list
                        val intent = Intent(this@RemittanceScreen, InputScreen::class.java)
                        // Map the response data to the intent extras
                        intent.putExtra(
                            "SENDING_COUNTRY_CODE",
                            data.transaction.sending_country_code as String?
                        )
                        intent.putExtra("TYPE", data.type)
                        intent.putExtra(
                            "RECEIVING_MODE",
                            data.transaction.receiving_mode as String?
                        )
                        intent.putExtra(
                            "RECEIVING_MODE_NAME",
                            data.transaction.receiving_mode as String?
                        )// Assuming receiving_mode is the same as receiving_mode_name
                        intent.putExtra(
                            "RECEIVING_COUNTRY_CODE",
                            data.transaction.receiving_country_code as String?
                        )
                        intent.putExtra(
                            "LIMIT_MIN_AMOUNT",
                            remittanceDetail.limit_min_amount.toString()
                        ) // Assuming this is not provided in the response
                        intent.putExtra(
                            "LIMIT_PER_TRANSACTION",
                            remittanceDetail.limit_per_transaction.toString()
                        ) // Assuming this is not provided in the response
                        intent.putExtra(
                            "SEND_MIN_AMOUNT",
                            remittanceDetail.send_min_amount.toString()
                        ) // Assuming this is not provided in the response
                        intent.putExtra(
                            "SEND_MAX_AMOUNT",
                            remittanceDetail.send_max_amount.toString()
                        ) // Assuming this is not provided in the response
                        intent.putExtra("CORRESPONDENT", correspondent as String?)
                        intent.putExtra("BANK_ID", bankId as String?)
                        intent.putExtra("BRANCH_ID", branchId as String?)
                        intent.putExtra(
                            "SENDER_CURRENCY_CODE",
                            data.transaction.sending_currency_code as String?
                        )
                        intent.putExtra(
                            "RECEIVER_CURRENCY_CODE",
                            data.transaction.receiving_currency_code as String?
                        )
                        intent.putExtra("CORRESPONDENT_NAME", null as String?)
                        intent.putExtra(
                            "BANK_ID",
                            null as String?
                        ) // Assuming this is not provided in the response
                        intent.putExtra(
                            "BRANCH_ID",
                            null as String?
                        ) // Assuming this is not provided in the response
                        intent.putExtra(
                            "ROUTING_CODE",
                            data.receiver.bank_details?.routing_code as String?
                        )
                        intent.putExtra("ISO_CODE", data.receiver.bank_details?.iso_code as String?)
                        //intent.putExtra("SORT_CODE", data.receiver.bank_details?.sort_code as String?)
                        intent.putExtra("IBAN", data.receiver.bank_details?.iban as String?)
                        intent.putExtra(
                            "ACCOUNT_NUMBER",
                            data.receiver.bank_details?.account_number as String?
                        )
                        intent.putExtra("RECEIVER_FIRST_NAME", data.receiver.first_name as String?)
                        intent.putExtra(
                            "RECEIVER_MIDDLE_NAME",
                            data.receiver.middle_name as String?
                        )
                        intent.putExtra("RECEIVER_LAST_NAME", data.receiver.last_name as String?)
                        intent.putExtra("INSTRUMENT", data.instrument as String?)
                        intent.putExtra("RECEIVER_PHONE_NO", data.receiver.mobile_number as String?)
                        intent.putExtra(
                            "ACCOUNT_TYPE_CODE",
                            data.receiver.bank_details?.account_type as String?
                        )

                        // Start the RemittanceDetails activity
                        startActivity(intent)

                    }

                    override fun onFailed(errorMessage: String) {
                        dismissDialog()
                        if (isLikelyJson(errorMessage)) {
                            extractErrorMessageData(errorMessage)
                        } else {
                            showMessage(errorMessage)
                        }
                    }
                })
        }
    }

    /**
     * Checks if string is likely JSON format
     */
    fun isLikelyJson(input: String): Boolean {
        return input.trimStart().startsWith('{') || input.trimStart().startsWith('[')
    }

    /**
     * Extracts error message from JSON response:
     * - Parses JSON string
     * - Shows extracted message
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
     * Handles user login:
     * - Gets access token
     * - Validates response
     * - Stores session data
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
                    showError("Error Occurred", (error.message ?: "Error occurred: Null"))
                    if (isLikelyJson(error.message ?: "Error occurred: Null")) {
                        extractErrorMessageData(error.message ?: "Error occurred: Null")
                    } else {
                        showMessage(error.message ?: "Error occurred: Null")
                    }
                    return@launch
                }

                val newToken = result.getOrNull()?.access_token
                if (newToken.isNullOrEmpty()) {
                    dismissDialog()
                    showError("Error Occurred", "Access token is null or empty")
                    showMessage("Access token is null or empty")
                    return@launch
                }

                addSession(
                    username,
                    password,
                    "password",
                    "cdp_app",
                    null,
                    "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y"
                )

                dismissDialog()
            } catch (e: Exception) {
                dismissDialog()
                showError("Error Occurred", (e.message ?: "Error occurred: Null"))
                if (isLikelyJson(e.message ?: "Error occurred: Null")) {
                    extractErrorMessageData(e.message ?: "")
                } else {
                    showMessage(e.message ?: "Error occurred: Null")
                }
            }
        }
    }

    /**
     * Navigates to login screen and finishes current activity
     */
    private fun redirectToLoginScreen() {
        val intent = Intent(this, LoginScreen::class.java)
        intent.putExtra("LOGO_RES_ID", logoResId)
        startActivity(intent)
        finish()
    }

    /**
     * Shows progress dialog:
     * - Creates and configures dialog
     * - Prevents dismissal
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
     * Dismisses progress dialog if showing
     */
    private fun dismissDialog() {
        if (dialog.isShowing) {
            dialog.dismiss()
        }
    }

    /**
     * Stores session data in SessionManager
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

    private fun showBiometricPrompt(email: String, password: String) {
        BiometricHelper.authenticate(
            "Login Confirmation",
            "Please authenticate to continue",
            this,
            onSuccess = {
                // Handle success (e.g., navigate to another screen)
                showDialog()
                loginUser(email, password)
            },
            onFailure = {
                // Handle failure (e.g., show error message)
                showMessage("Biometric authentication failed")
            },
            onError = {
                showError("Error Occurred", it)
            })

    }

    /**
     * Shows toast message to user
     */
    private fun showMessage(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    /**
     * Implements FinishActivityListener interface
     * Finishes activity when called
     */
    override fun onFinishActivity() {
        finish() // Close this activity when called
    }

    /**
     * Cleans up resources when activity is destroyed
     */
    override fun onDestroy() {
        super.onDestroy()
        destroyListeners()
    }
}
