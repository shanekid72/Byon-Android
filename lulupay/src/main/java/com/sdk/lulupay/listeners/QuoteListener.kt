package com.sdk.lulupay.listeners;

import com.sdk.lulupay.model.response.*

interface QuoteListener {
     fun onSuccess(response: QuoteResponse)
     fun onFailed(errorMessage: String)
}
