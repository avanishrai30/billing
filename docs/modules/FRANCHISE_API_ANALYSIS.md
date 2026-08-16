# Phase 12A — Franchise & Franchise Supply Domain & Contract Analysis

## 1. Executive Summary & Domain Scope

The **Franchise CRM & Supply Chain Domain** manages external B2B franchise business partners, custom wholesale catalog supply agreements, and outbound wholesale supply dispatches. It is distinct from internal company-owned store outlets (`stores` collection).

### Domain Boundary Clarifications:
- **`franchises` (Tenant-Wide Entity):** External partner profiles, contact info, legal GSTIN, and custom wholesale product catalog pricing (`supplyList`).
- **`franchise_supply_orders` (B2B Dispatch Ledger):** Outbound supply orders dispatched to franchise partners with wholesale pricing, GST calculation, payment tracking (`paid` vs `pending`), and executive earnings attribution.
- **`stores` (Internal Outlets):** Company-owned retail branches (`ST-MUM`, `ST-PUN`) that participate in the internal Store Scope system.
- **`invoices` (B2C/B2B Sales):** End-customer sales transactions.
- **`purchases` (Procurement):** Inbound supplier vendor stock inwarding.
- **`inventory` (Stock Balances):** Central stock balances and immutable movement ledger.

---

## 2. Verified Backend Endpoints & Route Registration

