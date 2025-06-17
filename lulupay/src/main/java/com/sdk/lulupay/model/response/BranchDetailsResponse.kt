package com.sdk.lulupay.model.response

data class BranchDetailsResponse(val status: String, val status_code: Int, val data: BranchDetails2)

data class BranchDetails2(
    val bank_id: String,
    val branch_id: String,
    val branch_name: String,
    val branch_full_name: String,
    val address: String? = null,
    val country_code: String,
    val routing_code: String? = null,
    val bic: String? = null,
    val iso_code: String? = null,
    val sort: String? = null,
    val bank_name: String? = null,
    val town_name: String? = null,
    val country_subdivision: String? = null,
    val ifsc: String? = null
)
