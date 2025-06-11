package com.sdk.lulupay.recyclerView

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.sdk.lulupay.R

/**
 * Data class representing fee details information
 * @property type The type of fee
 * @property model The fee model
 * @property currencyCode The currency code for the fee
 * @property amount The fee amount
 * @property description Optional description of the fee
 */
data class FeeDetails(
    val type: String,
    val model: String,
    val currencyCode: String,
    val amount: String,
    val description: String
)

/**
 * Adapter class for displaying fee details in a RecyclerView
 * @property feeDetails List of fee details to display
 * @property onItemClick Callback function triggered when an item is clicked
 */
class FeeDetailsAdapter(
    private val feeDetails: List<FeeDetails>,
    private val onItemClick: (position: Int, feeDetails: FeeDetails) -> Unit
) : RecyclerView.Adapter<FeeDetailsAdapter.ViewHolder>() {

    /**
     * ViewHolder class that holds references to the views in each item
     * @property type TextView for fee type
     * @property model TextView for fee model
     * @property currencyCode TextView for currency code
     * @property amount TextView for fee amount
     * @property description TextView for fee description
     * @property descriptionContainer Container layout for description section
     */
    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val type: TextView = itemView.findViewById(R.id.type_value)
        val model: TextView = itemView.findViewById(R.id.model_value)
        val currencyCode: TextView = itemView.findViewById(R.id.currency_code_value)
        val amount: TextView = itemView.findViewById(R.id.amount_value)
        val description: TextView = itemView.findViewById(R.id.description_value)
        val descriptionContainer: LinearLayout = itemView.findViewById(R.id.description_container)

        init {
            itemView.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onItemClick(position, feeDetails[position])
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
        val view = LayoutInflater.from(parent.context).inflate(R.layout.fee_details, parent, false)
        return ViewHolder(view)
    }

    /**
     * Binds data to the views in the ViewHolder and manages visibility of containers
     * based on description value
     * @param holder The ViewHolder to bind data to
     * @param position The position of the item in the data set
     */
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = feeDetails[position]

        // Set costRate visibility
        if (item.description.isNotEmpty()) {
            holder.description.text = item.description
            holder.descriptionContainer.visibility = View.VISIBLE
        } else {
            holder.descriptionContainer.visibility = View.GONE
        }

        // Set other fields
        holder.type.text = item.type
        holder.model.text = item.model
        holder.currencyCode.text = item.currencyCode
        holder.amount.text = item.amount
    }

    /**
     * Returns the total number of items in the data set
     * @return Size of the feeDetails list
     */
    override fun getItemCount(): Int {
        return feeDetails.size
    }
}