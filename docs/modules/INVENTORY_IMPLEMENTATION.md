# Phase 7B — Inventory & Stock Management Implementation Specification

## 1. Executive Summary
The Inventory & Stock Management module has been migrated to the modern typed Next.js frontend architecture (`apps/web/features/inventory/` and route `apps/web/app/(protected)/inventory/page.tsx`). It provides authoritative store-scoped stock visibility, real-time Socket.IO synchronization, atomic stock reconciliations, inter-store transfers, and immutable movement ledger tracking.

---

## 2. API Contract Mapping (Frozen Backend)

All operations consume existing frozen backend endpoints without backend code modifications:

| Operation | Method | Path | RBAC Permission | Scope | Realtime Event |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Aggregated Summary** | `GET` | `/api/v1/inventory/summary` | `inventory.view` | Outlet Scoped | Invalidated on `inventory.updated`, `inventory.bulk_updated` |
| **Current Balances** | `GET` | `/api/v1/inventory` | `inventory.view` | Outlet Scoped | Invalidated on `inventory.updated`, `product_updated` |
| **Ledger Logs** | `GET` | `/api/v1/inventory/logs` | `inventory.view` | Scoped / Cursor | Polled or re-fetched per product |
| **Availability Check** | `POST` | `/api/v1/inventory/check-availability` | `inventory.view` | Store Scope | Pre-flight validation |
| **Stock Adjustment** | `POST` | `/api/v1/inventory/adjust` | `inventory.adjust` | Store Scope | Emits `inventory.updated` to room `store_${locationId}` |
| **Inter-Store Transfer** | `POST` | `/api/v1/inventory/transfer` | `inventory.transfer` | Source Outlet | Emits `inventory.updated` to affected store rooms |

---

## 3. Stock Semantics & Computations

1. **Available Stock:**
   $$\text{Available} = \max(0, \text{quantity} - \text{reservedQuantity})$$
2. **Stock Status:**
   - **Out of Stock:** $\text{quantity} \le 0$
   - **Low Stock:** $0 < \text{quantity} \le \text{reorderLevel}$
   - **Healthy / In Stock:** $\text{quantity} > \text{reorderLevel}$
3. **Asset Valuation:**
   $$\text{Valuation} = \text{quantity} \times \text{costPrice}$$

---

## 4. Components & Responsibilities

- **[`InventoryHeader`](file:///Users/avanish/Documents/billing%20system/apps/web/features/inventory/components/InventoryHeader.tsx):** Store outlet switcher, realtime status indicator, mutation action buttons.
- **[`InventorySummaryCards`](file:///Users/avanish/Documents/billing%20system/apps/web/features/inventory/components/InventorySummaryCards.tsx):** 4 deterministic KPI cards (Total Units, Low Stock items, Out of Stock items, Total Inventory Valuation).
- **[`InventoryFilters`](file:///Users/avanish/Documents/billing%20system/apps/web/features/inventory/components/InventoryFilters.tsx):** Instant search (name/SKU/barcode), category dropdown, and stock status filter pills.
- **[`InventoryTable`](file:///Users/avanish/Documents/billing%20system/apps/web/features/inventory/components/InventoryTable.tsx):** Typed data table with SKU, category, stock numbers, status badges, asset value in INR, and movement history trigger.
- **[`StockAdjustmentModal`](file:///Users/avanish/Documents/billing%20system/apps/web/features/inventory/components/StockAdjustmentModal.tsx):** React Hook Form + Zod modal for physical count reconciliation with audit reason note.
- **[`StockTransferModal`](file:///Users/avanish/Documents/billing%20system/apps/web/features/inventory/components/StockTransferModal.tsx):** Inter-store transfer modal validating source $\ne$ destination and available stock limits.
- **[`InventoryLedgerDrawer`](file:///Users/avanish/Documents/billing%20system/apps/web/features/inventory/components/InventoryLedgerDrawer.tsx):** Slide-out drawer with movement history list, before/after quantity progression, and movement badges (`SALE`, `PURCHASE`, `TRANSFER_IN`, `TRANSFER_OUT`, `MANUAL_ADJUSTMENT`, `DAMAGE`, `VOID`).

---

## 5. Anti-Flicker & Performance Guarantees

1. **Deterministic Skeleton Loading:** Skeletons preserve layout dimensions before data arrives, eliminating first-paint layout shifts.
2. **Stable Keyed Table Rows:** Uses composite `${item.productId}-${item.locationId}` keys to avoid row jumping.
3. **Targeted Realtime Invalidations:** Socket.IO events invalidate only `['inventory', 'balances']` and `['inventory', 'summary']`, avoiding whole-app reloads.
4. **No Hover Scale/Translate:** Zero hover layout mutations or CSS transform shifts.

---

## 6. Responsive Breakdown

- **Desktop ($\ge$ 1024px):** 4-column summary grid, full data table with inline actions.
- **Mobile (< 1024px):** 2-column stacked KPI cards, horizontal scrollable status filter pills, responsive table with horizontal containment (zero page scroll), and slide-out `Drawer` modal.
