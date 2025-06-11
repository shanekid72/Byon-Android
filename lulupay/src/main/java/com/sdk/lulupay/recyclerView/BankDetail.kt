package com.sdk.lulupay.recyclerView;

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.sdk.lulupay.R

/**
 * Data class representing bank details information
 * @property bankName Name of the bank
 * @property routingCode Bank routing code
 * @property bicSwift BIC/SWIFT code of the bank
 * @property sortCode Sort code of the bank
 * @property address Optional address of the bank
 * @property townName Town/City where bank is located
 * @property countrySubdivision Country subdivision/state/region
 */
data class BankDetail(
    val bankName: String,
    val routingCode: String,
    val bicSwift: String,
    val sortCode: String,
    val address: String? = null,
    val townName: String,
    val countrySubdivision: String
)

/**
 * Adapter class for displaying bank details in a RecyclerView
 * @property bankDetails List of bank details to display
 * @property onItemClick Callback function triggered when an item is clicked
 */
class BankDetailsAdapter(
    private val bankDetails: List<BankDetail>,
    private val onItemClick: (position: Int, bankDetail: BankDetail) -> Unit
) : RecyclerView.Adapter<BankDetailsAdapter.ViewHolder>() {

    /**
     * ViewHolder class that holds references to the views in each item
     * @property bankName TextView for bank name
     * @property routingCode TextView for routing code
     * @property bicSwift TextView for BIC/SWIFT code
     * @property sortCode TextView for sort code
     * @property address TextView for bank address
     * @property townName TextView for town name
     * @property countrySubdivision TextView for country subdivision
     */
    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val bankName: TextView = itemView.findViewById(R.id.bank_name_value)
        val routingCode: TextView = itemView.findViewById(R.id.routing_code_value)
        val bicSwift: TextView = itemView.findViewById(R.id.bic_swift_value)
        val sortCode: TextView = itemView.findViewById(R.id.sort_code_value)
        val address: TextView = itemView.findViewById(R.id.address_value)
        val townName: TextView = itemView.findViewById(R.id.town_name_value)
        val countrySubdivision: TextView = itemView.findViewById(R.id.country_subdivision_value)

        init {
            itemView.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onItemClick(position, bankDetails[position])
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
        val view = LayoutInflater.from(parent.context).inflate(R.layout.bank_details, parent, false)
        return ViewHolder(view)
    }

    /**
     * Binds data to the views in the ViewHolder
     * @param holder The ViewHolder to bind data to
     * @param position The position of the item in the data set
     */
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = bankDetails[position]
        holder.bankName.text = item.bankName
        holder.routingCode.text = item.routingCode
        holder.bicSwift.text = item.bicSwift
        holder.sortCode.text = item.sortCode
        holder.address.text = item.address
        holder.townName.text = item.townName
        holder.countrySubdivision.text = item.countrySubdivision
    }

    /**
     * Returns the total number of items in the data set
     * @return Size of the bankDetails list
     */
    override fun getItemCount() = bankDetails.size
}