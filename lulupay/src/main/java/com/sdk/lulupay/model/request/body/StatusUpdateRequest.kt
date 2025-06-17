package com.sdk.lulupay.model.request.body

data class StatusUpdateRequest(val transaction_ref_number: Long, val status: String)
