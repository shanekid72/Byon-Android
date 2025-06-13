package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.*

interface StatusUpdateListener {
    /**
     * Called when the status update is successful
     * @param response The response containing the status update details
     */
    fun onSuccess(response: StatusUpdateResponse)

    /**
     * Called when the status update fails
     * @param errorMessage A string describing what went wrong
     */
    fun onFailed(errorMessage: String)
} 