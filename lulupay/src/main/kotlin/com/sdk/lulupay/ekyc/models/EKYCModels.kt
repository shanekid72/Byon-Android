package com.sdk.lulupay.ekyc.models

/**
 * eKYC Configuration received from API 2
 */
data class EKYCConfiguration(
    val accessToken: String,
    val partnerId: String,
    val ocrConfig: OCRConfiguration,
    val livenessConfig: LivenessConfiguration,
    val workflowId: String,
    val expiryTime: Long
)

/**
 * OCR SDK Configuration
 */
data class OCRConfiguration(
    val apiKey: String,
    val endpoint: String,
    val supportedDocs: List<String>
)

/**
 * Face Liveness SDK Configuration
 */
data class LivenessConfiguration(
    val apiKey: String,
    val endpoint: String,
    val challenges: List<String>
)

/**
 * eKYC Configuration Request (API 2)
 */
data class EKYCConfigRequest(
    val partnerId: String,
    val customerType: String,
    val verificationType: String,
    val country: String,
    val documentTypes: List<String>
)

/**
 * OCR Analysis Result (API 3)
 */
data class OCRAnalysisResult(
    val documentType: String,
    val extractedData: Map<String, String>,
    val confidence: Double,
    val isValid: Boolean,
    val sessionId: String
)

/**
 * Face Liveness Result (API 4)
 */
data class FaceLivenessResult(
    val isLive: Boolean,
    val livenessScore: Double,
    val sessionId: String,
    val confidence: Double,
    val challenges: List<String>
)

/**
 * Identity Confirmation Data (API 5)
 */
data class IdentityConfirmationData(
    val customerNumber: String,
    val documentData: Map<String, String>,
    val biometricData: BiometricData,
    val riskScore: Double
)

/**
 * Biometric Data
 */
data class BiometricData(
    val faceImage: String,
    val livenessScore: Double,
    val challenges: List<String>
)

/**
 * Customer Details (API 7)
 */
data class CustomerDetails(
    val customerNumber: String,
    val kycStatus: String, // APPROVED, PENDING, REJECTED
    val verificationLevel: String,
    val approvedDate: Long?,
    val expiryDate: Long?,
    val riskLevel: String,
    val transactionLimits: TransactionLimits,
    val rejectionReason: String? = null
)

/**
 * Transaction Limits based on KYC level
 */
data class TransactionLimits(
    val dailyLimit: Double,
    val monthlyLimit: Double,
    val perTransactionLimit: Double
)

/**
 * OCR Document Analysis Result
 */
data class DocumentAnalysisResult(
    val extractedData: Map<String, String>,
    val confidence: Double
)

/**
 * Face Liveness Detection Result
 */
data class FaceLivenessDetectionResult(
    val livenessScore: Double,
    val faceImageBase64: String,
    val challenges: List<String>,
    val sessionId: String
)

/**
 * eKYC Workflow Status
 */
enum class EKYCStatus {
    NOT_STARTED,
    TOKEN_OBTAINED,
    CONFIG_RECEIVED,
    DOCUMENT_ANALYZED,
    LIVENESS_COMPLETED,
    IDENTITY_CONFIRMED,
    ADDITIONAL_INFO_REQUIRED,
    COMPLETED,
    FAILED
}

/**
 * Document Types supported
 */
enum class DocumentType(val value: String) {
    PASSPORT("PASSPORT"),
    NATIONAL_ID("NATIONAL_ID"),
    DRIVING_LICENSE("DRIVING_LICENSE"),
    RESIDENCE_PERMIT("RESIDENCE_PERMIT")
}

/**
 * eKYC Workflow Progress
 */
data class EKYCProgress(
    val currentStage: EKYCStatus,
    val completedSteps: List<EKYCStatus>,
    val remainingSteps: List<EKYCStatus>,
    val progressPercentage: Int
) 