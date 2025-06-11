package com.sdk.lulupay.bottomsheet

import android.os.Bundle
import android.widget.*
import android.app.*
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.FragmentActivity
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.button.MaterialButton
import androidx.recyclerview.widget.RecyclerView
import androidx.lifecycle.lifecycleScope
import com.sdk.lulupay.R
import androidx.appcompat.app.AlertDialog
import com.sdk.lulupay.listeners.*
import com.sdk.lulupay.model.response.*
import com.sdk.lulupay.recyclerView.*
import com.sdk.lulupay.remittance.Remittance
import kotlinx.coroutines.launch

/**
 * BottomSheetLookupsFragment
 * A bottom sheet dialog fragment for looking up bank branch details
 * Allows searching by sort code, routing code or SWIFT code
 * Displays search results in a recycler view
 */
class BottomSheetLookupsFragment : BottomSheetDialogFragment() {
    companion object {
        private const val ARG_RECEIVING_MODE = "receiving_mode"
        private const val ARG_RECEIVING_NAME = "receivingName"
        private const val ARG_SENDER = "sender"
        private const val ARG_COUNTRY = "country"

        /**
         * Creates a new instance of BottomSheetLookupsFragment
         * @param receivingMode The mode of receiving payment
         * @param receivingName Name of receiver
         * @param sender Name of sender
         * @param country Country code
         * @return New BottomSheetLookupsFragment instance with arguments
         */
        fun newInstance(receivingMode: String, receivingName: String, sender: String, country: String): BottomSheetLookupsFragment {
            val fragment = BottomSheetLookupsFragment()
            val args = Bundle()
            args.putString(ARG_RECEIVING_MODE, receivingMode)
            args.putString(ARG_RECEIVING_NAME, receivingName)
            args.putString(ARG_SENDER, sender)
            args.putString(ARG_COUNTRY, country)
            fragment.arguments = args
            return fragment
        }
    }
    
    private lateinit var sortCodeEdittext: EditText
    private lateinit var routingCodeEdittext: EditText
    private lateinit var swiftCodeEdittext: EditText
    private lateinit var buttonSearch: MaterialButton
    private lateinit var recyclerView: RecyclerView
    private lateinit var adapter: BankDetailsAdapter
    
    private var receivingMode = ""
    private var receivingName = ""
    private var sender = ""
    private var country = ""
    
    private var bankName: String = ""
    private var routingCode: String = ""
    private var bicSwift: String = ""
    private var sortCode: String = ""
    private var address: String = ""
    private var townName: String = ""
    private var countrySubdivision: String = ""
    private var bankId: String = ""
    private var branchId: String = ""
    private var branchName: String = ""
    private var branchFullName: String = ""
    private var countryCode: String = ""
    private var ifsc: String = ""
    private var bic: String = ""

    /**
     * Creates and configures the bottom sheet dialog
     * Sets up dialog to be full height and expanded by default
     * @param savedInstanceState Bundle containing saved state
     * @return Configured Dialog instance
     */
    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val dialog = super.onCreateDialog(savedInstanceState) as BottomSheetDialog

        dialog.setOnShowListener { dialogInterface ->
            val bottomSheetDialog = dialogInterface as BottomSheetDialog
            val bottomSheet = bottomSheetDialog.findViewById<View>(com.google.android.material.R.id.design_bottom_sheet)

            if (bottomSheet != null) {
                val behavior = BottomSheetBehavior.from(bottomSheet)
                behavior.state = BottomSheetBehavior.STATE_EXPANDED
                bottomSheet.layoutParams.height = ViewGroup.LayoutParams.MATCH_PARENT
                bottomSheet.requestLayout()
            }
        }

