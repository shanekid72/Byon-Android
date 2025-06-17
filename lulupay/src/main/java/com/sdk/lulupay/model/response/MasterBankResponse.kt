package com.sdk.lulupay.model.response

data class MasterBankResponse(val status: String, val status_code: Int, val data: BankListData)

data class BankListData(
    val records: Int,
    val list: List<BankInfo>,
    val total_records: Int,
    val total_page: Int,
    val current_page: Int
)

data class BankInfo(val bank_id: String, val bank_name: String)
