# AIAVRO Billing OS — Purchase Entry & Procurement Module Specification

**Status:** Phase 5 Complete & Authoritative  
**Target Path:** `apps/web/features/purchases/*` & `apps/web/app/(protected)/purchases/page.tsx`  
**Backend API Endpoints:** (Frozen)
- `GET    /api/v1/purchases`
- `GET    /api/v1/purchases/:id`
- `POST   /api/v1/purchases`
- `DELETE /api/v1/purchases/:id`

---

## 1. Overview & Information Architecture

The Purchase module handles inward procurement batches, supplier invoicing, GST calculations on line items, optional freight and logistics accounting, and inventory batch additions with atomic rollback upon voiding.

### Component Structure
```
PurchasesPage (apps/web/app/(protected)/purchases/page.tsx)
├── Tabs ('entry' | 'history')
├── Tab 1: New Purchase Entry
│   ├── PurchaseHeader (Vendor, Inward Bill #, Purchase Date, Store Location, Payment Status, Notes)
│   ├── PurchaseItemsTable (Editable line items with HSN, Qty, Rate, Discount %, GST %, Line Totals)
│   ├── PurchaseTransportSection (Freight toggle, Transporter, Mode, LR/Docket #, Freight Tax, Terms)
│   └── PurchaseTotalsSummary (Sticky sidebar with taxable bases, GST breakdown, Other charges, Grand total, Submit action)
├── Tab 2: Inward Purchase History
│   └── PurchaseHistory (Server-paginated register, client-side search, status filters, pagination controls)
├── PurchaseDetailDrawer (Slide-out drawer displaying item lines, GST breakdowns, transport details, audit log timestamps)
└── PurchaseVoidDialog (Confirmation dialog warning of atomic stock reversal before marking purchase as VOIDED)
```

---

## 2. Financial Calculations (Pure Functions)

All line-item and grand total calculations are computed deterministically through pure functions in [`apps/web/features/purchases/calculations.ts`](file:///Users/avanish/Documents/billing%20system/apps/web/features/purchases/calculations.ts):

1. **Line Level:**
   $$\text{Raw Subtotal} = \text{Quantity} \times \text{Cost}$$
   $$\text{Discount Amount} = \text{Raw Subtotal} \times \left(\frac{\text{Discount \%}}{100}\right)$$
   $$\text{Taxable Value} = \text{Raw Subtotal} - \text{Discount Amount}$$
   $$\text{Tax Amount} = \text{Taxable Value} \times \left(\frac{\text{GST Rate}}{100}\right)$$
   $$\text{Line Total} = \text{Taxable Value} + \text{Tax Amount}$$

2. **Grand Total Level:**
   $$\text{Grand Total} = \text{Goods Taxable} + \text{Goods GST} + \text{Freight Charge} + \text{Freight GST} + \text{Other Charges}$$

---

## 3. Realtime & Query Strategy

- **Queries:**
  - `queryKeys.purchases(filters)` $\to$ `['purchases', filters]`
  - `queryKeys.purchase(id)` $\to$ `['purchases', id]`
- **Mutations:**
  - `useCreatePurchaseMutation()` $\to$ triggers `POST /api/v1/purchases` and invalidates `['purchases']`, `['dashboard-metrics']`, and `['inventory']`.
  - `useVoidPurchaseMutation()` $\to$ triggers `DELETE /api/v1/purchases/:id` and invalidates queries.
- **Realtime Synchronization:**
  - Listens to `purchase_created` and `purchase_deleted` Socket.IO events to invalidate purchase queries without reloading the page or altering unrelated components.