        return dialog
    }

    /**
     * Creates and inflates the view for this fragment
     * Initializes UI elements from layout
     * @param inflater LayoutInflater to inflate views
     * @param container Parent view container
     * @param savedInstanceState Bundle containing saved state
     * @return Inflated View
     */
    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.bottom_sheet_lookups, container, false)
        
        sortCodeEdittext = view.findViewById(R.id.sort_code_bottom_sheet)
        routingCodeEdittext = view.findViewById(R.id.routing_code_bottom_sheet)
        swiftCodeEdittext = view.findViewById(R.id.bic_swift_code)
        buttonSearch = view.findViewById(R.id.button_search)
        recyclerView = view.findViewById(R.id.recycler_view_bottom_sheet)
        
        return view
    }

    /**
     * Called after view is created
     * Gets arguments and sets up click listeners
     * @param view Created view
     * @param savedInstanceState Bundle containing saved state
     */
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        receivingMode = arguments?.getString(ARG_RECEIVING_MODE) ?: ""
        receivingName = arguments?.getString(ARG_RECEIVING_NAME) ?: ""
        sender = arguments?.getString(ARG_SENDER) ?: ""
        country = arguments?.getString(ARG_COUNTRY) ?: ""
        
        setClickListener()
    }
    
    /**
     * Sets up click listener for search button
     * Validates input fields and triggers branch lookup
     */
    private fun setClickListener(){
        buttonSearch.setOnClickListener{
            var sortCodeValue : String? = null
            var swiftCodeValue : String? = null
            var routingCodeValue : String? = null
            
            if(sortCodeEdittext.text.toString().isNullOrBlank()){
                sortCodeValue = null
            }else{
                sortCodeValue = sortCodeEdittext.text.toString()
            }
            
            if(swiftCodeEdittext.text.toString().isNullOrBlank()){
                swiftCodeValue = null
            }else{
                swiftCodeValue = swiftCodeEdittext.text.toString()
            }
            
            if(routingCodeEdittext.text.toString().isNullOrBlank()){
                routingCodeValue = null
            }else{
                routingCodeValue = routingCodeEdittext.text.toString()
            }
            
            if(!sortCodeEdittext.text.toString().isNullOrBlank() || !swiftCodeEdittext.text.toString().isNullOrBlank() || !routingCodeEdittext.text.toString().isNullOrBlank()){
                showDialogProgress()
                branchLookup(sortCodeValue, routingCodeValue, swiftCodeValue)
            }else{
                showMessage("Sort Code Or Routing Code Or Swift Code is required to perform bank search!")
            }
        }
    }
    
    /**
     * Performs branch lookup API call
     * Handles success and failure responses
     * @param sort_code Bank sort code
     * @param routing_code Bank routing code
     * @param swift_code Bank SWIFT/BIC code
     */
    private fun branchLookup(sort_code: String? = null, routing_code: String? = null, swift_code: String? = null){
        lifecycleScope.launch {
            Remittance.branchLookup(
                sortCode = sort_code,
                routingCode = routing_code,
                swiftCode = swift_code,
                partnerName = sender,
                receivingCountryCode = country,
                receivingMode = receivingMode,
                object : BranchLookupListener {
                    override fun onSuccess(response: BranchSearchResponse) {
                        dismissDialogProgress()
                        
                        if(response.status.equals("failure") || response.status_code >= 400){
                            showMessage(response.message ?: "Bank not found")
                        }else{
                            response.data?.list?.let { branchDetails ->
                                (requireActivity().supportFragmentManager.findFragmentByTag("BottomSheet") as? BottomSheetLookupsFragment)?.setupRecyclerView(branchDetails)
                            }
                        }
                    }

                    override fun onFailed(errorMessage: String) {
                        dismissDialogProgress()
                        showMessage(errorMessage)
                    }
                })
        }
    }
    
    /**
     * Sets up recycler view with branch details
     * Creates adapter and handles item click events
     * @param branchDetails List of branch details to display
     */
    fun setupRecyclerView(branchDetails: List<BranchDetails>) {
        val bankDetails = branchDetails.map {
            BankDetail(
                bankName = it.bank_name ?: "",
                routingCode = it.routing_code ?: "",
                bicSwift = it.bic ?: "",
                sortCode = it.sort,
                address = it.address,
                townName = it.town_name ?: "",
                countrySubdivision = it.country_subdivision ?: ""
            )
        }

        adapter = BankDetailsAdapter(bankDetails) { position, bankDetail ->
            val selectedBranch = branchDetails[position]
            bankId = selectedBranch.bank_id
            branchId = selectedBranch.branch_id
            branchName = selectedBranch.branch_name
            branchFullName = selectedBranch.branch_full_name
            countryCode = selectedBranch.country_code
            ifsc = selectedBranch.ifsc ?: ""
            bic = selectedBranch.bic ?: ""
            
            bankName = selectedBranch.bank_name ?: ""
            routingCode = selectedBranch.routing_code ?: ""
            bicSwift = selectedBranch.bic ?: ""
            sortCode = selectedBranch.sort
            address = selectedBranch.address
            townName = selectedBranch.town_name ?: ""
            countrySubdivision = selectedBranch.country_subdivision ?: ""
            sortClickListener()
        }

        recyclerView.layoutManager = LinearLayoutManager(requireContext())
        recyclerView.adapter = adapter
    }
    
    /**
     * Handles click on sorted/selected bank
     * Validates BIC/SWIFT code and dismisses dialog
     */
    private fun sortClickListener() {
        if (bicSwift.isNullOrBlank() || bicSwift.equals(".") || bicSwift.equals("-")) {
            showMessage("Bic/Swift Code is required!")
        }else{
            dismiss()
        }
    }
    
    /**
     * Adds recycler view adapter
     * @param response Branch search response
     */
    private fun addRecyclerViewAdapter(response: BranchSearchResponse){
    
    }
    
    private lateinit var dialog: AlertDialog

    /**
     * Shows progress dialog while loading
     * Creates and displays non-cancelable AlertDialog
     */
    private fun showDialogProgress() {
        dialog = AlertDialog.Builder(requireContext(), R.style.TransparentDialog)
            .setView(R.layout.custom_dialog)
            .setCancelable(false)
            .create()

        dialog.setCanceledOnTouchOutside(false)
        dialog.show()
    }

    /**
     * Dismisses progress dialog if showing
     */
    private fun dismissDialogProgress() {
        if (::dialog.isInitialized && dialog.isShowing) {
            dialog.dismiss()
        }
    }

    /**
     * Removes fragment from child fragment manager
     */
    private fun destroyFragment(){
        val fragment = childFragmentManager.findFragmentByTag("BottomSheet")
        if (fragment != null) {
            childFragmentManager.beginTransaction()
                .remove(fragment)
                .commit()
        }
    }

    /**
     * Shows toast message
     * @param message Message to display
     */
    private fun showMessage(message: String) {
        Toast.makeText(requireActivity(), message, Toast.LENGTH_SHORT).show()
    }
    
    /**
     * Returns custom theme for full screen bottom sheet
     * @return Theme resource ID
     */
    override fun getTheme(): Int {
        return R.style.FullScreenBottomSheetDialog
    }
    
    /**
     * Called when view is destroyed
     * Notifies listener with selected bank details
     */
    override fun onDestroyView() {
        super.onDestroyView()
        (activity as? BottomSheetListener)?.onBottomSheetDismissed(
            bankId = bankId,
            branchId = branchId,
            branchName = branchName,
            branchFullName = branchFullName,
            countryCode = countryCode,
            ifsc = ifsc,
            bic = bic,
            bankName = bankName,
            routingCode = routingCode,
            swiftCode = bicSwift,
            sortCode = sortCode,
            address = address,
            townName = townName,
            countrySubdivision = countrySubdivision
        )
    }
}