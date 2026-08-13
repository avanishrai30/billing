# Transaction Flows — Stage 08

This document describes the complete transaction lifecycle for **Purchases**, **POS Sales (Invoices)**, **Stock Transfers**, and **Invoice/Purchase Voids** in the VC Organic Billing System.

---

## 1. Purchase Flow

```
Supplier
  ↓
POST /api/v1/purchases  { transactionId, supplierId, locationId, items, … }
  ↓
Idempotency check (transactionId in purchases collection)
  ↓  duplicate → return existing record, skip stock
  ↓  new →
Validate items (productId, quantity > 0, unitCost)
  ↓
Server recalculates: lineTotals, subtotal, tax, total
  ↓
inventoryService.addStockBatch(items, locationId, purchaseId, username)
  ↓
Inventory balance incremented atomically
  ↓
Immutable inventory_ledger entries (type: PURCHASE_IN)
  ↓
Purchase document saved (status: COMPLETED)
  ↓
auditService.writeAuditLog('STOCK_PURCHASE', …)
  ↓
io.emit('purchase_created') to sync_global room
```

### Purchase Data Model

| Field | Type | Description |
|:------|:-----|:------------|
| `purchaseId` | string | Canonical unique identifier |
| `transactionId` | string | Idempotency key |
| `supplierId` | string | Supplier reference |
| `locationId` | string | Destination store/warehouse |
| `invoiceNumber` | string | Vendor bill number |
| `purchaseDate` | ISO string | Date of purchase |
| `items[]` | array | Line items |
| `items[].productId` | string | Product reference |
| `items[].variantId` | string | Variant reference (if applicable) |
| `items[].quantity` | number | Units received |
| `items[].unitCost` | number | Per-unit cost |
| `items[].tax` | number | Line-level tax amount |
| `items[].lineTotal` | number | Calculated line total |
| `subtotal` | number | Server-calculated subtotal |
| `tax` | number | Server-calculated total tax |
| `total` | number | Server-calculated grand total |
| `status` | string | DRAFT / PENDING / COMPLETED / FAILED / VOIDED |
| `createdBy` | string | Username who created |
| `createdAt` | ISO string | Creation timestamp |

### Purchase Idempotency

The `transactionId` field prevents duplicate processing. When a browser retries a purchase POST:

1. Server checks `purchases` collection for existing `transactionId`.
2. If found and not archived → returns `{ success: true, duplicate: true }` with the existing record.
3. `addStockBatch()` is never called again.
4. Stock is never incremented twice.

### Purchase Void

```
DELETE /api/v1/purchases/:id
  ↓
Find purchase by id/purchaseId
  ↓
Check: not already VOIDED / isArchived
  ↓  already voided → 400 PURCHASE_ALREADY_VOIDED
  ↓  active →
inventoryService.revertStockBatch(items, locationId, 'purchase_void', …)
  ↓
Inventory decremented (reverse of addStockBatch)
  ↓
Reverse ledger entries created
  ↓
Purchase marked: status=VOIDED, isArchived=true
  ↓
auditService.writeAuditLog('STOCK_VOID', …)
  ↓
io.emit('purchase_deleted')
```

---

## 2. POS Sale / Invoice Flow

```
Browser: product search / barcode scan
  ↓
Cart (frontend advisory stock only)
  ↓
POST /api/v1/invoices  { transactionId, locationId, items, paymentMode, … }
  ↓
Store authorization check (user.assignedStoreId vs locationId)
  ↓  unauthorized → 403 UNAUTHORIZED_STORE
  ↓
Idempotency check (transactionId in invoices collection)
  ↓  duplicate → return existing invoice, skip stock
  ↓  new →
Server-side line item recalculation (lineTotal, subtotal, tax, grandTotal)
  ↓
Payment mode validation (CASH / UPI / CARD / BANK)
  ↓
inventoryService.consumeStockBatch(items, locationId, invoiceNumber, username)
  ↓  insufficient stock → 400 INSUFFICIENT_STOCK + compensating rollback
  ↓  success →
Invoice document saved (status: COMPLETED)
  ↓
auditService.writeAuditLog('STOCK_SALE', …)
  ↓
io.emit('invoice_created') to store room
```

