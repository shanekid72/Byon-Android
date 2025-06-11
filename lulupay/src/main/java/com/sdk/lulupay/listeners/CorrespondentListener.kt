package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.CodeResponse

interface CorrespondentListener {
	/**
	 * Called when the correspondent operation is successful
	 * @param response The response containing the correspondent code details
	 */
	fun onSuccess(response: CodeResponse)

	/**
	 * Called when the correspondent operation fails
	 * @param errorMessage A string describing what went wrong
	 */
	fun onFailed(errorMessage: String)
}