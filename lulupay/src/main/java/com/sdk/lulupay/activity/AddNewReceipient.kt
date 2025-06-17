package com.sdk.lulupay.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.sdk.lulupay.R
import com.sdk.lulupay.database.LuluPayDB
import com.sdk.lulupay.listeners.*
import com.sdk.lulupay.model.response.*
import com.sdk.lulupay.remittance.Remittance
import com.sdk.lulupay.singleton.ActivityCloseManager
import com.sdk.lulupay.session.SessionManager
import com.google.android.material.button.MaterialButton
import java.math.BigDecimal
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch
import com.sdk.lulupay.bottomsheet.*
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.sdk.lulupay.theme.ThemeManager

/**
 * Data class representing a country with name, code and currency
 */
data class Country(val name: String, val code: String, val currency: String)

/**
 * Activity for adding new remittance recipients
 * Handles recipient details input and validation
 * Manages UI elements and API calls for recipient creation
 */
class AddNewReceipient : AppCompatActivity(), BottomSheetListener, FinishActivityListener {

    private lateinit var dialog: AlertDialog

    private lateinit var getDetailsBtn: Button

    private lateinit var luluPayDB: LuluPayDB

    // Receivers Details
    private lateinit var receiverFirstNameEdittext: EditText
    private lateinit var receiverMiddleNameEdittext: EditText
    private lateinit var receiverLastNameEdittext: EditText
    private lateinit var receiverPhoneNoEdittext: EditText
    private lateinit var receiverCountrySpinner: Spinner
    private lateinit var receiverReceivingMode: Spinner
    private lateinit var receiverAcctType: Spinner
    private lateinit var receiverIbanEdittext: EditText
    private lateinit var receiverAcctNoEdittext: EditText
    private lateinit var searchBankButton: MaterialButton
    private lateinit var receiverRoutingCodeEdittext: EditText
    private lateinit var receiverIsoCodeEdittext: EditText
    private lateinit var receiverAddressEdittext: EditText
    private lateinit var receiverTownNameEdittext: EditText
    private lateinit var receiverCountrySubdivisionEdittext: EditText

    // Transaction Details
    private lateinit var instrument: Spinner
    private lateinit var correspondentSpinner: Spinner

    // Selected Spinner Details
    private var selectedReceivingModeCode: String = ""
    private var selectedReceivingModeName: String = ""
    private var selectedBank: String = ""
    private var selectedCountryName: String = ""
    private var selectedCountryCode: String = ""
    private var selectedCurrencyCode: String = ""
    private var selectedReceiverAcctType: String = ""
    private var selectedInstrument: String = ""
    private var selectedCorrespondent: String = ""

    // List CodeNames to use in onItemSelectedListener
    private lateinit var receivingModeList: List<CodeName>
    private lateinit var acctTypeList: List<CodeName>
    private lateinit var instrumentList: List<CodeName>
    private lateinit var correspondentList: List<CodeName>
    private lateinit var bankList: List<BankInfo>

    // Details will be use to construct a remittance payload
    private var sendingCountryCode: String = ""
    private var type: String = ""
    private var receivingMode: String = ""
    private var receivingCountryCode: String = ""
    private var limitMinAmount: BigDecimal = BigDecimal.ZERO
    private var limitPerTransaction: BigDecimal = BigDecimal.ZERO
    private var sendMinAmount: BigDecimal = BigDecimal.ZERO
    private var sendMaxAmount: BigDecimal = BigDecimal.ZERO
    private var correspondent: String = ""
    private var sendingCurrencyCode: String = ""
    private var receivingCurrencyCode: String = ""
    private var correspondentName: String = ""
    private var bankId: String = ""
    private var branchId: String = ""
    private var branchName: String = ""
    private var routingCode: String = ""
    private var isoCode: String = ""
    private var sort: String = ""
    private var iban: String = ""
    private var bankName: String = ""
    private var bankBranchName: String = ""
    private var ifsc: String = ""
    private var bic: String = ""
    private var address: String = ""
    private var townName: String = ""
    private var countrySubdivision: String = ""
    private var countryCode: String = ""

    private var countryPosition: Int = 0
    private var receivingPosition: Int = 0

    /**
     * List of supported countries with their codes and currencies
     */
    private val countries = listOf(
        Country("Choose Country", "", ""),
        Country("China", "CN", "CNY"),
        Country("Egypt", "EG", "EGP"),
        Country("India", "IN", "INR"),
        Country("Pakistan", "PK", "PKR"),
        Country("Philippines", "PH", "PHP"),
        Country("Sri Lanka", "LK", "LKR")
    )

    /**
     * Initializes activity, sets content view and calls setup methods
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.add_new_receipient)

        luluPayDB = LuluPayDB(this)

        registerListeners()
        setupViews()
    }

    /**
     * Registers activity close listener
     */
    private fun registerListeners() {
        ActivityCloseManager.registerListener(this)
    }

    /**
     * Unregisters activity close listener to avoid memory leaks
     */
    private fun destroyListeners() {
        ActivityCloseManager.unregisterListener(this)
    }

