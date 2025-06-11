package com.sdk.lulupay.remittance

import com.sdk.lulupay.listeners.*
import com.sdk.lulupay.model.request.body.*
import com.sdk.lulupay.network.client.RetrofitClient
import com.sdk.lulupay.network.interfaces.ApiService
import com.sdk.lulupay.requestId.RequestId
import com.sdk.lulupay.session.SessionManager
import com.sdk.lulupay.timer.Timer
import com.sdk.lulupay.token.AccessToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.math.BigDecimal

class Remittance {
  companion object {
  
  /**
   * Enquires about a transaction using its reference number
   * Makes an API call to get transaction details
   * @param transactionRefNo The reference number of the transaction to enquire about
   * @param listener Callback interface to handle success/failure responses
   */
  suspend fun enquireTransaction(transactionRefNo: String, listener: EnquireTransactionListener){
    try{
    val apiService = RetrofitClient.retrofit.create(ApiService::class.java)
    
         // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }
            
            
            val response =
            withContext(Dispatchers.IO) {
              apiService
                  .enquireTransaction(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      transaction_ref_number = transactionRefNo)
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
  
  }catch(e: Exception){
    listener.onFailed("Unexpected error: ${e.message}")
    }
  }
  
  /**
   * Gets the receipt for a completed transaction
   * Makes an API call to retrieve transaction receipt details
   * @param transactionRefNo The reference number of the transaction
   * @param listener Callback interface to handle success/failure responses
   */
  suspend fun getTransactionReceipt(transactionRefNo: String, listener: TransactionReceiptListener){
  try{
    val apiService = RetrofitClient.retrofit.create(ApiService::class.java)
    
         // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }
            
            
            val response =
            withContext(Dispatchers.IO) {
              apiService
                  .getTransactionReceipt(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      transaction_ref_number = transactionRefNo)
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
  
  }catch(e: Exception){
    listener.onFailed("Unexpected error: ${e.message}")
    }
  
  }
  
  /**
   * Confirms a transaction after it has been initiated
   * Makes an API call to confirm the transaction with bank reference
   * @param transactionRefNo The reference number of the transaction to confirm
   * @param bankRefNo Optional bank reference number
   * @param listener Callback interface to handle success/failure responses
   */
  suspend fun confirmTransaction(transactionRefNo: String, bankRefNo: String?, listener: ConfirmTransactionListener){
    try{
      val apiService = RetrofitClient.retrofit.create(ApiService::class.java)
        
        val confirmTransaction = ConfirmTransactionRequest(
            transaction_ref_number = transactionRefNo,
            bank_ref_number = bankRefNo
        )
      
            // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }
            
            
            val response =
            withContext(Dispatchers.IO) {
              apiService
                  .confirmTransaction(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      request = confirmTransaction)
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
      
    }catch(e: Exception){
    listener.onFailed("Unexpected error: ${e.message}")
    }
  }
  
  /**
   * Creates a new transaction with the provided details
   * Makes an API call to create a new remittance transaction
   * @param instrument The payment instrument to use
   * @param customerNumber Customer number of the sender
   * @param agentCustomerNumber Agent's customer number
   * @param mobileNo Recipient's mobile number
   * @param firstName Recipient's first name
   * @param middleName Recipient's middle name
   * @param lastName Recipient's last name
   * @param nationality Recipient's nationality
   * @param accountTypeCode Type of account for bank transfers
   * @param accountNo Optional account number for bank transfers
   * @param isoCode Optional ISO code
   * @param iban Optional IBAN number
   * @param routingCode Optional routing code
   * @param walletId Optional wallet ID for mobile wallet transfers
   * @param receivingMode Mode of receiving the money (BANK/MOBILEWALLET/CASHPICKUP)
   * @param correspondent Optional correspondent details
   * @param bankId Optional bank ID
   * @param branchId Optional branch ID
   * @param quoteId Quote ID for the transaction
   * @param agentTransactionRefNumber Agent's transaction reference number
   * @param listener Callback interface to handle success/failure responses
   */
  suspend fun createTransaction(instrument: String, customerNumber: String, agentCustomerNumber: String, mobileNo: String, firstName: String, middleName: String, lastName: String, nationality: String, accountTypeCode: String, accountNo: String?, isoCode: String?, iban: String?, routingCode: String?, walletId: String?, receivingMode: String, correspondent: String?, bankId: String?, branchId: String?, quoteId: String, agentTransactionRefNumber: String, listener: TransactionListener){
  try{
  val apiService = RetrofitClient.retrofit.create(ApiService::class.java)
  
  //Sender data request class
    val sender = Sender(
        customer_number = customerNumber,
        agent_customer_number = agentCustomerNumber
    )
    
    // Receiver data request class
    val receiver = Receiver(
        mobile_number = mobileNo,
        first_name = firstName,
        last_name = lastName,
        middle_name = middleName,
        nationality = nationality,
        relation_code = "32",
        bank_details = if(receivingMode.contains("BANK")){
         BankDetails(
            account_type_code = accountTypeCode,
            account_number = accountNo,
            iso_code = isoCode,
            iban = iban,
            routing_code = routingCode)
            }else{
            null
            },
        mobileWallet_details = if(receivingMode.contains("MOBILEWALLET")){ 
        MobileWalletDetails(
            wallet_id = walletId,
            correspondent = correspondent,
            bank_id = bankId,
            branch_id = branchId)
            }else{
            null
            },
        cashPickup_details = if(receivingMode.contains("CASHPICKUP")){
        CashPickupDetails(
            correspondent_id = bankId,
            correspondent = correspondent,
            correspondent_location_id = branchId
        )}else{
        null
        }
    )
    
    // Transaction request data class
    val transaction = Transaction(
        quote_id = quoteId,
        agent_transaction_ref_number = agentTransactionRefNumber
    )
    
    // Create Transaction Request data class
    val createTransactionRequest = CreateTransactionRequest(
        type = "SEND",
        source_of_income = "SLRY",
        purpose_of_txn = "SAVG",
        instrument = instrument,
        message = "Agency Transaction",
        sender = sender,
        receiver = receiver,
        transaction = transaction
    )

         // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }
            
            
            val response =
            withContext(Dispatchers.IO) {
              apiService
                  .createTransaction(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      request = createTransactionRequest)
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
            
  }catch(e: Exception){
  listener.onFailed("Unexpected error: ${e.message}")
  }
  }
  
  /**
   * Creates a quote for a remittance transaction
   * Makes an API call to get quote details for a transaction
   * @param sendingCountryCode Country code of sender
   * @param sendingCurrencyCode Currency code of sending amount
   * @param receivingCountryCode Country code of receiver
   * @param receivingCurrencyCode Currency code for receiving amount
   * @param sendingAmount Amount to be sent
   * @param receivingMode Mode of receiving the money
   * @param instrument Payment instrument
   * @param paymentMode Mode of payment
   * @param isoCode Optional ISO code
   * @param routingCode Optional routing code
   * @param correspondent Optional correspondent details
   * @param correspondentId Optional correspondent ID
   * @param correspondentLocationId Optional correspondent location ID
   * @param listener Callback interface to handle success/failure responses
   */
  suspend fun createQuote(sendingCountryCode: String, sendingCurrencyCode: String, receivingCountryCode: String, receivingCurrencyCode: String, sendingAmount: String, receivingMode: String, instrument: String, paymentMode: String, isoCode: String?, routingCode: String?, correspondent: String?, correspondentId: String?, correspondentLocationId: String?, listener: QuoteListener){
  try{
  val apiService = RetrofitClient.retrofit.create(ApiService::class.java)
    val request = QuoteRequest(
        sending_country_code = sendingCountryCode,
        sending_currency_code = sendingCurrencyCode,
        receiving_country_code = receivingCountryCode,
        receiving_currency_code = receivingCurrencyCode,
        sending_amount = BigDecimal(sendingAmount),
        receiving_amount = null,
        receiving_mode = receivingMode,
        type = "SEND",
        instrument = instrument,
        iso_code = isoCode,
        routing_code = routingCode,
        payment_mode = paymentMode,
        correspondent = correspondent,
        correspondent_id = correspondentId,
        correspondent_location_id = correspondentLocationId
    )

         // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }
            
            
            val response =
            withContext(Dispatchers.IO) {
              apiService
                  .createQuote(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      request = request)
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
            
  }catch(e: Exception){
  listener.onFailed("Unexpected error: ${e.message}")
  }
  }
  
  /**
   * Gets the current exchange rate for a currency pair
   * Makes an API call to retrieve current exchange rates
   * @param receivingCurrencyCode Currency code for receiving amount
   * @param receivingCountryCode Country code of receiver
   * @param includeCorrespondents Whether to include correspondent details
   * @param receivingMode Mode of receiving the money
   * @param correspondents Optional correspondent details
   * @param listener Callback interface to handle success/failure responses
   */
  suspend fun getRate(receivingCurrencyCode: String, receivingCountryCode: String, includeCorrespondents: String, receivingMode: String, correspondents: String?, listener: RatesListener){
  try{
  val apiService = RetrofitClient.retrofit.create(ApiService::class.java)
  
  
         // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }
            
            
            val response =
            withContext(Dispatchers.IO) {
              apiService
                  .getRates(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      receiving_currency_code = receivingCurrencyCode,
                      receiving_country_code = receivingCountryCode,
                      include_correspondents = includeCorrespondents,
                      receiving_mode = receivingMode,
                      correspondent = correspondents)
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
  
  }catch(e: Exception){
  listener.onFailed("Unexpected error: ${e.message}")
  }
  }
  
  /**
   * Gets the available balance for a payment mode
   * Makes an API call to retrieve agent's credit balance
   * @param paymentMode Mode of payment to check balance for
   * @param listener Callback interface to handle success/failure responses
   */
  suspend fun getAvailableBalance(paymentMode: String, listener: AvailableBalanceListener){
  try{
  val apiService = RetrofitClient.retrofit.create(ApiService::class.java)

        // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }
            
            
            val response =
            withContext(Dispatchers.IO) {
              apiService
                  .getAgentCreditBalance(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      payment_mode = paymentMode)
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
  }catch(e: Exception){
  listener.onFailed("Unexpected error: ${e.message}")
  }
  }
  
  /**
   * Looks up branch details using various codes
   * Makes an API call to search for branch information
   * @param sortCode Optional sort code to search by
   * @param routingCode Optional routing code to search by
   * @param swiftCode Optional SWIFT code to search by
   * @param partnerName Name of the partner
   * @param receivingCountryCode Country code where branch is located
   * @param receivingMode Mode of receiving the money
   * @param listener Callback interface to handle success/failure responses
   */
  suspend fun branchLookup(sortCode: String? = null, routingCode: String? = null, swiftCode: String? = null, partnerName: String, receivingCountryCode: String, receivingMode: String, listener: BranchLookupListener){
  try{
  val apiService = RetrofitClient.retrofit.create(ApiService::class.java)

        // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }

        val response =
            withContext(Dispatchers.IO) {
              apiService
                  .searchBranch(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      receiving_mode = receivingMode,
                      receivingCountryCode = receivingCountryCode,
                      correspondent = null,
                      code = sortCode,
                      isoCode = swiftCode,
                      routing_code = routingCode)
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
      } catch (e: Exception) {
        listener.onFailed("Unexpected error: ${e.message}")
      }
  }
  
  /**
   * Validates a recipient's account details
   * Makes an API call to verify account information
   * @param partnerName Name of the partner
   * @param receiving_country_code Country code where account is located
   * @param receiving_mode Mode of receiving the money
   * @param swiftCode Optional SWIFT code of the bank
   * @param routingCode Optional routing code
   * @param iban Optional IBAN number
   * @param acct_no Optional account number
   * @param first_name First name of account holder
   * @param middle_name Middle name of account holder
   * @param last_name Last name of account holder
   * @param listener Callback interface to handle success/failure responses
   */
    suspend fun validateAccount(
        partnerName: String,
        receiving_country_code: String,
        receiving_mode: String,
        swiftCode: String? = null,
        routingCode: String? = null,
        iban: String? = null,
        acct_no: String? = null,
        first_name: String,
        middle_name: String,
        last_name: String,
        listener: ValidateAccountListener
    ) {
      try {
        val apiService = RetrofitClient.retrofit.create(ApiService::class.java)

        // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }

        val response =
            withContext(Dispatchers.IO) {
              apiService
                  .validateAccount(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      receiving_mode = receiving_mode,
                      receiving_country_code = receiving_country_code,
                      iso_code = swiftCode,
                      routing_code = routingCode,
                      iban = iban,
                      account_number = acct_no,
                      first_name = first_name,
                      middle_name = middle_name,
                      last_name = last_name)
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
      } catch (e: Exception) {
        listener.onFailed("Unexpected error: ${e.message}")
      }
    }

    /**
     * Gets the list of branches for a bank
     * Makes an API call to retrieve branch master data
     * */
    suspend fun getBranchMaster(
        receiving_country_code: String,
        receiving_mode: String,
        correspondent: String,
        bankId: String,
        partnerName: String,
        listener: BranchMasterListener
    ) {
      try {
        val apiService = RetrofitClient.retrofit.create(ApiService::class.java)

        // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }

        val response =
            withContext(Dispatchers.IO) {
              apiService
                  .getBankBranches(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      receivingMode = receiving_mode,
                      receivingCountryCode = receiving_country_code,
                      correspondent = correspondent,
                      page = 1,
                      size = 1,
                      bankId = bankId)
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
      } catch (e: Exception) {
        listener.onFailed("Unexpected error: ${e.message}")
      }
    }

    /**
     * Gets the service corridor information for a given partner and receiving details
     * @param partnerName Name of the partner
     * @param receiving_mode Mode of receiving the remittance
     * @param receiving_country_code Country code where remittance will be received
     * @param listener Callback listener for success/failure events
     */
    suspend fun getServiceCorridor(
        partnerName: String,
        receiving_mode: String,
        receiving_country_code: String,
        listener: ServiceCorridorListener
    ) {
      try {
        val apiService = RetrofitClient.retrofit.create(ApiService::class.java)

        // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }

        val response =
            withContext(Dispatchers.IO) {
              apiService
                  .getServiceCorridor(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      receiving_mode = receiving_mode,
                      receiving_country_code = receiving_country_code)
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
      } catch (e: Exception) {
        listener.onFailed("Unexpected error: ${e.message}")
      }
    }

    /**
     * Retrieves available instruments for a given partner
     * @param partnerName Name of the partner
     * @param listener Callback listener for success/failure events
     */
    suspend fun getInstruments(partnerName: String, listener: InstrumentListener) {
      try {
        val apiService = RetrofitClient.retrofit.create(ApiService::class.java)

        // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }

        val response =
            withContext(Dispatchers.IO) {
              apiService
                  .getCodes(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      code = "INSTRUMENTS",
                      service_type = "C2C")
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
      } catch (e: Exception) {
        listener.onFailed("Unexpected error: ${e.message}")
      }
    }

    /**
     * Gets available address types for a given partner
     * @param partnerName Name of the partner
     * @param listener Callback listener for success/failure events
     */
    suspend fun getAddressType(partnerName: String, listener: AddressTypeListener) {
      try {
        val apiService = RetrofitClient.retrofit.create(ApiService::class.java)

        // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }

        val response =
            withContext(Dispatchers.IO) {
              apiService
                  .getCodes(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      code = "ADDRESS_TYPES",
                      service_type = "C2C")
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
      } catch (e: Exception) {
        listener.onFailed("Unexpected error: ${e.message}")
      }
    }

    /**
     * Gets available account types for a given partner
     * @param partnerName Name of the partner
     * @param listener Callback listener for success/failure events
     */
    suspend fun getAccountType(partnerName: String, listener: AccountTypeListener) {
      try {
        val apiService = RetrofitClient.retrofit.create(ApiService::class.java)

        // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }

        val response =
            withContext(Dispatchers.IO) {
              apiService
                  .getCodes(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      code = "ACCOUNT_TYPES",
                      service_type = "C2C")
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
      } catch (e: Exception) {
        listener.onFailed("Unexpected error: ${e.message}")
      }
    }

    /**
     * Gets available correspondents for a given partner
     * @param partnerName Name of the partner
     * @param listener Callback listener for success/failure events
     */
    suspend fun getCorrespondent(partnerName: String, listener: CorrespondentListener) {
      try {
        val apiService = RetrofitClient.retrofit.create(ApiService::class.java)

        // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }

        val response =
            withContext(Dispatchers.IO) {
              apiService
                  .getCodes(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      code = "CORRESPONDENTS",
                      service_type = "C2C")
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
      } catch (e: Exception) {
        listener.onFailed("Unexpected error: ${e.message}")
      }
    }

    /**
     * Gets available source of income options for a given partner
     * @param partnerName Name of the partner
     * @param listener Callback listener for success/failure events
     */
    suspend fun getSourceOfIncome(partnerName: String, listener: SourceOfIncomeListener) {
      try {
        val apiService = RetrofitClient.retrofit.create(ApiService::class.java)

        // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }

        val response =
            withContext(Dispatchers.IO) {
              apiService
                  .getCodes(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      code = "SOURCE_OF_INCOMES",
                      service_type = "C2C")
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
      } catch (e: Exception) {
        listener.onFailed("Unexpected error: ${e.message}")
      }
    }

    /**
     * Gets available payment modes for a given partner
     * @param partnerName Name of the partner
     * @param listener Callback listener for success/failure events
     */
    suspend fun getPaymentMode(partnerName: String, listener: PaymentModeListener) {
      try {
        val apiService = RetrofitClient.retrofit.create(ApiService::class.java)

        // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }

        val response =
            withContext(Dispatchers.IO) {
              apiService
                  .getCodes(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      code = "PAYMENT_MODES",
                      service_type = "C2C")
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
      } catch (e: Exception) {
        listener.onFailed("Unexpected error: ${e.message}")
      }
    }

    /**
     * Gets available purpose of transaction options for a given partner
     * @param partnerName Name of the partner
     * @param listener Callback listener for success/failure events
     */
    suspend fun getPurposeOfTXN(partnerName: String, listener: PurposeOfTXNListener) {
      try {
        val apiService = RetrofitClient.retrofit.create(ApiService::class.java)

        // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "password",
                      clientId = SessionManager.clientId ?: "cdp_app",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret
                              ?: "mSh18BPiMZeQqFfOvWhgv8wzvnNVbj3Y")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }

        val response =
            withContext(Dispatchers.IO) {
              apiService
                  .getCodes(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      code = "PURPOSE_OF_TRANSACTIONS",
                      service_type = "C2C")
                  .execute()
            }

        if (response.isSuccessful) {
          val responses = response.body()
          if (responses != null) {
            listener.onSuccess(responses)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
      } catch (e: Exception) {
        listener.onFailed("Unexpected error: ${e.message}")
      }
    }

    /**
     * Gets available receiving modes for a given partner
     * @param partnerName Name of the partner
     * @param listener Callback listener for success/failure events
     */
    suspend fun getReceivingModes(partnerName: String, listener: ReceiveModeListener) {
      try {
        val apiService = RetrofitClient.retrofit.create(ApiService::class.java)

        // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "",
                      clientId = SessionManager.clientId ?: "",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret ?: "")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }

        val response =
            withContext(Dispatchers.IO) {
              apiService
                  .getCodes(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      sender = SessionManager.username ?: "",
                      code = "RECEIVING_MODES",
                      service_type = "C2C")
                  .execute()
            }

        if (response.isSuccessful) {
          val receiveModes = response.body()
          if (receiveModes != null) {
            listener.onSuccess(receiveModes)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
      } catch (e: Exception) {
        listener.onFailed("Unexpected error: ${e.message}")
      }
    }

    /**
     * Gets bank master data for a given country and receiving mode
     * @param countryCode Country code to get banks for
     * @param receivingMode Mode of receiving the remittance
     * @param partnerName Name of the partner
     * @param listener Callback listener for success/failure events
     */
    suspend fun getBankMaster(
        countryCode: String,
        receivingMode: String,
        partnerName: String,
        listener: BankMasterListener
    ) {
      try {
        // Get the API service
        val apiService = RetrofitClient.retrofit.create(ApiService::class.java)

        // Get the access token
        val token: String =
            if (!Timer.isRunning) {
              val result =
                  AccessToken.getAccessToken(
                      username = SessionManager.username ?: "",
                      password = SessionManager.password ?: "",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      grantType = SessionManager.grantType ?: "",
                      clientId = SessionManager.clientId ?: "",
                      scope = SessionManager.scope,
                      clientSecret = SessionManager.clientSecret ?: "")

              val error = result.exceptionOrNull()
              if (error != null) {
                listener.onFailed(error.message ?: "Error occurred: Null")
                return
              }

              val newToken = result.getOrNull()?.access_token
              if (newToken.isNullOrEmpty()) {
                listener.onFailed("Access token is null or empty")
                return
              }

              AccessToken.access_token = newToken // Cache the token
              newToken
            } else {
              AccessToken.access_token
            }

        // Make the API call with coroutines
        val response =
            withContext(Dispatchers.IO) {
              apiService
                  .getMasterBanks(
                      authorization = "Bearer $token",
                      requestId = (SessionManager.username ?: "") + "-" + RequestId.generateRequestId(),
                      countryCode = countryCode,
                      receivingMode = receivingMode)
                  .execute()
            }

        if (response.isSuccessful) {
          val bankData = response.body()
          if (bankData != null) {
            listener.onSuccess(bankData)
          } else {
            listener.onFailed("Response body is null")
          }
        } else {
          listener.onFailed("Error: ${response.errorBody()?.string() ?: "Unknown error"}")
        }
      } catch (e: Exception) {
        listener.onFailed("Unexpected error: ${e.message}")
      }
    }
  }
}
