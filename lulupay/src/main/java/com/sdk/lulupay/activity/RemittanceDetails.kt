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
import com.sdk.lulupay.R
import com.sdk.lulupay.listeners.*
import com.sdk.lulupay.model.response.*
import com.sdk.lulupay.remittance.Remittance
import com.sdk.lulupay.session.SessionManager
import com.sdk.lulupay.recyclerView.*
import com.sdk.lulupay.database.LuluPayDB
import com.google.android.material.button.MaterialButton
import java.math.BigDecimal
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch
import com.google.gson.*
import com.google.gson.reflect.TypeToken
import com.google.gson.JsonObject
import androidx.recyclerview.widget.RecyclerView
import androidx.recyclerview.widget.LinearLayoutManager
import com.sdk.lulupay.authentication.BiometricHelper
import com.sdk.lulupay.database.RemittanceHistory
import com.sdk.lulupay.theme.ThemeManager

/**
 * RemittanceDetails Activity
 * This activity handles displaying and managing remittance transaction details including:
 * - Transaction details display
 * - FX rates and fee details
 * - Settlement information
 * - Transaction confirmation and processing
 * - Recipient data storage
 */
class RemittanceDetails : AppCompatActivity() {

    // Header Details
    private lateinit var backButton: ImageButton
    private lateinit var headerAmount: TextView
    private lateinit var headerflagImage: ImageView
    private lateinit var headerCurrencyName: TextView

    // Body Details
    private lateinit var bodyQuoteId: TextView
    private lateinit var bodyReceivingMode: TextView
    private lateinit var bodySendingCountry: TextView
    private lateinit var bodySendingCurrency: TextView
    private lateinit var bodyReceivingCountry: TextView
    private lateinit var bodyReceivingCurrency: TextView
    private lateinit var bodySendingAmount: TextView
    private lateinit var bodyReceivingAmount: TextView
    private lateinit var bodyTotalPayingAmount: TextView
    private lateinit var bodyReference: TextView
    private lateinit var bodyPriceGuarantee: TextView

    // RecyclerViews
    private lateinit var fxRateRecyclerView: RecyclerView
    private lateinit var feeDetailsRecyclerView: RecyclerView
    private lateinit var settlementRecyclerView: RecyclerView
    private lateinit var correspondentRulesRecyclerView: RecyclerView

    // Proceed Button
    private lateinit var proceedBtn: Button

    // Intent Extra Variable Datas
    private var quoteId: String = ""
    private var receivingModeName: String = ""
    private var sendingCountry: String = ""
    private var sendingCurrency: String = ""
    private var receivingCountry: String = ""
    private var receivingCurrency: String = ""
    private var sendingAmount: String = ""
    private var receivingAmount: String = ""
    private var receivingCurrencySymbol: String = ""
    private var totalPayingAmount: String = ""
    private var reference: String = ""
    private var priceGuarantee: String = ""
    private var instrument: String = ""
    private var phoneNo: String = ""
    private var firstName: String = ""
    private var middleName: String = ""
    private var lastName: String = ""
    private var accountTypeCode: String = ""
    private var accountNo: String? = ""
    private var isoCode: String? = ""
    private var iban: String? = ""
    private var routingCode: String? = ""
    private var correspondent: String? = ""
    private var receivingMode: String = ""
    private var bankId: String? = ""
    private var branchId: String? = ""
    private var agentTransactionRefNumber: String = ""
    private lateinit var fxRates: List<FxRate>
    private lateinit var feeDetails: List<FeeDetail>
    private lateinit var settlementDetails: List<SettlementDetail>
    private lateinit var correspondentRules: List<CorrespondentRule>

    private lateinit var dialog: AlertDialog

