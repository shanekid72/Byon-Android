package com.sdk.lulupay.model.response

import java.math.BigDecimal

data class ServiceCorridorResponse(val status: String,
val status_code: Int,
val data: List<RemittanceDetail>
)

data class RemittanceDetail(
val instrument: String,
val transaction_type: String,
val receiving_mode: String,
val sending_country: String,
val sending_country_code: String,
val receiving_country: String,
val receiving_country_code: String,
val limit_currency: String,
val limit_currency_code: String,
val limit_min_amount: BigDecimal,
val limit_per_transaction: BigDecimal,
val send_min_amount: BigDecimal,
val send_max_amount: BigDecimal,
val corridor_currencies: List<CorridorCurrency>
)

data class CorridorCurrency(
val correspondent: String,
val anywhere: Int? = null,
val sending_currency: String,
val sending_currency_code: String,
val receiving_currency: String,
val receiving_currency_code: String,
val correspondent_name: String
)