package com.sdk.lulupay.network.interceptor

import com.sdk.lulupay.storage.SecureStorage
import okhttp3.Interceptor
import okhttp3.Response
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.json.JSONObject

class DecryptionInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val response = chain.proceed(chain.request())

        val responseBodyString = response.body?.string() ?: return response
        val jsonResponse = JSONObject(responseBodyString)

        val decryptedText = SecureStorage.decryptNetworkData(
            jsonResponse.getString("ciphertext"),
            jsonResponse.getString("iv")
        )

        return response.newBuilder()
            .body(decryptedText.toResponseBody("application/json".toMediaType()))
            .build()
    }
}
