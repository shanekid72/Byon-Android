package com.sdk.lulupay.listeners

interface FinishActivityListener {
    /**
     * Called when an activity needs to be finished/closed
     * This callback allows the implementing class to handle activity completion
     */
    fun onFinishActivity()
}
