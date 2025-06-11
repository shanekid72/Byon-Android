package com.sdk.lulupay.network.interfaces

import com.sdk.lulupay.model.request.body.*
import com.sdk.lulupay.model.response.*
import retrofit2.Call
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Field
import retrofit2.http.FormUrlEncoded
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {

  /**
   * Authenticates user and retrieves access token
   * @param contentType Content type header, defaults to application/x-www-form-urlencoded
   * @param requestId Unique request identifier
   * @param username User's username
   * @param password User's password
   * @param grantType Type of grant for authentication
   * @param clientId Client application identifier
   * @param scope Optional scope of access
   * @param clientSecret Client secret key
   * @return Response containing access token details
   */
  @FormUrlEncoded
  @POST("auth/realms/cdp/protocol/openid-connect/token")
  suspend fun getAccessToken(
      @Header("Content-Type") contentType: String = "application/x-www-form-urlencoded",
      @Header("X-REQUEST-ID") requestId: String,
      @Field("username") username: String,
      @Field("password") password: String,
      @Field("grant_type") grantType: String,
      @Field("client_id") clientId: String,
      @Field("scope") scope: String? = null,
      @Field("client_secret") clientSecret: String
  ): Response<AccessTokenResponse>

  /**
   * Creates a quote for remittance transaction
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Optional sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param request Quote request details
   * @return Quote response with rate and transaction details
   */
  @POST("/amr/ras/api/v1_0/ras/quote")
  fun createQuote(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String? = null,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Body request: QuoteRequest
  ): Call<QuoteResponse>

  /**
   * Creates a new remittance transaction
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Optional sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param request Transaction creation details
   * @return Response with created transaction details
   */
  @POST("/amr/ras/api/v1_0/ras/createtransaction")
  fun createTransaction(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String? = null,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Body request: CreateTransactionRequest
  ): Call<CreateTransactionResponse>

  /**
   * Confirms a created transaction
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Optional sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param request Transaction confirmation details
   * @return Response with confirmation status
   */
  @POST("/amr/ras/api/v1_0/ras/confirmtransaction")
  fun confirmTransaction(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String? = null,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Body request: ConfirmTransactionRequest
  ): Call<ConfirmTransactionResponse>

  /**
   * Authorizes clearance for a transaction
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Optional sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param request Authorization clearance details
   * @return Response with clearance status
   */
  @POST("amr/ras/authorize-clearance")
  fun authorizeClearance(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String? = null,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Body request: AuthorizationClearanceRequest
  ): Call<AuthorizationClearanceResponse>

  /**
   * Enquires about transaction status
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Optional sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param transaction_ref_number Transaction reference number to enquire about
   * @return Response with transaction status details
   */
  @GET("/amr/ras/api/v1_0/ras/enquire-transaction")
  fun enquireTransaction(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String? = null,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Query("transaction_ref_number") transaction_ref_number: String
  ): Call<EnquireTransactionResponse>

  /**
   * Updates BRN (Bank Reference Number) for a transaction
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Optional sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param request BRN update details
   * @return Response with update status
   */
  @POST("api/v1_0/ras/brn-update")
  fun updateBrn(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String? = null,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Body request: BrnUpdateRequest
  ): Call<BrnUpdateResponse>

  /**
   * Retrieves transaction receipt
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Optional sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param transaction_ref_number Transaction reference number
   * @return Response containing transaction receipt details
   */
  @GET("/amr/ras/api/v1_0/ras/transaction-receipt")
  fun getTransactionReceipt(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String? = null,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Query("transaction_ref_number") transaction_ref_number: String
  ): Call<TransactionReceiptResponse>

  /**
   * Cancels an existing transaction
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Optional sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param request Cancel transaction details
   * @return Response with cancellation status
   */
  @POST("api/v1_0/ras/canceltransaction")
  fun cancelTransaction(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String? = null,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Body request: CancelTransactionRequest
  ): Call<CancelTransactionResponse>

  /**
   * Updates transaction status
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Optional sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param request Status update details
   * @return Response with update status
   */
  @PUT("api/v1_0/paas/status-update")
  fun updateStatus(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String? = null,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Body request: StatusUpdateRequest
  ): Call<StatusUpdateResponse>

  // Callback Api
  // Code here. It will be hosted by partner

  /**
   * Retrieves master codes
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param code Optional code to filter
   * @param service_type Optional service type to filter
   * @return Response with code details
   */
  @GET("raas/masters/v1/codes")
  fun getCodes(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Query("code") code: String? = null,
      @Query("service_type") service_type: String? = null
  ): Call<CodeResponse>

  /**
   * Retrieves service corridor information
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param receiving_mode Optional receiving mode filter
   * @param receiving_country_code Optional receiving country code filter
   * @return Response with service corridor details
   */
  @GET("raas/masters/v1/service-corridor")
  fun getServiceCorridor(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Query("receiving_mode") receiving_mode: String? = null,
      @Query("receiving_country_code") receiving_country_code: String? = null
  ): Call<ServiceCorridorResponse>

  /**
   * Retrieves master bank information
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param countryCode Required receiving country code
   * @param receivingMode Optional receiving mode
   * @param correspondent Optional correspondent
   * @param page Optional page number for pagination
   * @param size Optional page size for pagination
   * @param bank_id Optional bank ID filter
   * @param bank_name Optional bank name filter
   * @return Response with master bank details
   */
  @GET("raas/masters/v1/banks")
  fun getMasterBanks(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Query("receiving_country_code") countryCode: String,
      @Query("receiving_mode") receivingMode: String? = null,
      @Query("correspondent") correspondent: String? = null,
      @Query("page") page: Int? = null,
      @Query("size") size: Int? = null,
      @Query("bank_id") bank_id: String? = null,
      @Query("bank_name") bank_name: String? = null
  ): Call<MasterBankResponse>

  /**
   * Retrieves details for a specific bank by ID
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param correspondent Optional correspondent filter
   * @param bankId Bank ID to retrieve details for
   * @return Response with bank details
   */
  @GET("raas/masters/v1/banks/{bankId}")
  fun getMasterBankById(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Query("correspondent") correspondent: String? = null,
      @Path("bankId") bankId: String
  ): Call<MasterBankDetailResponse>

  /**
   * Retrieves branches for a specific bank
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param bankId Bank ID to retrieve branches for
   * @param receivingCountryCode Receiving country code
   * @param receivingMode Receiving mode
   * @param page Page number for pagination
   * @param size Page size for pagination
   * @param correspondent Correspondent information
   * @param branch_id Optional branch ID filter
   * @param branch_name_part Optional branch name filter
   * @return Response with bank branch details
   */
  @GET("raas/masters/v1/banks/{bankId}/branches")
  fun getBankBranches(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Path("bankId") bankId: String,
      @Query("receiving_country_code") receivingCountryCode: String,
      @Query("receiving_mode") receivingMode: String,
      @Query("page") page: Int,
      @Query("size") size: Int,
      @Query("correspondent") correspondent: String,
      @Query("branch_id") branch_id: String? = null,
      @Query("branch_name_part") branch_name_part: String? = null
  ): Call<BankBranchResponse>

  /**
   * Retrieves details for a specific branch
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param bankId Bank ID the branch belongs to
   * @param branchId Branch ID to retrieve details for
   * @param correspondent Optional correspondent filter
   * @return Response with branch details
   */
  @GET("raas/masters/v1/banks/{bankId}/branches/{branchId}")
  fun getBranchDetails(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Path("bankId") bankId: String,
      @Path("branchId") branchId: String,
      @Query("correspondent") correspondent: String?
  ): Call<BranchDetailsResponse>

  /**
   * Searches for branches based on various criteria
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Optional sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param receivingCountryCode Receiving country code
   * @param isoCode Optional ISO code filter
   * @param page Optional page number for pagination
   * @param size Optional page size for pagination
   * @param correspondent Optional correspondent filter
   * @param receiving_mode Optional receiving mode filter
   * @param routing_code Optional routing code filter
   * @param code Optional sort code filter
   * @return Response with branch search results
   */
  @GET("raas/masters/v1/branches/lookup")
  fun searchBranch(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String? = null,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Query("receiving_country_code") receivingCountryCode: String,
      @Query("iso_code") isoCode: String? = null,
      @Query("page") page: Int? = null,
      @Query("size") size: Int? = null,
      @Query("correspondent") correspondent: String? = null,
      @Query("receiving_mode") receiving_mode: String? = null,
      @Query("routing_code") routing_code: String? = null,
      @Query("sort_code") code: String? = null
  ): Call<BranchSearchResponse>

  /**
   * Retrieves agent credit balance
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param payment_mode Optional payment mode filter
   * @return Response with agent credit balance details
   */
  @GET("raas/masters/v1/accounts/balance")
  fun getAgentCreditBalance(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Query("payment_mode") payment_mode: String? = null
  ): Call<AgentCreditBalanceResponse>

  /**
   * Retrieves exchange rates
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Optional sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param receiving_currency_code Optional receiving currency code filter
   * @param receiving_country_code Optional receiving country code filter
   * @param include_correspondents Optional flag to include correspondents
   * @param receiving_mode Optional receiving mode filter
   * @param correspondent Optional correspondent filter
   * @return Response with exchange rates
   */
  @GET("raas/masters/v1/rates")
  fun getRates(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String? = null,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Query("receiving_currency_code") receiving_currency_code: String? = null,
      @Query("receiving_country_code") receiving_country_code: String? = null,
      @Query("include_correspondents") include_correspondents: String? = null,
      @Query("receiving_mode") receiving_mode: String? = null,
      @Query("correspondent") correspondent: String? = null
  ): Call<RatesResponse>

  /**
   * Validates account information
   * @param authorization Bearer token for authentication
   * @param requestId Unique request identifier
   * @param sender Optional sender information
   * @param channel Optional channel information, defaults to Direct
   * @param company Optional company code, defaults to 784825
   * @param branch Optional branch code, defaults to 784826
   * @param receiving_country_code Receiving country code
   * @param receiving_mode Receiving mode
   * @param correspondent Optional correspondent
   * @param iso_code Optional ISO code
   * @param routing_code Optional routing code
   * @param sort_code Optional sort code
   * @param account_number Optional account number
   * @param iban Optional IBAN
   * @param bank_id Optional bank ID
   * @param branch_id Optional branch ID
   * @param first_name Optional first name
   * @param middle_name Optional middle name
   * @param last_name Optional last name
   * @return Response with account validation status
   */
  @GET("raas/masters/v1/accounts/validation")
  fun validateAccount(
      @Header("Authorization") authorization: String,
      @Header("X-REQUEST-ID") requestId: String,
      @Header("sender") sender: String? = null,
      @Header("channel") channel: String? = "Direct",
      @Header("company") company: String? = "784825",
      @Header("branch") branch: String? = "784826",
      @Query("receiving_country_code") receiving_country_code: String,
      @Query("receiving_mode") receiving_mode: String,
      @Query("correspondent") correspondent: String? = null,
      @Query("iso_code") iso_code: String? = null,
      @Query("routing_code") routing_code: String? = null,
      @Query("sort_code") sort_code: String? = null,
      @Query("account_number") account_number: String? = null,
      @Query("iban") iban: String? = null,
      @Query("bank_id") bank_id: String? = null,
      @Query("branch_id") branch_id: String? = null,
      @Query("first_name") first_name: String? = null,
      @Query("middle_name") middle_name: String? = null,
      @Query("last_name") last_name: String? = null
  ): Call<AccountValidationResponse>
}
