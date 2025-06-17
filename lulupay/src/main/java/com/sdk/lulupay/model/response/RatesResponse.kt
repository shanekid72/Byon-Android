package com.sdk.lulupay.model.response

import java.math.BigDecimal

data class RatesResponse(val status: String, val statusCode: Int, val data: RateData)

data class RateData(val rates: List<Rate>)

data class Rate(
    val rate: BigDecimal,
    val to_currency_name: String,
    val to_currency: String,
    val from_currency: String,
    val to_country_name: String,
    val to_country: String,
    val receiving_mode: String,
    val correspondent: String? = null,
    val anywhere: Int? = null,
    val correspondent_name: String? = null
)
