package com.sdk.lulupay.service

import android.app.job.JobParameters
import android.app.job.JobService
import android.util.Log
import com.sdk.lulupay.preference.PreferencesHelper

class JobService : JobService() {

    /**
     * Called by the system when the job starts executing
     * Handles the initial execution of the job and any data passed to it
     * 
     * @param params JobParameters that contain job-specific information including extras bundle
     * @return true if there is more work being done on a separate thread,
     *         false if the job was completed synchronously
     */
    override fun onStartJob(params: JobParameters?): Boolean {
        // Retrieve data from the JobScheduler
        val receivedData = params?.extras?.getString("job_data")
        Log.d("MyJobService", "Job started with data: $receivedData")
        
        jobFinished(params, false)
        return true // Work is still being done in a background thread
    }

    /**
     * Called by the system if the job must be stopped before completion
     * Handles cleanup and determines if the job should be rescheduled
     *
     * @param params JobParameters that contain job-specific information
     * @return true if the job should be rescheduled based on the retry criteria,
     *         false if the job should be dropped
     */
    override fun onStopJob(params: JobParameters?): Boolean {
        Log.d("MyJobService", "Job stopped before completion")
        return true // Reschedule the job if stopped prematurely
    }
}