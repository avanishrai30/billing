# Phase 10B — Suppliers Implementation Specification

## 1. Executive Summary
The Suppliers module has been migrated to the typed Next.js frontend architecture (`apps/web/features/suppliers/` and route `apps/web/app/(protected)/suppliers/page.tsx`). It provides an authoritative central vendor directory, responsive table browsing, client-side memoized filtering (name, contact, email, GSTIN), modal-based registration and editing with Zod validation, safe deletion confirmation, slide-out detail drawers with real-time purchase procurement history integration, and Socket.IO real-time synchronization.

---

## 2. API Contract Mapping (Frozen Backend)

All operations consume existing frozen backend endpoints from `modules/suppliers.js` without backend code modifications:

| Operation | Method | Path | RBAC Permission | Scope | Realtime Event |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **List Suppliers** | `GET` | `/api/v1/suppliers` | `suppliers.view` | Global Tenant Directory | Polled & invalidated on `supplier_updated`, `supplier_deleted` |
| **Get Supplier** | `GET` | `/api/v1/suppliers/:id` | `suppliers.view` | Global Tenant Directory | Stale time 60s |
| **Register Supplier** | `POST` | `/api/v1/suppliers` | `suppliers.create` / `suppliers.update` | Global Tenant Directory | Emits `supplier_updated` to `sync_global` |
| **Edit Supplier** | `PATCH` | `/api/v1/suppliers/:id` | `suppliers.update` | Global Tenant Directory | Emits `supplier_updated` to `sync_global` |
| **Delete Supplier** | `DELETE` | `/api/v1/suppliers/:id` | `suppliers.delete` | Global Tenant Directory | Emits `supplier_deleted` to `sync_global` |
| **Purchase History** | `GET` | `/api/v1/purchases?supplierId=<id>` | `purchases.view` | Scoped to User Store | Purchases remain authoritative source of truth |

---

## 3. Supplier Domain & Boundary Rules

1. **Identity & Contact Only:**
   The supplier record stores `name`, `contact`, `email`, `gst`, and `address`.
2. **No Accounts Payable / Credit Ledger:**
   No fake balance, opening balance, accounts payable ledger, or credit limit tracking is rendered in the UI, as it does not exist in the backend contract.
3. **Purchase History Single Source of Truth:**
   Supplier procurement history and lifetime statistics are dynamically derived from the authoritative `purchases` module.

---

## 4. Components & Responsibilities

- **[`SupplierHeader`](file:///Users/avanish/Documents/billing%20system/apps/web/features/suppliers/components/SupplierHeader.tsx):** Directory header, realtime status badge, "Register Supplier" modal trigger.
- **[`SupplierSummaryCards`](file:///Users/avanish/Documents/billing%20system/apps/web/features/suppliers/components/SupplierSummaryCards.tsx):** 3 deterministic KPI cards (Registered Supply Partners, GST Registered Vendors, Direct Email Channels).
- **[`SupplierFilters`](file:///Users/avanish/Documents/billing%20system/apps/web/features/suppliers/components/SupplierFilters.tsx):** Live search input across name, contact, email, and GSTIN with reset button.
- **[`SupplierTable`](file:///Users/avanish/Documents/billing%20system/apps/web/features/suppliers/components/SupplierTable.tsx):** Compound typed data table with formatted contact numbers, GSTIN badges, and actions (View History, Edit Profile, Delete).
- **[`SupplierModal`](file:///Users/avanish/Documents/billing%20system/apps/web/features/suppliers/components/SupplierModal.tsx):** React Hook Form + Zod modal for registering new suppliers or editing existing profiles.
- **[`SupplierDetailDrawer`](file:///Users/avanish/Documents/billing%20system/apps/web/features/suppliers/components/SupplierDetailDrawer.tsx):** Slide-out drawer with profile info, address, tax identification, and integrated inward purchase history ledger with transport LR numbers.
- **[`SupplierDeleteDialog`](file:///Users/avanish/Documents/billing%20system/apps/web/features/suppliers/components/SupplierDeleteDialog.tsx):** Modal dialog with directory removal explanation and deletion trigger.

---

## 5. Anti-Flicker & Performance Guarantees

1. **Deterministic Skeletons:** Table and summary skeletons match rendered geometry exactly to eliminate layout shift.
2. **Stable Row Keys:** Rows keyed by unique `sup.id`.
3. **Scoped Query Invalidation:** Realtime events (`supplier_updated`, `supplier_deleted`) invalidate only `['suppliers']`, `['purchases', 'suppliers']`, and `['supplier', id]`.
4. **Zero Layout Animation:** Zero hover scale, zero hover translate, and zero structural reflows.

---

## 6. Responsive Breakdown

- **Desktop ($\ge$ 1024px):** 3-column summary grid, full multi-column data table with inline actions.
- **Mobile (< 1024px):** Stacked KPI cards, full-width search input, horizontal containment for table without window scroll, and slide-out `Drawer` modal.
