# Mobile App: "Add New Item" Implementation Plan

## 1. Objective
Enable users to add a new inventory item via the Android app.
This involves creating a new screen (`AddItemScreen`) and connecting it to the `InventoryProvider`.

## 2. API Data Contract
The backend endpoint `POST /api/inventory` expects the following fields in the JSON body:

| Field | Type | Required? | Notes |
| :--- | :--- | :--- | :--- |
| `productName` | String | **YES** | Name of the item. |
| `quantity` | Number | **YES** | Current stock count. |
| `unit` | String | No | Default: "pcs". Options: pcs, kg, box. |
| `mfgDate` | ISO Date String | **YES** | Manufacturing Date. |
| `expDate` | ISO Date String | **YES** | Expiry Date. |
| `branch` | String | **YES** | The branch name (e.g., "Main Branch"). |
| `status` | String | **YES** | e.g., "Good", "Expired", "Critical". |
| `barcode` | String | No | Optional scanned barcode. |
| `notes` | String | No | Optional text. |

**Important Logic for Mobile:**
- **Branch:** Fetch from the logged-in user's profile (stored in `AuthProvider` or Secure Storage), OR default to "Main Branch".
- **Status:** Calculate automatically based on `expDate` vs `DateTime.now()` (e.g., if `expDate < now` -> "Expired").

---

## 3. Implementation Steps

### Step 1: Create `AddItemScreen`
Create file: `lib/screens/add_item_screen.dart`

**UI Requirements:**
1.  **Scaffold & AppBar**: Title "Add New Item".
2.  **Form Widget**: Key = `_formKey`.
3.  **Fields**:
    *   `ProductName` (TextFormField)
    *   `Quantity` (TextFormField, number keyboard)
    *   `Unit` (DropdownButtonFormField: pcs, kg, box)
    *   `Manufacturing Date` (InkWell/GestureDetector -> `showDatePicker`)
    *   `Expiry Date` (InkWell/GestureDetector -> `showDatePicker`)
4.  **Save Button**:
    *   Validate Form.
    *   Calculate `status`.
    *   Call Provider.

### Step 2: Update `InventoryProvider`
Ensure the `addItem` method is robust. It's already basically there, but double check it accepts the Map correctly and refreshes the list on success.

### Step 3: Connect the Screens
In `lib/screens/inventory_screen.dart`:
*   Find the `FloatingActionButton`.
*   Update `onPressed` to push the new screen:
    ```dart
    Navigator.push(context, MaterialPageRoute(builder: (_) => const AddItemScreen()));
    ```

---

## 4. Code Snippet for AI (Copy & Paste this)
*You can give this context to the AI implementing the code:*

```dart
// Example of the payload construction in AddItemScreen
final newItem = {
  "productName": _nameController.text,
  "quantity": int.parse(_qtyController.text),
  "unit": _selectedUnit,
  "mfgDate": _mfgDate.toIso8601String(),
  "expDate": _expDate.toIso8601String(),
  "branch": "Main Branch", // TODO: Get from AuthProvider
  "status": _calculateStatus(_expDate), // Helper function
  "barcode": _barcodeController.text,
};

// Call provider
await context.read<InventoryProvider>().addItem(newItem);
```
