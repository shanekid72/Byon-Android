package com.sdk.lulupay.requestId

import java.util.UUID

class RequestId {
  companion object {
    /**
     * Generates a unique request ID using UUID
     * Used to track API requests and ensure idempotency
     * @return A randomly generated UUID string that can be used as a request identifier
     */
    fun generateRequestId(): String {
      return UUID.randomUUID().toString()
    }
  }
}