    /**
     * Initializes the activity and sets up the UI:
     * - Sets content view layout
     * - Gets intent extras
     * - Sets up views and click listeners
     * - Initializes data and adapters
     * @param savedInstanceState Bundle containing activity's previously saved state
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_sending_payment_details)

        getIntentExtras()
        setupViews()

        setClickListener()
        setData()
        setupRecyclerViewFxRateAdapter(fxRate = fxRates)
        setupRecyclerViewFeeDetailsAdapter(feeDetail = feeDetails)
        setupRecyclerViewSettlementAdapter(settlementDetail = settlementDetails)
        setupRecyclerViewCorrespondentRulesAdapter(correspondentRule = correspondentRules)
    }

    /**
     * Initializes all view references:
     * - Finds and assigns all UI elements
     * - Sets up header views
     * - Sets up body detail views
     * - Sets up recycler views
     * - Sets up proceed button
     */
    private fun setupViews() {
        backButton = findViewById(R.id.back_button)
        headerAmount = findViewById(R.id.amountValue)
        headerflagImage = findViewById(R.id.currencyIcon)
        headerCurrencyName = findViewById(R.id.currencyName)

        bodyQuoteId = findViewById(R.id.quote_id)
        bodyReceivingMode = findViewById(R.id.receiving_mode)
        bodySendingCountry = findViewById(R.id.sending_country)
        bodySendingCurrency = findViewById(R.id.sending_currency_code)
        bodyReceivingCountry = findViewById(R.id.receiving_country)
        bodyReceivingCurrency = findViewById(R.id.receiving_currency_code)
        bodySendingAmount = findViewById(R.id.sending_amount)
        bodyReceivingAmount = findViewById(R.id.receiving_amount)
        bodyTotalPayingAmount = findViewById(R.id.total_amount)
        bodyReference = findViewById(R.id.reference)
        bodyPriceGuarantee = findViewById(R.id.price_guarantee)

        fxRateRecyclerView = findViewById(R.id.recyclerViewFxRates)
        feeDetailsRecyclerView = findViewById(R.id.recyclerViewFeeDetails)
        settlementRecyclerView = findViewById(R.id.recyclerViewSettlement)
        correspondentRulesRecyclerView = findViewById(R.id.recyclerViewCorrespondentRules)

        proceedBtn = findViewById(R.id.proceedButton)

    }

    /**
     * Sets up click listeners for buttons:
     * - Back button to finish activity
     * - Proceed button to start transaction process
     */
    private fun setClickListener() {
        backButton.setOnClickListener {
            finish()
        }

        proceedBtn.setOnClickListener {
            showDialogProgress()
            createTransaction()
        }
    }

    /**
     * Populates UI elements with data:
     * - Sets header values
     * - Sets body detail values
     * - Sets appropriate flag image
     */
    private fun setData() {
        headerAmount.setText("$receivingCurrencySymbol$receivingAmount")
        headerCurrencyName.setText(receivingCurrency)
        bodyQuoteId.setText(quoteId)
        bodyReceivingMode.setText(receivingModeName)
        bodySendingCountry.setText(sendingCountry)
        bodySendingCurrency.setText(sendingCurrency)
        bodyReceivingCurrency.setText(receivingCurrency)
        bodyReceivingCountry.setText(receivingCountry)
        bodySendingAmount.setText(sendingCurrency + " " + sendingAmount)
        bodyReceivingAmount.setText("$receivingCurrencySymbol $receivingAmount")
        bodyTotalPayingAmount.setText(sendingCurrency + " " + totalPayingAmount)
        bodyReference.setText(reference)
        bodyPriceGuarantee.setText(priceGuarantee)

        setFlagImage()
    }

    /**
     * Creates a new transaction:
     * - Launches coroutine to make API call
     * - Handles success and failure responses
     * - Shows progress dialog during transaction
     */
    private fun createTransaction() {
        lifecycleScope.launch {
            Remittance.createTransaction(
                instrument = instrument,
                customerNumber = "7841001220007002",
                agentCustomerNumber = "AGENT" + generateUniqueId(),
                mobileNo = phoneNo,
                firstName = firstName,
                middleName = middleName,
                lastName = lastName,
                nationality = receivingCountry,
                accountTypeCode = accountTypeCode,
                accountNo = accountNo,
                isoCode = isoCode,
                iban = iban,
                routingCode = routingCode,
                walletId = phoneNo,
                receivingMode = receivingMode,
                correspondent = correspondent,
                bankId = bankId,
                branchId = branchId,
                quoteId = quoteId,
                agentTransactionRefNumber = agentTransactionRefNumber,
                listener = object : TransactionListener {
                    override fun onSuccess(response: CreateTransactionResponse) {
                        dismissDialogProgress()
                        sortCreateTransactionResponse(response)
                    }

                    override fun onFailed(errorMessage: String) {
                        dismissDialogProgress()
                        if (isLikelyJson(errorMessage)) {
                            extractErrorMessageData(errorMessage)
                        } else {
                            showMessage(errorMessage)
                        }
                        finish()
                    }
                })
        }
    }

