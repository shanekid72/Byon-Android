package com.sdk.lulupay.recyclerView

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.sdk.lulupay.R

/**
 * Data class representing recipient information
 * @property firstName First name of the recipient
 * @property lastName Last name of the recipient 
 * @property phoneNo Phone number of the recipient
 * @property transactionRefNo Transaction reference number
 */
data class Receipients(
    val firstName: String,
    val lastName: String,
    val phoneNo: String,
    val transactionRefNo: String
)

/**
 * Adapter class for displaying recipients in a RecyclerView
 * @property receipients List of recipients to display
 * @property onItemClick Callback function triggered when an item is clicked
 * @property onItemLongClick Callback function triggered when an item is long clicked
 */
class ReceipientsAdapter(
    private val receipients: List<Receipients>,
    private val onItemClick: (position: Int, receipient: Receipients) -> Unit,
    private val onItemLongClick: (position: Int, receipient: Receipients) -> Unit
) : RecyclerView.Adapter<ReceipientsAdapter.ViewHolder>() {

    /**
     * ViewHolder class that holds references to the views in each item
     * @property contactName TextView for displaying the contact name
     * @property contactNumber TextView for displaying the contact number
     */
    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val contactName: TextView = itemView.findViewById(R.id.contactName)
        val contactNumber: TextView = itemView.findViewById(R.id.contactNumber)

        init {
            // Handle item click
            itemView.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onItemClick(position, receipients[position])
                }
            }

            // Handle item long click
            itemView.setOnLongClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onItemLongClick(position, receipients[position])
                    true  // Return true to indicate the event is handled
                } else {
                    false
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
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_contact, parent, false)
        return ViewHolder(view)
    }

    /**
     * Binds data to the views in the ViewHolder
     * @param holder The ViewHolder to bind data to
     * @param position The position of the item in the data set
     */
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = receipients[position]
        
        holder.contactName.text = "${item.firstName} ${item.lastName}"
        holder.contactNumber.text = item.phoneNo
    }

    /**
     * Returns the total number of items in the data set
     * @return Size of the recipients list
     */
    override fun getItemCount(): Int {
        return receipients.size
    }
}