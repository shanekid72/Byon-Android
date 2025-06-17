package com.sdk.lulupay.model.response

data class MasterBankDetailResponse(val status: String, val status_code: Int, val data: BankData)

data class BankData(
    val bank_id: String,
    val bank_name: String,
    val bank_country_code: String,
    val bank_account_number_length: String,
    val bank_address: String? = null // Optional
)
