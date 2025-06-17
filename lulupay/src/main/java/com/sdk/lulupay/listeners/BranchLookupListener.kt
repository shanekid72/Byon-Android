package com.sdk.lulupay.listeners;

import com.sdk.lulupay.model.response.*

interface BranchLookupListener {
  /**
   * Called when the branch lookup operation is successful
   * @param response The response containing the branch search results
   */
  fun onSuccess(response: BranchSearchResponse)

  /**
   * Called when the branch lookup operation fails
   * @param errorMessage A string describing what went wrong
   */
  fun onFailed(errorMessage: String)
}