package com.sdk.lulupay.model.response

data class CancelTransactionResponse(
    val status: String,
    val status_code: Int,
    val error_code: Int? = null,
    val message: String? = null,
    val data: ResponseData2? = null
)

data class ResponseData2(
    val state: String? = null,
    val sub_state: String? = null,
    val transaction_ref_number: String? = null
)