### Price Integrity

The server does NOT trust browser-submitted totals. For every item:

```
lineGross = quantity × unitPrice
lineTax   = lineGross × taxRate / 100
subtotal  = Σ lineGross
tax       = Σ lineTax
grandTotal = subtotal + tax - discount
```

All values are rounded to 2 decimal places.

### Invoice Idempotency

Same pattern as purchases. The `transactionId` field prevents duplicate invoice creation on browser retry/timeout.

### Payment Methods

| Method | Description |
|:-------|:------------|
| `CASH` | Cash payment |
| `UPI` | UPI digital payment |
| `CARD` | Credit/debit card |
| `BANK` | Bank transfer |

No payment gateway integrations. `paymentMode` is stored on the invoice document.

### Invoice Void

```
POST /api/v1/invoices/:id/void
  ↓
Find invoice by invoiceNumber/id
  ↓
Check: not already VOIDED / isArchived
  ↓  already voided → 400 TRANSACTION_ALREADY_VOIDED
  ↓  active →
inventoryService.revertStockBatch(items, locationId, 'VOID', 'invoice_void', …)
  ↓
Inventory restored atomically
  ↓
Reverse ledger entries created
  ↓
Invoice marked: status=VOIDED, isArchived=true
  ↓
auditService.writeAuditLog('STOCK_VOID', …)
  ↓
io.emit('invoice_voided')
```

Double-void is blocked: if `isArchived === true` or `status === 'VOIDED'`, the server returns HTTP 400 without touching inventory.

---

## 3. Stock Transfer Flow

```
POST /api/v1/inventory/transfer  { productId, fromLocationId, toLocationId, quantity, transferId, … }
  ↓
Validate fields (productId, source ≠ target, quantity > 0)
  ↓
Store authorization (user.assignedStoreId vs fromLocationId)
  ↓  unauthorized → 403 UNAUTHORIZED_STORE
  ↓
Idempotency check (transferId/transactionId in inventory_ledger)
  ↓  duplicate → return existing result, skip stock
  ↓  new →
inventoryService.transferStock(productId, from, to, qty, username, notes)
  ↓
Atomic source decrement (quantity guard: $gte)
  ↓  insufficient → 400 INSUFFICIENT_STOCK
  ↓  success →
Destination increment
  ↓
Two immutable ledger entries:
  TRANSFER_OUT (source, referenceId)
  TRANSFER_IN  (destination, same referenceId)
  ↓
auditService.writeAuditLog('STOCK_TRANSFER', …)
  ↓
Response: { referenceId, transfer details }
```

### Transfer Atomicity

The transfer uses the existing compensating approach:
- Source decrement uses `$gte` guard (atomic).
- If source succeeds but destination fails, the source decrement is compensated (rolled back).
- The same `referenceId` links both `TRANSFER_OUT` and `TRANSFER_IN` ledger records.

---

## 4. Sale Return

**Current status**: Sale return functionality does not exist as a dedicated workflow in Stage 08. Returns can be handled via manual stock adjustment (`POST /api/v1/inventory/adjust` with type `SALE_RETURN`), but there is no return UI or dedicated return API endpoint.

**Gap for later**: Stage 09+ should implement a `POST /api/v1/returns` endpoint that creates a return document, calls `inventoryService.adjustStock()` with type `SALE_RETURN`, and links back to the original invoice.

---

## 5. Inventory Ledger Consistency

For every successful business transaction, the following contract holds:

| Transaction | Inventory Change | Ledger Type | Reference | Performed By |
|:------------|:-----------------|:------------|:----------|:-------------|
| Purchase | +qty | `PURCHASE_IN` | purchaseId | username |
| Sale | −qty | `SALE` | invoiceNumber | username |
| Purchase Void | −qty | `purchase_void` | purchaseId | username |
| Invoice Void | +qty | `VOID` | invoiceNumber | username |
| Transfer Out | −qty | `TRANSFER_OUT` | transferId | username |
| Transfer In | +qty | `TRANSFER_IN` | transferId | username |
| Adjustment | ±qty | `ADJUSTMENT` | referenceId | username |

