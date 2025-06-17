package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.*

interface TransactionReceiptListener {
   fun onSuccess(response: TransactionReceiptResponse)
     fun onFailed(errorMessage: String)
}
