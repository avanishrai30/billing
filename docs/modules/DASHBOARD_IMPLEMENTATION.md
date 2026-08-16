# AIAVRO Billing OS — Dashboard Module Implementation Specification

**Status:** Phase 4 Complete & Authoritative  
**Target Path:** `apps/web/features/dashboard/*` & `apps/web/app/(protected)/dashboard/page.tsx`  
**Backend API Endpoint:** `GET /api/v1/dashboard/metrics` (Frozen)

---

## 1. Overview & Information Architecture

The Dashboard module replaces the legacy multi-megabyte array downloads and full-DOM redraws with a single, server-aggregated KPI and operational intelligence layer.

### Component Hierarchy
```
DashboardPage (apps/web/app/(protected)/dashboard/page.tsx)
├── DashboardSkeleton (when isLoading)
├── ErrorState (when isError)
└── Populated Dashboard Container
    ├── DashboardHeader (Title, Store Location Badge, Manual Refresh Action)
    ├── KPIGrid
    │   ├── Primary Financial KPIs (Gross Sales, Net Profit, Purchases, Stock Valuation)
    │   └── Secondary Operational KPIs (Catalog SKUs, Low Stock Count, Expiry Warnings, Franchise Earnings)
    ├── SalesSummaryChart (Deterministic Financial Velocity & Portfolio Composition Bars)
    ├── LowStockWatchlist (Critical Replenishment Watchlist Table + EmptyState)
    └── Dual Activity Grid (Two-column responsive container)
        ├── RecentSalesTable (Recent Invoices + StatusBadge + EmptyState)
        └── RecentPurchasesTable (Recent Inward POs + StatusBadge + EmptyState)
```

---

## 2. API Contract & Data Model

- **Endpoint:** `GET /api/v1/dashboard/metrics`
- **Query Parameter:** `storeId?: string` (enforced via RBAC for non-super admins)
- **Response Schema:**
  - `metrics`: All numerical metrics computed server-side via MongoDB aggregation pipelines.
  - `lowStockWatchlist`: Top 5 items with `stock <= reorderLevel`.
  - `recentInvoices`: 5 most recent sales records.
  - `recentPurchases`: 5 most recent inward purchase orders.
  - `activeStoreId`: Scoped store ID (`all` or outlet ID).

---

## 3. Query & Real-Time Invalidation Strategy

- **TanStack Query Key:** `queryKeys.dashboardMetrics(storeId)` $\to$ `['dashboard-metrics', storeId]`
- **Real-Time Subscriptions:**
  The `useDashboardMetrics` hook subscribes to the following Socket.IO events and triggers query invalidation without full page reloads:
  - `invoice_created`
  - `invoice_voided`
  - `purchase_created`
  - `purchase_deleted`
  - `inventory.updated`

---

## 4. Financial Number & Anti-Flicker Safety

1. **Tabular Numerals:** All currency amounts, percentages, quantities, and timestamps enforce `font-variant-numeric: tabular-nums;`.
2. **Deterministic Skeleton Geometry:** `DashboardSkeleton` matches the populated card and table heights exactly, preventing layout shifts during initial load.
3. **Pure Declarative Rendering:** Zero `innerHTML`, zero DOM queries (`document.querySelector`), zero structural transforms on hover.
