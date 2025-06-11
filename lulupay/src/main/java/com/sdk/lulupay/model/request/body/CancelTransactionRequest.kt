package com.sdk.lulupay.model.request.body

data class CancelTransactionRequest(
    val transaction_ref_number: String,
    val cancel_reason: String,
    val remarks: String
)
