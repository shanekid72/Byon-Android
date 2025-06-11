package com.sdk.lulupay.listeners

interface BottomSheetListener {
    /**
     * Called when the bottom sheet is dismissed with bank and branch details
     * @param bankId The ID of the selected bank
     * @param branchId The ID of the selected branch
     * @param branchName The name of the selected branch
     * @param branchFullName The full name of the selected branch
     * @param countryCode The country code where the bank/branch is located
     * @param ifsc The IFSC code of the branch
     * @param bic The BIC code of the bank
     * @param bankName The name of the selected bank
     * @param routingCode The routing code of the bank
     * @param swiftCode The SWIFT code of the bank
     * @param sortCode The sort code of the bank
     * @param address The address of the branch
     * @param townName The town/city where the branch is located
     * @param countrySubdivision The state/province where the branch is located
     */
    fun onBottomSheetDismissed(bankId: String, branchId: String, branchName: String, branchFullName: String, countryCode: String, ifsc: String, bic: String, bankName: String, routingCode: String, swiftCode: String, sortCode: String, address: String, townName: String, countrySubdivision: String)
}
