package com.sdk.lulupay.network.client

import com.sdk.lulupay.network.interceptor.DecryptionInterceptor
import com.sdk.lulupay.network.interceptor.EncryptionInterceptor
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit
import retrofit2.converter.gson.GsonConverterFactory

/**
 * Singleton object that provides a configured Retrofit instance for making API calls.
 * Contains configurations for logging, headers, timeouts and other network settings.
 */
object RetrofitClient {

  private const val BASE_URL = "https://drap-sandbox.digitnine.com/"

  /**
   * Logging interceptor that logs network requests and responses.
   * Set to BODY level to log the complete request/response including headers and body.
   * Other available levels are NONE, BASIC, HEADERS
   */
  private val loggingInterceptor =
      HttpLoggingInterceptor().apply {
        level =
            HttpLoggingInterceptor.Level
                .BODY
      }

  /**
   * Header interceptor that adds Content-Type header to all requests.
   * Adds "application/json" as the content type since we're working with JSON data.
   */
  private val headerInterceptor = Interceptor { chain ->
    val request = chain.request().newBuilder().addHeader("Content-Type", "application/json").build()
    chain.proceed(request)
  }

  /**
   * Configured OkHttpClient instance with custom timeouts and interceptors.
   * - Sets connect, read and write timeouts to 10000 seconds
   * - Adds header interceptor for Content-Type
   * - Adds logging interceptor for debugging
   */
  private val okHttpClient =
      OkHttpClient.Builder()
          .connectTimeout(30, TimeUnit.SECONDS)
          .readTimeout(30, TimeUnit.SECONDS)
          .writeTimeout(30, TimeUnit.SECONDS)
          .addInterceptor(headerInterceptor)
          .addInterceptor(loggingInterceptor)
          .build()

  /**
   * Configured Retrofit instance ready for creating API interfaces.
   * - Uses the defined BASE_URL
   * - Uses the configured okHttpClient
   * - Adds GSON converter factory for JSON serialization/deserialization
   */
  val retrofit =
      Retrofit.Builder()
          .baseUrl(BASE_URL)
          .client(okHttpClient)
          .addConverterFactory(GsonConverterFactory.create())
          .build()
 
}