    /**
     * Confirms a transaction:
     * - Makes API call to confirm transaction
     * - Handles success by saving recipient and showing success screen
     * - Handles failure with error message
     * @param transactionRefNo Reference number for the transaction
     * @param bankRefNo Optional bank reference number
     */
    private fun confirmTransaction(transactionRefNo: String, bankRefNo: String?) {
        lifecycleScope.launch {
            Remittance.confirmTransaction(
                transactionRefNo = transactionRefNo,
                bankRefNo = bankRefNo,
                listener = object : ConfirmTransactionListener {
                    override fun onSuccess(response: ConfirmTransactionResponse) {
                        dismissDialogProgress()

                        saveRecipient(
                            transactionRefNo,
                            firstName,
                            lastName,
                            phoneNo,
                            iban,
                            accountNo
                        )

                        val intent =
                            Intent(this@RemittanceDetails, RemittanceSuccessScreen::class.java)
                        intent.putExtra("TRANSACTION_REF_NO", transactionRefNo)
                        intent.putExtra("RECEIVER_FIRST_NAME", firstName)
                        intent.putExtra("RECEIVER_MIDDLE_NAME", middleName)
                        intent.putExtra("RECEIVER_LAST_NAME", lastName)
                        intent.putExtra("RECEIVING_CURRENCY_SYMBOL", receivingCurrencySymbol)
                        intent.putExtra("RECEIVING_CURRENCY_CODE", receivingCurrency)
                        intent.putExtra("RECEIVING_AMOUNT", receivingAmount)
                        startActivity(intent)
                        finish()
                    }

                    override fun onFailed(errorMessage: String) {
                        dismissDialogProgress()
                        if (isLikelyJson(errorMessage)) {
                            extractErrorMessageData(errorMessage)
                        } else {
                            showMessage(errorMessage)
                        }
                        finish()
                    }
                })
        }
    }

    /**
     * Checks if a string is likely JSON format
     * @param input String to check
     * @return Boolean indicating if string appears to be JSON
     */
    fun isLikelyJson(input: String): Boolean {
        return input.trimStart().startsWith('{') || input.trimStart().startsWith('[')
    }

    /**
     * Processes create transaction response:
     * - Extracts transaction reference number
     * - Shows payment confirmation dialog
     * @param response CreateTransactionResponse object
     */
    private fun sortCreateTransactionResponse(response: CreateTransactionResponse) {
        val transactionRefNo: String = response.data.transaction_ref_number

        showAgentPaymentDebitDialog(transactionRefNo, null)
    }

    /**
     * Saves recipient information to database:
     * - Checks if account already exists
     * - Inserts new recipient if not exists
     * - Shows appropriate message
     * @param transactionRefNo Transaction reference number
     * @param firstName Recipient's first name
     * @param lastName Recipient's last name
     * @param phoneNo Recipient's phone number
     * @param iban Optional IBAN
     * @param accountNo Optional account number
     */
    private fun saveRecipient(
        transactionRefNo: String,
        firstName: String,
        lastName: String,
        phoneNo: String,
        iban: String?,
        accountNo: String?
    ) {
        lifecycleScope.launch {
            try {
                // Perform the database operation in the IO context
                val luluPayDB: LuluPayDB = LuluPayDB(this@RemittanceDetails)

                if (accountExist(iban, accountNo, luluPayDB)) {
                    showMessage("Account exist before")
                } else {
                    luluPayDB.insertData(
                        transactionRefNo,
                        firstName,
                        lastName,
                        phoneNo,
                        iban,
                        accountNo
                    )
                    showMessage("Recipient saved successfully!")
                }
            } catch (e: Exception) {
                // Handle and show the error message
                showMessage(e.message ?: "An unexpected error occurred")
            }
        }
    }

