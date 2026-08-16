# Phase 11A — Stores, Businesses & Franchises Domain & API Contract Analysis

## 1. Executive Summary & Objective
This document provides the authoritative forensics and domain boundary analysis for **Businesses (Tenants)**, **Stores (Outlets)**, **Franchises**, and the unified **Store Scoping Architecture** across the billing system prior to any frontend implementation.

### Migration Status
- **Current Branch:** `migration/frontend-v2`
- **Latest Checkpoint:** `07aa12f feat: migrate suppliers to typed frontend`
- **Phase Objective:** Deep contract discovery and domain analysis ONLY.
- **Backend & Legacy Freeze:** Zero backend files changed, zero legacy HTML modifications.

---

## 2. Business / Tenant Domain Model

The `businesses` collection in MongoDB defines legal business profiles, tax registration, banking details, and default billing header settings.

### Verified Backend Schema (`modules/businesses.js`)

```typescript
export interface BusinessDoc {
  _id?: string;
  id: string; // e.g. "biz-1723847291000" or custom ID
  name: string; // Required (Legal business name / trade name)
  subtitle?: string; // Tagline / branch description
  owner?: string; // Proprietor / Director name
  gstin?: string; // GSTIN identification number
  phone?: string; // Contact phone
  email?: string; // Contact email
  address?: string; // Registered business address
  bankName?: string; // Bank name for invoice payment instructions
  accountNo?: string; // Bank account number
  ifsc?: string; // Bank IFSC code
  upiId?: string; // Merchant UPI ID for QR codes
  terms?: string; // Custom invoice footer terms & conditions
  logo?: string; // Media URL path to brand logo
  status: 'active' | 'inactive' | string;
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
}
```

### Auto-Sync with Stores
Whenever a business profile is created or updated via `POST /api/v1/businesses`, `modules/businesses.js` automatically creates/updates a mirror entry in the `stores` collection:
```javascript
const storeDoc = {
  id: docId,
  name: biz.name,
  code: biz.code || `ST-${biz.name.substring(0, 3).toUpperCase()}`,
  address: biz.address || "",
  status: docStatus,
  updatedAt: new Date().toISOString()
};
```
This guarantees backward compatibility for multi-store queries.

---

## 3. Store / Outlet Domain Model

The `stores` collection defines physical retail outlets, warehouses, and billing registers.

### Verified Backend Schema (`modules/stores.js`)

```typescript
export interface StoreDoc {
  _id?: string;
  id: string; // e.g. "st-1723847291000" or "store-1"
  name: string; // Required (Store outlet name, e.g. "Mumbai Flagship Store")
  code: string; // Store identifier code, e.g. "ST-MUM"
  address?: string; // Physical location address
  phone?: string; // Store landline / mobile contact
  businessId?: string; // Optional parent business profile link
  status: 'active' | 'inactive' | string;
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
}
```

---

## 4. Franchise & Supply Orders Domain Model

The `franchises` and `franchise_supply_orders` collections manage external franchise partner relationships and central warehouse distribution.

### Verified Backend Schema (`modules/franchise.js`)

```typescript
export interface FranchiseDoc {
  _id?: string;
  id: string; // e.g. "fran-1723847291000"
  name: string; // Required (Franchise partner / company name)
  storeName?: string; // Associated franchise outlet name
  owner?: string; // Franchisee owner / contact person
  phone?: string; // Contact phone
  email?: string; // Contact email
  address?: string; // Franchise outlet address
  gstin?: string; // Franchise GSTIN
  royaltyPercent?: number; // Royalty agreement percentage
  margin?: number; // Commercial margin percentage
  status: 'active' | 'pending' | 'suspended' | string;
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
}

export interface FranchiseSupplyOrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface FranchiseSupplyOrderDoc {
  _id?: string;
  id: string; // e.g. "fso-1723847291000"
  franchiseId: string; // Reference to franchise.id
  franchiseName: string;
  items: FranchiseSupplyOrderItem[];
  totalAmount?: number;
  grandTotal?: number;
  status: 'pending' | 'dispatched' | 'completed' | 'cancelled' | string;
  notes?: string;
  createdAt?: string; // ISO timestamp
}
```

