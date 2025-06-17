package com.sdk.lulupay.preference

import android.content.Context
import android.content.SharedPreferences
import androidx.preference.PreferenceManager

/**
 * Helper class to manage SharedPreferences operations
 * Provides methods to save and retrieve different types of data
 */
class PreferencesHelper(context: Context) {

    var sharedPreferences: SharedPreferences

    init {
            sharedPreferences = PreferenceManager.getDefaultSharedPreferences(context)
    }

    fun getBoolean(key: String): Boolean {
        return sharedPreferences.getBoolean(key, true)
    }

    fun setBoolean(key: String, value: Boolean) {
        sharedPreferences.edit().putBoolean(key, value).apply()
    }

    /**
     * Saves an integer value to SharedPreferences
     * @param key The key to store the value under
     * @param value The integer value to store
     */
    fun save(key: String, value: Int) {
        sharedPreferences.edit().putInt(key, value).apply()
    }
    
    /**
     * Saves a Set of Strings to SharedPreferences
     * @param key The key to store the set under
     * @param set The Set of Strings to store
     */
    fun saveStringSet(key: String, set: Set<String>) {
        sharedPreferences.edit().putStringSet(key, set).apply()
    }
   
    /**
     * Retrieves a Set of Strings from SharedPreferences
     * @param key The key to retrieve the set from
     * @return The stored Set of Strings, or an empty set if not found
     */
    fun retrieveStringSet(key: String): Set<String> {
        return sharedPreferences.getStringSet(key, emptySet()) ?: emptySet()
    }

    /**
     * Gets a string from a stored Set at a specific index
     * @param key The key of the stored Set
     * @param index The index of the desired string in the Set
     * @return The string at the specified index, or null if index is out of bounds
     */
    fun getStringByIndex(key: String, index: Int): String? {
        val stringSet = retrieveStringSet(key)
        val list = stringSet.toList() // Convert the Set to a List
        return if (index >= 0 && index < list.size) {
            list[index] // Return the element at the specified index
        } else {
            null // Return null if the index is out of bounds
        }
    }
    
    /**
     * Gets the size of a stored String Set
     * @param key The key of the stored Set
     * @return The number of elements in the Set
     */
    fun getStringByIndexSize(key: String): Int{
        val stringSet = retrieveStringSet(key)
        val list = stringSet.toList() // Convert the Set to a List
        return list.size
    }

    /**
     * Retrieves an integer value from SharedPreferences
     * @param key The key to retrieve the value from
     * @return The stored integer value, or 0 if not found
     */
    fun retrieve(key: String): Int {
        return sharedPreferences.getInt(key, 0) // Return 0 as default if the key does not exist
    }
}