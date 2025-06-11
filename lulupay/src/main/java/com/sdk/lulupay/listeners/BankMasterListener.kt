package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.MasterBankResponse

interface BankMasterListener {
  /**
   * Called when the bank master operation is successful
   * @param response The response containing the master bank details
   */
  fun onSuccess(response: MasterBankResponse)

  /**
   * Called when the bank master operation fails
   * @param errorMessage A string describing what went wrong
   */
  fun onFailed(errorMessage: String)
}
