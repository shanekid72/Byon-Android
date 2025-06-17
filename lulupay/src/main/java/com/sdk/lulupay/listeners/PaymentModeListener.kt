package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.CodeResponse

interface PaymentModeListener {
	/**
	 * Called when the payment mode operation is successful
	 * @param response The response containing the payment mode code details
	 */
	fun onSuccess(response: CodeResponse)

	/**
	 * Called when the payment mode operation fails
	 * @param errorMessage A string describing what went wrong
	 */
	fun onFailed(errorMessage: String)
}