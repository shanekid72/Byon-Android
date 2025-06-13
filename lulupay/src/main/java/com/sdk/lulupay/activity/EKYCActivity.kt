package com.sdk.lulupay.activity

import android.content.Intent
import android.graphics.Bitmap
import android.os.Bundle
import android.provider.MediaStore
import android.widget.Button
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import com.sdk.lulupay.R
import com.sdk.lulupay.ekyc.EKYCManager
import com.sdk.lulupay.ekyc.EKYCResultListener
import com.sdk.lulupay.ekyc.models.*
import com.sdk.lulupay.session.SessionManager

/**
 * EKYCActivity - Customer verification screen implementing 7-step eKYC flow
 * This is where customers complete identity verification before using remittance services
 */
class EKYCActivity : AppCompatActivity(), EKYCResultListener {

    private lateinit var progressBar: ProgressBar
    private lateinit var statusText: TextView
    private lateinit var instructionText: TextView
    private lateinit var documentImageView: ImageView
    private lateinit var captureDocumentButton: Button
    private lateinit var startLivenessButton: Button
    private lateinit var submitButton: Button
    
    private var currentStep = 1
    private var documentBitmap: Bitmap? = null
    private var ocrResult: OCRAnalysisResult? = null
    private var livenessResult: FaceLivenessResult? = null
    private var customerNumber: String = ""
    
    // Camera launcher for document capture
    private val documentCameraLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val imageBitmap = result.data?.extras?.get("data") as? Bitmap
            imageBitmap?.let {
                documentBitmap = it
                documentImageView.setImageBitmap(it)
                analyzeDocument(it)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ekyc)
        
        customerNumber = intent.getStringExtra("CUSTOMER_NUMBER") ?: "CUST${System.currentTimeMillis()}"
        