    /**
     * Initializes all UI views and calls methods to populate spinners
     * Shows progress dialog while fetching initial data
     */
    private fun setupViews() {
        getDetailsBtn = findViewById(R.id.get_details_btn)

        receiverFirstNameEdittext = findViewById(R.id.receiver_first_name)
        receiverMiddleNameEdittext = findViewById(R.id.receiver_middle_name)
        receiverLastNameEdittext = findViewById(R.id.receiver_last_name)
        receiverPhoneNoEdittext = findViewById(R.id.receiver_phone_no)
        receiverCountrySpinner = findViewById(R.id.receiver_country)
        receiverReceivingMode = findViewById(R.id.receiver_mode)
        receiverAcctType = findViewById(R.id.receiver_acct_type)
        receiverIbanEdittext = findViewById(R.id.receiver_iban)
        receiverAcctNoEdittext = findViewById(R.id.receiver_acct_no)
        searchBankButton = findViewById(R.id.button_search1)
        receiverRoutingCodeEdittext = findViewById(R.id.receiver_routing_code)
        receiverIsoCodeEdittext = findViewById(R.id.receiver_iso_code)
        receiverAddressEdittext = findViewById(R.id.receiver_address)
        receiverTownNameEdittext = findViewById(R.id.receiver_town_name)
        receiverCountrySubdivisionEdittext = findViewById(R.id.receiver_country_subdivision)

        instrument = findViewById(R.id.instrument)
        correspondentSpinner = findViewById(R.id.correspondent)

        addCountriesSpinner()

        registerClickListeners()
        registerSpinnerListeners()
        showDialogProgress()
        getReceiveingModes()
        getAccountType()
        getInstruments()
        showMessage("Fetching required data please wait!")
    }

    /**
     * Sets up listeners for all spinners to handle selection changes
     * Updates selected values and triggers API calls as needed
     */
    private fun registerSpinnerListeners() {
        receiverCountrySpinner.onItemSelectedListener =
            object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(
                    parent: AdapterView<*>,
                    view: View?,
                    position: Int,
                    id: Long
                ) {
                    countryPosition = position
                    hideViews()

                    if (position == 0) {
                        return
                    }

                    val selectedCountry = countries.getOrNull(position) // Safely get the country
                    selectedCountryName = selectedCountry?.name.orEmpty() // Avoid nulls
                    selectedCountryCode = selectedCountry?.code.orEmpty()
                    selectedCurrencyCode = selectedCountry?.currency.orEmpty()

                    // Check conditions and ensure none are null or invalid
                    if (position >= 1 && receivingPosition >= 1) {
                        showDialogProgress()
                        getServiceCorridor()
                    }
                }

                override fun onNothingSelected(parent: AdapterView<*>) {
                    // Handle the case where nothing is selected
                }
            }

        receiverReceivingMode.onItemSelectedListener =
            object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(
                    parent: AdapterView<*>,
                    view: View?,
                    position: Int,
                    id: Long
                ) {
                    receivingPosition = position
                    hideViews()


                    if (position == 0) {
                        selectedReceivingModeCode = ""
                        selectedReceivingModeName = ""
                        return
                    } else if (position - 1 in receivingModeList.indices) {

                        selectedReceivingModeCode = receivingModeList[position - 1].code
                        selectedReceivingModeName = receivingModeList[position - 1].name

                    }

                    if (position >= 1 && countryPosition >= 1) {
                        showDialogProgress()
                        getServiceCorridor()
                    }
                }

