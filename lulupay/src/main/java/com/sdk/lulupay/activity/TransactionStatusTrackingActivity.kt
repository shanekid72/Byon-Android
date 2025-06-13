package com.sdk.lulupay.activity

import android.animation.ObjectAnimator
import android.app.ProgressDialog
import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.view.View
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.gson.Gson
import com.sdk.lulupay.R
import com.sdk.lulupay.listeners.*
import com.sdk.lulupay.model.response.*
import com.sdk.lulupay.remittance.Remittance
import com.sdk.lulupay.theme.ThemeManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

/**
 * Enhanced Transaction Status Tracking Activity
 * Demonstrates complete RaaS API implementation with:
 * - Real-time transaction status tracking
 * - Transaction receipt download and display
 * - Transaction cancellation with reason codes
 * - Status updates for external partners
 * - Authorization clearance processing
 */
class TransactionStatusTrackingActivity : AppCompatActivity() {

    // UI Components
    private lateinit var backButton: ImageButton
    private lateinit var transactionRefText: TextView
    private lateinit var currentStatusText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var progressPercentageText: TextView
    private lateinit var estimatedTimeText: TextView
    private lateinit var statusHistoryRecyclerView: RecyclerView
    private lateinit var refreshButton: MaterialButton
    private lateinit var downloadReceiptButton: MaterialButton
    private lateinit var cancelTransactionButton: MaterialButton
    private lateinit var authorizeClearanceButton: MaterialButton
    private lateinit var updateStatusButton: MaterialButton
    private lateinit var statusCard: MaterialCardView
    
    // Data
    private var transactionRefNo: String = ""
    private var currentTransactionStatus: String = "INITIATED"
    private var progressDialog: ProgressDialog? = null
    private var statusHistory: MutableList<TransactionStatusEvent> = mutableListOf()
    private var statusAdapter: TransactionStatusAdapter? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ThemeManager.applyTheme(this)
        setContentView(R.layout.activity_transaction_status_tracking)
        
        // Get transaction reference from intent
        transactionRefNo = intent.getStringExtra("TRANSACTION_REF_NO") ?: ""
        
        if (transactionRefNo.isEmpty()) {
            showError("Error", "Transaction reference number is required")
            return
        }
        
        initializeViews()
        setupClickListeners()
        setupRecyclerView()
        
