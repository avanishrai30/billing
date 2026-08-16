# Phase 9A — Customers / CRM Domain & API Contract Analysis

## 1. Executive Summary & Objective
This document provides the authoritative domain and API contract forensics for the **Customers / CRM** module in the billing system before any frontend implementation begins.

### Migration Status
- **Current Branch:** `migration/frontend-v2`
- **Latest Checkpoint:** `65cd967 feat: migrate invoices to typed frontend`
- **Phase Objective:** Deep contract discovery and domain analysis ONLY.
- **Backend & Legacy Freeze:** Zero backend files changed, zero legacy HTML modifications.

---

## 2. Verified Backend API Contracts

All customer operations interact with Express routes in `modules/customers.js` backed by MongoDB collection `customers`.

| HTTP Method | Route Path | Auth Middleware | Required Permission | Store Scope | Payload / Query | Response Structure | Side Effects & Realtime Events |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/customers` | `verifyJWT` | `customers.view` | Global Tenant Directory | None | `Array<CustomerDoc>` | None |
| **GET** | `/api/v1/customers/:id` | `verifyJWT` | `customers.view` | Global Tenant Directory | Path param: `:id` | `CustomerDoc` (or `404 NOT_FOUND`) | None |
| **POST** | `/api/v1/customers` | `verifyJWT` | `customers.create` OR `customers.update` | Global Tenant Directory | JSON Body: `{ id?, name, phone, email?, gstin?, address? }` | `{ success: true, customer: CustomerDoc }` | Writes audit log `customer_created` / `customer_updated`. Emits Socket.IO `customer_updated` to `sync_global`. |
| **PATCH** | `/api/v1/customers/:id` | `verifyJWT` | `customers.update` | Global Tenant Directory | Path param: `:id`, JSON Body: partial updates | `{ success: true, customer: CustomerDoc }` | Writes audit log `customer_updated`. Emits Socket.IO `customer_updated` to `sync_global`. |
| **DELETE** | `/api/v1/customers/:id` | `verifyJWT` | `customers.delete` | Global Tenant Directory | Path param: `:id` | `{ success: true, message: "Customer deleted successfully" }` | Writes audit log `customer_deleted`. Emits Socket.IO `customer_deleted` to `sync_global`. |

---

## 3. Customer Domain Model & Schema

Verified MongoDB document schema in collection `customers`:

```typescript
export interface CustomerDoc {
  _id?: string;
  id: string; // e.g. "cust-1723847291000" or custom ID
  name: string; // Required (validation: min 1 char)
  phone: string; // Required (validation: 10-digit / phone format)
  email?: string; // Optional (valid email if provided)
  gstin?: string; // Optional (GSTIN format: e.g. "27AAAAA0000A1Z5")
  gst?: string; // Legacy alias occasionally populated
  address?: string; // Optional text address
  createdAt?: string; // ISO 8601 string
  updatedAt?: string; // ISO 8601 string
}
```

### Verified Required Fields
- `name`: String (Mandatory). Rejects with `400 INVALID_INPUT` if missing.
- `phone`: String (Mandatory). Rejects with `400 INVALID_INPUT` if missing.

### Optional Fields
- `email`: String (Optional).
- `gstin`: String (Optional).
- `address`: String (Optional).

---

## 4. Customer ↔ Invoice Relationship & Ledger Boundary

Invoices are the authoritative ledger for sales transactions. The Customer module does not duplicate invoice transaction data.

### 1. Invoice Snapshotting
When a POS checkout is completed (`POST /api/v1/invoices`), the invoice record snapshots the customer details:
- `customerId`: String (references `customer.id`)
- `customerName`: String
- `customerPhone`: String
- `customerAddress`: String
- `customerGst`: String

### 2. Querying Customer Purchase History
To retrieve a customer's purchase history, the frontend queries the verified invoices endpoint:
`GET /api/v1/invoices?customerId=<customerId>&page=1&limit=50`
This returns paginated invoices scoped to the authenticated user's store permissions.

### 3. Derived Metrics (Read-Only)
Customer aggregate metrics (total bills, lifetime revenue, last visit date) are derived client-side or from the invoices ledger query. They are not stored as mutable counters on the customer document to maintain ledger integrity.

---

## 5. Customer ↔ POS Interaction

The POS terminal (`apps/web/features/pos/`) already integrates with the Customer API:
1. **Lookup & Selector:** `CustomerSelector.tsx` queries `GET /api/v1/customers` with live name/phone auto-complete.
2. **Default Walk-In:** Walk-in customers (`id: 'walk-in'`, name: "Walk-in Customer") do not require customer creation.
3. **Quick-Add Customer:** A lightweight modal directly executes `POST /api/v1/customers` and automatically selects the newly created customer without leaving the POS register.
4. **Checkout Binding:** `POST /api/v1/invoices` receives `customerId`, `customerName`, and `customerPhone`.

The CRM Customers module will provide full customer management (view profiles, search directory, edit details, view purchase history, delete profiles).

---

## 6. Balance & Credit Semantics

> [!IMPORTANT]
> **CUSTOMER CREDIT / BALANCE NOT VERIFIED IN CURRENT CONTRACT**
> 
> Forensics of `modules/customers.js`, `services/billingService.js`, and `modules/billing.js` confirm that:
> 1. No customer credit ledger or opening balance accounts exist in MongoDB.
> 2. No credit limits, debit/credit ledgers, or customer account payment balances are tracked on `CustomerDoc`.
> 3. All POS transactions are settled per invoice with payment modes (`CASH`, `UPI`, `CARD`, `BANK`).
> 4. Customer lifetime spend is calculated dynamically from completed invoices.
> 
> The new frontend will NOT invent unsupported client-side customer ledger balances or credit accounts.

---

## 7. Search & Filtering Behavior

### Backend Query Capabilities
- `GET /api/v1/customers` returns all registered customer records.
- In-memory client-side filtering supports instant filtering across:
  - Customer Name
  - Mobile Phone Number
  - Email Address
  - GSTIN Number

---

## 8. Store Isolation & Authorization Matrix

Customers form a central tenant directory, allowing customers to make purchases across multiple outlets.

| Permission Key | Description | Super Admin | Admin | Manager | Cashier | Auditor |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `customers.view` | View customer directory & details | Yes | Yes | Yes | Yes | Yes |
| `customers.create` | Register new customer profile | Yes | Yes | Yes | Yes | No |
| `customers.update` | Edit existing customer profile | Yes | Yes | Yes | No | No |
| `customers.delete` | Delete customer profile | Yes | Yes | No | No | No |

---

## 9. Realtime Socket.IO Events

Producer: `modules/customers.js`
Room Scope: `sync_global`

| Event Name | Trigger | Payload Structure | Frontend Cache Invalidation |
| :--- | :--- | :--- | :--- |
| `customer_updated` | Created or updated customer via `POST` or `PATCH` | `{ customer: CustomerDoc }` | Invalidate `['customers']`, `['pos', 'customers']`, `['customer', id]` |
| `customer_deleted` | Customer deleted via `DELETE /api/v1/customers/:id` | `{ id: string }` | Invalidate `['customers']`, `['pos', 'customers']` |

---

## 10. Error Handling & Contract Mapping

| HTTP Status | Backend Error Code | Cause | Frontend Handling |
| :--- | :--- | :--- | :--- |
| `400` | `INVALID_INPUT` | Missing `name` or `phone` | Display field-level validation message in form dialog |
| `401` | `UNAUTHORIZED` | Expired or missing JWT token | Trigger session cleanup and redirect to `/login` |
| `403` | `FORBIDDEN` | Missing required RBAC permission | Hide unauthorized action buttons; show toast notification if rejected |
| `404` | `NOT_FOUND` | Customer ID does not exist | Display EmptyState or navigate back to directory |
| `500` | `SERVER_ERROR` | Database error | Show operational error state with retry action |

---

## 11. Legacy Frontend Anti-Patterns & Risk Audit

Forensic inspection of `aiavro_billing_system.html` (lines 10649–10830) identified:
1. **Direct DOM Mutation:** `tbody.innerHTML = ""` with string interpolation `escapeHTML(cust.name)`.
2. **Global Array Recomputation:** Iterates over global `state.invoices` array in memory for every row render.
3. **Full Page Resynchronization:** Calls `await syncStateWithServer()` on every customer save, triggering a full global state reload and view remounts.
4. **Hardcoded POS Select Mutator:** Directly modifies `document.getElementById("pos-customer-select")` inside `renderCustomersTable()`.

### Modern Replacement Guarantees
- Declarative React rendering with TanStack Query.
- Isolated cache invalidation via React Query keys (`['customers']`).
- Zero DOM manipulation or full-app state re-synchronization.

---

## 12. Recommended Phase 9B Typed Frontend Architecture

```
apps/web/features/customers/
├── api.ts                  # Typed client for GET, POST, PATCH, DELETE /api/v1/customers
├── hooks.ts                # React Query hooks with Socket.IO subscription to customer_updated/deleted
├── schemas.ts              # Zod validation schemas for customer creation & editing
├── types.ts                # Authoritative TypeScript types for CustomerDoc and CustomerMetrics
├── calculations.ts         # Pure helpers for phone formatting, GSTIN validation, and aggregate purchase summaries
├── components/
│   ├── CustomerHeader.tsx       # Search, registration trigger, count badge
│   ├── CustomerSummaryCards.tsx # Total registered, active buyers, repeat customers
│   ├── CustomerFilters.tsx      # Search by name/phone/GSTIN
│   ├── CustomerTable.tsx        # Responsive data table with actions (View, Edit, Delete)
│   ├── CustomerModal.tsx        # React Hook Form + Zod modal for Create & Edit
│   ├── CustomerDetailDrawer.tsx # Slide-out drawer with profile info & invoice purchase history
│   ├── CustomerDeleteDialog.tsx # Safe confirmation modal for customer removal
│   └── index.ts
└── page.tsx                # apps/web/app/(protected)/customers/page.tsx
```

---

## 13. Quality Check Verification

- **Backend code changes:** `0`
- **Legacy HTML changes:** `0`
- **New files:** `docs/modules/CUSTOMERS_API_ANALYSIS.md`
