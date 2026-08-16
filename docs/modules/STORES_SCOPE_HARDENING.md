# Phase 11C — Cross-Module Store Scope Regression & Hardening

## 1. Executive Summary & Objective
Phase 11C hardens the centralized **`StoreScopeProvider`** frontend context across all store-sensitive modules (`Dashboard`, `POS`, `Inventory`, `Purchases`, `Invoices`) and ensures that tenant-wide shared domains (`Customers`, `Suppliers`, `Businesses`, `Franchises`) remain untainted by local store filters.

### Key Verification & Hardening Results
- **Authoritative Store Scope Source of Truth:** `StoreScopeProvider` (`useStoreScope()`).
- **Cache Isolation:** TanStack Query keys encode effective scope identities (e.g. `['inventory', 'balances', storeId]`), preventing cross-store data leakage.
- **LocalStorage Tampering Guard:** Invalid or non-existent store IDs in `localStorage['aiavro_selected_store_id']` automatically fall back to permitted scopes (`'all'` or authorized store).
- **Restricted Staff Isolation:** Cashiers and single-store managers are strictly locked to `assignedStoreId` with locked topbar badges; backend RBAC rejects unauthorized requests with `403 STORE_ACCESS_DENIED`.
- **Zero Backend / Legacy Changes:** `0` backend modifications; `0` legacy HTML modifications.

---

## 2. Store-Sensitive vs. Tenant-Wide Domain Mapping

| Domain Module | Store Sensitivity | Query Key Isolation Scheme | Backend Scoping Enforcement |
| :--- | :---: | :--- | :--- |
| **Dashboard** | **Store-Scoped** | `['dashboard', 'metrics', storeId]` | Server-side MongoDB aggregation filters `locationId`/`storeId` |
| **POS Terminal** | **Store-Scoped** | Bound to operating outlet in checkout payload | Session and invoice receipt bound to store `locationId` |
| **Inventory Balances** | **Store-Scoped** | `['inventory', 'balances', storeId]` | Stock quantities and ledger entries isolated by `locationId` |
| **Purchases Inward** | **Store-Scoped** | `['purchases', 'list', { locationId }]` | Inward transport and inventory arrival scoped by store `locationId` |
| **Invoices Ledger** | **Store-Scoped** | `['invoices', 'list', { locationId }]` | Sales receipts filtered by store `locationId` |
| **Customers CRM** | **Tenant-Wide** | `['customers', 'list']` | Shared buyer accounts across all store outlets |
| **Suppliers Directory** | **Tenant-Wide** | `['suppliers', 'list']` | Shared vendor accounts across all procurement points |
| **Business Legal Profile** | **Tenant-Wide** | `['businesses', 'list']` | Tenant enterprise profile, bank accounts, and GSTIN |
| **Stores Directory** | **Tenant-Wide** | `['stores', 'list']` | Complete list of all store branch configurations |

---

## 3. Realtime Socket Room Management & Fast Switching

When switching between Store A and Store B:
1. `realtimeManager.joinStore(newStoreId)` automatically purges previous `store_*` rooms from internal tracking and emits `JOIN_SYNC` for `store_<newStoreId>`.
2. Base Socket.IO connection is preserved without reconnect teardown or duplicate listeners.
3. Fast repeated switching ($A \to B \to A \to B \to \text{All}$) maintains single-room occupancy.

---

## 4. Quality Gates & Verification

```bash
# 1. Jest Unit, Query Isolation & Component Test Suite (46 Suites / 188 Tests)
$ npm test -w apps/web
PASS tests/unit/storeScopeIsolation.test.ts
PASS tests/unit/realtimeStoreScope.test.ts
PASS tests/unit/storeScope.test.tsx
PASS tests/unit/storeSchemas.test.ts
PASS tests/unit/storeQuery.test.ts
PASS tests/unit/storeComponents.test.tsx
PASS tests/unit/businessComponents.test.tsx
... (46 test suites passed)

# 2. TypeScript Strict Typecheck
$ npm run typecheck -w apps/web
> tsc --noEmit
# 0 errors

# 3. Next.js Production Build
$ npm run build -w apps/web
✓ Compiled successfully

# 4. Playwright End-to-End Suite (36 Tests)
$ npm run test:e2e -w apps/web
36 passed
```

---

## 5. Architectural Checklist

- [x] Single authoritative store scope state in `StoreScopeProvider`.
- [x] Zero duplicate store state or conflicting local store selectors.
- [x] Store A data never leaks into Store B cache.
- [x] Restricted users locked to assigned store; localStorage tampering falls back to valid scope.
- [x] Realtime socket rooms cleaned up on store switch.
- [x] Customers and Suppliers directories remain global.
- [x] Mobile viewports (430x932 & 390x844) verified with zero horizontal overflow.
- [x] Zero backend files changed. Zero legacy HTML files changed.
