package com.sdk.lulupay.activity

import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import com.rajat.pdfviewer.PdfRendererView
import com.sdk.lulupay.R
import com.sdk.lulupay.theme.ThemeManager
import java.io.File

/**
 * PdfViewScreen Activity
 * This activity handles displaying PDF files:
 * - Receives PDF file path from intent
 * - Initializes PDF viewer component
 * - Loads and displays local PDF files
 * - Handles file validation and error cases
 */
class PdfViewScreen : AppCompatActivity() {
    private lateinit var pdfView: PdfRendererView

    /**
     * Initializes the activity and sets up PDF viewing:
     * - Sets content view layout
     * - Finds PDF viewer component
     * - Gets PDF file path from intent
     * - Validates file exists
     * - Loads PDF if valid, shows error if invalid
     * @param savedInstanceState Bundle containing activity's previously saved state
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pdf_view_screen)

        pdfView = findViewById(R.id.pdfView)

        val filePath = intent.getStringExtra("pdf_path")

        if (filePath != null) {
            val file = File(filePath)
            if (file.exists()) {
                pdfView.initWithFile(file) // Load the local PDF file
            } else {
                Log.e("PDF Viewer", "File does not exist: $filePath")
            }
        } else {
            Log.e("PDF Viewer", "No file path received!")
        }
    }
}