    /**
     * Checks if account already exists in database:
     * - Queries database for matching IBAN or account number
     * @param iban IBAN to check
     * @param accountNo Account number to check
     * @param luluPayDB Database instance
     * @return Boolean indicating if account exists
     */
    private suspend fun accountExist(
        iban: String?,
        accountNo: String?,
        luluPayDB: LuluPayDB
    ): Boolean {
        return try {
            val remittanceList: List<RemittanceHistory> = luluPayDB.getAllData()

            for (remittance in remittanceList) {
                if (remittance.iban != null && remittance.iban == iban) {
                    return true
                }

                if (remittance.accountNo != null && remittance.accountNo == accountNo) {
                    return true
                }
            }
            false // Return false if no match is found
        } catch (e: Exception) {
            false // Return false in case of an error
        }
    }

    /**
     * Shows payment confirmation dialog:
     * - Displays dialog with payment details
     * - Handles confirm and cancel actions
     * @param transactionRefNo Transaction reference number
     * @param bankRefNo Optional bank reference number
     */
    private fun showAgentPaymentDebitDialog(transactionRefNo: String, bankRefNo: String?) {
        val builder = AlertDialog.Builder(this)
        builder.setTitle("Transfer Confirmation") // Set the title of the dialog
        builder.setMessage("We are about to debit your account and confirm the transaction") // Set the message of the dialog

        // Set a positive button and its click listener
        builder.setPositiveButton("Pay and Confirm") { dialog, which ->
            // Handle the "Pay" button click (optional)
            dialog.dismiss() // Dismiss the dialog
            showBiometricPrompt(transactionRefNo)
        }

        // Optionally, set a negative button
        builder.setNegativeButton("Cancel") { dialog, which ->
            // Handle the "Cancel" button click (optional)
            dialog.dismiss() // Dismiss the dialog
            finish()
        }

        // Create and show the dialog
        val dialog: AlertDialog = builder.create()
        dialog.setCancelable(false)
        dialog.setCanceledOnTouchOutside(false)
        dialog.show()
    }

    /**
     * Generates unique identifier based on timestamp
     * @return String containing timestamp
     */
    private fun generateUniqueId(): String {
        return System.currentTimeMillis().toString()
    }

    /**
     * Sets appropriate flag image based on currency:
     * - Maps currency codes to flag resources
     * - Updates flag ImageView
     */
    private fun setFlagImage() {
        if (receivingCurrency.equals("CNY")) {
            headerflagImage.setImageResource(R.drawable.china_flag)
        }

        if (receivingCurrency.equals("EGP")) {
            headerflagImage.setImageResource(R.drawable.egypt_flag)
        }

        if (receivingCurrency.equals("INR")) {
            headerflagImage.setImageResource(R.drawable.india_flag)
        }

        if (receivingCurrency.equals("PKR")) {
            headerflagImage.setImageResource(R.drawable.pakistan_flag)
        }

        if (receivingCurrency.equals("PHP")) {
            headerflagImage.setImageResource(R.drawable.philipines_flag)
        }

        if (receivingCurrency.equals("LKR")) {
            headerflagImage.setImageResource(R.drawable.srilanka_flag)
        }
    }

