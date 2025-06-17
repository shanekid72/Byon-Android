package com.sdk.lulupay.recyclerView

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.sdk.lulupay.R

/**
 * Data class representing settlement details information
 * @property chargeType The type of charge
 * @property value The value or amount
 * @property currencyCode The currency code for the settlement
 */
data class SettlementDetails(
    val chargeType: String,
    val value: String,
    val currencyCode: String
)

/**
 * Adapter class for displaying settlement details in a RecyclerView
 * @property settlementDetails List of settlement details to display
 * @property onItemClick Callback function triggered when an item is clicked
 */
class SettlementDetailsAdapter(
    private val settlementDetails: List<SettlementDetails>,
    private val onItemClick: (position: Int, settlementDetails: SettlementDetails) -> Unit
) : RecyclerView.Adapter<SettlementDetailsAdapter.ViewHolder>() {

    /**
     * ViewHolder class that holds references to the views in each item
     * @property chargeType TextView for displaying the charge type
     * @property value TextView for displaying the value
     * @property currencyCode TextView for displaying the currency code
     */
    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val chargeType: TextView = itemView.findViewById(R.id.charge_type_value)
        val value: TextView = itemView.findViewById(R.id.value)
        val currencyCode: TextView = itemView.findViewById(R.id.currency_value)

        init {
            itemView.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onItemClick(position, settlementDetails[position])
                }
            }
        }
    }

    /**
     * Creates new ViewHolder instances when needed by the RecyclerView
     * @param parent The ViewGroup into which the new View will be added
     * @param viewType The view type of the new View
     * @return A new ViewHolder that holds a View of the given view type
     */
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.settlement, parent, false)
        return ViewHolder(view)
    }

    /**
     * Binds data to the views in the ViewHolder
     * @param holder The ViewHolder to bind data to
     * @param position The position of the item in the data set
     */
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = settlementDetails[position]

        // Set other fields
        holder.chargeType.text = item.chargeType
        holder.value.text = item.value
        holder.currencyCode.text = item.currencyCode
    }

    /**
     * Returns the total number of items in the data set
     * @return Size of the settlement details list
     */
    override fun getItemCount(): Int {
        return settlementDetails.size
    }
}