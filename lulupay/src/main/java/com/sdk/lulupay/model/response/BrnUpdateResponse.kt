package com.sdk.lulupay.model.response

data class BrnUpdateResponse(val status: String, val status_code: Int, val data: ResponseData3)

data class ResponseData3(val state: String, val sub_state: String)
