# Database Index Reconciliation Report

**Date:** August 14, 2026  
**Status:** Canonical Index Specifications & Policy  
**Architecture:** Safe verification without automatic destructive drops

---

## 1. Index Audit & Reconciliation Matrix

| Collection | Index Name | Key Specification | Unique | Sparse | Text Weights | Target Expected | Actual Production | Status | Migration Required | Reason / Decision |
|---|---|---|---|---|---|---|---|---|---|---|
| `products` | `sku_1_sparse` | `{ sku: 1 }` | `true` | `true` | N/A | `{ sku: 1 }` (unique, sparse) | `{ sku: 1 }` (unique) | **ACCEPTED_OPTION_VARIATION** | **No** | Production index is already unique; sparse flag difference does not impact non-null SKUs. Preserved safely. |
| `products` | `barcode_1_sparse` | `{ barcode: 1 }` | `false` | `true` | N/A | `{ barcode: 1 }` (sparse) | `{ barcode: 1 }` (sparse) | **VERIFIED** | **No** | Matches canonical sparse definition. |
| `products` | `name_text` / `products_text_search` | `{ _fts: 'text', _ftsx: 1 }` | `false` | `false` | `{ name: 1 }` vs `{ name: 1, category: 1, brand: 1 }` | Multi-field text index | Single-field `name_text` | **ACCEPTED_LEGACY** | **No** | Application search (`modules/products.js:109-140`) uses regex `$regex: s, $options: 'i'` on name/SKU/barcode and exact match on category/brand. `$text` is not used in production queries; legacy `name_text` is retained without auto-drop. |
| `product_barcodes` | `barcode_1` | `{ barcode: 1 }` | `false` | `false` | N/A | `{ barcode: 1 }` | `{ barcode: 1 }` | **VERIFIED** | **No** | Exact match. |
| `product_barcodes` | `productId_1` | `{ productId: 1 }` | `false` | `false` | N/A | `{ productId: 1 }` | `{ productId: 1 }` | **VERIFIED** | **No** | Exact match. |
| `inventory` | `productId_1_locationId_1` | `{ productId: 1, locationId: 1 }` | `false` | `false` | N/A | `{ productId: 1, locationId: 1 }` | `{ productId: 1, locationId: 1 }` | **VERIFIED** | **No** | Ensures fast compound lookup during POS stock checks. |
| `inventory` | `locationId_1` | `{ locationId: 1 }` | `false` | `false` | N/A | `{ locationId: 1 }` | `{ locationId: 1 }` | **VERIFIED** | **No** | Store snapshot retrieval. |
| `inventory_ledger` | `createdAt_desc_productId_locationId` | `{ createdAt: -1, productId: 1, locationId: 1 }` | `false` | `false` | N/A | `{ createdAt: -1, productId: 1, locationId: 1 }` | `{ createdAt: -1, productId: 1, locationId: 1 }` | **VERIFIED** | **No** | Historical audit trail. |
| `inventory_ledger` | `locationId_1_createdAt_desc` | `{ locationId: 1, createdAt: -1 }` | `false` | `false` | N/A | `{ locationId: 1, createdAt: -1 }` | `{ locationId: 1, createdAt: -1 }` | **VERIFIED** | **No** | Store-scoped paginated ledger queries. |
| `invoices` | `locationId_1_createdAt_desc` | `{ locationId: 1, createdAt: -1 }` | `false` | `false` | N/A | `{ locationId: 1, createdAt: -1 }` | `{ locationId: 1, createdAt: -1 }` | **VERIFIED** | **No** | High-frequency scoped invoice listings. |
| `invoices` | `invoiceNumber_1_sparse` | `{ invoiceNumber: 1 }` | `true` | `true` | N/A | `{ invoiceNumber: 1 }` (unique, sparse) | `{ invoiceNumber: 1 }` | **VERIFIED** | **No** | Fast invoice lookup & idempotency. |
| `invoices` | `transactionId_1_sparse` | `{ transactionId: 1 }` | `false` | `true` | N/A | `{ transactionId: 1 }` (sparse) | `{ transactionId: 1 }` | **VERIFIED** | **No** | POS idempotency guard. |
| `purchases` | `locationId_1_createdAt_desc` | `{ locationId: 1, createdAt: -1 }` | `false` | `false` | N/A | `{ locationId: 1, createdAt: -1 }` | `{ locationId: 1, createdAt: -1 }` | **VERIFIED** | **No** | Store-scoped purchase lists. |
| `purchases` | `supplierId_1` | `{ supplierId: 1 }` | `false` | `false` | N/A | `{ supplierId: 1 }` | `{ supplierId: 1 }` | **VERIFIED** | **No** | Supplier purchase history. |
| `users` | `username_1_sparse` | `{ username: 1 }` | `true` | `true` | N/A | `{ username: 1 }` (unique, sparse) | `{ username: 1 }` | **VERIFIED** | **No** | Authentication lookups. |
| `audit_logs` | `timestamp_desc` | `{ timestamp: -1 }` | `false` | `false` | N/A | `{ timestamp: -1 }` | `{ timestamp: -1 }` | **VERIFIED** | **No** | Security timeline logs. |
| `audit_logs` | `storeId_1_timestamp_desc` | `{ storeId: 1, timestamp: -1 }` | `false` | `false` | N/A | `{ storeId: 1, timestamp: -1 }` | `{ storeId: 1, timestamp: -1 }` | **VERIFIED** | **No** | Store security audits. |

---

## 2. Text Search Query Audit & Decision

### Codebase Search Query Analysis:
- `modules/products.js:109-140` executes:
  ```javascript
  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [
      { name: { $regex: s, $options: 'i' } },
      { sku: { $regex: s, $options: 'i' } },
      { barcode: { $regex: s, $options: 'i' } }
    ];
  }
  ```
- No `$text` query operator is used in any API route or service.
- **Decision:** **OPTION A (Accepted Legacy State)**
  - Existing `name_text` index is retained safely.
  - No destructive index drop is executed on boot.
  - Index Manager recognizes `name_text` as an `ACCEPTED_LEGACY` text index and reports `Errors: 0`.

---

## 3. Database Index Manager Contract

- **Startup Execution:** Index verification only.
- **Data Safety:** Zero `updateMany` or `deleteMany` mutations during application boot.
- **Semantic Accuracy:** Distinguishes exact match from option variations and legacy text indexes without false errors.
