package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.*

interface AuthorizationClearanceListener {
    /**
     * Called when the authorization clearance is successful
     * @param response The response containing the clearance authorization details
     */
    fun onSuccess(response: AuthorizationClearanceResponse)

    /**
     * Called when the authorization clearance fails
     * @param errorMessage A string describing what went wrong
     */
    fun onFailed(errorMessage: String)
} 