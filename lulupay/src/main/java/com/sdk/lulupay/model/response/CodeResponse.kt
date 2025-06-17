package com.sdk.lulupay.model.response

data class CodeResponse(val status: String,
val status_code: Int,
val data: Data2
)

// Nested Data Class
data class Data2(
val relationships: List<CodeName>,
val id_types: List<CodeName>,
val sources_of_incomes: List<CodeName>,
val purposes_of_transactions: List<CodeName>,
val professions: List<CodeName>,
val account_types: List<CodeName>,
val payment_modes: List<CodeName>,
val visa_types: List<CodeName>,
val instruments: List<CodeName>,
val address_types: List<CodeName>,
val receiving_modes: List<CodeName>,
val fee_types: List<CodeName>,
val transaction_states: List<TransactionState>,
val income_types: List<CodeName>,
val income_range_types: List<CodeName>,
val cancel_reason_codes: List<CodeName>,
val transaction_count_per_month: List<CodeName>,
val transaction_volume_per_month: List<CodeName>,
val correspondents: List<CodeName>,
val business_types: List<CodeName>,
val document_types: List<CodeName>,
val proof_content_types: List<CodeName>
)

// Generic Class for Code and Name
data class CodeName(
val code: String,
val name: String
)

// Class for Transaction State with Sub-States
data class TransactionState(
val state: String,
val sub_states: List<CodeName>
)