package com.sdk.lulupay.model.response

data class AuthorizationClearanceResponse(
    val status: String,
    val statusCode: Int,
    val data: TransactionStatusData2
)

data class TransactionStatusData2(
    val state: String,
    val subState: String,
    val transactionRefNumber: String
)
