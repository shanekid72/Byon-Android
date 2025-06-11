package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.AccountValidationResponse

interface ValidateAccountListener {
	fun onSuccess(response: AccountValidationResponse)
	fun onFailed(errorMessage: String)
}