package com.sdk.lulupay.model.response

data class BankBranchResponse(val status: String, val status_code: Int, val data: BranchData2)

data class BranchData2(
    val records: Int,
    val list: List<BranchDetails3>,
    val total_records: Int,
    val total_page: Int,
    val current_page: Int
)

data class BranchDetails3(
    val bank_id: String,
    val branch_id: String,
    val branch_name: String,
    val routing_code: String? = null,
    val iso_code: String? = null,
    val sort: String? = null,
    val bank_name: String,
    val bank_branch_name: String? = null,
    val ifsc: String? = null,
    val bic: String,
    val address: String? = null,
    val town_name: String? = null,
    val country_subdivision: String? = null,
    val country_code: String? = null
)
