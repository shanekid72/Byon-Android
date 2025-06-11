package com.sdk.lulupay.model.response

import java.math.BigDecimal

data class QuoteResponse(val status: String,
val statusCode: Int,
val data: QuoteData
)

data class QuoteData(
val quote_id: String,
val created_at: String,
val created_at_gmt: String,
val expires_at: String,
val expires_at_gmt: String,
val receiving_country_code: String,
val receiving_currency_code: String,
val sending_country_code: String,
val sending_currency_code: String,
val sending_amount: BigDecimal,
val receiving_amount: BigDecimal,
val total_payin_amount: BigDecimal,
val fx_rates: List<FxRate>,
val fee_details: List<FeeDetail>,
val settlement_details: List<SettlementDetail>,
val correspondent_rules: List<CorrespondentRule>,
val price_guarantee: String
)

data class FxRate(
val cost_rate: BigDecimal? = null,
val rate: BigDecimal,
val base_currency_code: String,
val counter_currency_code: String,
val type: String
)

data class FeeDetail(
val type: String,
val model: String,
val currency_code: String,
val amount: BigDecimal,
val description: String? = null
)

data class SettlementDetail(
val charge_type: String,
val value: BigDecimal,
val currency_code: String
)

data class CorrespondentRule(
val field: String? = null,
val rule: String? = null
)