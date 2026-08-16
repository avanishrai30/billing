# Phase 9B — Customers / CRM Implementation Specification

## 1. Executive Summary
The Customers / CRM module has been migrated to the typed Next.js frontend architecture (`apps/web/features/customers/` and route `apps/web/app/(protected)/customers/page.tsx`). It provides an authoritative central customer directory, responsive table browsing, client-side memoized filtering (name, phone, email, GSTIN), modal-based registration and editing with Zod validation, safe deletion confirmation, slide-out detail drawers with real-time invoice purchase history integration, and Socket.IO real-time synchronization.

---

## 2. API Contract Mapping (Frozen Backend)

All operations consume existing frozen backend endpoints from `modules/customers.js` without backend code modifications:

| Operation | Method | Path | RBAC Permission | Scope | Realtime Event |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **List Customers** | `GET` | `/api/v1/customers` | `customers.view` | Global Tenant Directory | Polled & invalidated on `customer_updated`, `customer_deleted` |
| **Get Customer** | `GET` | `/api/v1/customers/:id` | `customers.view` | Global Tenant Directory | Stale time 60s |
| **Register Customer** | `POST` | `/api/v1/customers` | `customers.create` / `customers.update` | Global Tenant Directory | Emits `customer_updated` to `sync_global` |
| **Edit Customer** | `PATCH` | `/api/v1/customers/:id` | `customers.update` | Global Tenant Directory | Emits `customer_updated` to `sync_global` |
| **Delete Customer** | `DELETE` | `/api/v1/customers/:id` | `customers.delete` | Global Tenant Directory | Emits `customer_deleted` to `sync_global` |
| **Invoice History** | `GET` | `/api/v1/invoices?customerId=<id>` | `invoices.view` | Scoped to User Store | Invoices remain authoritative source of truth |

---

## 3. Customer Domain & Boundary Rules

1. **Identity & Contact Only:**
   The customer record stores `name`, `phone`, `email`, `gstin`, and `address`.
2. **No Customer Credit / Balance:**
   No fake balance, opening balance, credit ledger, or debt tracking is rendered in the UI, as it does not exist in the backend contract.
3. **Invoice History Single Source of Truth:**
   Customer purchase history and lifetime statistics are dynamically derived from the authoritative `invoices` module.

---

## 4. Components & Responsibilities

- **[`CustomerHeader`](file:///Users/avanish/Documents/billing%20system/apps/web/features/customers/components/CustomerHeader.tsx):** Directory header, realtime status badge, "Register Customer" modal trigger.
- **[`CustomerSummaryCards`](file:///Users/avanish/Documents/billing%20system/apps/web/features/customers/components/CustomerSummaryCards.tsx):** 3 deterministic KPI cards (Registered Buyer Profiles, GST Registered Accounts, Direct Email Contacts).
- **[`CustomerFilters`](file:///Users/avanish/Documents/billing%20system/apps/web/features/customers/components/CustomerFilters.tsx):** Live search input across name, phone, email, and GSTIN with reset button.
- **[`CustomerTable`](file:///Users/avanish/Documents/billing%20system/apps/web/features/customers/components/CustomerTable.tsx):** Compound typed data table with formatted phone numbers, GSTIN badges, and actions (View History, Edit Profile, Delete).
- **[`CustomerModal`](file:///Users/avanish/Documents/billing%20system/apps/web/features/customers/components/CustomerModal.tsx):** React Hook Form + Zod modal for registering new buyers or editing existing profiles.
- **[`CustomerDetailDrawer`](file:///Users/avanish/Documents/billing%20system/apps/web/features/customers/components/CustomerDetailDrawer.tsx):** Slide-out drawer with profile info, address, tax identification, and integrated invoice purchase history ledger with direct PDF download triggers.
- **[`CustomerDeleteDialog`](file:///Users/avanish/Documents/billing%20system/apps/web/features/customers/components/CustomerDeleteDialog.tsx):** Modal dialog with directory removal explanation and deletion trigger.

---

## 5. Anti-Flicker & Performance Guarantees

1. **Deterministic Skeletons:** Table and summary skeletons match rendered geometry exactly to eliminate layout shift.
2. **Stable Row Keys:** Rows keyed by unique `cust.id`.
3. **Scoped Query Invalidation:** Realtime events (`customer_updated`, `customer_deleted`) invalidate only `['customers']`, `['pos', 'customers']`, and `['customer', id]`.
4. **Zero Layout Animation:** Zero hover scale, zero hover translate, and zero structural reflows.

---

## 6. Responsive Breakdown

- **Desktop ($\ge$ 1024px):** 3-column summary grid, full multi-column data table with inline actions.
- **Mobile (< 1024px):** Stacked KPI cards, full-width search input, horizontal containment for table without window scroll, and slide-out `Drawer` modal.
