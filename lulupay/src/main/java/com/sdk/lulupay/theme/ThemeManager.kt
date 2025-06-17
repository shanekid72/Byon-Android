package com.sdk.lulupay.theme

import com.sdk.lulupay.R

class ThemeManager {
    companion object {
        var isDarkMode: Boolean = false
        fun setTheme(isDarkMode: Boolean) {
            this.isDarkMode = isDarkMode
        }

        fun getTheme(): Int {
            return if (isDarkMode) {
                R.style.DarkTheme
            } else {
                R.style.LightTheme
            }
        }
    }
}