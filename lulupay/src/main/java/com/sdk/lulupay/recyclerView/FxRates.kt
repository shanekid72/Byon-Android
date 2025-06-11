package com.sdk.lulupay.recyclerView

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.sdk.lulupay.R

/**
 * Data class representing foreign exchange rate information
 * @property costRate The cost rate for the exchange
 * @property rate The actual exchange rate
 * @property baseCurrencyCode The code of the base currency
 * @property counterCurrencyCode The code of the counter currency
 * @property type The type of exchange rate
 */
data class FxRates(
    val costRate: String,
    val rate: String,
    val baseCurrencyCode: String,
    val counterCurrencyCode: String,
    val type: String
)

/**
 * Adapter class for displaying foreign exchange rates in a RecyclerView
 * @property fxRates List of foreign exchange rates to display
 * @property onItemClick Callback function triggered when an item is clicked
 */
class FxRatesAdapter(
    private val fxRates: List<FxRates>,
    private val onItemClick: (position: Int, fxRates: FxRates) -> Unit
) : RecyclerView.Adapter<FxRatesAdapter.ViewHolder>() {

    /**
     * ViewHolder class that holds references to the views in each item
     * @property costRate TextView for cost rate
     * @property rate TextView for exchange rate
     * @property baseCurrencyCode TextView for base currency code
     * @property counterCurrencyCode TextView for counter currency code
     * @property type TextView for rate type
     * @property costRateContainer Container layout for cost rate section
     */
    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val costRate: TextView = itemView.findViewById(R.id.cost_rate_value)
        val rate: TextView = itemView.findViewById(R.id.rate_value)
        val baseCurrencyCode: TextView = itemView.findViewById(R.id.base_currency_code_value)
        val counterCurrencyCode: TextView = itemView.findViewById(R.id.counter_currency_code_value)
        val type: TextView = itemView.findViewById(R.id.type_value)
        val costRateContainer: LinearLayout = itemView.findViewById(R.id.cost_rate_container)

        init {
            itemView.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onItemClick(position, fxRates[position])
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
        val view = LayoutInflater.from(parent.context).inflate(R.layout.fx_rate, parent, false)
        return ViewHolder(view)
    }

    /**
     * Binds data to the views in the ViewHolder and manages visibility of containers
     * based on costRate value
     * @param holder The ViewHolder to bind data to
     * @param position The position of the item in the data set
     */
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = fxRates[position]

        // Set costRate visibility
        if (!item.costRate.isNullOrEmpty()) {
            holder.costRate.text = item.costRate ?: ""
            holder.costRateContainer.visibility = View.VISIBLE
        } else {
            holder.costRateContainer.visibility = View.GONE
        }
        
        
        holder.rate.text = item.rate
        holder.baseCurrencyCode.text = item.baseCurrencyCode
        holder.counterCurrencyCode.text = item.counterCurrencyCode
        holder.type.text = item.type
    }

    /**
     * Returns the total number of items in the data set
     * @return Size of the fxRates list
     */
    override fun getItemCount(): Int {
        return fxRates.size
    }
}