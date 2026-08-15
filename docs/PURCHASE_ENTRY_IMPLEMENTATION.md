# Purchase Entry & Procurement Management Architecture

## 1. Overview & Business Workflow

The Purchase Entry and Procurement Management module in AIAVRO Billing OS manages the end-to-end procurement lifecycle for retail outlets, warehouses, and franchise stores:

```
[Supplier Consignment Arrival]
       │
       ▼
[Section A: New Purchase Entry (GRN)]
├── Header: Supplier, Invoice No, Date, Store Location, Payment Terms, E-Way Bill, Notes
├── Barcode / SKU Scanner + Catalog Item Quick Picker
├── Line Items Table: Rates, Quantities, Discounts (%), Taxable Values, GST Rates (%), GST Amounts, Line Totals
├── Structured Transport & Logistics (Optional): Transporter, Mode, LR/Docket, Freight Charge, Freight GST
└── Transparent Totals Summary: Subtotal → Discounts → Taxable → GST → Freight → Other Charges → Grand Total
       │
       ▼
[POST /api/v1/purchases]
├── Idempotency & Duplicate Submit Guard
├── inventoryService.addStockBatch() (Atomic Stock Ingestion & Movement Logging)
├── Structured Audit Log (audit_logs collection)
└── Realtime Event Emission: purchase_created to Store Room
       │
       ▼
[Section B: Procurement History & Ledger (Same Page)]
├── Multi-criteria Filters: Text Search, Supplier, Outlet, Status, Date Range
├── Atomic Single-Pass Pagination
├── Purchase Detail Drawer (Inspect Goods, Transport, Audit Links)
├── Printable Goods Receipt Note (GRN) Voucher
└── Safe Void Flow: DELETE /api/v1/purchases/:id (Reverts Stock Batches Atomically)
```

---

## 2. API Contract & Data Model

### Endpoints Reused (0 Duplicate Contracts)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/purchases` | Paginated purchase records with store-scope, supplier, status, date filtering. |
| `GET` | `/api/v1/purchases/:id` | Single purchase document lookup with store-scoping. |
| `POST` | `/api/v1/purchases` | Creates purchase entry, allocates batch stock, records audit log, emits `purchase_created`. |
| `DELETE` | `/api/v1/purchases/:id` | Voids purchase, reverts batch stock via `inventoryService`, records audit log, emits `purchase_deleted`. |

### Purchase Document Schema

```json
{
  "id": "pur-1786523910-x9a2b",
  "purchaseId": "INV-2026-0891",
  "transactionId": "pur-1786523910-x9a2b",
  "supplierId": "sup-org-01",
  "supplierName": "Green Valley Organic Farms",
  "supplierInvoiceNumber": "INV-2026-0891",
  "purchaseDate": "2026-08-15",
  "locationId": "Main Store",
  "storeId": "Main Store",
  "receivingStoreName": "Main Store (Whitefield)",
  "eWayBill": "EWB-991204859",
  "paymentStatus": "UNPAID",
  "notes": "Delivered in temperature-controlled crates",
  "items": [
    {
      "productId": "prod-101",
      "name": "Organic Whole Milk 1L",
      "sku": "MILK-ORG-1L",
      "hsn": "0401",
      "unit": "ltr",
      "quantity": 50,
      "purchaseRate": 52.00,
      "cost": 52.00,
      "discountPercent": 5,
      "discountAmount": 130.00,
      "taxableValue": 2470.00,
      "taxRate": 5,
      "taxAmount": 123.50,
      "lineTotal": 2593.50
    }
  ],
  "goodsSubtotal": 2600.00,
  "discount": 130.00,
  "goodsTaxableValue": 2470.00,
  "goodsTaxAmount": 123.50,
  "transport": {
    "enabled": true,
    "transporter": "VRL Logistics",
    "mode": "Road",
    "docketNumber": "LR-8829104",
    "transportDate": "2026-08-15",
    "charge": 500.00,
    "taxRate": 18,
    "taxAmount": 90.00,
    "totalCharge": 590.00,
    "paymentStatus": "Paid by Us",
    "notes": "Vehicle KA-01-AB-1234"
  },
  "otherCharges": 50.00,
  "taxAmount": 213.50,
  "shipping": 500.00,
  "grandTotal": 3234.00,
  "inventoryMovements": [
    "mov-1786523910-a1b2c"
  ],
  "status": "RECEIVED",
  "isArchived": false,
  "createdBy": "admin",
  "createdAt": "2026-08-15T13:20:00.000Z",
  "updatedAt": "2026-08-15T13:20:00.000Z"
}
```

---

## 3. Financial Calculation Formulas

$$\text{Goods Subtotal} = \sum (\text{item.purchaseRate} \times \text{item.quantity})$$

$$\text{Item Discount} = \frac{\text{item.purchaseRate} \times \text{item.quantity} \times \text{item.discountPercent}}{100}$$

$$\text{Goods Taxable Value} = \text{Goods Subtotal} - \sum \text{Item Discounts}$$

$$\text{Goods GST} = \sum \frac{\text{item.taxableValue} \times \text{item.taxRate}}{100}$$

$$\text{Freight GST} = \frac{\text{transport.charge} \times \text{transport.taxRate}}{100}$$

$$\text{Grand Total} = \text{round}\Big(\text{Goods Taxable Value} + \text{Goods GST} + \text{transport.charge} + \text{Freight GST} + \text{otherCharges}\Big)$$

---

## 4. Frontend Anti-Flicker & Performance Architecture

1. **Deterministic Three-Stage Pipeline**:
   - **Stage 1 (State Calculation)**: Pure JS math in `calculatePurchaseTotals()`. Zero DOM mutations or measurement queries during loop.
   - **Stage 2 (HTML Generation)**: In-memory string templating via `items.map().join('')` in `buildPurchaseSheetRowsHtml()`, `buildPurchaseHistoryRowsHtml()`, `buildPurchaseDetailDrawerHtml()`.
   - **Stage 3 (Atomic DOM Commit)**: Exactly one assignment to `tbody.innerHTML` per state change.
2. **Paint-Only CSS Transitions**:
   - Scoped transitions strictly to `background-color`, `border-color`, `color`, and `box-shadow`.
   - Zero `transition: all` rules.
   - Zero `transform: translateY` or `transform: scale` on hover/focus states to avoid hover-toggle jitter loops.
3. **Double-Submission & Idempotency Locking**:
   - Client button lock: `isPurchaseSubmitting` state guard disables submit button and shows loading state.
   - Backend idempotency: `transactionId` query prevents duplicate stock additions if duplicate HTTP packets arrive.
4. **Realtime Incremental Synchronization**:
   - Listens to `purchase_created` and `purchase_deleted` events via `syncSocket`.
   - Updates only the active view history table without full application shell re-rendering.

---

## 5. Verification & Test Suite

The module is verified with 28 comprehensive automated unit and regression tests in `tests/purchaseManagement.test.js` covering:
- Layout and component boundaries
- Form input validity and normalization
- Line item rates, discounts, and GST calculation
- Dedicated transport toggling and freight math
- Backend contract reuse and backward compatibility
- Pagination, search, and filtering
- Detail drawer and printable goods receipt vouchers
- Void confirmation modal and inventory reversion warnings
- Role-based authorization and store-scoping guards
