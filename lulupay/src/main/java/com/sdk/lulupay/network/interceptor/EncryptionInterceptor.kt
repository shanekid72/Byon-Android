package com.sdk.lulupay.network.interceptor

import com.sdk.lulupay.storage.SecureStorage
import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.Response
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class EncryptionInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val body = originalRequest.body

        // Read request body as a string
        val requestBodyString: String? = body?.let { itToString(it) }

        // Encrypt request data
        val (encryptedData, iv) = SecureStorage.encryptData(requestBodyString)

        // Create new JSON payload
        val encryptedJson = JSONObject().apply {
            put("ciphertext", encryptedData)
            put("iv", iv)
        }.toString()

        // Replace request body with encrypted data
        val encryptedBody = encryptedJson.toRequestBody("application/json".toMediaType())

        val encryptedRequest: Request = originalRequest.newBuilder()
            .method(originalRequest.method, encryptedBody)
            .build()

        return chain.proceed(encryptedRequest)
    }

    private fun itToString(body: okhttp3.RequestBody): String {
        val buffer = okio.Buffer()
        body.writeTo(buffer)
        return buffer.readUtf8()
    }
}
