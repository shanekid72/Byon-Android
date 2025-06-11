package com.hackathon.lulupay

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.AppCompatButton
import com.hackathon.lulupay.R
import com.sdk.lulupay.activity.RemittanceScreen

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val intent = Intent(
            this@MainActivity,
            RemittanceScreen::class.java
        )
        // Pass the theme decision
        intent.putExtra("USE_MAIN_APP_THEME", true)

        // Pass the logo resource (if drawable resource ID)
        intent.putExtra("LOGO_RES_ID", R.drawable.logo_test)


        val btn: AppCompatButton = findViewById(R.id.btnPayment);
        btn.setOnClickListener {
            startActivity(intent)
        }
    }
}