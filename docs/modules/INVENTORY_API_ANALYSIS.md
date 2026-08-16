# Phase 7A — Inventory Domain & Contract Analysis

## 1. Executive Summary
This document establishes the verified domain model, API contracts, RBAC permissions, stock movement mechanics, realtime events, and error behaviors for the **Inventory Module** across the VC Organic / AIAVRO Billing platform.

All contracts documented herein reflect the actual, frozen backend codebase ([`modules/inventory.js`](file:///Users/avanish/Documents/billing%20system/modules/inventory.js), [`services/inventoryService.js`](file:///Users/avanish/Documents/billing%20system/services/inventoryService.js), [`services/authzService.js`](file:///Users/avanish/Documents/billing%20system/services/authzService.js), and [`services/realtimeService.js`](file:///Users/avanish/Documents/billing%20system/services/realtimeService.js)). No backend code was created or modified.

---

## 2. API Contract Inventory

### 2.1 Aggregated Inventory Summary
- **Method & Path:** `GET /api/v1/inventory/summary`
- **Authentication:** `verifyJWT`
- **RBAC Permission:** `inventory.view`
- **Store Scope:** Enforced via `locationId` / `storeId` query parameter; non-super-admins are locked to `req.user.assignedStoreId`.
- **Query Parameters:**
  - `locationId` / `storeId` (string, optional): Target outlet filter or `all`
- **Response Shape (200 OK):**
  ```json
  {
    "success": true,
    "summary": {
      "totalProducts": 10,
      "totalTrackedItems": 8,
      "totalUnits": 1450.5,
      "lowStockCount": 2,
      "outOfStockCount": 1,
      "inventoryValue": 85400.0,
      "locationId": "store-1"
    }
  }
  ```
- **Error Codes:**
  - `401 Unauthorized` (`AUTH_REQUIRED`)
  - `403 Forbidden` (`PERMISSION_DENIED`)
  - `500 Internal Server Error` (`SUMMARY_ERROR`)

---

### 2.2 List Current Inventory Balances
- **Method & Path:** `GET /api/v1/inventory`
- **Authentication:** `verifyJWT`
- **RBAC Permission:** `inventory.view`
- **Store Scope:** Super-admin can query any `storeId` / `locationId`; store cashiers/managers are constrained to their assigned store.
- **Query Parameters:**
  - `storeId` / `locationId` (string, optional)
  - `productId` (string, optional): Target product filter
- **Response Shape (200 OK):**
  ```json
  {
    "success": true,
    "inventory": [
      {
        "_id": "66bc1...",
        "productId": "prod-101",
        "locationId": "store-1",
        "storeId": "store-1",
        "locationType": "STORE",
        "quantity": 45.0,
        "reservedQuantity": 0.0,
        "reorderLevel": 10.0,
        "version": 4,
        "updatedAt": "2026-08-16T12:00:00.000Z"
      }
    ]
  }
  ```
- **Error Codes:**
  - `401 Unauthorized`, `403 Forbidden`, `500 Internal Server Error` (`FETCH_ERROR`)

---

### 2.3 Paginated Immutable Inventory Ledger Logs
- **Method & Path:** `GET /api/v1/inventory/logs`
- **Authentication:** `verifyJWT`
- **RBAC Permission:** `inventory.view`
- **Store Scope:** Enforced via query option or token `assignedStoreId`.
- **Query Parameters:**
  - `productId` (string, optional)
  - `storeId` / `locationId` (string, optional)
  - `type` (string, optional): `SALE`, `PURCHASE`, `MANUAL_ADJUSTMENT`, `TRANSFER_IN`, `TRANSFER_OUT`, `VOID`, `DAMAGE`
  - `startDate` (ISO string, optional)
  - `endDate` (ISO string, optional)
  - `limit` (number, default: 50, max: 500)
  - `cursor` (string, MongoDB ObjectId for cursor pagination)
- **Response Shape (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "66bc2...",
        "movementId": "mov-17869123-abc",
        "id": "mov-17869123-abc",
        "productId": "prod-101",
        "locationId": "store-1",
        "storeId": "store-1",
        "locationType": "STORE",
        "type": "SALE",
        "quantity": -2.0,
        "beforeQuantity": 47.0,
        "afterQuantity": 45.0,
        "unitCost": 120.0,
        "totalValue": 350.0,
        "referenceType": "invoice",
        "referenceId": "INV-2026-001",
        "performedBy": "cashier1",
        "notes": "POS Sale Checkout #INV-2026-001",
        "createdAt": "2026-08-16T12:30:00.000Z"
      }
    ],
    "pagination": {
      "limit": 50,
      "nextCursor": "66bc2..."
    }
  }
  ```

---

### 2.4 Pre-Flight Stock Availability Check
- **Method & Path:** `POST /api/v1/inventory/check-availability`
- **Authentication:** `verifyJWT`
- **RBAC Permission:** `inventory.view`
- **Request Body:**
  ```json
  {
    "locationId": "store-1",
    "items": [
      { "productId": "prod-101", "quantity": 5 },
      { "productId": "prod-102", "quantity": 10 }
    ]
  }
  ```
- **Response Shape (200 OK):**
  ```json
  {
    "available": true,
    "items": [
      {
        "productId": "prod-101",
        "requested": 5,
        "available": 45,
        "unit": "unit"
      }
    ]
  }
  ```
- **Insufficient Stock Response Shape (200 OK):**
  ```json
  {
    "available": false,
    "errors": [
      {
        "productId": "prod-102",
        "name": "Organic Paneer 500g",
        "requested": 10,
        "available": 2
      }
    ],
    "items": [ ... ]
  }
  ```

---

### 2.5 Manual Stock Adjustment
- **Method & Path:** `POST /api/v1/inventory/adjust`
- **Authentication:** `verifyJWT`
- **RBAC Permission:** `inventory.adjust`
- **Store Scope Check:** `requireStoreScope` on target location
- **Request Body:**
  ```json
  {
    "productId": "prod-101",
    "locationId": "store-1",
    "quantity": 50.0,
    "type": "MANUAL_ADJUSTMENT",
    "referenceId": "AUDIT-2026-Q3",
    "notes": "Physical inventory count reconciliation",
    "cost": 120.0
  }
  ```
  *(Note: `quantity` represents the **target absolute quantity**; the service calculates delta = target - current).*
- **Response Shape (200 OK):**
  ```json
  {
    "success": true,
    "message": "Inventory adjusted successfully",
    "record": 50.0
  }
  ```
- **Side Effects:**
  - Creates immutable record in `inventory_ledger` with `beforeQuantity`, `afterQuantity`, delta, and user audit metadata.
  - Emits `inventory.updated` Socket.IO event to room `store_${locationId}`.
  - Logs `inventory_updated` to `auditService`.

---

### 2.6 Inter-Store Stock Transfer
- **Method & Path:** `POST /api/v1/inventory/transfer`
- **Authentication:** `verifyJWT`
- **RBAC Permission:** `inventory.transfer`
- **Store Scope Check:** Explicit authorization check that user is authorized on the **source store** (`fromLocationId`).
- **Request Body:**
  ```json
  {
    "productId": "prod-101",
    "fromLocationId": "store-1",
    "toLocationId": "store-2",
    "quantity": 10.0,
    "transferId": "TRF-2026-08-001",
    "notes": "Stock rebalancing for festive weekend demand"
  }
  ```
- **Response Shape (200 OK):**
  ```json
  {
    "success": true,
    "message": "Stock transfer completed successfully",
    "referenceId": "tf-17869123-ab",
    "transfer": {
      "success": true,
      "referenceId": "tf-17869123-ab",
      "fromBefore": 50.0,
      "fromAfter": 40.0,
      "toBefore": 5.0,
      "toAfter": 15.0
    }
  }
  ```
- **Error Codes:**
  - `400 Bad Request` (`INSUFFICIENT_STOCK`, `INVALID_FIELDS`, `INVALID_LOCATION`)
  - `403 Forbidden` (`STORE_ACCESS_DENIED`)
  - `500 Internal Server Error` (`TRANSFER_ERROR`)

---

## 3. Inventory Domain Model & Storage Schema

```
┌─────────────────┐             1:N             ┌─────────────────────────┐
│     Product     │ ──────────────────────────> │   Inventory Balance     │
│ (Catalog Meta)  │                             │ (Per Store Snapshot)    │
└─────────────────┘                             └─────────────────────────┘
         │                                                   │
         │ 1:N                                               │ 1:N
         ▼                                                   ▼