All franchise routes are mounted in `server.js` at line 333: `app.use('/api/v1', franchiseRouter)` from [`modules/franchise.js`](file:///Users/avanish/Documents/billing%20system/modules/franchise.js).

| HTTP Method | Route Path | Permission Middleware | Request Body | Response Shape | Realtime & Audit Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`GET`** | `/api/v1/franchises` | `franchise.view` | *None* | `FranchiseDoc[]` *(Direct Array)* | *None* |
| **`GET`** | `/api/v1/franchises/:id` | `franchise.view` | *None* | `FranchiseDoc` *(Object)* | Returns `404 NOT_FOUND` if absent |
| **`POST`** | `/api/v1/franchises` | `franchise.manage` | `FranchiseFormPayload` | `{ success: true, franchise: FranchiseDoc }` | Audit `franchise_created` / `franchise_updated`. Emits `franchise_updated` to `sync_global`. |
| **`DELETE`** | `/api/v1/franchises/:id` | `franchise.manage` | *None* | `{ success: true, message: string }` | Audit `franchise_deleted`. Emits `franchise_deleted` to `sync_global`. |
| **`GET`** | `/api/v1/franchise-supply-orders` | `franchise.view` | *None* | `FranchiseSupplyOrderDoc[]` *(Direct Array)* | *None* |
| **`POST`** | `/api/v1/franchise-supply-orders` | `franchise.manage` | `SupplyOrderFormPayload` | `{ success: true, order: FranchiseSupplyOrderDoc }` | Audit `franchise_order_created`. Emits `franchise_order_created` to `sync_global`. |

> [!IMPORTANT]
> **Discovery of Non-Existent Endpoints:**
> - There are **NO** `PATCH` endpoints for `/franchises` or `/franchise-supply-orders`.
> - There are **NO** dedicated endpoints for `approve`, `dispatch`, `receive`, `complete`, `cancel`, or `status`.
> - Updates to franchise partner records are submitted via `POST /api/v1/franchises` with existing `id`.
> - Supply orders are immutable records created via `POST /api/v1/franchise-supply-orders`.

---

## 3. Authoritative Data Models

### 3.1 Franchise Partner Document (`franchises` collection)
```typescript
export interface FranchiseSupplyListItem {
  productId: string;        // Product ID or 'custom-<slug>'
  name: string;             // Display name
  supplyPrice: number;      // Wholesale price charged to franchise
  retailPrice: number;      // Suggested consumer MRP
  isCustom?: boolean;       // True if product is custom outside standard catalog
}

export interface FranchiseDoc {
  id: string;               // e.g. "fran-1723812345678"
  name: string;             // Franchise business / store name
  location: string;         // City / area location
  owner: string;            // Franchisee primary contact person
  phone?: string;           // Phone number
  email?: string;           // Email address
  gstin?: string;           // 15-character Indian GSTIN
  status: 'active' | 'inactive' | 'suspended';
  supplyList?: FranchiseSupplyListItem[];
  createdAt: string;        // ISO 8601 timestamp
  updatedAt?: string;       // ISO 8601 timestamp
}
```

### 3.2 Franchise Supply Order Document (`franchise_supply_orders` collection)
```typescript
export interface FranchiseSupplyOrderItem {
  productId: string;        // Product ID
  name: string;             // Item name
  qty: number;              // Quantity supplied
  supplyPrice: number;      // Wholesale unit price
  gst: number;              // GST tax rate percentage (e.g. 5, 12, 18)
  isCustom?: boolean;       // Flag for custom item
}

export interface FranchiseSupplyOrderDoc {
  id: string;               // e.g. "fso-1723812345678"
  franchiseId: string;      // Target franchise partner ID
  date?: string;            // ISO 8601 date string
  items: FranchiseSupplyOrderItem[];
  subtotal: number;         // Sum of (supplyPrice * qty)
  tax: number;              // Sum of (lineTotal * gst / 100)
  grandTotal: number;       // subtotal + tax
  paymentStatus: 'paid' | 'pending' | 'credit' | 'unpaid';
  notes?: string;           // Dispatch notes
  createdAt: string;        // ISO 8601 timestamp
}
```

---

## 4. Supply Order Lifecycle & Accounting Semantics

### 4.1 Order Creation & Status
1. **Creation:** Order is submitted via `POST /api/v1/franchise-supply-orders` with `items`, calculated `subtotal`, `tax`, `grandTotal`, and `paymentStatus`.
2. **Payment Tracking:** 
   - `paymentStatus: 'paid'`: Order is fully settled. Contributes directly to `franchiseEarnings` on the Executive Dashboard.
   - `paymentStatus: 'pending'` / `'credit'`: Order is recorded as outstanding receivables from the franchise partner.
3. **No Multi-Stage Dispatch Lifecycle:** The backend stores the order directly as created. There is no multi-step state machine (no distinct `approved`, `dispatched`, `received` backend routes).

### 4.2 Dashboard Financial Aggregation
In [`modules/dashboard.js:169-173`](file:///Users/avanish/Documents/billing%20system/modules/dashboard.js#L169-L173):
```javascript
const franAgg = await db.collection('franchise_supply_orders').aggregate([
  { $match: { paymentStatus: 'paid' } },
  { $group: { _id: null, total: { $sum: { $ifNull: ["$grandTotal", { $ifNull: ["$total", 0] }] } } } }
]).toArray();
franchiseEarnings = franAgg[0] ? Math.round(franAgg[0].total * 100) / 100 : 0;
```
`franchiseEarnings` on the Dashboard KPI represents the total revenue generated from paid franchise supply orders.

---

## 5. Inventory Impact Forensics

### Backend Behavior (Ground Truth):
- In `modules/franchise.js`, `POST /api/v1/franchise-supply-orders` executes:
  `await db.collection('franchise_supply_orders').insertOne(orderDoc);`
- The backend **does not** automatically deduct from MongoDB `inventory_balances` or write to `inventory_ledger`.
- In legacy HTML frontend (`aiavro_billing_system.html`), the client attempted in-memory `prod.stock -= item.qty` and called a local logging helper, which did not persist across server reloads.
- **Frontend Architecture Requirement (Phase 12B):**
  The typed frontend must submit the supply order to `/api/v1/franchise-supply-orders` and trigger query invalidations (`['franchises']`, `['franchise-supply-orders']`, `['dashboard-metrics']`). If stock adjustment is explicitly required in the future, it must use the verified `/api/v1/inventory/adjust` endpoint.

---

## 6. Store Scope & Tenant-Wide Entity Semantics

- **Franchise Partners are Tenant-Wide:** Franchises operate at the enterprise tenant level. They are not partitioned by internal store IDs.
- **Source Store vs Destination:** Franchises represent external third-party partner locations, while central stock is dispatched from central inventory or company stores.
- **Store Scope Interaction:**
  - `useStoreScope()` does **not** filter the franchise directory.
  - All users with `franchise.view` can inspect the full franchise directory and supply ledger.
  - Creating a supply order allows recording dispatch notes and attributing revenue to the enterprise.

---

## 7. Role-Based Access Control (RBAC) Matrix

Authz enforcement in `modules/franchise.js` and `services/authzService.js`:

| Role | `franchise.view` | `franchise.manage` | Permitted Actions |
| :--- | :---: | :---: | :--- |
| **Super Admin** | ✅ | ✅ | Full View, Create, Update, Delete Partner, Record Supply Dispatch |
| **Owner** | ✅ | ✅ | Full View, Create, Update, Delete Partner, Record Supply Dispatch |
| **Admin** | ✅ | ✅ | Full View, Create, Update, Delete Partner, Record Supply Dispatch |
| **Cashier / Employee** | ❌ | ❌ | Access Denied (`403 FORBIDDEN`) |
| **Auditor** | ❌ | ❌ | Access Denied (`403 FORBIDDEN`) |

---

## 8. Real-Time WebSocket Events & Cache Coordination

| Event Name | Producer | Room | Payload | TanStack Query Invalidation Target |
| :--- | :--- | :--- | :--- | :--- |
| **`franchise_updated`** | `POST /api/v1/franchises` | `sync_global` | `{ franchise: FranchiseDoc }` | `['franchises']`, `['franchises', id]` |
| **`franchise_deleted`** | `DELETE /api/v1/franchises/:id` | `sync_global` | `{ id: string }` | `['franchises']` |
| **`franchise_order_created`** | `POST /api/v1/franchise-supply-orders` | `sync_global` | `{ order: FranchiseSupplyOrderDoc }` | `['franchise-supply-orders']`, `['dashboard-metrics']` |

---

## 9. Legacy Risk Audit & Anti-Flicker Strategy

1. **Unescaped DOM & HTML Injection:** Legacy code injected unescaped HTML strings directly into `innerHTML` for cards and modals.
2. **Missing Input Validation:** Wholesale/retail prices and quantity lacked Zod schema validation.
3. **No Loading / Empty States:** Legacy cards collapsed into an empty string without skeletons.
4. **Anti-Flicker Mandate:** In Phase 12B, the `FranchisesPage` will use `AppShell`, `Table`, `Dialog`, `Drawer`, and `Badge` primitives with standard TanStack Query caching and zero full-page remounts.

---

## 10. Proposed Phase 12B Frontend Architecture Blueprint

```
apps/web/features/franchises/
├── types.ts                   # Authoritative FranchiseDoc, FranchiseSupplyOrderDoc, Summary metrics
├── schemas.ts                 # Zod schemas for franchise profile and supply order forms
├── calculations.ts           # Pure functions: calculateFranchiseEarnings, calculateSupplyOrderTotals
├── api.ts                     # Typed API client for /api/v1/franchises and /franchise-supply-orders
├── hooks.ts                   # TanStack Query & Mutation hooks with realtime sync
├── components/
│   ├── FranchiseHeader.tsx    # Page header with KPI badges & "Register Franchise" button
│   ├── FranchiseCardsGrid.tsx # Responsive card grid with KPI summaries per partner
│   ├── FranchiseCard.tsx      # Individual partner card with earnings, contact, and action buttons
│   ├── FranchiseModal.tsx     # Create / Edit partner modal with dynamic supply list pricing
│   ├── FranchiseSupplyModal.tsx # Record Supply Dispatch modal with live subtotal & GST calculation
│   ├── FranchiseSupplyTable.tsx # Tabulated ledger of historical supply dispatches
│   ├── FranchiseDeleteDialog.tsx# Accessible confirmation dialog for partner deletion
│   └── index.ts               # Barrel exports
└── index.ts                   # Feature export
```

### Route:
- [`apps/web/app/(protected)/franchises/page.tsx`](file:///Users/avanish/Documents/billing%20system/apps/web/app/%28protected%29/franchises/page.tsx) — Main Franchises & Supply Chain management view.

---

## 11. Verification & Test Strategy for Phase 12B

1. **Unit Tests:**
   - `tests/unit/franchiseCalculations.test.ts`: Test earnings, pending order totals, supply tax calculations.
   - `tests/unit/franchiseSchemas.test.ts`: Validate Zod schemas for partner profile and supply order forms.
   - `tests/unit/franchiseQuery.test.ts`: Test Query keys and API request mappings.
   - `tests/unit/franchiseComponents.test.tsx`: Test card grid, modal form triggers, and accessible dialogs.
2. **E2E Tests:**
   - `tests/e2e/franchises.spec.ts`: Full lifecycle (view directory $\to$ register franchise $\to$ edit pricing $\to$ dispatch supply order $\to$ verify card metrics $\to$ verify dashboard earnings $\to$ mobile responsive view at 430x932).
