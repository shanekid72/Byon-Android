package com.sdk.lulupay.model.response

data class MasterBankDetailResponse2(
    val bankId: String,
    val bankName: String,
    val countryCode: String,
    val receivingMode: String,
    val swiftCode: String? = null,
    val address: String? = null
// Add more fields as per the actual response
)
