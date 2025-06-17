package com.sdk.lulupay.singleton

import com.sdk.lulupay.listeners.FinishActivityListener

object ActivityCloseManager {
    private val listeners = mutableListOf<FinishActivityListener>()

    /**
     * Registers a new activity listener to be notified when activities need to be closed
     * Adds the listener to the list of registered listeners that will be notified
     * @param listener The FinishActivityListener to register
     */
    fun registerListener(listener: FinishActivityListener) {
        listeners.add(listener)
    }

    /**
     * Unregisters an activity listener so it no longer receives close notifications
     * Removes the listener from the list of registered listeners
     * @param listener The FinishActivityListener to unregister
     */
    fun unregisterListener(listener: FinishActivityListener) {
        listeners.remove(listener)
    }

    /**
     * Closes all registered activities by notifying all listeners
     * Calls onFinishActivity() on each registered listener
     * Clears the listener list after notifying all activities
     */
    fun closeAll() {
        listeners.forEach { it.onFinishActivity() }
        listeners.clear() // Clear the list after closing activities
    }
}