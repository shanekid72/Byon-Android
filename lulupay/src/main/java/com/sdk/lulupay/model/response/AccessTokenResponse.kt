package com.sdk.lulupay.model.response

import com.google.gson.annotations.SerializedName

data class AccessTokenResponse(
    val access_token: String,
    val token_type: String,
    val expires_in: Int,
    val refresh_expires_in: Int? = null,
    val refresh_token: String? = null,
    @SerializedName("not-before-policy") val NotBeforePolicy: Int? = null,
    val session_state: String? = null,
    val scope: String
)