    /**
     * Gets and processes intent extras:
     * - Extracts all transaction details
     * - Parses JSON data for rates and fees
     * - Sets default values if extras missing
     */
    private fun getIntentExtras() {
        quoteId = intent.getStringExtra("QOUTE_ID") ?: ""
        receivingModeName = intent.getStringExtra("RECEIVING_MODE_NAME") ?: ""
        sendingCountry = intent.getStringExtra("SENDING_COUNTRY_CODE") ?: ""
        sendingCurrency = intent.getStringExtra("SENDING_CURRENCY_CODE") ?: ""
        receivingCountry = intent.getStringExtra("RECEIVING_COUNTRY_CODE") ?: ""
        receivingCurrency = intent.getStringExtra("RECEIVING_CURRENCY_CODE") ?: ""
        receivingCurrencySymbol = intent.getStringExtra("RECEIVING_CURRENCY_SYMBOL") ?: ""
        sendingAmount = intent.getStringExtra("SENDING_AMOUNT") ?: ""
        receivingAmount = intent.getStringExtra("RECEIVING_AMOUNT") ?: ""
        totalPayingAmount = intent.getStringExtra("TOTAL_PAYIN_AMOUNT") ?: ""
        reference = intent.getStringExtra("REFERENCE") ?: ""
        priceGuarantee = intent.getStringExtra("PRICE_GUARANTEE") ?: ""
        instrument = intent.getStringExtra("INSTRUMENT") ?: ""
        phoneNo = intent.getStringExtra("RECEIVER_PHONE_NO") ?: ""
        firstName = intent.getStringExtra("RECEIVER_FIRST_NAME") ?: ""
        middleName = intent.getStringExtra("RECEIVER_MIDDLE_NAME") ?: ""
        lastName = intent.getStringExtra("RECEIVER_LAST_NAME") ?: ""
        accountTypeCode = intent.getStringExtra("ACCOUNT_TYPE_CODE") ?: ""
        accountNo = intent.getStringExtra("ACCOUNT_NO") ?: null
        isoCode = intent.getStringExtra("ISO_CODE") ?: null
        iban = intent.getStringExtra("IBAN") ?: null
        routingCode = intent.getStringExtra("ROUTING_CODE") ?: null
        correspondent = intent.getStringExtra("CORRESPONDENT") ?: null
        receivingMode = intent.getStringExtra("RECEIVING_MODE") ?: ""
        bankId = intent.getStringExtra("BANK_ID") ?: null
        branchId = intent.getStringExtra("BRANCH_ID") ?: null
        quoteId = intent.getStringExtra("QUOTE_ID") ?: ""
        agentTransactionRefNumber = intent.getStringExtra("REFERENCE") ?: ""

        val gson = Gson()
        fxRates = intent.getStringExtra("FX_RATES")?.let { json ->
            gson.fromJson(json, object : TypeToken<List<FxRate>>() {}.type)
        } ?: emptyList()

        feeDetails = intent.getStringExtra("FEE_DETAILS")?.let { json ->
            gson.fromJson(json, object : TypeToken<List<FeeDetail>>() {}.type)
        } ?: emptyList()

        settlementDetails = intent.getStringExtra("SETTLEMENT_DETAILS")?.let { json ->
            gson.fromJson(json, object : TypeToken<List<SettlementDetail>>() {}.type)
        } ?: emptyList()

        correspondentRules = intent.getStringExtra("CORRESPONDENT_RULES")?.let { json ->
            gson.fromJson(json, object : TypeToken<List<CorrespondentRule>>() {}.type)
        } ?: emptyList()

        /*val fxRatesString = fxRates.joinToString(", ") { it.toString() }
      Log.d("FXRATES", fxRatesString)

        val fxRatesString2 = feeDetails.joinToString(", ") { it.toString() }
      Log.d("FEEDETAILS", fxRatesString2)

      val fxRatesString3 = settlementDetails.joinToString(", ") { it.toString() }
      Log.d("SETTLEMENT", fxRatesString3)

      val fxRatesString4 = correspondentRules.joinToString(", ") { it.toString() }
      Log.d("CORRESPONDENT_RULES", fxRatesString4)*/

    }

