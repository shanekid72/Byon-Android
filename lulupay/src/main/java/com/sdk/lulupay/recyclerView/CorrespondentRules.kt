package com.sdk.lulupay.recyclerView

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.sdk.lulupay.R

/**
 * Data class representing correspondent rules information
 * @property field The field name or identifier
 * @property rule The rule or condition associated with the field
 */
data class CorrespondentRules(
    val field: String,
    val rule: String,
)

/**
 * Adapter class for displaying correspondent rules in a RecyclerView
 * @property correspondentRules List of correspondent rules to display
 * @property onItemClick Callback function triggered when an item is clicked
 */
class CorrespondentRulesAdapter(
    private val correspondentRules: List<CorrespondentRules>,
    private val onItemClick: (position: Int, correspondentRules: CorrespondentRules) -> Unit
) : RecyclerView.Adapter<CorrespondentRulesAdapter.ViewHolder>() {

    /**
     * ViewHolder class that holds references to the views in each item
     * @property field TextView for displaying the field value
     * @property rule TextView for displaying the rule value
     * @property fullContainer Container layout for the entire item
     * @property fieldContainer Container layout for the field section
     * @property ruleContainer Container layout for the rule section
     */
    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val field: TextView = itemView.findViewById(R.id.field_value)
        val rule: TextView = itemView.findViewById(R.id.rules_value)
        val fullContainer: LinearLayout = itemView.findViewById(R.id.correspondent_rules_container)
        val fieldContainer: LinearLayout = itemView.findViewById(R.id.field_container)
        val ruleContainer: LinearLayout = itemView.findViewById(R.id.rules_container)

        init {
            itemView.setOnClickListener {
                val position = adapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onItemClick(position, correspondentRules[position])
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
        val view = LayoutInflater.from(parent.context).inflate(R.layout.correspondent_rules, parent, false)
        return ViewHolder(view)
    }

    /**
     * Binds data to the views in the ViewHolder and manages visibility of containers
     * based on field and rule values
     * @param holder The ViewHolder to bind data to
     * @param position The position of the item in the data set
     */
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = correspondentRules[position]
        
        if(item.field.isNullOrEmpty() && item.rule.isNullOrEmpty()){
        holder.fullContainer.visibility = View.GONE
        }
        
        if(!item.field.isNullOrEmpty()){
        holder.fullContainer.visibility = View.VISIBLE
        holder.fieldContainer.visibility = View.VISIBLE
        holder.field.text = item.field
        }
        
        if(!item.rule.isNullOrEmpty()){
        holder.fullContainer.visibility = View.VISIBLE
        holder.ruleContainer.visibility = View.VISIBLE
        holder.rule.text = item.rule
        }
        
    }

    /**
     * Returns the total number of items in the data set
     * @return Size of the correspondentRules list
     */
    override fun getItemCount(): Int {
        return correspondentRules.size
    }
}