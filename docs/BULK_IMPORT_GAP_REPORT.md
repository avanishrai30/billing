# Stage 09 — Intelligent Bulk Import Engine: Inspection & Gap Report

## Executive Summary

This document presents a comprehensive architectural inspection of the bulk product import subsystem in the VC Organic Billing System. It analyzes the frontend parser, UI controls, backend import API, product matching logic, inventory integration, barcode integrity, transaction safety, and error reporting mechanisms.

---

## 1. Current Import UI Architecture

* **File Selection & Extensions**:
  * `<input type="file" id="excel-file-input" accept=".xlsx, .xls, .csv">` (line 5667 in `aiavro_billing_system.html`).
  * Drag-and-drop is visually suggested by a dashed border box but is not implemented with HTML5 drag/drop event listeners (`ondrop`, `ondragover`).
* **Parser Library**:
  * SheetJS (`XLSX` library loaded globally).
  * Executes `const workbook = XLSX.read(data, { type: 'array' })` followed by `XLSX.utils.sheet_to_json(worksheet)`.
* **Sheet Selection**:
  * Hardcoded to `workbook.SheetNames[0]`. Multi-sheet workbooks cannot be previewed or selected by the user.
* **Header & Row Processing**:
  * Iterates over JSON rows using a key cleaner: `key.toLowerCase().trim().replace(/[^a-z0-9]/g, "")`.
* **Preview & Validation**:
  * Only displays a simple 4-line summary:
    * Total rows in sheet
    * Ready to Import / Process
    * Matching Existing Products
    * Skipped Invalid
  * Includes a small scrollable diagnostic list for errors.
  * **Gap**: There is no interactive table preview showing column mappings, per-row data validation, or row-by-row action indicators (`NEW`, `UPDATE`, `CONFLICT`, `INVALID`).
* **Duplicate Strategy Selector**:
  * Strategy dropdown (`#excel-duplicate-strategy`) offers:
    * `merge` (Adds incoming stock to client product object)
    * `replace` (Overwrites client product object)
    * `skip` (Leaves client product object unchanged)
* **Import Execution**:
  * Executes client-side array mutation in `state.products`, calls `api.products.import({ newProducts, logs })`, and triggers `syncStateWithServer()`.

---

## 2. Current Import Code Trace

```
1. User selects File
   ↓
2. handleExcelFileSelect(event) [aiavro_billing_system.html:12796]
   - XLSX.read() & XLSX.utils.sheet_to_json()
   - Row-by-row regex header matching
   - Local validation (name present, price > 0, valid GST)
   - Checks existing products via findProductByBarcode() or name.toLowerCase()
   - Generates excelImportData array
   ↓
3. User clicks "Run Bulk Import"
   ↓
4. processExcelImport() [aiavro_billing_system.html:12973]
   - Applies local duplicate strategy (merge/replace/skip) on state.products
   - Creates simulated client-side inventory logs
   - Calls api.products.import({ newProducts, logs }) [frontend-api/products.js:46]
   ↓
5. POST /api/v1/products/import [modules/products.js:414]
   - Reads req.body.newProducts || req.body.products
   - Loops over array:
     - Matches ONLY on { sku: cleanSku } with { upsert: true }
     - Calls syncProductBarcodes(db, productId, primaryBarcode, ...)
   - Writes audit log: product_imported
   - Emits Socket.IO event: products_imported
   ↓
6. Frontend executes syncStateWithServer()
```

---

## 3. Current Header Contract & Aliases