    /**
     * Shows toast message
     * @param message Message to display
     */
    private fun showMessage(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    /**
     * Sets up FX rates recycler view:
     * - Maps FX rate data to display model
     * - Creates and sets adapter
     * @param fxRate List of FX rates
     */
    private fun setupRecyclerViewFxRateAdapter(fxRate: List<FxRate>) {
        val fxRates = fxRate.map {
            FxRates(
                costRate = it.cost_rate.toString() ?: "",
                rate = it.rate.toString(),
                baseCurrencyCode = it.base_currency_code,
                counterCurrencyCode = it.counter_currency_code,
                type = it.type
            )
        }
        var adapter = FxRatesAdapter(fxRates) { position, fxRates ->
        }

        fxRateRecyclerView.layoutManager = LinearLayoutManager(this)
        fxRateRecyclerView.adapter = adapter
    }

    /**
     * Sets up fee details recycler view:
     * - Maps fee data to display model
     * - Creates and sets adapter
     * @param feeDetail List of fee details
     */
    private fun setupRecyclerViewFeeDetailsAdapter(feeDetail: List<FeeDetail>) {
        val feeDetails = feeDetail.map {
            FeeDetails(
                type = it.type,
                model = it.model,
                currencyCode = it.currency_code,
                amount = it.amount.toString(),
                description = it.description ?: ""
            )
        }
        var adapter = FeeDetailsAdapter(feeDetails) { position, feeDetails ->
        }

        feeDetailsRecyclerView.layoutManager = LinearLayoutManager(this)
        feeDetailsRecyclerView.adapter = adapter
    }

    /**
     * Sets up settlement details recycler view:
     * - Maps settlement data to display model
     * - Creates and sets adapter
     * @param settlementDetail List of settlement details
     */
    private fun setupRecyclerViewSettlementAdapter(settlementDetail: List<SettlementDetail>) {
        val settlementDetails = settlementDetail.map {
            SettlementDetails(
                chargeType = it.charge_type,
                value = it.value.toString(),
                currencyCode = it.currency_code
            )
        }
        var adapter = SettlementDetailsAdapter(settlementDetails) { position, settlementDetails ->
        }

        settlementRecyclerView.layoutManager = LinearLayoutManager(this)
        settlementRecyclerView.adapter = adapter
    }

    /**
     * Sets up correspondent rules recycler view:
     * - Maps rules data to display model
     * - Creates and sets adapter
     * @param correspondentRule List of correspondent rules
     */
    private fun setupRecyclerViewCorrespondentRulesAdapter(correspondentRule: List<CorrespondentRule>) {
        val correspondentRules = correspondentRule.map {
            CorrespondentRules(
                field = it.field ?: "",
                rule = it.rule ?: ""
            )
        }
        var adapter =
            CorrespondentRulesAdapter(correspondentRules) { position, correspondentRules ->
            }

        correspondentRulesRecyclerView.layoutManager = LinearLayoutManager(this)
        correspondentRulesRecyclerView.adapter = adapter
    }

    /**
     * Extracts error message from JSON response:
     * - Parses JSON string
     * - Shows extracted message
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
     * Shows progress dialog:
     * - Creates and configures dialog
     * - Prevents dismissal
     */
    private fun showDialogProgress() {
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

    private fun showBiometricPrompt(transactionRefNo: String) {
        BiometricHelper.authenticate(
            "Payment Confirmation",
            "Please authenticate to continue",
            this,
            onSuccess = {
                // Handle success (e.g., navigate to another screen)
                showAgentPaymentDebitDialog(transactionRefNo, null)
            },
            onFailure = {
                // Handle failure (e.g., show error message)
                showMessage("Biometric authentication failed")
            },
            onError = {
                // Handle error (e.g., show error message)
                showErrorDialog(it)
            })

    }

    private fun showErrorDialog(message: String) {
        dialog = AlertDialog.Builder(this@RemittanceDetails)
            .setTitle("Biometric Authentication Failed")
            .setMessage(message)
            .setPositiveButton("Cancel") { dialog, _ ->
                dialog.dismiss()
                finish()
            }
            .setCancelable(false)
            .create()

        dialog.setCanceledOnTouchOutside(false)
        dialog.show()
    }

    /**
     * Dismisses progress dialog if showing
     */
    private fun dismissDialogProgress() {
        if (dialog.isShowing == true) {
            dialog.dismiss()
        }
    }
}
