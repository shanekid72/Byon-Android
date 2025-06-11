package com.sdk.lulupay.model.response

data class AgentCreditBalanceResponse(
    val status: String,
    val statusCode: Int,
    val data: List<BalanceData>
)

data class BalanceData(val closingBalance: Long, val currency: String)
