package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.*

interface TransactionTrackingListener {
    /**
     * Called when the transaction tracking is successful
     * @param response The response containing the real-time tracking details
     */
    fun onSuccess(response: TransactionTrackingResponse)

    /**
     * Called when the transaction tracking fails
     * @param errorMessage A string describing what went wrong
     */
    fun onFailed(errorMessage: String)
} 