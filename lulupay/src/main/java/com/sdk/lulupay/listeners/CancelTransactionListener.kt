package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.*

interface CancelTransactionListener {
    /**
     * Called when the transaction cancellation is successful
     * @param response The response containing the cancellation details
     */
    fun onSuccess(response: CancelTransactionResponse)

    /**
     * Called when the transaction cancellation fails
     * @param errorMessage A string describing what went wrong
     */
    fun onFailed(errorMessage: String)
} 