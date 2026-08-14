# Legacy Barcode Migration Guide & Policy

**Date:** August 14, 2026  
**Status:** Separation of Migration from Application Startup  
**Script Location:** [`scripts/migrations/clean_legacy_barcodes.js`](file:///Users/avanish/Documents/billing%20system/scripts/migrations/clean_legacy_barcodes.js)

---

## 1. Background & Root Cause

In early iterations of the system, products imported or saved without barcodes stored `barcode: ""` (an empty string) or `barcode: null` explicitly in the MongoDB document.

When MongoDB's sparse index `{ barcode: 1 }` is applied:
- Documents **missing** the `barcode` field are omitted from the index.
- Documents with `barcode: ""` are indexed as a valid value `""`.
- Therefore, importing or saving more than one product with `barcode: ""` resulted in:
  `MongoServerError: E11000 duplicate key error collection: vc_organic.products index: barcode_1 dup key: { barcode: "" }`

---

## 2. Separation of Concerns: Why Boot Cleanup Was Removed

Previously, `services/databaseIndexService.js` automatically executed:
```javascript
await db.collection('products').updateMany({ $or: [{ barcode: "" }, ...] }, { $unset: { barcode: "" } });
await db.collection('product_barcodes').deleteMany({ $or: [{ barcode: "" }, ...] });
```
on every Node.js / PM2 process start.

### Risks of Boot Cleanup:
1. **Implicit Production Data Mutation:** Modifying customer data during application initialization without operator authorization.
2. **Hidden Side Effects:** Database writes during startup could mask bugs in upstream persistence code.
3. **Cluster & Concurrency Interference:** In multi-worker PM2 cluster setups, multiple workers concurrently running `updateMany` can cause write contention on boot.

### New Architecture:
- **Application Startup (`server.js` $\rightarrow$ `databaseIndexService.js`):** Performs **index verification only** (Zero data mutations).
- **Application Write Paths (`bulkImportService.js`, `modules/products.js`):** Strictly enforces `$unset: { barcode: "" }` and normalizes all blank inputs to absent fields before writing.
- **Explicit Migration Script (`scripts/migrations/clean_legacy_barcodes.js`):** Performs one-time, operator-controlled cleanup of legacy records.

---

## 3. Migration Script Specifications

### 3.1 Dry-Run Mode (Default)
Inspects the database and outputs counts of matching records without mutating:
```bash
node scripts/migrations/clean_legacy_barcodes.js --dry-run
```

**Output:**
```json
{
  "mode": "DRY-RUN",
  "productsIdentified": 1,
  "productBarcodesIdentified": 0,
  "productsModified": 0,
  "productBarcodesDeleted": 0,
  "timestamp": "2026-08-14T04:45:00.000Z"
}
```

### 3.2 Apply Mode
Executes the safe `$unset` and `deleteMany` operations idempotently:
```bash
node scripts/migrations/clean_legacy_barcodes.js --apply
```

**Output:**
```json
{
  "mode": "APPLY",
  "productsIdentified": 1,
  "productBarcodesIdentified": 0,
  "productsModified": 1,
  "productBarcodesDeleted": 0,
  "timestamp": "2026-08-14T04:45:10.000Z"
}
```

---

## 4. Rollback & Recovery Considerations

- The migration unsets only `barcode: ""` and whitespace strings. Non-empty barcodes (e.g. `8901234567890`) are untouched.
- If a product legitimately requires a barcode later, it can be assigned via the Product Master UI or Barcode Matrix at any time.
- Nightly backups via [`scripts/backup-drive.sh`](file:///Users/avanish/Documents/billing%20system/scripts/backup-drive.sh) ensure point-in-time recovery if needed.
