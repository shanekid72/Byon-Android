package com.sdk.lulupay.session

/**
 * Manages session data for authentication and API requests
 * Stores credentials and configuration needed for accessing protected resources
 * Implemented as a singleton object to maintain single source of truth
 */
object SessionManager {
  var username: String? = null
  var password: String? = null
  var grantType: String? = null
  var clientId: String? = null
  var scope: String? = null
  var clientSecret: String? = null
  var partnerName: String? = null

  /**
   * Clears all session data
   * Used for logging out or invalidating the current session
   * Sets all credentials and configuration values to null
   */
  fun clearSession() {
    username = null
    password = null
    grantType = null
    clientId = null
    scope = null
    clientSecret = null
  }
}
