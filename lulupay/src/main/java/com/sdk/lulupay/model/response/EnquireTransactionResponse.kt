package com.sdk.lulupay.model.response

import java.util.Date
import java.math.BigDecimal

class EnquireTransactionResponse(
    val status: String,
    val statusCode: Int,
    val data: TransactionData
)

data class TransactionData(
    val state: String,
    val sub_state: String,
    val transaction_gmt_date: String,
    val transaction_date: String,
    val type: String,
    val instrument: String,
    val source_of_income: String,
    val purpose_of_txn: String,
    val message: String,
    val sender: Sender,
    val receiver: Receiver,
    val transaction: Transaction
)

data class Sender(
    val mobile_number: String? = null,
    val customer_number: String,
    val email: String? = null,
    val first_name: String? = null,
    val last_name: String? = null,
    val date_of_birth: String? = null,
    val countryOfBirth: String? = null,
    val gender: String? = null,
    val nationality: String? = null,
    val professionCode: String? = null,
    val employer: String? = null,
    val visaTypeCode: String? = null,
    val sender_address: List<Address>? = null
)

data class Receiver(
    val agent_receiver_id: String? = null,
    val mobile_number: String,
    val first_name: String,
    val middle_name: String,
    val last_name: String,
    val dateOfBirth: String? = null,
    val gender: String? = null,
    val receiverAddress: List<Address>? = null,
    val nationality: String,
    val relation_code: String,
    val bank_details: BankDetails? = null,
    val cashpickup_details: CashPickupDetails? = null,
    val mobilewallet_details: MobileWalletDetails? = null
)

data class Address(
    val addressType: String? = null,
    val addressLine: String? = null,
    val streetName: String? = null,
    val buildingNumber: String? = null,
    val postCode: String? = null,
    val pobox: String? = null,
    val townName: String? = null,
    val countrySubdivision: String? = null,
    val countryCode: String? = null
)

data class BankDetails(
    val account_type: String,
    val account_number: String? = null,
    val iso_code: String? = null,
    val routing_code: String? = null,
    val iban: String? = null
)

data class CashPickupDetails(
    val correspondent: String? = null,
    val correspondent_id: String? = null,
    val correspondent_location_id: String? = null
)

data class MobileWalletDetails(
    val wallet_id: String? = null, 
    val correspondent: String? = null,
	val bank_id: String? = null,
	val branch_id: String? = null)

data class Transaction(
    val quote_id: String,
    val channel_quote_id: String? = null,
    val agent_transaction_ref_number: String? = null,
    val receiving_mode: String,
    val payment_mode: String? = null,
    val sending_country_code: String? = null,
    val receiving_country_code: String,
    val sending_currency_code: String,
    val receiving_currency_code: String,
    val sending_amount: BigDecimal,
    val receiving_amount: BigDecimal,
    val total_payin_amount: BigDecimal? = null,
    val fxRates: List<FxRate2>? = null,
    val feeDetails: List<FeeDetail2>? = null,
    val settlementDetails: List<SettlementDetail2>? = null
)

data class FxRate2(
    val rate: BigDecimal? = null,
    val baseCurrencyCode: String? = null,
    val counterCurrencyCode: String? = null,
    val type: String
)

data class FeeDetail2(
    val type: String? = null,
    val model: String? = null,
    val amount: BigDecimal? = null,
    val description: String? = null,
    val currencyCode: String? = null
)

data class SettlementDetail2(val chargeType: String? = null, val value: BigDecimal? = null, val currencyCode: String? = null)
