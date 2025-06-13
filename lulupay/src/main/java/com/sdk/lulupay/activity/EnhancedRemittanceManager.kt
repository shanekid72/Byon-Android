package com.sdk.lulupay.activity

import android.content.Context
import android.util.Log
import androidx.lifecycle.lifecycleScope
import com.sdk.lulupay.listeners.*
import com.sdk.lulupay.model.response.*
import com.sdk.lulupay.remittance.Remittance
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Enhanced Remittance Manager
 * Comprehensive implementation of all RaaS API endpoints:
 * 
 * 1. Create Quote - Get rates, fees, and quote ID ✅
 * 2. Create Transaction - Submit sender/receiver details ✅  
 * 3. Confirm Transaction - Final authorization ✅
 * 4. Authorize Clearance - Initiate actual payment ✅
 * 5. Status Enquiry - Check transaction status ✅
 * 6. Cancel Transaction - Cancel if needed ✅
 * 7. Transaction Receipt - Download invoice ✅
 * 8. Status Update - For external partners ✅
 * 9. Real-time Tracking - Monitor transaction progress ✅
 */
class EnhancedRemittanceManager(private val context: Context) {
    
    companion object {
        private const val TAG = "EnhancedRemittanceManager"
    }
    
    /**
     * Complete remittance flow demonstration
     * Shows end-to-end money transfer process with all RaaS APIs
     */
    fun demonstrateCompleteRemittanceFlow(
        scope: CoroutineScope,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        scope.launch {
            try {
                val flowResult = executeCompleteRemittanceFlow()
                withContext(Dispatchers.Main) {
                    onSuccess(flowResult)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    onError("Remittance flow failed: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Execute complete remittance flow with all RaaS APIs
     */
    private suspend fun executeCompleteRemittanceFlow(): String {
        val flowSteps = mutableListOf<String>()
        
        // Step 1: Create Quote
        flowSteps.add("🔍 Step 1: Creating Quote...")
        val quoteId = createQuoteAsync()
        flowSteps.add("✅ Quote created successfully: $quoteId")
        
        // Step 2: Create Transaction
        flowSteps.add("💳 Step 2: Creating Transaction...")
        val transactionRef = createTransactionAsync(quoteId)
        flowSteps.add("✅ Transaction created: $transactionRef")
        
        // Step 3: Confirm Transaction
        flowSteps.add("🔐 Step 3: Confirming Transaction...")
        confirmTransactionAsync(transactionRef)
        flowSteps.add("✅ Transaction confirmed")
        
        // Step 4: Authorize Clearance
        flowSteps.add("🚀 Step 4: Authorizing Clearance...")
        authorizeClearanceAsync(transactionRef)
        flowSteps.add("✅ Clearance authorized - Payment initiated")
        
        // Step 5: Track Transaction Status
        flowSteps.add("📊 Step 5: Tracking Transaction Status...")
        val trackingData = trackTransactionAsync(transactionRef)
        flowSteps.add("✅ Current Status: ${trackingData.currentStatus} (${trackingData.progressPercentage}%)")
        
        // Step 6: Status Enquiry
        flowSteps.add("🔍 Step 6: Transaction Status Enquiry...")
        val enquiryData = enquireTransactionAsync(transactionRef)
        flowSteps.add("✅ Status: ${enquiryData.data.status}")
        
        // Step 7: Download Receipt (if completed)
        if (isTransactionCompleted(trackingData.currentStatus)) {
            flowSteps.add("📄 Step 7: Downloading Receipt...")
            val receiptData = downloadReceiptAsync(transactionRef)
            flowSteps.add("✅ Receipt downloaded: ${receiptData.receipt_format}")
        }
        
        // Step 8: Status Update (demonstration)
        flowSteps.add("🔄 Step 8: Updating Status (External Partner)...")
        updateStatusAsync(transactionRef, "PROCESSING")
        flowSteps.add("✅ Status updated for external partner")
        
        return flowSteps.joinToString("\n")
    }
    
    /**
     * Create quote asynchronously
     */
    private suspend fun createQuoteAsync(): String {
        return withContext(Dispatchers.IO) {
            var result = ""
            var error = ""
            
            Remittance.createQuote(
                sendingCountryCode = "AE",
                sendingCurrencyCode = "AED",
                receivingCountryCode = "IN",
                receivingCurrencyCode = "INR",
                sendingAmount = "1000",
                receivingMode = "BANK",
                instrument = "REMITTANCE",
                paymentMode = "CASH",
                isoCode = "HDFC",
                routingCode = null,
                correspondent = "HDFC Bank",
                correspondentId = "HDFC001",
                correspondentLocationId = "HDFC001_MUMBAI",
                listener = object : QuoteListener {
                    override fun onSuccess(response: QuoteResponse) {
                        result = response.data.quote_id
                        Log.d(TAG, "Quote created: ${response.data.quote_id}")
                    }
                    
                    override fun onFailed(errorMessage: String) {
                        error = errorMessage
                        Log.e(TAG, "Quote creation failed: $errorMessage")
                    }
                }
            )
            
            // Wait for callback
            var attempts = 0
            while (result.isEmpty() && error.isEmpty() && attempts < 50) {
                kotlinx.coroutines.delay(100)
                attempts++
            }
            
            if (error.isNotEmpty()) throw Exception(error)
            if (result.isEmpty()) throw Exception("Quote creation timeout")
            
            result
        }
    }
    
    /**
     * Create transaction asynchronously
     */
    private suspend fun createTransactionAsync(quoteId: String): String {
        return withContext(Dispatchers.IO) {
            var result = ""
            var error = ""
            
            Remittance.createTransaction(
                instrument = "REMITTANCE",
                customerNumber = "CUST001",
                agentCustomerNumber = "AGENT001",
                mobileNo = "+919876543210",
                firstName = "John",
                middleName = "",
                lastName = "Doe",
                nationality = "IN",
                accountTypeCode = "SAVINGS",
                accountNo = "1234567890",
                isoCode = "HDFC",
                iban = null,
                routingCode = null,
                walletId = null,
                receivingMode = "BANK",
                correspondent = "HDFC Bank",
                bankId = "HDFC001",
                branchId = "HDFC001_MUMBAI",
                quoteId = quoteId,
                agentTransactionRefNumber = "AGENT_${System.currentTimeMillis()}",
                listener = object : TransactionListener {
                    override fun onSuccess(response: CreateTransactionResponse) {
                        result = response.data.transaction_ref_number
                        Log.d(TAG, "Transaction created: ${response.data.transaction_ref_number}")
                    }
                    
                    override fun onFailed(errorMessage: String) {
                        error = errorMessage
                        Log.e(TAG, "Transaction creation failed: $errorMessage")
                    }
                }
            )
            
            // Wait for callback
            var attempts = 0
            while (result.isEmpty() && error.isEmpty() && attempts < 50) {
                kotlinx.coroutines.delay(100)
                attempts++
            }
            
            if (error.isNotEmpty()) throw Exception(error)
            if (result.isEmpty()) throw Exception("Transaction creation timeout")
            
            result
        }
    }
    
    /**
     * Confirm transaction asynchronously
     */
    private suspend fun confirmTransactionAsync(transactionRef: String) {
        return withContext(Dispatchers.IO) {
            var success = false
            var error = ""
            
            Remittance.confirmTransaction(
                transactionRefNo = transactionRef,
                bankRefNo = null,
                listener = object : ConfirmTransactionListener {
                    override fun onSuccess(response: ConfirmTransactionResponse) {
                        success = true
                        Log.d(TAG, "Transaction confirmed: $transactionRef")
                    }
                    
                    override fun onFailed(errorMessage: String) {
                        error = errorMessage
                        Log.e(TAG, "Transaction confirmation failed: $errorMessage")
                    }
                }
            )
            
            // Wait for callback
            var attempts = 0
            while (!success && error.isEmpty() && attempts < 50) {
                kotlinx.coroutines.delay(100)
                attempts++
            }
            
            if (error.isNotEmpty()) throw Exception(error)
            if (!success) throw Exception("Transaction confirmation timeout")
        }
    }
    
    /**
     * Authorize clearance asynchronously
     */
    private suspend fun authorizeClearanceAsync(transactionRef: String) {
        return withContext(Dispatchers.IO) {
            var success = false
            var error = ""
            
            Remittance.authorizeClearance(
                transactionRefNo = transactionRef,
                listener = object : AuthorizationClearanceListener {
                    override fun onSuccess(response: AuthorizationClearanceResponse) {
                        success = true
                        Log.d(TAG, "Clearance authorized: $transactionRef")
                    }
                    
                    override fun onFailed(errorMessage: String) {
                        error = errorMessage
                        Log.e(TAG, "Clearance authorization failed: $errorMessage")
                    }
                }
            )
            
            // Wait for callback
            var attempts = 0
            while (!success && error.isEmpty() && attempts < 50) {
                kotlinx.coroutines.delay(100)
                attempts++
            }
            
            if (error.isNotEmpty()) throw Exception(error)
            if (!success) throw Exception("Clearance authorization timeout")
        }
    }
    
    /**
     * Track transaction asynchronously
     */
    private suspend fun trackTransactionAsync(transactionRef: String): TransactionTrackingData {
        return withContext(Dispatchers.IO) {
            var result: TransactionTrackingData? = null
            var error = ""
            
            Remittance.trackTransactionRealTime(
                transactionRefNo = transactionRef,
                listener = object : TransactionTrackingListener {
                    override fun onSuccess(response: TransactionTrackingResponse) {
                        result = response.data
                        Log.d(TAG, "Transaction tracking: ${response.data.currentStatus}")
                    }
                    
                    override fun onFailed(errorMessage: String) {
                        error = errorMessage
                        Log.e(TAG, "Transaction tracking failed: $errorMessage")
                    }
                }
            )
            
            // Wait for callback
            var attempts = 0
            while (result == null && error.isEmpty() && attempts < 50) {
                kotlinx.coroutines.delay(100)
                attempts++
            }
            
            if (error.isNotEmpty()) throw Exception(error)
            result ?: throw Exception("Transaction tracking timeout")
        }
    }
    
    /**
     * Enquire transaction asynchronously
     */
    private suspend fun enquireTransactionAsync(transactionRef: String): EnquireTransactionResponse {
        return withContext(Dispatchers.IO) {
            var result: EnquireTransactionResponse? = null
            var error = ""
            
            Remittance.enquireTransaction(
                transactionRefNo = transactionRef,
                listener = object : EnquireTransactionListener {
                    override fun onSuccess(response: EnquireTransactionResponse) {
                        result = response
                        Log.d(TAG, "Transaction enquiry: ${response.data.status}")
                    }
                    
                    override fun onFailed(errorMessage: String) {
                        error = errorMessage
                        Log.e(TAG, "Transaction enquiry failed: $errorMessage")
                    }
                }
            )
            
            // Wait for callback
            var attempts = 0
            while (result == null && error.isEmpty() && attempts < 50) {
                kotlinx.coroutines.delay(100)
                attempts++
            }
            
            if (error.isNotEmpty()) throw Exception(error)
            result ?: throw Exception("Transaction enquiry timeout")
        }
    }
    
    /**
     * Download receipt asynchronously
     */
    private suspend fun downloadReceiptAsync(transactionRef: String): TransactionReceiptResponse {
        return withContext(Dispatchers.IO) {
            var result: TransactionReceiptResponse? = null
            var error = ""
            
            Remittance.getTransactionReceipt(
                transactionRefNo = transactionRef,
                listener = object : TransactionReceiptListener {
                    override fun onSuccess(response: TransactionReceiptResponse) {
                        result = response
                        Log.d(TAG, "Receipt downloaded: ${response.receipt_format}")
                    }
                    
                    override fun onFailed(errorMessage: String) {
                        error = errorMessage
                        Log.e(TAG, "Receipt download failed: $errorMessage")
                    }
                }
            )
            
            // Wait for callback
            var attempts = 0
            while (result == null && error.isEmpty() && attempts < 50) {
                kotlinx.coroutines.delay(100)
                attempts++
            }
            
            if (error.isNotEmpty()) throw Exception(error)
            result ?: throw Exception("Receipt download timeout")
        }
    }
    
    /**
     * Update status asynchronously
     */
    private suspend fun updateStatusAsync(transactionRef: String, status: String) {
        return withContext(Dispatchers.IO) {
            var success = false
            var error = ""
            
            Remittance.updateTransactionStatus(
                transactionRefNo = transactionRef,
                status = status,
                listener = object : StatusUpdateListener {
                    override fun onSuccess(response: StatusUpdateResponse) {
                        success = true
                        Log.d(TAG, "Status updated: $transactionRef -> $status")
                    }
                    
                    override fun onFailed(errorMessage: String) {
                        error = errorMessage
                        Log.e(TAG, "Status update failed: $errorMessage")
                    }
                }
            )
            
            // Wait for callback
            var attempts = 0
            while (!success && error.isEmpty() && attempts < 50) {
                kotlinx.coroutines.delay(100)
                attempts++
            }
            
            if (error.isNotEmpty()) throw Exception(error)
            if (!success) throw Exception("Status update timeout")
        }
    }
    
    /**
     * Demonstrate transaction cancellation
     */
    fun demonstrateCancellation(
        transactionRef: String,
        scope: CoroutineScope,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    var success = false
                    var error = ""
                    
                    Remittance.cancelTransaction(
                        transactionRefNo = transactionRef,
                        reasonCode = "Customer Request",
                        listener = object : CancelTransactionListener {
                            override fun onSuccess(response: CancelTransactionResponse) {
                                success = true
                                Log.d(TAG, "Transaction cancelled: $transactionRef")
                            }
                            
                            override fun onFailed(errorMessage: String) {
                                error = errorMessage
                                Log.e(TAG, "Transaction cancellation failed: $errorMessage")
                            }
                        }
                    )
                    
                    // Wait for callback
                    var attempts = 0
                    while (!success && error.isEmpty() && attempts < 50) {
                        kotlinx.coroutines.delay(100)
                        attempts++
                    }
                    
                    if (error.isNotEmpty()) throw Exception(error)
                    if (!success) throw Exception("Transaction cancellation timeout")
                }
                
                withContext(Dispatchers.Main) {
                    onSuccess("Transaction $transactionRef cancelled successfully")
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    onError("Cancellation failed: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Check if transaction is completed
     */
    private fun isTransactionCompleted(status: String): Boolean {
        return status.uppercase() in listOf("COMPLETED", "SUCCESS", "CLEARED")
    }
    
    /**
     * Get transaction status color
     */
    fun getStatusColor(status: String): Int {
        return when (status.uppercase()) {
            "SUCCESS", "COMPLETED", "CLEARED" -> android.R.color.holo_green_dark
            "FAILED", "CANCELLED" -> android.R.color.holo_red_dark
            "PENDING", "PROCESSING" -> android.R.color.holo_orange_dark
            else -> android.R.color.holo_blue_dark
        }
    }
    
    /**
     * Get transaction status description
     */
    fun getStatusDescription(status: String): String {
        return when (status.uppercase()) {
            "INITIATED" -> "Transaction has been initiated"
            "PENDING" -> "Transaction is pending processing"
            "CONFIRMED" -> "Transaction has been confirmed"
            "PROCESSING" -> "Transaction is being processed"
            "CLEARED" -> "Payment has been cleared"
            "COMPLETED" -> "Transaction completed successfully"
            "SUCCESS" -> "Transaction was successful"
            "FAILED" -> "Transaction failed"
            "CANCELLED" -> "Transaction was cancelled"
            "ON_HOLD" -> "Transaction is on hold"
            else -> "Unknown status: $status"
        }
    }
} 