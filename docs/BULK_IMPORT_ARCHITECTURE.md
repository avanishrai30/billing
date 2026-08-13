# Bulk Import Engine Architecture (Stage 09)

This document details the multi-stage, transactional architecture of the Intelligent Bulk Product Importer in the VC Organic Billing System.

---

## 1. End-to-End Import Pipeline

```
Spreadsheet (.xlsx, .xls, .csv)
             ↓
[1. File & Sheet Parser] (Browser SheetJS + UTF-8 / BOM auto-clean)
             ↓
[2. Header Normalizer] (Strips whitespace, symbols, case; detects aliases)
             ↓
[3. Column Mapper] (Interactive UI allows user override & mapping)
             ↓
[4. Pre-Commit Validation & Preview]
    POST /api/v1/products/import/preview
    - Exact Barcode Match
    - Exact SKU Match
    - Cross-Product Conflict Detection
    - Intra-Batch Duplicate Check
    - Returns summary KPIs + row-level classifications
             ↓
[5. Interactive Review & Strategy Selection] (Read-Only Preview Table)
    - ADD + UPDATE / ADD NEW ONLY / UPDATE EXISTING ONLY
    - Default Store Selection for Initial Stock
             ↓
[6. Transactional Commit Execution]
    POST /api/v1/products/import/commit
    - Idempotency check on importId
    - Server-side Revalidation
    - Product Master created/updated in 'products'
    - Barcode Registry updated in 'product_barcodes'
    - Authoritative Stock allocated via inventoryService.addStockBatch()
    - Immutable movement records in 'inventory_ledger' (type: OPENING_STOCK)
    - Audit log written via auditService (type: IMPORT_COMPLETED, STOCK_OPENING)
    - Granular Socket.IO events emitted (products_imported, import_completed)
             ↓
[7. Results & Error Reporting]
    - Summary of new products, updates, inventory movements, and per-row error logs
```

---

## 2. Product Matching Priority & Rules

1. **Exact Primary Barcode Match**: Matches `product_barcodes.barcode` or `products.barcode`.
2. **Exact SKU Match**: Matches `products.sku`.
3. **Exact Variant Barcode / SKU**: Matches `products.variants`.
4. **No Automatic Plain Name Merge**: If a product has a matching name but differing barcode/SKU, it is treated as a **new distinct product** (with a `POSSIBLE_NAME_MATCH` warning) rather than silently overwriting another catalog item.

---

## 3. Authoritative Inventory Integration

* The bulk importer **never writes directly to `products.stock` as the source of truth**.
* Opening stock quantities are routed through `inventoryService.addStockBatch()` targeting the resolved `locationId`.
* This updates the authoritative `inventory` collection balance and records an audit-compliant transaction in `inventory_ledger` with `reference: IMPORT:<importId>`.

---

## 4. Import Idempotency & Error Isolation

* Every import run uses a unique `importId`.
* Retrying a previously completed `importId` immediately returns the existing session summary without duplicating products or inventory movements.
* If a single row fails during batch execution (e.g. server revalidation conflict), that row's error is logged, while remaining valid rows proceed cleanly to completion.
