package com.sdk.lulupay.database

import android.content.Context
import android.database.Cursor
import androidx.sqlite.db.SupportSQLiteDatabase
import androidx.sqlite.db.SupportSQLiteOpenHelper
import androidx.sqlite.db.framework.FrameworkSQLiteOpenHelperFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Data class representing a remittance transaction history record
 * Contains:
 * - Transaction reference number
 * - First name of recipient
 * - Last name of recipient 
 * - Transaction state
 */
data class RemittanceTransactionHistory(
    val transactionRefNo: String,
    val firstName: String,
    val lastName: String,
    val transactionState: String
)

/**
 * Database class for managing remittance transaction state data
 * Handles CRUD operations for transaction records
 * @param context Android context used to initialize the database
 */
class LuluPayDB2(context: Context) {

  companion object {
    private const val DATABASE_NAME = "remittance_transaction_state.db"
    private const val DATABASE_VERSION = 2
  }

  private val helper: SupportSQLiteOpenHelper

  init {
    val configuration =
        SupportSQLiteOpenHelper.Configuration.builder(context)
            .name(DATABASE_NAME)
            .callback(
                object : SupportSQLiteOpenHelper.Callback(DATABASE_VERSION) {
                  /**
                   * Called when database is first created
                   * Creates transaction_state table with columns:
                   * - id (primary key)
                   * - transactionRefNo
                   * - firstName
                   * - lastName
                   * - transactionState
                   */
                  override fun onCreate(db: SupportSQLiteDatabase) {
                    // Create the table with the required columns
                    db.execSQL(
                        "CREATE TABLE transaction_state (" +
                            "id INTEGER PRIMARY KEY, " +
                            "transactionRefNo TEXT, " +
                            "firstName TEXT, " +
                            "lastName TEXT, " +
                            "transactionState TEXT)")
                  }

                  /**
                   * Called when database needs to be upgraded
                   * Drops existing table and recreates it
                   * @param oldVersion Previous database version
                   * @param newVersion New database version to upgrade to
                   */
                  override fun onUpgrade(
                      db: SupportSQLiteDatabase,
                      oldVersion: Int,
                      newVersion: Int
                  ) {
                    // Upgrade database (here we drop and recreate the table for simplicity)
                    db.execSQL("DROP TABLE IF EXISTS transaction_state")
                    onCreate(db)
                  }
                })
            .build()

    helper = FrameworkSQLiteOpenHelperFactory().create(configuration)
  }

  /**
   * Gets writable database instance
   * @return SupportSQLiteDatabase instance that can be written to
   */
  private fun getDatabase(): SupportSQLiteDatabase {
    return helper.writableDatabase
  }

  /**
   * Inserts a new transaction record into the database
   * @param transactionRefNo Reference number of the transaction
   * @param firstName First name of recipient
   * @param lastName Last name of recipient
   * @param transactionState State of the transaction
   * @throws Exception if insert fails
   */
  suspend fun insertData(
      transactionRefNo: String,
      firstName: String,
      lastName: String,
      transactionState: String
  ) {
    try {
      val db = getDatabase()
      db.execSQL(
          "INSERT INTO transaction_state (transactionRefNo, firstName, lastName, transactionState) VALUES (?, ?, ?, ?)",
          arrayOf(transactionRefNo, firstName, lastName, transactionState))
    } catch (e: Exception) {
      throw Exception(e.message)
    }
  }

  /**
   * Retrieves all transaction records from the database
   * @return List of RemittanceTransactionHistory objects
   * @throws Exception if query fails
   */
  suspend fun getAllData(): List<RemittanceTransactionHistory> {
    val dataList = mutableListOf<RemittanceTransactionHistory>()
    val db = getDatabase()
    var cursor: Cursor? = null
    try {
      cursor = db.query("SELECT * FROM transaction_state")
      if (cursor.moveToFirst()) {
        do {
          val transactionRefNo = cursor.getString(cursor.getColumnIndexOrThrow("transactionRefNo"))
          val firstName = cursor.getString(cursor.getColumnIndexOrThrow("firstName"))
          val lastName = cursor.getString(cursor.getColumnIndexOrThrow("lastName"))
          val transactionState = cursor.getString(cursor.getColumnIndexOrThrow("transactionState"))
          dataList.add(RemittanceTransactionHistory(transactionRefNo, firstName, lastName, transactionState))
        } while (cursor.moveToNext())
      }
    } catch (e: Exception) {
      throw Exception("Error reading data: ${e.message}")
    } finally {
      cursor?.close()
    }
    return dataList
  }

  /**
   * Updates an existing transaction record
   * @param id ID of record to update
   * @param newTransactionRefNo New reference number
   * @param newFirstName New first name
   * @param newLastName New last name
   * @param newTransactionState New transaction state
   * @throws Exception if update fails
   */
  suspend fun updateData(
      id: Int,
      newTransactionRefNo: String,
      newFirstName: String,
      newLastName: String,
      newTransactionState: String
  ) {
    try {
      val db = getDatabase()
      db.execSQL(
          "UPDATE transaction_state SET transactionRefNo = ?, firstName = ?, lastName = ?, transactionState = ? WHERE id = ?",
          arrayOf(newTransactionRefNo, newFirstName, newLastName, newTransactionState, id))
    } catch (e: Exception) {
      throw Exception(e.message)
    }
  }

  /**
   * Deletes a transaction record
   * @param id ID of record to delete
   * @throws Exception if deletion fails
   */
  suspend fun deleteData(id: Int) {
    withContext(Dispatchers.IO) {
      try {
        val db = getDatabase()
        db.execSQL("DELETE FROM transaction_state WHERE id = ?", arrayOf(id))
      } catch (e: Exception) {
        throw Exception(e.message)
      }
    }
  }

  /**
   * Closes the database connection
   * Should be called when database is no longer needed
   */
  fun closeDatabase() {
    helper.close()
  }
}