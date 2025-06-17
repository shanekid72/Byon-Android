package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.*

interface TransactionListener {
     fun onSuccess(response: CreateTransactionResponse)
     fun onFailed(errorMessage: String)
}