┌─────────────────┐                             ┌─────────────────────────┐
│ Purchase / Sale │ ──────────────────────────> │    Inventory Ledger     │
│ (Transaction)   │    (Generates Movement)     │ (Immutable Audit Trail) │
└─────────────────┘                             └─────────────────────────┘
```

### 3.1 Collections

#### Collection 1: `inventory`
- `productId` (string, indexed): Reference to `products.id`
- `locationId` (string, indexed): Store identifier or `all`
- `storeId` (string, legacy alias for `locationId`)
- `locationType` (string): `'STORE'` | `'WAREHOUSE'`
- `quantity` (number, authoritative balance)
- `reservedQuantity` (number, default: 0)
- `reorderLevel` (number, threshold for low-stock triggers)
- `version` (number, optimistic lock / concurrency counter)
- `updatedAt` (ISO Date string)

#### Collection 2: `inventory_ledger`
- `movementId` (string, unique): `mov-${timestamp}-${rand}`
- `productId` (string, indexed)
- `locationId` (string, indexed)
- `locationType` (string)
- `type` (string, indexed):
  - `'SALE'` (POS Retail deduction, negative delta)
  - `'PURCHASE'` (Inward purchase entry, positive delta)
  - `'MANUAL_ADJUSTMENT'` (Count corrections / physical reconciliations)
  - `'TRANSFER_IN'` (Inter-store receipt)
  - `'TRANSFER_OUT'` (Inter-store dispatch)
  - `'VOID'` (Compensating reversal of cancelled sales/purchases)
  - `'DAMAGE'` (Spoilage, transit damage, or shrinkage write-offs)
- `quantity` (number, signed delta)
- `beforeQuantity` (number, balance immediately prior to movement)
- `afterQuantity` (number, balance immediately after movement)
- `unitCost` (number)
- `totalValue` (number)
- `referenceType` (string): `'invoice'`, `'purchase'`, `'transfer'`, `'manual_adjustment'`, `'rollback'`
- `referenceId` (string, indexed)
- `performedBy` (string, user username/id)
- `notes` (string)
- `createdAt` (ISO Date string, indexed for time-range queries)

---

## 4. Stock Semantics & Calculation Rules

| Stock Semantic | Authoritative Calculation / Source | Backend Definition |
| :--- | :--- | :--- |
| **Opening / Current Stock** | `inventory.quantity` | Authoritative persisted balance per `(productId, locationId)`. |
| **Available Stock** | `quantity - reservedQuantity` | Available for immediate POS sale / transfer. |
| **Reserved Stock** | `inventory.reservedQuantity` | Quarantined for pending orders (default 0 in retail store). |
| **Low Stock Threshold** | `inventory.reorderLevel ?? product.reorderLevel ?? 10` | Default 10 units. Product is flagged "Low Stock" when $0 < \text{quantity} \le \text{reorderLevel}$. |
| **Out of Stock** | $\text{quantity} \le 0$ | Flagged "Out of Stock"; POS displays disabled state or warning. |
| **Inventory Valuation** | $\sum (\text{inventory.quantity} \times \text{product.cost})$ | Calculated by summing item quantities multiplied by purchase cost. |
| **Batch Expiry** | Derived from purchase batches or product shelf-life tags | Products flagged warning when expiry $\le 30\text{ days}$. |

---

## 5. Real-Time Socket.IO Synchronization

| Event Name | Producer | Payload Structure | Target Room | Frontend Action |
| :--- | :--- | :--- | :--- | :--- |
| `inventory.updated` | `inventoryService.recordMovementAtomic` | `{ entity: "inventory", action: "updated", id: productId, locationId, data: { productId, locationId, quantity, delta }, version }` | `store_${locationId}` | Invalidate `['inventory', 'balances']`, `['inventory', 'summary']`, `['pos', 'products']`, `['dashboard', 'metrics']`. |
| `inventory.bulk_updated` | `bulkImportService` | `{ entity: "inventory", action: "bulk_updated", count, locationId }` | `store_${locationId}` | Invalidate `['inventory', 'balances']`, `['inventory', 'summary']`. |
| `product_updated` | `productService` | `{ id, name, sku, price, cost, reorderLevel }` | Global / store | Invalidate `['inventory', 'products']`. |

---

## 6. RBAC Matrix

| Role | View Balances & Logs (`inventory.view`) | Manual Adjustment (`inventory.adjust`) | Inter-Store Transfer (`inventory.transfer`) |
| :--- | :---: | :---: | :---: |
| **Super Admin** | ✅ (All Outlets) | ✅ | ✅ (Any Source $\to$ Destination) |
| **Owner** | ✅ (All Outlets) | ✅ | ✅ (Any Source $\to$ Destination) |
| **Admin** | ✅ (Assigned Outlets) | ✅ | ✅ (Source must match assigned outlet) |
| **Employee / Cashier** | ✅ (Assigned Outlet) | ❌ | ❌ |
| **Auditor** | ✅ (Read-Only) | ❌ | ❌ |

---

## 7. Legacy Frontend Risks & Anti-Patterns Audit

1. **Destructive Full-Table Rebuilds:** Legacy `renderInventoryTable()` invoked `tbody.innerHTML = ""` followed by `for` loop DOM injection on every keystroke/filter change.
2. **Global Mutable State (`state.inventory`, `state.products`):** Multiple uncoordinated scripts mutated the global state in-place.
3. **Coupled Product CRUD inside Inventory View:** Legacy UI merged Product editing, price changes, and deletion inside the stock table. The modern architecture strictly separates **Product Master** (`/products`) from **Inventory & Stock Movements** (`/inventory`).
4. **Redundant Server Sync:** Inter-store transfer called `await syncStateWithServer()`, triggering full re-fetching of all invoices, customers, businesses, and settings simultaneously.

---

## 8. Proposed Frontend Architecture (Phase 7 Implementation Blueprint)

```
apps/web/features/inventory/
├── api.ts                   # Typed API client (summary, list, logs, adjust, transfer, checkAvailability)
├── hooks.ts                 # React Query hooks + realtime event subscriptions
├── schemas.ts               # Zod schemas for adjustments, transfers, and ledger queries
├── types.ts                 # Authoritative models (InventoryBalance, LedgerLog, Summary, AdjustPayload, TransferPayload)
├── calculations.ts          # Pure stock valuations, status badge derivations, filter helpers
├── components/
│   ├── InventoryHeader.tsx          # Store selector, live sync badge, summary KPI strip
│   ├── InventorySummaryCards.tsx    # Total items, Total units, Low stock alert, Out of stock, Total asset value
│   ├── InventoryTable.tsx           # Typed table with pagination, sorting, search, and stock level badges
│   ├── InventoryFilters.tsx         # Category, Brand, Stock status (All, In Stock, Low Stock, Out of Stock)
│   ├── StockAdjustmentModal.tsx     # Atomic stock reconciliation dialog with reason & audit trail
│   ├── StockTransferModal.tsx       # Inter-store transfer dialog with real-time stock pre-check
│   ├── InventoryLedgerDrawer.tsx    # Slide-out history drawer showing immutable movement log for a product
│   └── index.ts
```

### Future Quality & Verification Flow:
1. **Dashboard** $\to$ Click Inventory navigation item.
2. **Stock List** $\to$ Verify summary cards, sort by stock level, filter by category/brand, search by SKU/name.
3. **Movement History** $\to$ Open `InventoryLedgerDrawer` for an item; verify paginated movements (`SALE`, `PURCHASE`, `TRANSFER_IN`, `TRANSFER_OUT`).
4. **Action Execution** $\to$ Perform a Stock Adjustment or Transfer; verify immediate UI feedback, optimistic/realtime cache invalidation, and audit log generation.
5. **Cross-Module Verification** $\to$ Return to Dashboard and POS; verify that stock changes reflect across modules without layout flicker or state corruption.
