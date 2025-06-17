package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.CodeResponse

interface AccountTypeListener {
	/**
	 * Called when the account type operation is successful
	 * @param response The response containing the account type code and details
	 */
	fun onSuccess(response: CodeResponse)

	/**
	 * Called when the account type operation fails
	 * @param errorMessage A string describing what went wrong
	 */
	fun onFailed(errorMessage: String)
}