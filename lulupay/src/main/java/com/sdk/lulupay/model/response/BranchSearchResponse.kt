package com.sdk.lulupay.model.response

data class BranchSearchResponse(
    val status: String,
    val status_code: Int,
    val error_code: Int? = null, // Optional for failure case
    val message: String? = null, // Optional for failure case
    val data: BranchData? = null // Optional for success case
)

data class BranchData(
    val records: Int,
    val list: List<BranchDetails>,
    val total_records: Int,
    val total_page: Int,
    val current_page: Int
)

data class BranchDetails(
    val bank_id: String,
    val branch_id: String,
    val branch_name: String,
    val branch_full_name: String,
    val address: String,
    val town_name: String? = null,
    val country_subdivision: String? = null,
    val country_code: String,
    val routing_code: String? = null,
    val iso_code: String? = null,
    val sort: String,
    val bank_name: String? = null,
    val ifsc: String? = null,
    val bic: String? = null
)
