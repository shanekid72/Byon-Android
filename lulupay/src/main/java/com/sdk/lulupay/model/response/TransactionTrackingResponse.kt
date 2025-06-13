package com.sdk.lulupay.model.response

/**
 * Response model for real-time transaction tracking
 */
data class TransactionTrackingResponse(
    val status: String,
    val statusCode: Int,
    val data: TransactionTrackingData
)

data class TransactionTrackingData(
    val transactionRefNumber: String,
    val currentStatus: String,
    val statusHistory: List<TransactionStatusEvent>,
    val estimatedCompletion: String?,
    val lastUpdated: String,
    val progressPercentage: Int
)

data class TransactionStatusEvent(
    val status: String,
    val timestamp: String,
    val description: String,
    val location: String?
) 