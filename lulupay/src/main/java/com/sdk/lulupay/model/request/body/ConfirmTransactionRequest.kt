package com.sdk.lulupay.model.request.body

/**
 * Request class for confirming a transaction
 * Contains transaction reference and optional bank details
 * Used to confirm and finalize a transaction after initial creation
 */
data class ConfirmTransactionRequest(
    val transaction_ref_number: String,
    val bank_ref_number: String? = null,
    val customer_bank_name: String? = null,
    val deposit_account_id: String? = null
)
