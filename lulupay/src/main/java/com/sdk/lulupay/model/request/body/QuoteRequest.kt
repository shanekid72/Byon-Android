package com.sdk.lulupay.model.request.body

import java.math.BigDecimal

/**
 * Request class for getting a quote for money transfer
 * Contains details about:
 * - Source and destination countries/currencies
 * - Transfer amounts and modes
 * - Payment type and instrument
 * - Routing and correspondent details
 * Used to get exchange rates and fees for a potential transfer
 */
data class QuoteRequest(
    val sending_country_code: String,
    val sending_currency_code: String,
    val receiving_country_code: String,
    val receiving_currency_code: String,
    val sending_amount: BigDecimal,
    val receiving_amount: BigDecimal? = null,
    val receiving_mode: String,
    val type: String,
    val instrument: String,
    val iso_code: String? = null, // Optional field
    val routing_code: String? = null, // Optional field
    val payment_mode: String,
    val correspondent: String? = null, // Optional field
    val correspondent_id: String? = null, // Optional field
    val correspondent_location_id: String? = null, // Optional field
    val service_type: String? = "C2C"
)
