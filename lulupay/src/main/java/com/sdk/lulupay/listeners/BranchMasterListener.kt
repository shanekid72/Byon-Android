package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.*

interface BranchMasterListener {
	/**
	 * Called when the branch master operation is successful
	 * @param response The response containing the bank branch details
	 */
	fun onSuccess(response: BankBranchResponse)

	/**
	 * Called when the branch master operation fails
	 * @param errorMessage A string describing what went wrong
	 */
	fun onFailed(errorMessage: String)
}