package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.RatesResponse

interface RatesListener {
    fun onSuccess(response: RatesResponse)
    fun onFailed(errorMessage: String)
}
