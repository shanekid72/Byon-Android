package com.sdk.lulupay.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.*
import android.util.Log
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.activity.OnBackPressedCallback
import com.sdk.lulupay.R
import com.sdk.lulupay.listeners.*
import com.sdk.lulupay.model.response.*
import com.sdk.lulupay.remittance.Remittance
import com.sdk.lulupay.session.SessionManager
import com.sdk.lulupay.singleton.ActivityCloseManager
import com.sdk.lulupay.recyclerView.*
import com.sdk.lulupay.database.LuluPayDB
import com.google.android.material.button.MaterialButton
import java.math.BigDecimal
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch
import com.google.gson.*
import com.google.gson.reflect.TypeToken
import com.sdk.lulupay.theme.ThemeManager

/**
 * RemittanceSuccessScreen Activity
 * Displays success screen after a successful remittance transaction:
 * - Shows transaction details
 * - Provides receipt access
 * - Handles navigation
 */
class RemittanceSuccessScreen : AppCompatActivity() {

    private lateinit var backButton: ImageButton
    private lateinit var paymentMessageText: TextView
    private lateinit var receiptButton: Button

    private var firstName: String = ""
    private var middleName: String = ""
    private var lastName: String = ""
    private var receivingCurrencySymbol: String = ""
    private var receivingCurrencyCode: String = ""
    private var receivingAmount: String = ""
    private var transactionRefNo: String = ""

    /**
     * Initializes the activity:
     * - Sets content view layout
     * - Destroys previous activities
     * - Registers event handlers
     * - Gets intent extras
     * - Sets up views and listeners
     * - Displays transaction data
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_payment_done)

        destroyPreviousActivity()
        registerEvents()
        getIntentExtras()
        setupViews()
        setClickListeners()
        setData()
    }

    /**
     * Destroys all previous activities in the stack
     * Uses ActivityCloseManager to clean up activity history
     */
    private fun destroyPreviousActivity() {
        ActivityCloseManager.closeAll()
    }

    /**
     * Registers back press event handler:
     * - Adds callback for system back button
     * - Overrides default back behavior
     * - Handles custom back navigation
     */
    private fun registerEvents() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Handle back button press
                goBack()
            }
        })
    }

    /**
     * Initializes view references:
     * - Finds and assigns back button
     * - Finds and assigns payment message text view
     * - Finds and assigns receipt button
     */
    private fun setupViews() {
        backButton = findViewById(R.id.back_button)
        paymentMessageText = findViewById(R.id.paymentMessageText)
        receiptButton = findViewById(R.id.receiptButton)
    }

    /**
     * Gets transaction data from intent extras:
     * - Extracts receiver name details
     * - Extracts currency information
     * - Extracts transaction amount
     * - Extracts transaction reference number
     */
    private fun getIntentExtras() {
        firstName = intent.getStringExtra("RECEIVER_FIRST_NAME") ?: ""
        middleName = intent.getStringExtra("RECEIVER_MIDDLE_NAME") ?: ""
        lastName = intent.getStringExtra("RECEIVER_LAST_NAME") ?: ""
        receivingCurrencyCode = intent.getStringExtra("RECEIVING_CURRENCY_CODE") ?: ""
        receivingCurrencySymbol = intent.getStringExtra("RECEIVING_CURRENCY_SYMBOL") ?: ""
        receivingAmount = intent.getStringExtra("RECEIVING_AMOUNT") ?: ""
        transactionRefNo = intent.getStringExtra("TRANSACTION_REF_NO") ?: ""
    }

    /**
     * Sets up click listeners for buttons:
     * - Back button listener for navigation
     * - Receipt button listener for viewing receipt
     */
    private fun setClickListeners() {
        backButton.setOnClickListener {
            goBack()
        }

        receiptButton.setOnClickListener {
            redirectToReceiptScreen()
        }
    }

    /**
     * Displays transaction success message:
     * - Formats message with transaction details
     * - Shows amount, currency and recipient name
     */
    private fun setData() {
        paymentMessageText.setText("You've successfully sent $receivingCurrencySymbol $receivingAmount $receivingCurrencyCode to $firstName $middleName $lastName")
    }

    /**
     * Navigates to receipt screen:
     * - Creates intent for RemittanceReceipt activity
     * - Passes transaction reference number
     * - Starts receipt activity
     */
    private fun redirectToReceiptScreen() {
        val intent = Intent(this, RemittanceReceipt::class.java)
        intent.putExtra("TRANSACTION_REF_NO", transactionRefNo)
        startActivity(intent)
    }

    /**
     * Handles back navigation:
     * - Creates intent for RemittanceScreen
     * - Sets manual login flag
     * - Starts remittance activity
     * - Finishes current activity
     */
    private fun goBack() {
        val intent = Intent(this, RemittanceScreen::class.java)
        intent.putExtra("ISMANUALLOGIN", true)
        startActivity(intent)
        finish()
    }
}