package com.sdk.lulupay.model.response

data class StatusUpdateResponse(val status: String, val status_code: Int, val data: ResponseData)

data class ResponseData(val status: String)
