package com.sdk.lulupay.activity

import android.content.Intent
import android.util.Log
import android.os.Bundle
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.sdk.lulupay.theme.ThemeManager

class TransactionHistoryScreen : AppCompatActivity() {

    private lateinit var backBtn: ImageButton
    private lateinit var transactionState: TextView
    private lateinit var transactionSubState: TextView
    private lateinit var transactionDate: TextView
    private lateinit var senderName: TextView
    private lateinit var senderCustomerNo: TextView
    private lateinit var receiverName: TextView
    private lateinit var receiverPhoneNo: TextView
    private lateinit var receiverRefNo: TextView
    private lateinit var transactionAmount: TextView

    private lateinit var dialog: AlertDialog

    private var transactionRefNo: String = ""

    /**
     * Initializes the activity and sets up the UI components
     * - Sets the content view
     * - Gets intent extras`
     * - Shows loading dialog
     * - Sets up views and click listeners
     * - Fetches transaction details
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_remittance_history)

        getIntentExtra()
        showDialog()
        setupViews()
        setupClickListener()
        getEnquireTransaction()
    }

    /**
     * Retrieves the transaction reference number from the intent extras
     * that was passed when launching this activity
     */
    private fun getIntentExtra() {
        transactionRefNo = intent.getStringExtra("TRANSACTION_REF_NO") ?: ""
    }

    /**
     * Initializes all the view components by finding them by their IDs
     * from the layout resource file
     */
    private fun setupViews() {
        backBtn = findViewById(R.id.back_button)
        transactionState = findViewById(R.id.tvTransactionState)
        transactionSubState = findViewById(R.id.tvTransactionSubState)
        transactionDate = findViewById(R.id.tvTransactionDate)
        senderName = findViewById(R.id.tvSenderName)
        senderCustomerNo = findViewById(R.id.tvSenderCustomerNumber)
        receiverName = findViewById(R.id.tvReceiverName)
        receiverPhoneNo = findViewById(R.id.tvReceiverMobile)
        receiverRefNo = findViewById(R.id.tvTransactionRefNo)
        transactionAmount = findViewById(R.id.tvTransactionAmount)
    }

    /**
     * Sets up click listeners for interactive UI elements
     * Currently only handles the back button click to finish the activity
     */
    private fun setupClickListener() {
        backBtn.setOnClickListener {
            finish()
        }
    }

    /**
     * Makes an API call to fetch transaction details using the transaction reference number
     * Handles both success and failure cases:
     * - On success: Updates UI with transaction details
     * - On failure: Shows error message to user
     */
    private fun getEnquireTransaction() {
        lifecycleScope.launch {
            Remittance.enquireTransaction(
                transactionRefNo = transactionRefNo,
                listener = object : EnquireTransactionListener {
                    override fun onSuccess(response: EnquireTransactionResponse) {
                        sortEnquireTransactionResponse(response)
                        dismissDialog()
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
     * Checks if a given string is likely to be a JSON by examining its first character
     * @param input The string to check
     * @return Boolean indicating if the string appears to be JSON
     */
    fun isLikelyJson(input: String): Boolean {
        return input.trimStart().startsWith('{') || input.trimStart().startsWith('[')
    }

    /**
     * Extracts the error message from a JSON string and displays it to the user
     * @param errorMessage JSON string containing error details
     */
    private fun extractErrorMessageData(errorMessage: String) {
        val gson = Gson()
        val jsonObject = gson.fromJson(errorMessage, JsonObject::class.java)
        val message = jsonObject.get("message").asString
        showMessage(message)
    }

    /**
     * Displays a toast message to the user
     * @param message The message to display
     */
    private fun showMessage(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    /**
     * Updates the UI with transaction details from the API response
     * Sets text for all transaction-related TextViews including:
     * - Transaction state and sub-state
     * - Transaction date
     * - Sender and receiver details
     * - Transaction amounts and currencies
     * @param response The API response containing transaction details
     */
    private fun sortEnquireTransactionResponse(response: EnquireTransactionResponse) {
        transactionState.setText("State: " + response.data.state)
        transactionSubState.setText("Sub-State: " + response.data.sub_state)
        transactionDate.setText("Date: " + response.data.transaction_date)
        senderName.setText("Sender: " + response.data.sender?.first_name + " " + response.data.sender?.last_name)
        senderCustomerNo.setText("Customer No: " + response.data.sender?.customer_number)
        receiverName.setText("Receiver: " + response.data.receiver.first_name + " " + response.data.receiver.middle_name + " " + response.data.receiver.last_name)
        receiverPhoneNo.setText("Mobile: " + response.data.receiver.mobile_number)
        receiverRefNo.setText("Ref No: " + transactionRefNo)
        transactionAmount.setText("Amount: " + response.data.transaction.sending_currency_code + " " + response.data.transaction.sending_amount + " → " + response.data.transaction.receiving_currency_code + " " + response.data.transaction.receiving_amount)
    }

    /**
     * Creates and shows a loading dialog
     * The dialog is:
     * - Non-cancelable
     * - Cannot be dismissed by touching outside
     * - Uses a custom layout
     */
    private fun showDialog() {
        dialog = AlertDialog.Builder(this, R.style.TransparentDialog)
            .setView(R.layout.custom_dialog)
            .setCancelable(false)
            .create()

        dialog.setCanceledOnTouchOutside(false)
        dialog.show()
    }

    /**
     * Dismisses the loading dialog if it is currently showing
     */
    private fun dismissDialog() {
        if (dialog.isShowing == true) {
            dialog.dismiss()
        }
    }
}