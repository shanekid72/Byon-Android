package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.*

interface ConfirmTransactionListener {
    /**
     * Called when the transaction confirmation is successful
     * @param response The response containing the transaction confirmation details
     */
    fun onSuccess(response: ConfirmTransactionResponse)

    /**
     * Called when the transaction confirmation fails
     * @param errorMessage A string describing what went wrong
     */
    fun onFailed(errorMessage: String)
}