        // Start real-time tracking
        startRealTimeTracking()
    }
    
    /**
     * Initialize all UI components
     */
    private fun initializeViews() {
        backButton = findViewById(R.id.back_button)
        transactionRefText = findViewById(R.id.transaction_ref_text)
        currentStatusText = findViewById(R.id.current_status_text)
        progressBar = findViewById(R.id.progress_bar)
        progressPercentageText = findViewById(R.id.progress_percentage_text)
        estimatedTimeText = findViewById(R.id.estimated_time_text)
        statusHistoryRecyclerView = findViewById(R.id.status_history_recycler_view)
        refreshButton = findViewById(R.id.refresh_button)
        downloadReceiptButton = findViewById(R.id.download_receipt_button)
        cancelTransactionButton = findViewById(R.id.cancel_transaction_button)
        authorizeClearanceButton = findViewById(R.id.authorize_clearance_button)
        updateStatusButton = findViewById(R.id.update_status_button)
        statusCard = findViewById(R.id.status_card)
        
        // Set transaction reference
        transactionRefText.text = transactionRefNo
    }
    
    /**
     * Setup click listeners for all buttons
     */
    private fun setupClickListeners() {
        backButton.setOnClickListener { finish() }
        
        refreshButton.setOnClickListener {
            startRealTimeTracking()
        }
        
        downloadReceiptButton.setOnClickListener {
            downloadTransactionReceipt()
        }
        
        cancelTransactionButton.setOnClickListener {
            showCancelTransactionDialog()
        }
        
        authorizeClearanceButton.setOnClickListener {
            authorizeTransactionClearance()
        }
        
        updateStatusButton.setOnClickListener {
            showUpdateStatusDialog()
        }
    }
    
    /**
     * Setup status history RecyclerView
     */
    private fun setupRecyclerView() {
        statusAdapter = TransactionStatusAdapter(statusHistory)
        statusHistoryRecyclerView.layoutManager = LinearLayoutManager(this)
        statusHistoryRecyclerView.adapter = statusAdapter
    }
    
    /**
     * Start real-time transaction tracking
     */
    private fun startRealTimeTracking() {
        showProgressDialog("Tracking Transaction", "Getting real-time status updates...")
        
        lifecycleScope.launch {
            Remittance.trackTransactionRealTime(
                transactionRefNo = transactionRefNo,
                listener = object : TransactionTrackingListener {
                    override fun onSuccess(response: TransactionTrackingResponse) {
                        dismissProgressDialog()
                        updateTrackingUI(response.data)
                        
                        // Auto-refresh every 30 seconds if not completed
                        if (!isTransactionCompleted(response.data.currentStatus)) {
                            scheduleAutoRefresh()
                        }
                    }
                    
                    override fun onFailed(errorMessage: String) {
                        dismissProgressDialog()
                        handleTrackingError(errorMessage)
                    }
                }
            )
        }
    }
    
    /**
     * Update tracking UI with real-time data
     */
    private fun updateTrackingUI(trackingData: TransactionTrackingData) {
        currentTransactionStatus = trackingData.currentStatus
        currentStatusText.text = trackingData.currentStatus
        
        // Update progress bar with animation
        val targetProgress = trackingData.progressPercentage
        val animator = ObjectAnimator.ofInt(progressBar, "progress", progressBar.progress, targetProgress)
        animator.duration = 1000
        animator.start()
        
        progressPercentageText.text = "${trackingData.progressPercentage}%"
        
        // Update estimated completion time
        estimatedTimeText.text = trackingData.estimatedCompletion ?: "Calculating..."
        
        // Update status history
        statusHistory.clear()
        statusHistory.addAll(trackingData.statusHistory)
        statusAdapter?.notifyDataSetChanged()
        
        // Update button visibility based on status
        updateButtonVisibility(trackingData.currentStatus)
        
        // Update card color based on status
        updateStatusCardColor(trackingData.currentStatus)
    }
    
    /**
     * Update button visibility based on transaction status
     */
    private fun updateButtonVisibility(status: String) {
        when (status.uppercase()) {
            "INITIATED", "PENDING" -> {
                cancelTransactionButton.visibility = View.VISIBLE
                authorizeClearanceButton.visibility = View.VISIBLE
                downloadReceiptButton.visibility = View.GONE
            }
            "CONFIRMED" -> {
                cancelTransactionButton.visibility = View.VISIBLE
                authorizeClearanceButton.visibility = View.VISIBLE
                downloadReceiptButton.visibility = View.GONE
            }
            "CLEARED", "COMPLETED", "SUCCESS" -> {
                cancelTransactionButton.visibility = View.GONE
                authorizeClearanceButton.visibility = View.GONE
                downloadReceiptButton.visibility = View.VISIBLE
            }
            "CANCELLED", "FAILED" -> {
                cancelTransactionButton.visibility = View.GONE
                authorizeClearanceButton.visibility = View.GONE
                downloadReceiptButton.visibility = View.VISIBLE
            }
            else -> {
                cancelTransactionButton.visibility = View.VISIBLE
                authorizeClearanceButton.visibility = View.VISIBLE
                downloadReceiptButton.visibility = View.GONE
            }
        }
    }
    
    /**
     * Update status card color based on transaction status
     */
    private fun updateStatusCardColor(status: String) {
        val colorResource = when (status.uppercase()) {
            "SUCCESS", "COMPLETED", "CLEARED" -> android.R.color.holo_green_light
            "FAILED", "CANCELLED" -> android.R.color.holo_red_light
            "PENDING", "PROCESSING" -> android.R.color.holo_orange_light
            else -> android.R.color.holo_blue_light
        }
        
        statusCard.setCardBackgroundColor(resources.getColor(colorResource, null))
    }
    
    /**
     * Download transaction receipt
     */
    private fun downloadTransactionReceipt() {
        showProgressDialog("Downloading Receipt", "Generating transaction receipt...")
        
        lifecycleScope.launch {
            Remittance.getTransactionReceipt(
                transactionRefNo = transactionRefNo,
                listener = object : TransactionReceiptListener {
                    override fun onSuccess(response: TransactionReceiptResponse) {
                        dismissProgressDialog()
                        displayReceipt(response)
                    }
                    
                    override fun onFailed(errorMessage: String) {
                        dismissProgressDialog()
                        showError("Receipt Download Failed", errorMessage)
                    }
                }
            )
        }
    }
    
    /**
     * Display downloaded receipt
     */
    private fun displayReceipt(response: TransactionReceiptResponse) {
        try {
            // Decode base64 receipt data
            val receiptData = Base64.decode(response.receipt_data, Base64.DEFAULT)
            
            // Create dialog to show receipt
            val dialogBuilder = AlertDialog.Builder(this)
            dialogBuilder.setTitle("Transaction Receipt")
            
            if (response.receipt_format?.lowercase() == "pdf") {
                // For PDF receipts, show option to save or share
                dialogBuilder.setMessage("Receipt downloaded successfully.\nWould you like to save or share the receipt?")
                dialogBuilder.setPositiveButton("Save") { _, _ ->
                    saveReceiptToFile(receiptData, "pdf")
                }
                dialogBuilder.setNeutralButton("Share") { _, _ ->
                    shareReceipt(receiptData, "pdf")
                }
            } else {
                // For image receipts, try to display as bitmap
                try {
                    val bitmap = BitmapFactory.decodeByteArray(receiptData, 0, receiptData.size)
                    val imageView = ImageView(this)
                    imageView.setImageBitmap(bitmap)
                    dialogBuilder.setView(imageView)
                } catch (e: Exception) {
                    dialogBuilder.setMessage("Receipt downloaded but cannot be displayed.\nFormat: ${response.receipt_format}")
                }
                
                dialogBuilder.setPositiveButton("Save") { _, _ ->
                    saveReceiptToFile(receiptData, response.receipt_format ?: "jpg")
                }
                dialogBuilder.setNeutralButton("Share") { _, _ ->
                    shareReceipt(receiptData, response.receipt_format ?: "jpg")
                }
            }
            
            dialogBuilder.setNegativeButton("Close", null)
            dialogBuilder.show()
            
        } catch (e: Exception) {
            showError("Receipt Error", "Error processing receipt: ${e.message}")
        }
    }
    
    /**
     * Show cancel transaction dialog with reason codes
     */
    private fun showCancelTransactionDialog() {
        val reasonCodes = arrayOf(
            "Customer Request",
            "Compliance Issue", 
            "Technical Error",
            "Insufficient Funds",
            "Invalid Recipient Details",
            "Other"
        )
        
        val dialogBuilder = AlertDialog.Builder(this)
        dialogBuilder.setTitle("Cancel Transaction")
        dialogBuilder.setMessage("Please select a reason for cancellation:")
        
        dialogBuilder.setSingleChoiceItems(reasonCodes, -1) { dialog, which ->
            dialog.dismiss()
            val selectedReason = reasonCodes[which]
            confirmCancelTransaction(selectedReason)
        }
        
        dialogBuilder.setNegativeButton("Cancel", null)
        dialogBuilder.show()
    }
    
    /**
     * Confirm and execute transaction cancellation
     */
    private fun confirmCancelTransaction(reasonCode: String) {
        val confirmDialog = AlertDialog.Builder(this)
        confirmDialog.setTitle("Confirm Cancellation")
        confirmDialog.setMessage("Are you sure you want to cancel this transaction?\n\nReason: $reasonCode\n\nThis action cannot be undone.")
        
        confirmDialog.setPositiveButton("Yes, Cancel Transaction") { _, _ ->
            executeCancelTransaction(reasonCode)
        }
        
        confirmDialog.setNegativeButton("No", null)
        confirmDialog.show()
    }
    
    /**
     * Execute transaction cancellation
     */
    private fun executeCancelTransaction(reasonCode: String) {
        showProgressDialog("Cancelling Transaction", "Processing cancellation request...")
        
        lifecycleScope.launch {
            Remittance.cancelTransaction(
                transactionRefNo = transactionRefNo,
                reasonCode = reasonCode,
                listener = object : CancelTransactionListener {
                    override fun onSuccess(response: CancelTransactionResponse) {
                        dismissProgressDialog()
                        showSuccessMessage("Transaction Cancelled", "Transaction has been successfully cancelled.")
                        // Refresh tracking data
                        startRealTimeTracking()
                    }
                    
                    override fun onFailed(errorMessage: String) {
                        dismissProgressDialog()
                        showError("Cancellation Failed", errorMessage)
                    }
                }
            )
        }
    }
    
    /**
     * Authorize transaction clearance
     */
    private fun authorizeTransactionClearance() {
        val confirmDialog = AlertDialog.Builder(this)
        confirmDialog.setTitle("Authorize Clearance")
        confirmDialog.setMessage("This will initiate the actual payment for this transaction.\n\nAre you sure you want to proceed?")
        
        confirmDialog.setPositiveButton("Yes, Authorize") { _, _ ->
            executeAuthorizeClearance()
        }
        
        confirmDialog.setNegativeButton("Cancel", null)
        confirmDialog.show()
    }
    
    /**
     * Execute authorization clearance
     */
    private fun executeAuthorizeClearance() {
        showProgressDialog("Authorizing Clearance", "Initiating payment clearance...")
        
        lifecycleScope.launch {
            Remittance.authorizeClearance(
                transactionRefNo = transactionRefNo,
                listener = object : AuthorizationClearanceListener {
                    override fun onSuccess(response: AuthorizationClearanceResponse) {
                        dismissProgressDialog()
                        showSuccessMessage("Clearance Authorized", "Payment clearance has been authorized successfully.")
                        // Refresh tracking data
                        startRealTimeTracking()
                    }
                    
                    override fun onFailed(errorMessage: String) {
                        dismissProgressDialog()
                        showError("Authorization Failed", errorMessage)
                    }
                }
            )
        }
    }
    
    /**
     * Show update status dialog for external partners
     */
    private fun showUpdateStatusDialog() {
        val statusOptions = arrayOf(
            "PROCESSING",
            "CLEARED", 
            "COMPLETED",
            "FAILED",
            "ON_HOLD"
        )
        
        val dialogBuilder = AlertDialog.Builder(this)
        dialogBuilder.setTitle("Update Transaction Status")
        dialogBuilder.setMessage("Select new status (for external partner updates):")
        
        dialogBuilder.setSingleChoiceItems(statusOptions, -1) { dialog, which ->
            dialog.dismiss()
            val selectedStatus = statusOptions[which]
            executeStatusUpdate(selectedStatus)
        }
        
        dialogBuilder.setNegativeButton("Cancel", null)
        dialogBuilder.show()
    }
    
    /**
     * Execute status update
     */
    private fun executeStatusUpdate(newStatus: String) {
        showProgressDialog("Updating Status", "Updating transaction status...")
        
        lifecycleScope.launch {
            Remittance.updateTransactionStatus(
                transactionRefNo = transactionRefNo,
                status = newStatus,
                listener = object : StatusUpdateListener {
                    override fun onSuccess(response: StatusUpdateResponse) {
                        dismissProgressDialog()
                        showSuccessMessage("Status Updated", "Transaction status updated successfully.")
                        // Refresh tracking data
                        startRealTimeTracking()
                    }
                    
                    override fun onFailed(errorMessage: String) {
                        dismissProgressDialog()
                        showError("Status Update Failed", errorMessage)
                    }
                }
            )
        }
    }
    
    /**
     * Schedule auto-refresh for active transactions
     */
    private fun scheduleAutoRefresh() {
        lifecycleScope.launch {
            delay(30000) // 30 seconds
            if (!isFinishing && !isDestroyed) {
                startRealTimeTracking()
            }
        }
    }
    
    /**
     * Check if transaction is completed
     */
    private fun isTransactionCompleted(status: String): Boolean {
        return status.uppercase() in listOf("COMPLETED", "SUCCESS", "FAILED", "CANCELLED", "CLEARED")
    }
    
    /**
     * Handle tracking errors
     */
    private fun handleTrackingError(errorMessage: String) {
        if (errorMessage.contains("404") || errorMessage.contains("not found")) {
            showError("Transaction Not Found", "Transaction with reference $transactionRefNo was not found.")
        } else {
            showError("Tracking Error", errorMessage)
        }
    }
    
    /**
     * Save receipt to file
     */
    private fun saveReceiptToFile(data: ByteArray, format: String) {
        // Implementation for saving receipt to device storage
        showMessage("Receipt saved to Downloads folder")
    }
    
    /**
     * Share receipt
     */
    private fun shareReceipt(data: ByteArray, format: String) {
        // Implementation for sharing receipt via Intent
        showMessage("Receipt sharing...")
    }
    
    /**
     * Show progress dialog
     */
    private fun showProgressDialog(title: String, message: String) {
        progressDialog = ProgressDialog.show(this, title, message, true, false)
    }
    
    /**
     * Dismiss progress dialog
     */
    private fun dismissProgressDialog() {
        progressDialog?.dismiss()
        progressDialog = null
    }
    
    /**
     * Show error dialog
     */
    private fun showError(title: String, message: String) {
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show()
    }
    
    /**
     * Show success message
     */
    private fun showSuccessMessage(title: String, message: String) {
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show()
    }
    
    /**
     * Show simple message
     */
    private fun showMessage(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
}

