package com.sdk.lulupay.model.response

data class AccountValidationResponse(
    val status: String,
    val status_code: Int,
    val data: String? = null,
    val errorCode: Int? = null,
    val message: String? = null
)