Every ledger entry contains: `movementId`, `productId`, `locationId`, `type`, `quantity`, `beforeQuantity`, `afterQuantity`, `unitCost`, `totalValue`, `referenceType`, `referenceId`, `performedBy`, `createdAt`.

Ledger entries are **immutable after creation**.

---

## 6. Audit Events

| Event | Module | When |
|:------|:-------|:-----|
| `STOCK_PURCHASE` | purchase | Purchase created |
| `STOCK_VOID` | purchase | Purchase voided |
| `STOCK_SALE` | billing | Invoice created (POS sale) |
| `STOCK_VOID` | billing | Invoice voided |
| `STOCK_TRANSFER` | inventory | Stock transferred between stores |
| `STOCK_ADJUSTMENT` | inventory | Manual stock adjustment |

All audit events include `performedBy`, `timestamp`, `entityId`, and change details.

---

## 7. Realtime Events

| Event | Emitted After | Room |
|:------|:--------------|:-----|
| `purchase_created` | Successful purchase | `sync_global` |
| `purchase_deleted` | Purchase voided | `sync_global` |
| `invoice_created` | Successful POS sale | `store_{locationId}` |
| `invoice_voided` | Invoice voided | `store_{locationId}` |
| `inventory.updated` | Any inventory mutation | Per inventoryService |

Events are emitted **only after** the inventory mutation and document save succeed. Never before.

---

## 8. Error Contract

All transaction failure responses follow:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  },
  "requestId": "x-request-id header value"
}
```

### Error Codes

| Code | HTTP | Description |
|:-----|:-----|:------------|
| `INSUFFICIENT_STOCK` | 400 | Not enough inventory for the requested quantity |
| `DUPLICATE_TRANSACTION` | 200 | Transaction already processed (returned with `duplicate: true`) |
| `INVALID_ITEMS` | 400 | No valid items in request |
| `INVALID_QUANTITY` | 400 | Zero or negative quantity |
| `INVALID_LOCATION` | 400 | Missing or same-as-source location |
| `UNAUTHORIZED_STORE` | 403 | User not assigned to the target store |
| `TRANSACTION_ALREADY_VOIDED` | 400 | Invoice already voided |
| `PURCHASE_ALREADY_VOIDED` | 400 | Purchase already voided |
| `INVOICE_NOT_FOUND` | 404 | Invoice record not found |
| `PURCHASE_NOT_FOUND` | 404 | Purchase record not found |
| `PURCHASE_CREATION_FAILED` | 500 | Server error during purchase |
| `INVOICE_CREATION_FAILED` | 500 | Server error during invoice |
| `INVOICE_VOID_FAILED` | 500 | Server error during void |
| `TRANSFER_ERROR` | 500 | Server error during transfer |

---

## 9. Failure Handling & Compensation

### Checkout (consumeStockBatch) Failure

If any item in a multi-item basket fails (e.g., item 3 of 5 has insufficient stock):

1. Items 1–2 are rolled back via compensating `$inc: { quantity: +deducted }`.
2. Rollback successes and failures are tracked in `rollback_tracking` collection.
3. The invoice document is NOT created.
4. HTTP 400 `INSUFFICIENT_STOCK` is returned.

### Purchase (addStockBatch) Failure

If `addStockBatch` throws, the purchase document is NOT saved. No partial stock additions remain because each item addition is individually atomic.

### Void Failure

If `revertStockBatch` fails during a void operation, the purchase/invoice status update is NOT applied. The document remains in its original state. The error is logged and returned to the client.

### Rollback Partial Failure

If the compensating rollback itself partially fails (e.g., item 1 rolled back, item 2 rollback fails), the failure is recorded in `rollback_tracking` with `status: PARTIAL_FAILURE` and the specific `failedRollbacks` array. This requires manual investigation.
