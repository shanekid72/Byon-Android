package com.sdk.lulupay.listeners

import com.sdk.lulupay.model.response.*

interface ServiceCorridorListener {
  fun onSuccess(response: ServiceCorridorResponse)

  fun onFailed(errorMessage: String)
}