| Field | Current Parser Aliases (`cleanKey`) | Default Fallback |
| :--- | :--- | :--- |
| **Product Name** | `name`, `productname`, `itemname`, `title`, `product`, `item`, `description` | Required (fails row if missing) |
| **Barcode / SKU** | `barcode`, `sku`, `itemcode`, `upc`, `ean`, `code`, `id`, `productid` | Auto-generated: `VC{timestamp}{i}` |
| **Category** | `category`, `group`, `type`, `section`, `class` | `"Dairy & Ghee"` |
| **Buying Price** | `buyingprice`, `wholesale`, `cost`, `purchaseprice`, `buying`, `costprice`, `cp`, `unitcost`, `purchase` | `0` (fails row if <= 0) |
| **Selling Price** | `sellingprice`, `price`, `mrp`, `selling`, `retail`, `sp`, `saleprice`, `retailprice`, `rate` | `0` (fails row if <= 0) |
| **Stock / Qty** | `stock`, `initialstock`, `qty`, `quantity`, `count`, `onhand` | `0` |
| **GST Rate** | `gst`, `gstslab`, `tax`, `vat`, `taxrate` | `12` (fails row if not in [0, 5, 12, 18, 28]) |
| **Unit** | `unit`, `pack`, `packaging`, `measure`, `size` | `"1 Unit"` |
| **Brand** | `brand`, `company`, `manufacturer`, `make` | `"AIAVRO"` |
| **Supplier** | `supplier`, `vendor`, `source` | `"Direct Farmer Market"` |
| **DOM** | `dom`, `mfgdate`, `mfg` | Current date (YYYY-MM-DD) |
| **DOE** | `doe`, `expiry`, `expdate` | Current date + 180 days |
| **Min Stock** | `minstock`, `reorder`, `safety` | `10` |
| **Max Stock** | `maxstock`, `limit` | `100` |
| **Store** | `store`, `location`, `outlet` | `"Main Store"` |
| **Image URL** | `image`, `imagepath`, `productimage`, `picture` | `"/uploads/system/default-product.webp"` |

---

## 4. Header Alias Gaps & Root Cause of User-Reported Bug

### Reported Bug:
> "Total rows: 7, Ready to import: 0, Skipped invalid: 7 — Missing 'Product Name' column data."

### Root Causes:
1. **Header Normalization Limitations**:
   - The parser strips non-alphanumeric characters, but files containing Unicode Byte Order Marks (`\ufeff`), headers like `Item Description`, `Particulars`, `Product / Service`, `Name of Item`, `Product Title`, or leading/trailing whitespace in raw keys can fail to match the hardcoded alias array.
2. **Missing Inversion Safety**:
   - In some supplier spreadsheets, columns are labeled `Purchase Rate` or `MRP / Retail`. If an unlisted alias is used, price is parsed as `0` and rejected.
3. **No Interactive Column Mapping**:
   - Users cannot manually map spreadsheet headers (e.g., mapping `Item_Desc` $\rightarrow$ `Product Name`) when automatic detection fails.

---

## 5. Product Matching & Existing Product Behavior

* **Current Frontend Matching**:
  * Checks `findProductByBarcode(barcode)` (matches barcode, SKU, variant barcodes) **OR** `state.products.find(p => p.name.toLowerCase() === name.toLowerCase())`.
  * **Risk**: Matching by plain product name can cause accidental merges of distinct products that share generic names (e.g., "Cow Milk 500ml" vs "Cow Milk 1L").
* **Current Backend Matching**:
  * `db.collection('products').updateOne({ sku: cleanSku }, { $set: productDoc }, { upsert: true })`.
  * **Critical Discrepancy**: The backend matches **strictly by SKU**. It does not check barcode indexes, IDs, or the user's selected strategy (`merge`, `replace`, `skip`).
* **Target Matching Priority**:
  1. Exact Primary Barcode
  2. Exact SKU
  3. Variant / Alternate Barcode
  4. Explicit Product ID
  5. New Product (Never merge on plain name alone without user confirmation)

---

## 6. Authoritative Inventory Integration Gap

### The Single Largest Architecture Gap:
In Stage 07 & 08, authoritative stock was migrated to the `inventory` collection and `inventory_ledger`.
However, the current bulk import:
1. Mutates `product.stock` on the client.
2. Sends `newProducts` to `POST /api/v1/products/import`.
3. The backend saves `product.stock` into the `products` collection.
4. **The backend DOES NOT call `inventoryService.addStockBatch()` or `inventoryService.adjustStock()`.**
5. **No records are created in `inventory` or `inventory_ledger`.**

### Required Target Architecture:
When products are imported with opening stock:
```
Product Master Saved / Updated
         ↓
Resolve Target locationId (Store / Warehouse)
         ↓
inventoryService.recordMovementAtomic() / addStockBatch()
         ↓
Authoritative balance updated in inventory collection
         ↓
Immutable ledger entries written (type: OPENING_STOCK or IMPORT_STOCK)
```

---

## 7. Barcode Safety & Collision Gaps