        initializeViews()
        setupClickListeners()
        startEKYCProcess()
    }
    
    private fun initializeViews() {
        progressBar = findViewById(R.id.progress_bar)
        statusText = findViewById(R.id.status_text)
        instructionText = findViewById(R.id.instruction_text)
        documentImageView = findViewById(R.id.document_image_view)
        captureDocumentButton = findViewById(R.id.capture_document_button)
        startLivenessButton = findViewById(R.id.start_liveness_button)
        submitButton = findViewById(R.id.submit_button)
        
        updateUI()
    }
    
    private fun setupClickListeners() {
        captureDocumentButton.setOnClickListener {
            captureDocumentPhoto()
        }
        
        startLivenessButton.setOnClickListener {
            performFaceLivenessCheck()
        }
        
        submitButton.setOnClickListener {
            confirmIdentity()
        }
    }
    
    /**
     * Start the complete eKYC process
     */
    private fun startEKYCProcess() {
        currentStep = 1
        updateProgress(10)
        updateStatus("Initializing eKYC verification...")
        updateInstructions("We need to verify your identity before you can send money. This process takes 2-3 minutes.")
        
        // Initialize eKYC Manager (APIs 1 & 2)
        EKYCManager.initialize(
            context = this,
            partnerId = SessionManager.partnerId ?: "default_partner",
            listener = this
        )
    }
    
    /**
     * Step 1: Capture and analyze document (API 3)
     */
    private fun captureDocumentPhoto() {
        val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        documentCameraLauncher.launch(intent)
    }
    
    private fun analyzeDocument(documentBitmap: Bitmap) {
        currentStep = 2
        updateProgress(30)
        updateStatus("Analyzing document...")
        updateInstructions("Please wait while we extract information from your document.")
        
        // API 3: OCR Document Analysis
        EKYCManager.analyzeDocument(
            context = this,
            documentBitmap = documentBitmap,
            documentType = "PASSPORT" // Can be determined automatically
        )
    }
    
    /**
     * Step 2: Perform face liveness check (API 4)
     */
    private fun performFaceLivenessCheck() {
        currentStep = 3
        updateProgress(60)
        updateStatus("Performing liveness check...")
        updateInstructions("Please follow the instructions on screen to verify you are a real person.")
        
        // API 4: Face Liveness Detection
        EKYCManager.performFaceLivenessCheck(this)
    }
    
    /**
     * Step 3: Confirm identity (API 5)
     */
    private fun confirmIdentity() {
        if (ocrResult == null || livenessResult == null) {
            showError("Please complete document capture and liveness check first")
            return
        }
        
        currentStep = 4
        updateProgress(80)
        updateStatus("Confirming identity...")
        updateInstructions("Verifying your identity with our security systems.")
        
        val identityData = IdentityConfirmationData(
            customerNumber = customerNumber,
            documentData = ocrResult!!.extractedData,
            biometricData = BiometricData(
                faceImage = "base64_face_image",
                livenessScore = livenessResult!!.livenessScore,
                challenges = livenessResult!!.challenges
            ),
            riskScore = calculateRiskScore()
        )
        
        // API 5: Confirm Identity
        EKYCManager.confirmIdentity(identityData)
    }
    
    private fun updateUI() {
        captureDocumentButton.isVisible = currentStep == 1
        startLivenessButton.isVisible = currentStep == 2 && ocrResult != null
        submitButton.isVisible = currentStep >= 3 && ocrResult != null && livenessResult != null
    }
    
    private fun updateProgress(progress: Int) {
        progressBar.progress = progress
    }
    
    private fun updateStatus(status: String) {
        statusText.text = status
    }
    
    private fun updateInstructions(instructions: String) {
        instructionText.text = instructions
    }
    
    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
    
    private fun calculateRiskScore(): Double {
        val docConfidence = ocrResult?.confidence ?: 0.0
        val livenessScore = livenessResult?.livenessScore ?: 0.0
        return 1.0 - ((docConfidence + livenessScore) / 2.0)
    }
    
    // eKYC Result Listener Implementation
    
    override fun onEKYCConfigurationReceived(config: EKYCConfiguration) {
        runOnUiThread {
            updateStatus("eKYC configured successfully")
            updateInstructions("Please capture a photo of your government-issued ID")
            captureDocumentButton.isVisible = true
        }
    }
    
    override fun onDocumentAnalyzed(result: OCRAnalysisResult) {
        runOnUiThread {
            this.ocrResult = result
            updateProgress(40)
            updateStatus("Document analyzed successfully")
            
            if (result.confidence > 0.8) {
                updateInstructions("Document verified! Now we need to verify that you are a real person.")
                startLivenessButton.isVisible = true
            } else {
                updateInstructions("Document quality is low. Please retake the photo.")
                captureDocumentButton.isVisible = true
            }
        }
    }
    
    override fun onFaceLivenessCompleted(result: FaceLivenessResult) {
        runOnUiThread {
            this.livenessResult = result
            updateProgress(70)
            updateStatus("Liveness check completed")
            
            if (result.isLive) {
                updateInstructions("Identity verification complete! Click submit to finish.")
                submitButton.isVisible = true
            } else {
                updateInstructions("Liveness check failed. Please try again.")
                startLivenessButton.isVisible = true
            }
        }
    }
    
    override fun onAdditionalInfoRequired(requiredFields: List<String>) {
        runOnUiThread {
            updateStatus("Additional information required")
            val additionalData = mapOf(
                "EMPLOYMENT_STATUS" to "EMPLOYED",
                "INCOME_SOURCE" to "SALARY"
            )
            EKYCManager.provideAdditionalInformation(customerNumber, additionalData)
        }
    }
    
    override fun onEKYCCompleted(customerDetails: CustomerDetails) {
        runOnUiThread {
            updateProgress(100)
            updateStatus("eKYC completed successfully!")
            showSuccessDialog(customerDetails)
        }
    }
    
    override fun onEKYCPending(customerDetails: CustomerDetails) {
        runOnUiThread {
            updateProgress(90)
            updateStatus("eKYC under review")
            showPendingDialog()
        }
    }
    
    override fun onEKYCRejected(reason: String) {
        runOnUiThread {
            updateStatus("eKYC verification failed")
            showRejectedDialog(reason)
        }
    }
    
    override fun onEKYCError(error: String) {
        runOnUiThread {
            updateStatus("eKYC error occurred")
            showError("Error: $error")
        }
    }
    
    override fun onEKYCProgress(stage: String, progress: Int) {
        runOnUiThread {
            updateProgress(progress)
            updateStatus(stage)
        }
    }
    
    private fun showSuccessDialog(customerDetails: CustomerDetails) {
        AlertDialog.Builder(this)
            .setTitle("Identity Verified!")
            .setMessage("Your identity has been successfully verified.\n\nDaily Limit: $${customerDetails.transactionLimits.dailyLimit}")
            .setPositiveButton("Continue") { _, _ ->
                val intent = Intent(this, RemittanceScreen::class.java)
                intent.putExtra("CUSTOMER_NUMBER", customerNumber)
                intent.putExtra("KYC_STATUS", "APPROVED")
                startActivity(intent)
                finish()
            }
            .setCancelable(false)
            .show()
    }
    
    private fun showPendingDialog() {
        AlertDialog.Builder(this)
            .setTitle("Verification Under Review")
            .setMessage("Your verification is being reviewed. You will be notified within 24 hours.")
            .setPositiveButton("OK") { _, _ -> finish() }
            .setCancelable(false)
            .show()
    }
    
    private fun showRejectedDialog(reason: String) {
        AlertDialog.Builder(this)
            .setTitle("Verification Failed")
            .setMessage("Reason: $reason")
            .setPositiveButton("Try Again") { _, _ -> startEKYCProcess() }
            .setNegativeButton("Contact Support") { _, _ -> finish() }
            .setCancelable(false)
            .show()
    }
}