---

## 5. Verified Backend API Contracts

All endpoints are registered in `server.js` and enforce `verifyJWT` and RBAC middleware.

### 5.1 Businesses API (`modules/businesses.js` -> `/api/v1/businesses`)

| Method | Endpoint | Permission | Request Body | Response | Side Effects & Realtime |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/businesses` | `businesses.view` | None | `BusinessDoc[]` | None |
| `GET` | `/api/v1/businesses/:id` | `businesses.view` | Path `:id` | `BusinessDoc` | None |
| `POST` | `/api/v1/businesses` | `businesses.create` OR `businesses.update` | `Partial<BusinessDoc>` (name required) | `{ success: true, business: BusinessDoc }` | Upserts `businesses` and mirror `stores` doc. Writes audit log. Emits `business_updated` to `sync_global`. |
| `PATCH` | `/api/v1/businesses/:id` | `businesses.update` | Partial updates | `{ success: true, business: BusinessDoc }` | Updates doc and syncs store name/address/status. Writes audit log. Emits `business_updated` to `sync_global`. |
| `DELETE` | `/api/v1/businesses/:id` | `businesses.delete` | Path `:id` | `{ success: true, message: string }` | Deletes from `businesses` and `stores`. Writes audit log. Emits `business_deleted` to `sync_global`. |

### 5.2 Stores API (`modules/stores.js` -> `/api/v1/stores`)

| Method | Endpoint | Permission | Request Body | Response | Side Effects & Realtime |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/stores` | `stores.view` | None | `StoreDoc[]` | None |
| `GET` | `/api/v1/stores/:id` | `stores.view` | Path `:id` | `StoreDoc` | None |
| `POST` | `/api/v1/stores` | `stores.create` OR `stores.update` | `Partial<StoreDoc>` (name required) | `{ success: true, store: StoreDoc }` | Writes audit log `store_created` / `store_updated`. Emits `store_updated` to `sync_global`. |
| `PATCH` | `/api/v1/stores/:id` | `stores.update` | Partial updates | `{ success: true, store: StoreDoc }` | Writes audit log `store_updated`. Emits `store_updated` to `sync_global`. |
| `DELETE` | `/api/v1/stores/:id` | `stores.delete` | Path `:id` | `{ success: true, message: string }` | Writes audit log `store_deleted`. Emits `store_deleted` to `sync_global`. |

### 5.3 Franchises API (`modules/franchise.js` -> `/api/v1`)

