# Print Center Gap Report

## Root Cause: Empty Receipt Items

### Primary Bug: Invoice ID Extraction Failure

After POS checkout at line 10661-10663 in `aiavro_billing_system.html`:

```javascript
const result = await api.invoices.save(newInvoice);
if (result.success) {
    const invoiceId = result.invoiceNumber;  // ← BUG: should be result.invoice.invoiceNumber
```

The backend response shape is `{ success: true, invoice: { invoiceNumber, items, ... } }`.  
`result.invoiceNumber` resolves to `undefined`.  
`result.invoice.invoiceNumber` is the correct path.

### Chain of Failure

1. `invoiceId` = `undefined`
2. `syncStateWithServer()` re-fetches all invoices from backend
3. `openInvoicePreviewModal(undefined)` is called
4. `state.invoices.find(i => i.id === undefined)` returns `undefined`
5. Function returns early at line 10790: `if (!inv) return;`
6. But the modal was already shown (line 10787), so it displays with stale/empty HTML from a previous render

### Result: The modal opens with its HTML container visible, but the item table body is empty because data population was skipped.

---

## Secondary Issues Found

### 2. Store Branding Resolution

Line 10812:
```javascript
const biz = state.businesses.find(b => b.id === inv.businessId) || DEFAULT_BUSINESSES[0];
```

- `DEFAULT_BUSINESSES` = `[]` (empty), so fallback is `undefined`
- `inv.businessId` is set to `targetLocationId` (store ID) by the backend, which may not match any business `id`
- No fallback to `inv.storeId` or `inv.locationId` for store lookup

### 3. Customer Fallback

Line 10813:
```javascript
const cust = state.customers.find(c => c.id === inv.customerId) || DEFAULT_CUSTOMERS[2];
```

- `DEFAULT_CUSTOMERS` = `[]`, so `DEFAULT_CUSTOMERS[2]` = `undefined`
- If customer is not found, accessing `cust.name`, `cust.phone` crashes with TypeError

### 4. Field Name Mismatches

| Frontend Renderer Expects | Backend Saves | Status |
|:---|:---|:---|
| `inv.grandtotal` | `grandtotal` (legacy alias) | ✅ OK |
| `inv.subtotal` | `subtotal` | ✅ OK |
| `inv.discount` | `discount` | ✅ OK |
| `inv.tax` | `tax` | ✅ OK |
| `inv.roundoff` | not saved by backend | ❌ MISSING |
| `inv.paymentMode` | `paymentMode` | ✅ OK |
| `inv.status === 'paid'` | `status: 'COMPLETED'` | ⚠️ Mismatch (UPI QR only) |
| `item.price` | `price` (saved) | ✅ OK |
| `item.gstRate` | `gst` (saved as `gst`) | ⚠️ Field name mismatch |
| `item.unit` | `unit` | ✅ OK |

### 5. `inv.roundoff` Missing

The frontend sends `roundoff` in `newInvoice`, and the backend spreads `...invoiceData` so it's preserved. But the backend doesn't explicitly validate or recalculate it. For legacy invoices that don't have roundoff, `inv.roundoff.toFixed(2)` crashes.

### 6. PDF Generation

The PDF route at `GET /api/v1/invoices/:invoiceNumber/pdf` uses `item.price` which matches the stored field. PDF data is consistent with the stored invoice.

### 7. Missing `frontend-api/invoices.js` Methods

Current methods: `list()`, `save()`, `void()`  
Missing: `getById()`, `getPdf()`

---

## Fix Plan

1. Fix invoice ID extraction: `result.invoice.invoiceNumber` or `result.invoice.id`
2. Use the freshly-returned invoice directly instead of re-fetching
3. Add `normalizeInvoiceForPrint()` to safely resolve all field aliases
4. Add `resolveInvoiceBranding()` for store/outlet branding
5. Add safe customer fallback (Walk-in Customer)
6. Guard all `.toFixed()` calls against undefined/null
7. Add `getById()` and `getPdf()` to frontend-api/invoices.js
8. Fix `item.gstRate` vs `item.gst` normalization
