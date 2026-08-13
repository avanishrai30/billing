# Bulk Import Error Matrix & Conflict Resolution

This document describes all validation error codes, classification states, and conflict resolution rules used by the Intelligent Bulk Import Engine.

---

## 1. Row Classification States

| Classification | Meaning | Action Taken |
| :--- | :--- | :--- |
| **`NEW`** | The row does not match any existing product by Barcode or SKU. | Ready to be created as a new Product Master record upon user approval. |
| **`EXISTING`** | The row matched an active product by exact Barcode or SKU with unchanged pricing. | In `ADD_AND_UPDATE` mode, details are preserved or merged. In `ADD_NEW_ONLY` mode, row is skipped. |
| **`UPDATE`** | The row matched an existing product, and field updates (e.g. price change, metadata change) were detected. | Requires approval before updating Product Master catalog prices. |
| **`CONFLICT`** | Conflicting identifiers detected across multiple existing products (e.g., Barcode belongs to Product A, but SKU belongs to Product B). | Blocked. Requires user review or spreadsheet correction. |
| **`INVALID`** | Required fields missing or invalid data types (e.g., missing product name, negative price, duplicate barcode in sheet). | Row is rejected and will not be imported. |
| **`SKIPPED`** | Row skipped in accordance with the selected import strategy (e.g., existing product during `ADD_NEW_ONLY`). | Ignored during commit. |

---

## 2. Validation Error & Warning Codes

| Code | Severity | Description | Suggested Fix |
| :--- | :--- | :--- | :--- |
| **`MISSING_NAME`** | `ERROR` | Product Name column value is empty or whitespace. | Provide a valid product name. |
| **`INVALID_PRICE`** | `ERROR` | Selling price and purchase price are both $\le 0$. | Specify selling price and purchase price $> 0$. |
| **`DUPLICATE_BARCODE_IN_BATCH`** | `ERROR` | The exact same barcode appears multiple times in the uploaded spreadsheet. | Ensure each distinct product has a unique barcode. |
| **`DUPLICATE_SKU_IN_BATCH`** | `ERROR` | The exact same SKU appears multiple times in the spreadsheet. | Assign unique SKU codes to distinct items. |
| **`SKU_CROSS_PRODUCT_CONFLICT`** | `ERROR` | Primary barcode belongs to Product X, but SKU belongs to Product Y. | Reconcile identifiers so barcode and SKU correspond to the same product. |
| **`PRICE_CHANGE`** | `WARNING` | Incoming prices differ from current Product Master prices in database. | Review price change to confirm update intent. |
| **`POSSIBLE_NAME_MATCH`** | `WARNING` | Product with similar name exists under a different barcode. | System will create as a distinct product rather than silently merging. |
| **`UNUSUAL_GST`** | `WARNING` | GST slab is non-standard (standard slabs: 0, 5, 12, 18, 28%). | Verify tax classification. |
| **`UNKNOWN_STORE_FALLBACK`** | `WARNING` | Store name in spreadsheet was not found in stores registry. | Stock allocates to the default store selected in the import wizard. |
| **`AUTO_GENERATED_BARCODE`** | `INFO` | Barcode was omitted; system generated internal barcode `VC...`. | Informational only. |

---

## 3. Server Revalidation on Commit

To protect against race conditions where another terminal registers a barcode while a user is reviewing the preview table:
1. The server checks active database barcodes immediately prior to writing each row.
2. If a collision is discovered, the row is marked `FAILED` with `Server revalidation failed` and recorded in the session error log.
3. Independent valid rows in the batch proceed without data corruption.