| Method | Endpoint | Permission | Request Body | Response | Side Effects & Realtime |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/franchises` | `franchise.view` | None | `FranchiseDoc[]` | None |
| `GET` | `/api/v1/franchises/:id` | `franchise.view` | Path `:id` | `FranchiseDoc` | None |
| `POST` | `/api/v1/franchises` | `franchise.manage` | `Partial<FranchiseDoc>` | `{ success: true, franchise: FranchiseDoc }` | Writes audit log. Emits `franchise_updated` to `sync_global`. |
| `DELETE` | `/api/v1/franchises/:id` | `franchise.manage` | Path `:id` | `{ success: true, message: string }` | Writes audit log. Emits `franchise_deleted` to `sync_global`. |
| `GET` | `/api/v1/franchise-supply-orders` | `franchise.view` | None | `FranchiseSupplyOrderDoc[]` | None |
| `POST` | `/api/v1/franchise-supply-orders` | `franchise.manage` | `Partial<FranchiseSupplyOrderDoc>` | `{ success: true, order: FranchiseSupplyOrderDoc }` | Writes audit log. Emits `franchise_order_created` to `sync_global`. |

---

## 6. Store Scoping & User Assignment Architecture

Store scoping is enforced at the database level by `services/authzService.js`:

```javascript
function getStoreScopeFilter(user, fieldNames = ['locationId', 'storeId']) {
  if (!user || isSuperAdmin(user) || !user.assignedStoreId || user.assignedStoreId === 'all') {
    return {};
  }
  const storeId = user.assignedStoreId;
  const orConditions = fieldNames.map(f => ({ [f]: storeId }));
  return orConditions.length === 1 ? orConditions[0] : { $or: orConditions };
}
```

### Role-Based Scoping Matrix

| Role / User Category | `assignedStoreId` Value | Store Switcher UI | Accessible Data Scope | Cross-Store Visibility |
| :--- | :--- | :---: | :--- | :---: |
| **Super Admin / Owner** | `'all'` or null | **Enabled** (Can select 'All Stores' or any individual store) | Global or Selected Store | Full |
| **Admin / Manager** | `'all'` or specific Store ID | **Enabled** if assigned to `'all'`; **Locked** if assigned to specific store | Scoped to assigned/selected store | Restricted to assigned stores |
| **Cashier / Staff** | Specific Store ID (e.g. `'store-1'`) | **Locked / Hidden** (Fixed to user's assigned store) | Strictly scoped to assigned store | None (Backend rejects queries for other stores with `403 STORE_ACCESS_DENIED`) |
| **Auditor** | `'all'` | **Enabled** (Read-only store switcher) | Global or Selected Store (Read-only) | Full (Read-only) |

---

## 7. Store Switching Lifecycle & Cross-Module Scope Propagation

When a Super Admin or authorized manager switches the active store in the UI:

```
[Store Switcher Dropdown in AppHeader]
                     │
                     ▼
          [StoreScopeContext State]
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
 [TanStack Query Keys]   [Socket.IO Room Sync]
 (e.g. ['dashboard', id] (emits JOIN_SYNC with storeId)
       ['inventory', id]
       ['invoices', id])
        │                         │
        ▼                         ▼
 [React Components Refetch] [Real-time Events Scoped]
 (zero DOM reload,         (receives store-specific events)
  isolated cache update)
