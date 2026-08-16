# Phase 10A — Suppliers Domain & API Contract Analysis

## 1. Executive Summary & Migration Status
This document provides the authoritative domain and API contract forensics for the **Suppliers** module in the billing system before any frontend implementation begins.

### Migration Status
- **Current Branch:** `migration/frontend-v2`
- **Latest Checkpoint:** `087dd3c feat: migrate customers to typed frontend`
- **Phase Objective:** Deep contract discovery and domain analysis ONLY.
- **Backend & Legacy Freeze:** Zero backend files changed, zero legacy HTML modifications.

---

## 2. Verified Backend API Contracts

All supplier operations interact with Express routes in `modules/suppliers.js` backed by MongoDB collection `suppliers`.

| HTTP Method | Route Path | Auth Middleware | Required Permission | Store Scope | Payload / Query | Response Structure | Side Effects & Realtime Events |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/suppliers` | `verifyJWT` | `suppliers.view` | Global Tenant Directory | None | `Array<SupplierDoc>` | None |
| **GET** | `/api/v1/suppliers/:id` | `verifyJWT` | `suppliers.view` | Global Tenant Directory | Path param: `:id` | `SupplierDoc` (or `404 NOT_FOUND`) | None |
| **POST** | `/api/v1/suppliers` | `verifyJWT` | `suppliers.create` OR `suppliers.update` | Global Tenant Directory | JSON Body: `{ id?, name, contact, email?, gst?, address? }` | `{ success: true, supplier: SupplierDoc }` | Writes audit log `supplier_created` / `supplier_updated`. Emits Socket.IO `supplier_updated` to `sync_global`. |
| **PATCH** | `/api/v1/suppliers/:id` | `verifyJWT` | `suppliers.update` | Global Tenant Directory | Path param: `:id`, JSON Body: partial updates | `{ success: true, supplier: SupplierDoc }` | Writes audit log `supplier_updated`. Emits Socket.IO `supplier_updated` to `sync_global`. |
| **DELETE** | `/api/v1/suppliers/:id` | `verifyJWT` | `suppliers.delete` | Global Tenant Directory | Path param: `:id` | `{ success: true, message: "Supplier deleted successfully" }` | Writes audit log `supplier_deleted`. Emits Socket.IO `supplier_deleted` to `sync_global`. |

---

## 3. Supplier Domain Model & Schema

Verified MongoDB document schema in collection `suppliers`:

```typescript
export interface SupplierDoc {
  _id?: string;
  id: string; // e.g. "sup-1723847291000" or custom ID
  name: string; // Required (Supplier company / agency name)
  contact: string; // Required (Primary contact phone number)
  email?: string; // Optional (Supplier contact email)
  gst?: string; // Optional (GSTIN tax identification number)
  gstin?: string; // Legacy/Modern alias
  address?: string; // Optional (Warehouse / dispatch address)
  createdAt?: string; // ISO 8601 string
  updatedAt?: string; // ISO 8601 string
}
```

### Verified Required Fields
- `name`: String (Mandatory). Rejects with `400 INVALID_INPUT` if missing.
- `contact`: String (Mandatory). Rejects with `400 INVALID_INPUT` if missing.

### Optional Fields
- `email`: String (Optional).
- `gst` / `gstin`: String (Optional).
- `address`: String (Optional).

---

## 4. Supplier ↔ Purchase Procurement Boundary

Purchases are the authoritative ledger for inward procurement stock batches. The Supplier module does not duplicate purchase transaction records.

### 1. Purchase Snapshotting
When a purchase entry is saved (`POST /api/v1/purchases`), the procurement record snapshots the supplier details:
- `supplierId`: String (references `supplier.id`)
- `supplierName`: String
- `supplierGst`: String
- `supplierInvoiceNumber`: String (Supplier's external bill reference)

### 2. Querying Supplier Purchase History
To retrieve a supplier's procurement history, the frontend queries the verified purchases endpoint:
`GET /api/v1/purchases?supplierId=<supplierId>&page=1&limit=50`
This returns paginated purchases scoped to the authenticated user's store permissions.

### 3. Derived Statistics (Read-Only)
Supplier metrics (total procurement orders, lifetime purchase expenditure, last purchase date) are derived dynamically from the purchase history query. They are not stored as mutable counters on the supplier document.

---

## 5. Supplier ↔ Purchase Entry Integration

The Purchase module (`apps/web/features/purchases/`) already integrates with the Supplier API:
1. **Supplier Selector:** `PurchaseEntryForm.tsx` queries `GET /api/v1/suppliers` with live company name auto-complete.
2. **Quick-Add Modal:** Allows immediate registration of a new supplier without abandoning an in-progress purchase invoice entry.
3. **Procurement Binding:** `POST /api/v1/purchases` receives `supplierId`, `supplierName`, and `supplierGst`.

The dedicated Suppliers module will provide full supplier directory management (view directory, search, edit details, view purchase history, delete profiles).

---

## 6. Supplier Payment & Credit Semantics

> [!IMPORTANT]
> **SUPPLIER CREDIT / PAYABLE LEDGER NOT VERIFIED**
> 
> Forensics of `modules/suppliers.js`, `services/inventoryService.js`, and `modules/purchases.js` confirm that:
> 1. No supplier accounts payable ledger, credit terms, or opening balances exist in MongoDB.
> 2. No advance payments, debit/credit ledgers, or payment balances are tracked on `SupplierDoc`.
> 3. All inward stock entries are settled per purchase invoice.
> 4. Supplier lifetime procurement spend is calculated dynamically from completed purchases.
> 
> The new frontend will NOT invent unsupported client-side accounts payable ledgers or credit accounts.

---

## 7. Search & Filtering Behavior

### Backend Query Capabilities
- `GET /api/v1/suppliers` returns all registered supplier records in the central directory.
- In-memory client-side filtering supports instant filtering across:
  - Supplier Company Name
  - Contact Phone Number
  - Email Address
  - GSTIN Number

---

## 8. Store Isolation & Authorization Matrix

Suppliers form a central tenant directory shared across all store locations.

| Permission Key | Description | Super Admin | Admin | Manager | Cashier | Auditor |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `suppliers.view` | View supplier directory & details | Yes | Yes | Yes | Yes | Yes |
| `suppliers.create` | Register new supplier profile | Yes | Yes | Yes | No | No |
| `suppliers.update` | Edit existing supplier profile | Yes | Yes | Yes | No | No |
| `suppliers.delete` | Delete supplier profile | Yes | Yes | No | No | No |

---

## 9. Realtime Socket.IO Events

Producer: `modules/suppliers.js`
Room Scope: `sync_global`

| Event Name | Trigger | Payload Structure | Frontend Cache Invalidation |
| :--- | :--- | :--- | :--- |
| `supplier_updated` | Created or updated supplier via `POST` or `PATCH` | `{ supplier: SupplierDoc }` | Invalidate `['suppliers']`, `['purchases', 'suppliers']`, `['supplier', id]` |
| `supplier_deleted` | Supplier deleted via `DELETE /api/v1/suppliers/:id` | `{ id: string }` | Invalidate `['suppliers']`, `['purchases', 'suppliers']` |

---

## 10. Error Handling & Contract Mapping

| HTTP Status | Backend Error Code | Cause | Frontend Handling |
| :--- | :--- | :--- | :--- |
| `400` | `INVALID_INPUT` | Missing `name` or `contact` | Display field-level validation message in form modal |
| `401` | `UNAUTHORIZED` | Expired or missing JWT token | Trigger session cleanup and redirect to `/login` |
| `403` | `FORBIDDEN` | Missing required RBAC permission | Hide unauthorized action buttons; show toast notification if rejected |
| `404` | `NOT_FOUND` | Supplier ID does not exist | Display EmptyState or navigate back to directory |
| `500` | `SERVER_ERROR` | Database error | Show operational error state with retry action |

---

## 11. Legacy Frontend Anti-Patterns & Risk Audit

Forensic inspection of `aiavro_billing_system.html` (lines 5452–5490, 7063–7066) identified:
1. **Global Array Mutation:** Mutates global `state.suppliers` on full synchronization.
2. **Whole-App Resynchronization:** Calls `await syncStateWithServer()` on every supplier save, causing full view remounts.
3. **Hardcoded Dropdown Mutator:** Directly modifies `document.getElementById("purchase-supplier-select")` inside `saveSupplierForm()`.

### Modern Replacement Guarantees
- Declarative React rendering with TanStack Query.
- Isolated cache invalidation via React Query keys (`['suppliers']`).
- Zero DOM manipulation or full-app state re-synchronization.

---

## 12. Recommended Phase 10B Typed Frontend Architecture

```
apps/web/features/suppliers/
├── api.ts                  # Typed client for GET, POST, PATCH, DELETE /api/v1/suppliers
├── hooks.ts                # TanStack Query hooks with Socket.IO subscription
├── schemas.ts              # Zod validation schemas for supplier creation & editing
├── types.ts                # Authoritative TypeScript types for SupplierDoc and SupplierMetrics
├── calculations.ts         # Pure helpers for contact formatting, GSTIN formatting, and spend calculations
├── components/
│   ├── SupplierHeader.tsx       # Search, register button, total counter badge
│   ├── SupplierSummaryCards.tsx # Total registered, GST accounts, direct email contacts
│   ├── SupplierFilters.tsx      # Search by name/contact/GSTIN
│   ├── SupplierTable.tsx        # Responsive data table with actions (View History, Edit, Delete)
│   ├── SupplierModal.tsx        # React Hook Form + Zod modal for Create & Edit
│   ├── SupplierDetailDrawer.tsx # Slide-out drawer with profile info & purchase history ledger
│   ├── SupplierDeleteDialog.tsx # Safe confirmation modal for supplier deletion
│   └── index.ts
└── page.tsx                # apps/web/app/(protected)/suppliers/page.tsx
```

---

## 13. Quality Check Verification

- **Backend code changes:** `0`
- **Legacy HTML changes:** `0`
- **New files:** `docs/modules/SUPPLIERS_API_ANALYSIS.md`