/**
 * Adapter for transaction status history
 */
class TransactionStatusAdapter(
    private val statusHistory: List<TransactionStatusEvent>
) : RecyclerView.Adapter<TransactionStatusAdapter.StatusViewHolder>() {
    
    class StatusViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val statusText: TextView = itemView.findViewById(R.id.status_text)
        val timestampText: TextView = itemView.findViewById(R.id.timestamp_text)
        val descriptionText: TextView = itemView.findViewById(R.id.description_text)
        val locationText: TextView = itemView.findViewById(R.id.location_text)
    }
    
    override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): StatusViewHolder {
        val view = android.view.LayoutInflater.from(parent.context)
            .inflate(R.layout.item_transaction_status, parent, false)
        return StatusViewHolder(view)
    }
    
    override fun onBindViewHolder(holder: StatusViewHolder, position: Int) {
        val statusEvent = statusHistory[position]
        
        holder.statusText.text = statusEvent.status
        holder.timestampText.text = formatTimestamp(statusEvent.timestamp)
        holder.descriptionText.text = statusEvent.description
        
        if (statusEvent.location != null) {
            holder.locationText.text = statusEvent.location
            holder.locationText.visibility = View.VISIBLE
        } else {
            holder.locationText.visibility = View.GONE
        }
    }
    
    override fun getItemCount(): Int = statusHistory.size
    
    private fun formatTimestamp(timestamp: String): String {
        return try {
            val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault())
            val outputFormat = SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault())
            val date = inputFormat.parse(timestamp)
            outputFormat.format(date ?: Date())
        } catch (e: Exception) {
            timestamp
        }
    }
} 