```

1. **No Application Reload:** Switching store updates only React state and triggers targeted query refetches.
2. **Unified Scope Provider:** All modules (`Dashboard`, `POS`, `Inventory`, `Invoices`, `Purchases`) consume a single `useStoreScope()` hook.
3. **Socket.IO Room Synchronization:** `realtimeManager.joinStore(newStoreId)` emits `JOIN_SYNC`, adding the socket to `store_<newStoreId>`.

---

## 8. Socket.IO Realtime Store Rooms & Events

Verified in `server.js` (lines 141–180):

- **Room `sync_global`:** All authenticated sockets join this room. Global events (`business_updated`, `store_updated`, `franchise_updated`, `customer_updated`, `supplier_updated`) broadcast here.
- **Room `store_<storeId>`:** Users join store-specific rooms upon calling `JOIN_SYNC`. Events scoped to store operations broadcast to `store_<storeId>`.
- **Authorization Guard on `JOIN_SYNC`:** Sockets attempting to join a `store_<storeId>` room without matching `assignedStoreId` are rejected with `AUTHORIZATION_DENIED`.

---

## 9. Cross-Module Store Scope Matrix

| Domain Module | Global | Store-Scoped | Backend Scoping Fields | Notes |
| :--- | :---: | :---: | :--- | :--- |
| **Dashboard** | Yes (`all`) | Yes | `locationId`, `storeId`, `businessId` | Aggregates all stores or filters to selected store |
| **POS Terminal** | No | **Yes** | `locationId`, `storeId` | Transactions strictly bound to operating store register |
| **Products Master** | **Yes** | No | Global catalog | Products are tenant-wide; stock levels are store-scoped |
| **Inventory Balances** | No | **Yes** | `locationId`, `storeId` | Stock quantities and movements are per-location |
| **Purchase Inward** | No | **Yes** | `locationId`, `storeId` | Inward shipments and transport bound to destination store |
| **Invoices Ledger** | Yes (`all` for Admin) | **Yes** | `locationId`, `storeId`, `businessId` | Sales records scoped to issuing store location |
| **Customers / CRM** | **Yes** | No | Tenant-wide | Shared buyer directory across all retail outlets |
| **Suppliers Directory** | **Yes** | No | Tenant-wide | Shared vendor directory across all procurement locations |
| **Franchises** | **Yes** | No | Tenant-wide | Central franchise partner registry |
| **Users & Staff** | **Yes** | Scoped | `assignedStoreId`, `assignedStores` | Staff profiles mapped to assigned store locations |
| **Audit Logs** | **Yes** | No | Global Tenant | Immutable security ledger |
| **Settings** | **Yes** | Partial | Global business profiles / Store overrides | Tenant settings and outlet metadata |

---

## 10. RBAC Authorization Matrix

| Permission Key | Description | Super Admin | Admin | Manager | Cashier | Auditor |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `businesses.view` | View legal business profiles | Yes | Yes | Yes | Yes | Yes |
| `businesses.create` | Create business profile | Yes | Yes | No | No | No |
| `businesses.update` | Edit business profile | Yes | Yes | No | No | No |
| `businesses.delete` | Delete business profile | Yes | No | No | No | No |
| `stores.view` | View store outlets directory | Yes | Yes | Yes | Yes | Yes |
| `stores.create` | Register new store outlet | Yes | Yes | No | No | No |
| `stores.update` | Edit store outlet details | Yes | Yes | Yes | No | No |
| `stores.delete` | Delete store outlet | Yes | Yes | No | No | No |
| `franchise.view` | View franchises and supply orders | Yes | Yes | Yes | No | Yes |
| `franchise.manage` | Create/edit franchise & supply orders | Yes | Yes | No | No | No |

---

## 11. Legacy Frontend Anti-Patterns & Risk Audit

Forensic inspection of `aiavro_billing_system.html` (lines 6792, 7122, 10287) identified:
1. **Global Variable Drift:** Relied on `state.activeBusinessId || state.businesses[0].id` scattered across separate functions.
2. **Whole-App Full Sync on Store Change:** Store change triggered `await syncStateWithServer()`, reloading every array and causing full screen flicker.
3. **Hardcoded Selector Mutators:** Imperatively manipulated dropdown `<option>` tags across DOM elements.

### Modern Architecture Guarantees
- Single `StoreScopeProvider` with React Context.
- TanStack Query cache isolation with keys encoding `activeStoreId`.
- Smooth store switching without full-app reloading.

---

## 12. Recommended Phase 11B Architecture Blueprint

```
apps/web/
├── providers/
│   └── StoreScopeProvider.tsx    # Authoritative store scope state & switcher provider
├── features/
│   ├── stores/
│   │   ├── api.ts                # Typed client for GET, POST, PATCH, DELETE /api/v1/stores & /businesses
│   │   ├── hooks.ts              # useStoresQuery, useBusinessesQuery, mutations
│   │   ├── schemas.ts            # Zod validation schemas for store and business forms
│   │   ├── types.ts              # Authoritative StoreDoc and BusinessDoc types
│   │   ├── components/
│   │   │   ├── StoreHeader.tsx
│   │   │   ├── StoreSummaryCards.tsx
│   │   │   ├── StoreTable.tsx
│   │   │   ├── StoreModal.tsx
│   │   │   ├── StoreDeleteDialog.tsx
│   │   │   └── index.ts
│   │   └── page.tsx              # apps/web/app/(protected)/stores/page.tsx
│   └── franchises/
│       ├── api.ts                # Typed client for /api/v1/franchises & /franchise-supply-orders
│       ├── hooks.ts              # useFranchisesQuery, useFranchiseSupplyOrdersQuery, mutations
│       ├── schemas.ts            # Zod validation schemas for franchise and supply order forms
│       ├── types.ts              # Authoritative FranchiseDoc & FranchiseSupplyOrderDoc types
│       ├── components/
│       │   ├── FranchiseHeader.tsx
│       │   ├── FranchiseSummaryCards.tsx
│       │   ├── FranchiseTable.tsx
│       │   ├── FranchiseModal.tsx
│       │   ├── FranchiseSupplyOrderModal.tsx
│       │   ├── FranchiseDetailDrawer.tsx
│       │   └── index.ts
│       └── page.tsx              # apps/web/app/(protected)/franchises/page.tsx
```

---

## 13. Quality Check Confirmation

- **Backend files changed:** `0`
- **Legacy frontend files changed:** `0`
- **New files created:** `docs/modules/STORES_FRANCHISES_API_ANALYSIS.md`