                override fun onNothingSelected(parent: AdapterView<*>) {
                    // Handle case where nothing is selected
                }
            }

        receiverAcctType.onItemSelectedListener =
            object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(
                    parent: AdapterView<*>,
                    view: View?,
                    position: Int,
                    id: Long
                ) {
                    if (position == 0) {
                        selectedReceiverAcctType = ""
                        return
                    }
                    if (position - 1 in acctTypeList.indices) { // Ensure valid position
                        val selected = acctTypeList[position - 1]
                        selectedReceiverAcctType = selected.code
                    }
                }

                override fun onNothingSelected(parent: AdapterView<*>) {
                    // Handle case where nothing is selected
                }
            }

        instrument.onItemSelectedListener =
            object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(
                    parent: AdapterView<*>,
                    view: View?,
                    position: Int,
                    id: Long
                ) {
                    if (position == 0) {
                        selectedInstrument = ""
                        return
                    }
                    if (position - 1 in instrumentList.indices) { // Ensure valid position
                        val selected = instrumentList[position - 1]
                        selectedInstrument = selected.code
                    }
                }

                override fun onNothingSelected(parent: AdapterView<*>) {
                    // Handle case where nothing is selected
                }
            }

        correspondentSpinner.onItemSelectedListener =
            object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(
                    parent: AdapterView<*>,
                    view: View?,
                    position: Int,
                    id: Long
                ) {
                    if (position == 0) {
                        selectedCorrespondent = ""
                        return
                    }
                    if (position - 1 in correspondentList.indices) { // Ensure valid position
                        val selected = correspondentList[position - 1]
                        selectedCorrespondent = selected.code
                    }
                }

                override fun onNothingSelected(parent: AdapterView<*>) {
                    // Handle case where nothing is selected
                }
            }
    }

    /**
     * Shows/hides input fields based on selected country and receiving mode
     * Different countries require different fields to be visible
     */
    private fun showViews() {
        // For pakistan country on what view to display
        if (selectedCountryCode.equals("PK") || selectedCountryCode.equals("EG") || selectedCountryCode.equals(
                "LK"
            )
        ) {

            if (receiverAcctNoEdittext.visibility == View.VISIBLE) {
                receiverAcctNoEdittext.visibility = View.GONE
            }

            if (receiverIbanEdittext.visibility == View.GONE) {
                receiverIbanEdittext.visibility = View.VISIBLE
            }

        } else {
            if (receiverAcctNoEdittext.visibility == View.GONE) {
                receiverAcctNoEdittext.visibility = View.VISIBLE
            }

            if (receiverIbanEdittext.visibility == View.VISIBLE) {
                receiverIbanEdittext.visibility = View.GONE
            }
        }

        // For India Receipient on what view to display
        if (selectedCountryCode.equals("IN")) {
            if (receiverIsoCodeEdittext.visibility == View.VISIBLE) {
                receiverIsoCodeEdittext.visibility = View.GONE
            }

            if (receiverIsoCodeEdittext.isEnabled) {
                receiverIsoCodeEdittext.isEnabled = false
            }

            if (receiverRoutingCodeEdittext.visibility == View.GONE) {
                receiverRoutingCodeEdittext.visibility = View.VISIBLE
            }

            if (!receiverRoutingCodeEdittext.isEnabled) {
                receiverRoutingCodeEdittext.isEnabled = true
            }

        } else {
            if (receiverIsoCodeEdittext.visibility == View.GONE) {
                receiverIsoCodeEdittext.visibility = View.VISIBLE
            }

            if (!receiverIsoCodeEdittext.isEnabled) {
                receiverIsoCodeEdittext.isEnabled = true
            }

            if (receiverRoutingCodeEdittext.visibility == View.VISIBLE) {
                receiverRoutingCodeEdittext.visibility = View.GONE
            }

            if (receiverRoutingCodeEdittext.isEnabled) {
                receiverRoutingCodeEdittext.isEnabled = false
            }
        }

        // For All Country
        if (receiverAcctType.visibility == View.GONE) {
            receiverAcctType.visibility = View.VISIBLE
        }

        if (instrument.visibility == View.GONE) {
            instrument.visibility = View.VISIBLE
        }

    }

    /**
     * Hides all input fields when selections change
     * Fields are shown again based on new selections
     */
    private fun hideViews() {
        if (receiverAcctNoEdittext.visibility == View.VISIBLE) {
            receiverAcctNoEdittext.visibility = View.GONE
        }

        if (receiverIbanEdittext.visibility == View.VISIBLE) {
            receiverIbanEdittext.visibility = View.GONE
        }

        if (receiverAcctType.visibility == View.VISIBLE) {
            receiverAcctType.visibility = View.GONE
        }

        if (instrument.visibility == View.VISIBLE) {
            instrument.visibility = View.GONE
        }

        if (correspondentSpinner.visibility == View.VISIBLE) {
            correspondentSpinner.visibility = View.GONE
        }

        if (receiverAddressEdittext.visibility == View.VISIBLE) {
            receiverAddressEdittext.visibility = View.GONE
        }

        if (receiverTownNameEdittext.visibility == View.VISIBLE) {
            receiverTownNameEdittext.visibility = View.GONE
        }

        if (receiverCountrySubdivisionEdittext.visibility == View.VISIBLE) {
            receiverCountrySubdivisionEdittext.visibility = View.GONE
        }

        receiverIsoCodeEdittext.isEnabled = false
    }

    /**
     * Makes API call to get list of banks for selected country and receiving mode
     * Updates bank spinner with results
     */
    private fun getBankList() {
        lifecycleScope.launch {
            Remittance.getBankMaster(
                countryCode = selectedCountryCode,
                receivingMode = selectedReceivingModeCode,
                partnerName = SessionManager.username ?: "",
                object : BankMasterListener {
                    override fun onSuccess(response: MasterBankResponse) {
                        addBanksSpinner(response)
                    }

                    override fun onFailed(errorMessage: String) {
                        if (isLikelyJson(errorMessage)) {
                            extractErrorMessageData(errorMessage)
                        } else {
                            showMessage(errorMessage)
                        }
                        hideViews()
                    }
                })
        }
    }

    /**
     * Makes API call to get service corridor details for selected country and receiving mode
     * Updates UI with corridor details on success
     */
    private fun getServiceCorridor() {
        lifecycleScope.launch {
            Remittance.getServiceCorridor(
                partnerName = SessionManager.username ?: "",
                receiving_mode = selectedReceivingModeCode,
                receiving_country_code = selectedCountryCode,
                listener =
                object : ServiceCorridorListener {
                    override fun onSuccess(response: ServiceCorridorResponse) {
                        sortServiceCorridorResponse(response)
                        dismissDialogProgress()
                        showViews()
                    }

                    override fun onFailed(errorMessage: String) {
                        dismissDialogProgress()
                        if (isLikelyJson(errorMessage)) {
                            extractErrorMessageData(errorMessage)
                        } else {
                            showMessage(errorMessage)
                        }
                        hideViews()
                    }
                })
        }
    }

    /**
     * Makes API call to get list of receiving modes
     * Updates receiving mode spinner with results
     */
    private fun getReceiveingModes() {
        lifecycleScope.launch {
            Remittance.getReceivingModes(
                SessionManager.username ?: "",
                object : ReceiveModeListener {
                    override fun onSuccess(response: CodeResponse) {
                        addReceivingModeSpinner(response)
                    }

                    override fun onFailed(errorMessage: String) {
                        dismissDialogProgress()
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
     * Makes API call to get list of correspondents
     * Updates correspondent spinner with results
     */
    private fun getCorrespondent() {
        lifecycleScope.launch {
            Remittance.getCorrespondent(
                SessionManager.username ?: "",
                object : CorrespondentListener {
                    override fun onSuccess(response: CodeResponse) {
                        addCorrespondentSpinner(response)
                        dismissDialogProgress()
                        showViews()
                    }

                    override fun onFailed(errorMessage: String) {
                        dismissDialogProgress()
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
     * Makes API call to get list of account types
     * Updates account type spinner with results
     */
    private fun getAccountType() {
        lifecycleScope.launch {
            Remittance.getAccountType(
                SessionManager.username ?: "",
                object : AccountTypeListener {
                    override fun onSuccess(response: CodeResponse) {
                        addAcctTypeSpinner(response)
                    }

                    override fun onFailed(errorMessage: String) {
                        dismissDialogProgress()
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
     * Makes API call to get list of address types
     * Currently not used but available for future use
     */
    private fun getAddressType() {
        lifecycleScope.launch {
            Remittance.getAddressType(
                SessionManager.username ?: "",
                object : AddressTypeListener {
                    override fun onSuccess(response: CodeResponse) {

                    }

                    override fun onFailed(errorMessage: String) {
                        dismissDialogProgress()
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
     * Makes API call to get list of instruments
     * Updates instrument spinner with results
     */
    private fun getInstruments() {
        lifecycleScope.launch {
            Remittance.getInstruments(
                SessionManager.username ?: "",
                object : InstrumentListener {
                    override fun onSuccess(response: CodeResponse) {
                        addInstrumentSpinner(response)
                        dismissDialogProgress()
                    }

                    override fun onFailed(errorMessage: String) {
                        dismissDialogProgress()
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
     * Sets up click listeners for buttons
     * Handles bank search and form validation
     */
    private fun registerClickListeners() {
        searchBankButton.setOnClickListener {
            if (!selectedReceivingModeCode.isNullOrBlank()) {
                if (!selectedCountryCode.isNullOrBlank()) {

                    // Opens BottomSheetFragment to search for available banks for cash pickup or mobile wallet
                    val bottomSheet = BottomSheetLookupsFragment.newInstance(
                        receivingMode = selectedReceivingModeCode,
                        receivingName = selectedReceivingModeName,
                        sender = SessionManager.username ?: "",
                        country = selectedCountryCode
                    )
                    bottomSheet.show(supportFragmentManager, "BottomSheet")
                } else {
                    showMessage("Receiver Country is required!")
                }
            } else {
                showMessage("Receiving Mode is required!")
            }
        }

        // This checks all input to validate account
        getDetailsBtn.setOnClickListener {
            val receiverFirstName: String = receiverFirstNameEdittext.text.toString()
            val receiverMiddleName: String = receiverMiddleNameEdittext.text.toString()
            val receiverLastName: String = receiverLastNameEdittext.text.toString()
            val receiverPhoneNo: String = receiverPhoneNoEdittext.text.toString()
            val receiverAcctNo: String = receiverAcctNoEdittext.text.toString()
            val receiverIban: String = receiverIbanEdittext.text.toString()


            if (!receiverFirstName.isNullOrEmpty()) {
                if (!receiverMiddleName.isNullOrEmpty()) {
                    if (!receiverLastName.isNullOrEmpty()) {
                        if (!receiverPhoneNo.isNullOrEmpty()) {
                            if (isValidPhoneNumber(receiverPhoneNo)) {
                                if (!receiverAcctNo.isNullOrEmpty() || !receiverIban.isNullOrEmpty()) {
                                    if (!selectedCountryCode.isNullOrEmpty()) {
                                        if (!selectedReceivingModeCode.isNullOrEmpty()) {
                                            if (!selectedReceiverAcctType.isNullOrBlank() || !selectedReceiverAcctType.isNullOrEmpty()) {
                                                if (!selectedInstrument.isNullOrEmpty()) {
                                                    if (!receiverIsoCodeEdittext.text.toString()
                                                            .isNullOrEmpty() || !receiverRoutingCodeEdittext.text.toString()
                                                            .isNullOrEmpty()
                                                    ) {
                                                        SessionManager.partnerName =
                                                            SessionManager.username ?: ""
                                                        iban = receiverIbanEdittext?.text.toString()
                                                            ?: ""
                                                        isoCode =
                                                            receiverIsoCodeEdittext.text.toString()
                                                        routingCode =
                                                            receiverRoutingCodeEdittext?.text.toString()
                                                                ?: ""

                                                        showDialogProgress()
                                                        validateAccount(
                                                            receiverFirstName,
                                                            receiverMiddleName,
                                                            receiverLastName,
                                                            receiverAcctNo
                                                        )

                                                    } else {
                                                        showMessage("Receiver Bic/Swift Code or Routing Code is required!")
                                                    }
                                                } else {
                                                    showMessage("Instrument is required!")
                                                }
                                            } else {
                                                showMessage("Receiver Account Type is required!")
                                            }
                                        } else {
                                            showMessage("Receiver Receiving Mode is required")
                                        }
                                    } else {
                                        showMessage("Receiver Country is Required!")
                                    }
                                } else {
                                    showMessage("Receiver Account Number or IBAN is required!")
                                }
                            } else {
                                showMessage("Receiver Phone Number is invalid!")
                            }
                        } else {
                            showMessage("Receiver Phone Number is required")
                        }
                    } else {
                        showMessage("Receiver Last Name is required!")
                    }
                } else {
                    showMessage("Receiver Middle Name is required!")
                }
            } else {
                showMessage("Receiver First Name is required!")
            }
        }
    }

    /**
     * Validates phone number format using regex
     */
    private fun isValidPhoneNumber(phoneNo: String): Boolean {
        val phoneNumber = phoneNo
        val phoneNumberRegex = Regex("^(\\+|0)[0-9]{3,15}$")
        return phoneNumberRegex.matches(phoneNumber)
    }

    /**
     * Checks if a string is likely JSON format
     */
    private fun isLikelyJson(input: String): Boolean {
        return input.trimStart().startsWith('{') || input.trimStart().startsWith('[')
    }

    /**
     * Adds countries to country spinner
     */
    private fun addCountriesSpinner() {
        val adapter =
            ArrayAdapter(this, android.R.layout.simple_spinner_item, countries.map { it.name })
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        receiverCountrySpinner.adapter = adapter
    }

    /**
     * Adds receiving modes to receiving mode spinner
     */
    private fun addReceivingModeSpinner(response: CodeResponse) {
        receivingModeList = response.data.receiving_modes
        val receivingModeName = mutableListOf("Choose Receive Mode") // Add the default first string
        receivingModeName.addAll(receivingModeList.map { it.name }) // Append the rest of the items

        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, receivingModeName)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        receiverReceivingMode.adapter = adapter
    }

    /**
     * Adds correspondents to correspondent spinner
     */
    private fun addCorrespondentSpinner(response: CodeResponse) {
        correspondentList = response.data.correspondents
        val correspondentName =
            mutableListOf("Choose Your Bank Correspondent") // Add the default first string
        correspondentName.addAll(correspondentList.map { it.name }) // Append the rest of the items

        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, correspondentName)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        correspondentSpinner.adapter = adapter
    }

    /**
     * Adds banks to bank spinner
     */
    private fun addBanksSpinner(response: MasterBankResponse) {
        bankList = response.data.list

        // Map the list to bank names for the spinner
        val bankNames = mutableListOf("Choose a Bank") // Add the default first string
        bankNames.addAll(bankList.map { it.bank_name }) // Append the rest of the items

        // Set up the Spinner with the list of bank names
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, bankNames)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        // receiverBankSpinner.adapter = adapter
    }

    /**
     * Processes service corridor response and updates UI fields
     */
    private fun sortServiceCorridorResponse(response: ServiceCorridorResponse) {
        // Assuming you need to process the first item in the list
        val remittanceDetail = response.data.firstOrNull() ?: return // Safely handle empty list

        sendingCountryCode = remittanceDetail.sending_country_code
        type = remittanceDetail.transaction_type
        receivingMode = remittanceDetail.receiving_mode
        receivingCountryCode = remittanceDetail.receiving_country_code
        limitMinAmount = remittanceDetail.limit_min_amount
        limitPerTransaction = remittanceDetail.limit_per_transaction
        sendMinAmount = remittanceDetail.send_min_amount
        sendMaxAmount = remittanceDetail.send_max_amount

        val corridorCurrency = remittanceDetail.corridor_currencies.firstOrNull()
        correspondent = corridorCurrency?.correspondent ?: "Unknown"
        sendingCurrencyCode = corridorCurrency?.sending_currency_code ?: "AED"
        receivingCurrencyCode = corridorCurrency?.receiving_currency_code ?: selectedCurrencyCode
        correspondentName = corridorCurrency?.correspondent_name ?: "Unknown"
    }

    /**
     * Processes bank response and updates UI fields
     */
    private fun sortBankByIdResponse(response: BankBranchResponse) {
        val bankData = response.data.list.firstOrNull() ?: return
        bankId = bankData.bank_id
        branchId = bankData.branch_id
        branchName = bankData.branch_name
        routingCode = bankData.routing_code ?: ""
        isoCode = bankData.iso_code ?: ""
        sort = bankData.sort ?: ""
        bankName = bankData.bank_name
        bankBranchName = bankData.bank_branch_name ?: ""
        ifsc = bankData.ifsc ?: ""
        bic = bankData.bic
        address = bankData.address ?: ""
        townName = bankData.town_name ?: ""
        countrySubdivision = bankData.country_subdivision ?: ""
        countryCode = bankData.country_code ?: receivingCountryCode

        showMessage(routingCode)
        showMessage(isoCode)

        if (routingCode.isNullOrEmpty() || routingCode.isNullOrBlank() || routingCode.equals(".") || routingCode.equals(
                "-"
            )
        ) {
            if (receiverRoutingCodeEdittext.visibility == View.GONE) {
                receiverRoutingCodeEdittext.visibility = View.VISIBLE
            }
        } else {
            if (receiverRoutingCodeEdittext.visibility == View.VISIBLE) {
                receiverRoutingCodeEdittext.visibility = View.GONE
            }
        }

        if (isoCode.isNullOrEmpty() || isoCode.isNullOrBlank() || isoCode.equals(".") || isoCode.equals(
                "-"
            )
        ) {
            if (receiverIsoCodeEdittext.visibility == View.GONE) {
                receiverIsoCodeEdittext.visibility = View.VISIBLE
            }
        } else {
            if (receiverIsoCodeEdittext.visibility == View.VISIBLE) {
                receiverIsoCodeEdittext.visibility = View.GONE
            }
        }

        /* if(sort.isNullOrEmpty() || sort.isNullOrBlank() || sort.equals(".") || sort.equals("-")){
         if (receiverSortCodeEdittext.visibility == View.GONE) {
           receiverSortCodeEdittext.visibility = View.VISIBLE
         }
         }else{
         if (receiverSortCodeEdittext.visibility == View.VISIBLE) {
           receiverSortCodeEdittext.visibility = View.GONE
         }
         }*/

        if (address.isNullOrEmpty() || address.isNullOrBlank() || address.equals(".") || address.equals(
                "-"
            )
        ) {
            if (receiverAddressEdittext.visibility == View.GONE) {
                receiverAddressEdittext.visibility = View.VISIBLE
            }
        } else {
            if (receiverAddressEdittext.visibility == View.VISIBLE) {
                receiverAddressEdittext.visibility = View.GONE
            }
        }

        if (townName.isNullOrEmpty() || townName.isNullOrBlank() || townName.equals(".") || townName.equals(
                "-"
            )
        ) {
            if (receiverTownNameEdittext.visibility == View.GONE) {
                receiverTownNameEdittext.visibility = View.VISIBLE
            }
        } else {
            if (receiverTownNameEdittext.visibility == View.VISIBLE) {
                receiverTownNameEdittext.visibility = View.GONE
            }
        }

        if (countrySubdivision.isNullOrEmpty() || countrySubdivision.isNullOrBlank() || countrySubdivision.equals(
                "."
            ) || countrySubdivision.equals("-")
        ) {
            if (receiverCountrySubdivisionEdittext.visibility == View.GONE) {
                receiverCountrySubdivisionEdittext.visibility = View.VISIBLE
            }
        } else {
            if (receiverCountrySubdivisionEdittext.visibility == View.VISIBLE) {
                receiverCountrySubdivisionEdittext.visibility = View.GONE
            }
        }
    }

    private fun addAcctTypeSpinner(response: CodeResponse) {
        acctTypeList = response.data.account_types
        val acctTypeName = mutableListOf("Choose Account Type") // Default string
        acctTypeName.addAll(acctTypeList.map { it.name }) // Append the rest

        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, acctTypeName)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        receiverAcctType.adapter = adapter
    }

    private fun addInstrumentSpinner(response: CodeResponse) {
        instrumentList = response.data.instruments
        val instrumentName = mutableListOf("Choose an instrument") // Default string
        instrumentName.addAll(instrumentList.map { it.name }) // Append the rest

        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, instrumentName)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        instrument.adapter = adapter
    }

    private fun validateAccount(
        firstName: String,
        middleName: String,
        lastName: String,
        accountNo: String
    ) {
        lifecycleScope.launch {
            if (receivingMode.contains("BANK")) {
                // For receiving mode with bank transfer
                if (receivingCountryCode.equals("IN")) {
                    // For countries that accept routing code and account number
                    Remittance.validateAccount(
                        partnerName = SessionManager.username ?: "",
                        receiving_country_code = receivingCountryCode,
                        receiving_mode = receivingMode,
                        swiftCode = null,
                        routingCode = routingCode,
                        iban = null,
                        acct_no = accountNo,
                        first_name = firstName,
                        middle_name = middleName,
                        last_name = lastName,
                        object : ValidateAccountListener {
                            override fun onSuccess(response: AccountValidationResponse) {
                                sortValidateAccountResponse(
                                    response,
                                    firstName,
                                    middleName,
                                    lastName,
                                    accountNo
                                )
                            }

                            override fun onFailed(errorMessage: String) {
                                dismissDialogProgress()
                                extractErrorMessageData(errorMessage)
                            }
                        })
                } else if (receivingCountryCode.equals("EG") || receivingCountryCode.equals("PK") || receivingCountryCode.equals(
                        "LK"
                    )
                ) {
                    // For countries that accept isoCode(BIC/SWIFT CODE) and iban
                    Remittance.validateAccount(
                        partnerName = SessionManager.username ?: "",
                        receiving_country_code = receivingCountryCode,
                        receiving_mode = receivingMode,
                        swiftCode = isoCode,
                        routingCode = null,
                        iban = iban,
                        acct_no = null,
                        first_name = firstName,
                        middle_name = middleName,
                        last_name = lastName,
                        object : ValidateAccountListener {
                            override fun onSuccess(response: AccountValidationResponse) {
                                sortValidateAccountResponse(
                                    response,
                                    firstName,
                                    middleName,
                                    lastName,
                                    accountNo
                                )
                            }

                            override fun onFailed(errorMessage: String) {
                                dismissDialogProgress()
                                showMessage(errorMessage)
                            }
                        })
                } else {
                    // For countries that accept isocode(Bic/Swift Code) and account number
                    Remittance.validateAccount(
                        partnerName = SessionManager.username ?: "",
                        receiving_country_code = receivingCountryCode,
                        receiving_mode = receivingMode,
                        swiftCode = isoCode,
                        routingCode = null,
                        iban = null,
                        acct_no = accountNo,
                        first_name = firstName,
                        middle_name = middleName,
                        last_name = lastName,
                        object : ValidateAccountListener {
                            override fun onSuccess(response: AccountValidationResponse) {
                                sortValidateAccountResponse(
                                    response,
                                    firstName,
                                    middleName,
                                    lastName,
                                    accountNo
                                )
                            }

                            override fun onFailed(errorMessage: String) {
                                dismissDialogProgress()
                                extractErrorMessageData(errorMessage)
                            }
                        })
                }
            } else {
                // For receiving mode with Cash pickup or Mobile wallet
                Remittance.validateAccount(
                    partnerName = SessionManager.username ?: "",
                    receiving_country_code = receivingCountryCode,
                    receiving_mode = receivingMode,
                    swiftCode = isoCode,
                    routingCode = null,
                    iban = null,
                    acct_no = null,
                    first_name = firstName,
                    middle_name = middleName,
                    last_name = lastName,
                    object : ValidateAccountListener {
                        override fun onSuccess(response: AccountValidationResponse) {
                            sortValidateAccountResponse(
                                response,
                                firstName,
                                middleName,
                                lastName,
                                accountNo
                            )
                        }

                        override fun onFailed(errorMessage: String) {
                            dismissDialogProgress()
                            extractErrorMessageData(errorMessage)
                        }
                    })
            }
        }
    }

    private fun sortValidateAccountResponse(
        response: AccountValidationResponse,
        firstName: String,
        middleName: String,
        lastName: String,
        accountNo: String
    ) {
        if (response.status == "failure" || response.status_code >= 400) {
            if (response.message?.contains("Lookup on any one of the request parameter") ?: false) {
                showMessage("Check and verify your iso code or routing code or sort code")
                return
            } else {
                showMessage(response.message ?: " An error occured")
                return
            }
        }

        dismissDialogProgress()

        val intent = Intent(this, InputScreen::class.java)
        if (receivingMode.contains("MOBILEWALLET")) {
            intent.putExtra("CORRESPONDENT", "LR")
            intent.putExtra("BANK_ID", null as String?)
            intent.putExtra("BRANCH_ID", null as String?)
        } else if (receivingMode.contains("BANK")) {
            intent.putExtra("CORRESPONDENT", null as String?)
            intent.putExtra("BANK_ID", null as String?)
            intent.putExtra("BRANCH_ID", null as String?)
        } else {
            intent.putExtra("CORRESPONDENT", "LR")
            intent.putExtra("BANK_ID", "INOPCP")
            intent.putExtra("BRANCH_ID", "OP")
        }

        if (receivingCountryCode == "IN") {
            intent.putExtra("ISO_CODE", null as String?)
            intent.putExtra("ROUTING_CODE", this.routingCode)
        } else {
            intent.putExtra("ISO_CODE", this.isoCode)
            intent.putExtra("ROUTING_CODE", null as String?)
        }

        if (receivingCountryCode.equals("EG") || receivingCountryCode.equals("PK") || receivingCountryCode.equals(
                "LK"
            )
        ) {
            intent.putExtra("ACCOUNT_NUMBER", null as String?)
            intent.putExtra("IBAN", this.iban)
        } else {
            intent.putExtra("ACCOUNT_NUMBER", accountNo)
            intent.putExtra("IBAN", null as String?)
        }


        intent.putExtra("SENDER_CURRENCY_CODE", this.sendingCurrencyCode)
        intent.putExtra("RECEIVER_CURRENCY_CODE", this.receivingCurrencyCode)
        intent.putExtra("CORRESPONDENT_NAME", this.correspondentName)
        intent.putExtra("BRANCH_NAME", this.branchName)
        intent.putExtra("SORT_CODE", this.sort)
        intent.putExtra("BANK_NAME", this.bankName)
        intent.putExtra("BANK_BRANCH_NAME", this.bankBranchName)
        intent.putExtra("IFSC", this.ifsc)
        intent.putExtra("BIC", this.bic)
        intent.putExtra("ADDRESS", this.address)
        intent.putExtra("TOWN_NAME", this.townName)
        intent.putExtra("ACCOUNT_TYPE_CODE", this.selectedReceiverAcctType)
        intent.putExtra("COUNTRY_SUBDIVISION", this.countrySubdivision)
        intent.putExtra("RECEIVER_FIRST_NAME", firstName)
        intent.putExtra("RECEIVER_MIDDLE_NAME", middleName)
        intent.putExtra("RECEIVER_LAST_NAME", lastName)
        intent.putExtra("RECEIVER_PHONE_NO", this.receiverPhoneNoEdittext.text.toString())
        intent.putExtra("TYPE", this.type)
        intent.putExtra("RECEIVING_MODE", this.receivingMode)
        intent.putExtra("RECEIVING_MODE_NAME", this.selectedReceivingModeName)
        intent.putExtra("RECEIVING_COUNTRY_CODE", this.receivingCountryCode)
        intent.putExtra("SENDING_COUNTRY_CODE", this.sendingCountryCode)
        intent.putExtra("LIMIT_MIN_AMOUNT", this.limitMinAmount.toString())
        intent.putExtra("LIMIT_PER_TRANSACTION", this.limitPerTransaction.toString())
        intent.putExtra("SEND_MIN_AMOUNT", this.sendMinAmount.toString())
        intent.putExtra("SEND_MAX_AMOUNT", this.sendMaxAmount.toString())
        intent.putExtra("RECEIVER_ADDRESS_LINE", this.receiverAddressEdittext.text.toString())
        intent.putExtra("RECEIVER_TOWN_NAME", this.receiverTownNameEdittext.text.toString())
        intent.putExtra(
            "RECEIVER_COUNTRY_SUBDIVISION",
            this.receiverCountrySubdivisionEdittext.text.toString()
        )
        intent.putExtra("INSTRUMENT", this.selectedInstrument)
        startActivity(intent)
    }

    private fun addSession(
        username: String,
        password: String,
        grantType: String,
        clientId: String,
        scope: String,
        clientSecret: String
    ) {
        SessionManager.username = username
        SessionManager.password = password
        SessionManager.grantType = grantType
        SessionManager.clientId = clientId
        SessionManager.scope = scope
        SessionManager.clientSecret = clientSecret
    }

    private fun redirectToLoginScreen() {
        val intent = Intent(this, LoginScreen::class.java)
        startActivity(intent)
        finish()
    }

    private fun saveRecipient(
        senderName: String,
        channelName: String,
        branchCode: String,
        companyCode: String
    ) {

    }

    private fun showMessage(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    private fun notifyUserForMobileWallet() {

    }

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

    private fun dismissDialogProgress() {
        if (dialog.isShowing == true) {
            dialog.dismiss()
        }
    }

    override fun onBottomSheetDismissed(
        bankId: String,
        branchId: String,
        branchName: String,
        branchFullName: String,
        countryCode: String,
        ifsc: String,
        bic: String,
        bankName: String,
        routingCode: String,
        swiftCode: String,
        sortCode: String,
        address: String,
        townName: String,
        countrySubdivision: String
    ) {
        receiverRoutingCodeEdittext.setText(routingCode)
        receiverIsoCodeEdittext.setText(swiftCode)
        receiverAddressEdittext.setText(address)
        receiverTownNameEdittext.setText(townName)
        receiverCountrySubdivisionEdittext.setText(countrySubdivision)


        this.bankId = bankId
        this.branchId = branchId
        this.branchName = branchName
        this.routingCode = routingCode
        this.isoCode = swiftCode
        this.sort = sortCode
        this.bankName = bankName
        this.bankBranchName = branchFullName
        this.ifsc = ifsc
        this.bic = bic
        this.address = address
        this.townName = townName
        this.countrySubdivision = countrySubdivision
        this.countryCode = countryCode

        if (countryCode.equals("CN")) {
            this.isoCode = "BKCHCNBJXXX"
        }

        if (countryCode.equals("EG")) {
            this.isoCode = "NBEGEGCX019"
        }

        if (countryCode.equals("IN")) {
            this.routingCode = "SBIN0004069"
        }

        if (countryCode.equals("PK")) {
            this.isoCode = "BKIPPKKAXXX"
        }

        if (countryCode.equals("PH")) {
            this.isoCode = "MBTCPHMMXXX"
        }

        if (countryCode.equals("LK")) {
            this.isoCode = "NBEGEGCX019"
        }

    }

    private fun extractErrorMessageData(errorMessage: String) {
        val gson = Gson()

        // Parse the JSON string into a JsonObject
        val jsonObject = gson.fromJson(errorMessage, JsonObject::class.java)

        // Extract the "message" value
        val message = jsonObject.get("message").asString

        showMessage(message)
    }

    override fun onFinishActivity() {
        finish() // Close this activity when called
    }

    override fun onDestroy() {
        super.onDestroy()
        destroyListeners()
    }
}
