package com.sdk.lulupay.model.response

data class CreateTransactionResponse(val status: String,
val statusCode: Int,
val data: TransactionData2
)

data class TransactionData2(
val transaction_ref_number: String,
val transactionDate: String,
val transactionGmtDate: String,
val expiresAt: String,
val expiresAtGmt: String
)