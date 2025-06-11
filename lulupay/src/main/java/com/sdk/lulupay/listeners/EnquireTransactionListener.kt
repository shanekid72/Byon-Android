package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.EnquireTransactionResponse

interface EnquireTransactionListener {
    /**
     * Called when the transaction enquiry operation is successful
     * @param response The response containing the transaction enquiry details
     */
    fun onSuccess(response: EnquireTransactionResponse)

    /**
     * Called when the transaction enquiry operation fails
     * @param errorMessage A string describing what went wrong
     */
    fun onFailed(errorMessage: String)
}