* **Current Flow**:
  * Backend calls `syncProductBarcodes(db, productId, primaryBarcode, ...)`.
  * If another product in the database already has that barcode, `syncProductBarcodes` throws `PRODUCT_BARCODE_ALREADY_EXISTS`.
* **Failure Mode**:
  * Because `POST /api/v1/products/import` runs in an unisolated loop without pre-validation, throwing on row 52 aborts the entire HTTP request with a 500 error.
  * Rows 1 to 51 remain saved in MongoDB without opening stock or rollback tracking.
  * The user receives a generic error message with zero information on which barcode collided or on which row.

---

## 8. Product Types (OWN vs EXTERNAL), Categories & Brands

* **Product Type**:
  * Spreadsheet parser currently does not extract `type` (OWN/EXTERNAL).
  * Backend defaults `type: (prod.type || 'OWN').toUpperCase()`. Both share the same Product Master schema.
* **Categories & Brands**:
  * Stored as free-text strings on the product document.
  * No validation against category or brand masters; no auto-creation in category/brand lookup tables.

---

## 9. Transaction Safety, Batch Size & Performance

* **Batching**:
  * Frontend sends all parsed rows in a single HTTP payload.
  * For 5,000+ rows, this can cause request payload bloat and long-running database operations.
* **Partial Failures**:
  * No two-phase commit or transactional rollback.
  * No isolation between valid rows and invalid rows.
* **Target Solution**:
  * **Phase 1: Pre-Commit Validation & Preview API (`POST /api/v1/products/import/validate`)**:
    * Validates all rows, detects collisions, checks existing SKU/barcodes, and returns a detailed analysis matrix.
  * **Phase 2: User Approval & Execution (`POST /api/v1/products/import/commit`)**:
    * Processes rows in controlled chunks (e.g., 50–100 items/chunk) with explicit duplicate strategy (`ADD_NEW_ONLY`, `UPDATE_EXISTING`, `MERGE_STOCK`, `REPLACE_ALL`).
    * Integrates with `inventoryService` for authoritative stock creation.

---

## 10. Summary Matrix: Current vs Target Architecture

| Area | Current Implementation | Target Stage 09 Architecture |
| :--- | :--- | :--- |
| **File Parser** | Browser-only SheetJS, single sheet | Multi-sheet support, CSV/XLSX, auto-encoding |
| **Header Matching** | Static regex array | Dynamic alias dictionary + UI column mapper |
| **Matching Key** | Frontend: Barcode or Name; Backend: SKU only | Exact Barcode $\rightarrow$ SKU $\rightarrow$ Variant Barcode $\rightarrow$ New |
| **Duplicate Strategy** | Client-side array mutation | Server-enforced strategies (`ADD_NEW`, `UPDATE`, `MERGE_STOCK`) |
| **Inventory Allocation** | Non-authoritative `product.stock` | Authoritative `inventory` + `inventory_ledger` movements |
| **Barcode Safety** | Throws 500 midway on collision | Pre-flight duplicate detection, reports row & conflicting product |
| **Preview UI** | 4 bullet points | Full interactive data grid with status pills per row |
| **Error Reporting** | Generic alerts | Granular error report (Row #, Column, Offending Value, Reason) |
| **Audit & Realtime** | Single `product_imported` log | `IMPORT_STARTED`, `IMPORT_COMPLETED`, structured audit per store |

---

## 11. Recommendations for Stage 09 Implementation Plan

1. **Backend Pre-Commit Validation Endpoint (`POST /api/v1/products/import/validate`)**:
   - Takes parsed rows, checks database for existing barcodes, SKUs, and categories, and returns classified rows (`NEW`, `UPDATE`, `CONFLICT`, `INVALID`).
2. **Backend Import Commit Endpoint (`POST /api/v1/products/import/commit`)**:
   - Executes product master creation/updates.
   - Allocates initial inventory to selected `locationId` via `inventoryService.adjustStock()` / `addStockBatch()` with ledger movement type `OPENING_STOCK`.
   - Enforces user-selected strategy without silent name merges.
3. **Frontend Import Modal Redesign**:
   - Drag & Drop file zone.
   - Column Mapping step (auto-mapped + manual override).
   - Full Interactive Preview Table with filter pills (All, Ready, Updates, Conflicts, Errors).
   - Strategy selector (`Add New Only`, `Update Existing Only`, `Add & Merge Stock`).
   - Store / Location selector for initial stock allocation.
