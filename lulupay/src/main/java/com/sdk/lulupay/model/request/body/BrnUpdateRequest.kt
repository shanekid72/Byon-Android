package com.sdk.lulupay.model.request.body

import java.math.BigDecimal

/**
 * Request class for updating bank reference number (BRN) details
 * Contains transaction identifiers, bank details, payment status and reconciliation info
 * Used to update transaction with bank reference and payment confirmation details
 */
data class BrnUpdateRequest(
    val transaction_ref_number: String,
    val bank_ref_number: String,
    val customer_bank_name: String? = null,
    val deposit_account_id: String? = null,
    val payment_initiated: String? = null,
    val customer_name: String? = null,
    val payment_id: String? = null,
    val amount: BigDecimal? = null,
    val match_type: String? = null,
    val is_reconciled: String
)
