package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.AgentCreditBalanceResponse

interface AvailableBalanceListener {
   /**
    * Called when the available balance operation is successful
    * @param response The response containing the agent's credit balance details
    */
   fun onSuccess(response: AgentCreditBalanceResponse)

   /**
    * Called when the available balance operation fails
    * @param errorMessage A string describing what went wrong
    */
   fun onFailed(errorMessage: String)
}
