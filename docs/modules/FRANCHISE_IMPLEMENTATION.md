# Phase 12B — Franchise CRM & Supply Order Implementation Specification

## 1. Executive Summary & Domain Scope

Phase 12B implements the **Franchise CRM & Supply Chain Management** feature module in the typed frontend workspace at `apps/web/features/franchises/` and `apps/web/app/(protected)/franchises/page.tsx`.

### Implemented Features:
1. **Franchise Directory & Profile Management:**
   - External partner registration (`name`, `location`, `owner`, `phone`, `email`, `gstin`, `status`).
   - Dynamic wholesale pricing catalog agreements (`supplyList` with `productId`, `name`, `supplyPrice`, `retailPrice`, `isCustom`).
   - Complete CRUD via `GET /api/v1/franchises`, `POST /api/v1/franchises`, `DELETE /api/v1/franchises/:id`.
2. **Franchise Supply Order Ledger & Creation:**
   - Creation of outbound B2B supply dispatch orders via `POST /api/v1/franchise-supply-orders`.
   - Line items calculation for wholesale `subtotal`, `tax` (GST), and `grandTotal`.
   - Payment status tracking (`paid`, `pending`, `credit`, `unpaid`).
   - Deep detail drawer displaying partner profile, agreement catalog, and historical dispatch records.
3. **No Inventory Side-Effect Boundary:**
   - Strictly obeys backend ground truth: `POST /api/v1/franchise-supply-orders` records the supply order without mutating MongoDB `inventory_balances` or `inventory_ledger`.

---

## 2. Verified Endpoints & RBAC Matrix

| Endpoint | Method | Permission | Payload / Response | Side Effects |
| :--- | :---: | :---: | :--- | :--- |
| `/api/v1/franchises` | `GET` | `franchise.view` | `FranchiseDoc[]` | None |
| `/api/v1/franchises/:id` | `GET` | `franchise.view` | `FranchiseDoc` | Returns `404` if not found |
| `/api/v1/franchises` | `POST` | `franchise.manage` | `FranchiseFormPayload` $\to$ `{ success: true, franchise }` | Audit log, emits `franchise_updated` to `sync_global` |
| `/api/v1/franchises/:id` | `DELETE` | `franchise.manage` | `{ success: true, message }` | Audit log, emits `franchise_deleted` to `sync_global` |
| `/api/v1/franchise-supply-orders` | `GET` | `franchise.view` | `FranchiseSupplyOrderDoc[]` | None |
| `/api/v1/franchise-supply-orders` | `POST` | `franchise.manage` | `SupplyOrderFormPayload` $\to$ `{ success: true, order }` | Audit log, emits `franchise_order_created` to `sync_global` |

---

## 3. Realtime WebSocket Events & Query Invalidation

- **`franchise_updated`:** Invalidates `['franchises', 'list']` and `['franchises', 'detail', id]`.
- **`franchise_deleted`:** Invalidates `['franchises']`.
- **`franchise_order_created`:** Invalidates `['franchise-supply-orders', 'list']` and `['dashboard-metrics']`.

---

## 4. Architectural Safety & Anti-Flicker Decisions

1. **Zero Backend Modifications:** Backend files (`server.js`, `modules/franchise.js`, etc.) remain 100% frozen.
2. **Zero Legacy HTML Modifications:** `aiavro_billing_system.html` remains 100% frozen.
3. **Declarative State & UI Primitives:** Pure React components using `AppShell`, `Table`, `Dialog`, `Drawer`, `StatCard`, and `Badge` primitives with zero imperative DOM mutations or innerHTML injections.
4. **Tenant-Wide Isolation:** Franchises operate at the enterprise tenant level; switching retail store scope does not incorrectly filter third-party franchise partners.
