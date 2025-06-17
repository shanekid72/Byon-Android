package com.sdk.lulupay.utils;

import android.app.job.JobInfo
import android.app.job.JobScheduler
import android.content.ComponentName
import android.content.Context
import com.sdk.lulupay.service.JobService
import android.util.Log
import android.os.Build
import android.os.Bundle
import android.os.PersistableBundle
import com.sdk.lulupay.preference.PreferencesHelper

class Utils{
 companion object{
 
 var index: Int = 0
  
  /**
   * Gets transaction reference number from preferences based on index
   * Resets index to 0 if it exceeds available numbers
   * @param context Android context
   * @return Transaction reference number string
   */
  fun getTransactionNumber(context: Context): String{
    val prefs = PreferencesHelper(context)
    
   if(prefs.getStringByIndexSize("TRSNSACTION_REF_NO") > index){
   index = 0
   }
   
   val value: String = prefs.getStringByIndex("TRSNSACTION_REF_NO",index) ?: ""
   index = index + 1
   return value
  }

  /**
   * Schedules a periodic background job that runs every 15 minutes
   * Job requires network connectivity and persists across reboots
   * @param context Android context used to access JobScheduler
   */
  fun scheduleJob(context: Context) {
    val jobScheduler = context.getSystemService(JobScheduler::class.java)

    val componentName = ComponentName(context, JobService::class.java)
    
    // Pass data to JobService
    val extras = PersistableBundle()
    extras.putString("TRANSACTION_REF_NO", "")

    val jobInfo = JobInfo.Builder(1, componentName)
        .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY) // Requires any network connection
        .setPersisted(true) // Ensure job survives device reboot (Requires RECEIVE_BOOT_COMPLETED permission)
        .setPeriodic(15 * 60 * 1000L) // Run every 15 minutes
        .setExtras(extras) // Pass the data
        .build()

    val resultCode = jobScheduler.schedule(jobInfo)
    if (resultCode == JobScheduler.RESULT_SUCCESS) {
        Log.d("JobScheduler", "Job scheduled successfully")
    } else {
        Log.d("JobScheduler", "Job scheduling failed")
    }
  }
}
}