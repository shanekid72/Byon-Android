package com.sdk.lulupay.timer

import android.os.CountDownTimer

class Timer {
  companion object {
    private var countDownTimer: CountDownTimer? = null
    var isRunning = false
      private set // Make setter private to prevent external modification

    /**
     * Starts a countdown timer with specified duration and interval
     * Creates new timer only if not already running
     * @param totalTimeInMillis Total duration of timer in milliseconds
     * @param intervalInMillis Interval between ticks in milliseconds
     */
    fun start(totalTimeInMillis: Long, intervalInMillis: Long) {
      if (isRunning) return // Prevent multiple starts

      countDownTimer =
          object : CountDownTimer(totalTimeInMillis, intervalInMillis) {
                override fun onTick(millisUntilFinished: Long) {
                  // Add any functionality for each tick
                }

                override fun onFinish() {
                  isRunning = false
                }
              }
              .start()
      isRunning = true
    }

    /**
     * Stops the currently running timer
     * Cancels countdown, resets timer object and running state
     */
    fun stop() {
      countDownTimer?.cancel() // Safely handle nullability
      countDownTimer = null
      isRunning = false
    }
  }
}
