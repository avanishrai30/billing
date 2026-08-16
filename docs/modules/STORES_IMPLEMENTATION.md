# Phase 11B — Stores, Business Management & Unified Store Scope Implementation

## 1. Executive Summary & Objective
Phase 11B completes the implementation of **Business Entity Profiles**, **Store / Branch Outlets Directory**, and the centralized **`StoreScopeProvider`** frontend context across the typed Next.js workspace.

### Key Deliverables
- **Authoritative Store Scope Provider:** `apps/web/providers/StoreScopeProvider.tsx` (`useStoreScope()`)
- **TopBar Store Switcher:** Integrated active store dropdown with locked indicator for restricted staff.
- **Business Profile Feature:** `apps/web/features/businesses/`
- **Stores Management Feature:** `apps/web/features/stores/`
- **Stores & Business Directory Page:** `apps/web/app/(protected)/stores/page.tsx`
- **Zero Backend Changes:** `0` backend modifications; `0` legacy HTML modifications.

---

## 2. Store Scope Architecture & State Lifecycle

```
                           [Authenticated User Session]
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        [Super Admin / 'all']                [Restricted User / 'store-1']
                    │                                     │
           [Unlocked Selector]                    [Locked Indicator]
                    │                                     │
                    ▼                                     ▼
             [User Selection]                    [Assigned Store Fixed]
                    │                                     │
                    └──────────────────┬──────────────────┘
                                       ▼
                          [StoreScopeContext State]
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
 [Query Scope Keys]         [Socket.IO Room Sync]          [Topbar Indicator]
 (['dashboard', storeId]    (emits JOIN_SYNC storeId)      (Displays active store)
  ['inventory', storeId])
```

### StoreScope Context Values
- `scope`: `{ mode: 'all', storeId: 'all' } | { mode: 'store', storeId: string }`
- `activeStoreId`: `'all'` or specific store ID (persisted to `localStorage['aiavro_selected_store_id']`).
- `effectiveStoreId`: `undefined` if `'all'` (for optional query params), or specific store ID string.
- `isAllStores`: `boolean`
- `isRestricted`: `boolean` (true when user has a non-'all' `assignedStoreId` and is not Super Admin).
- `stores`: `StoreDoc[]` (active store outlets list).
- `switchStore(storeId: string)`: switches active store and coordinates Socket.IO room sync via `realtimeManager.joinStore(storeId)`.

---

## 3. Real-Time Room Coordination & Cache Invalidation

1. **Global Events (`sync_global`):**
   - Sockets listen for `business_updated`, `business_deleted`, `store_updated`, `store_deleted`.
   - Mutating a business or store invalidates query keys `['businesses']` and `['stores']`.
2. **Store-Specific Events (`store_<storeId>`):**
   - When a user switches store, `realtimeManager.joinStore(newStoreId)` emits `JOIN_SYNC` with the target `storeId`.

---

## 4. Quality Gates & Test Results

```bash
# 1. Unit, Calculation, Schema, State & Component Tests (44 Test Suites)
$ npm test -w apps/web
PASS tests/unit/storeScope.test.ts
PASS tests/unit/storeSchemas.test.ts
PASS tests/unit/storeQuery.test.ts
PASS tests/unit/storeComponents.test.tsx
PASS tests/unit/businessComponents.test.tsx
... (all 44 suites passed)

# 2. TypeScript Strict Typecheck
$ npm run typecheck -w apps/web
> tsc --noEmit
# 0 errors

# 3. Next.js Production Build
$ npm run build -w apps/web
✓ Compiled successfully

# 4. Playwright End-to-End Suite (33 Tests)
$ npm run test:e2e -w apps/web
33 passed
```

---

## 5. Verification Checklist

- [x] `StoreScopeProvider` handles all-stores, assigned-store restriction, and store switching.
- [x] Topbar store switcher displays active store and disables for restricted users.
- [x] Business profile card and modal support viewing and editing tenant legal & banking details.
- [x] Store table supports listing, search filtering, registration modal, and deletion dialog.
- [x] Dashboard, Inventory, and Invoices reflect active store scope without full-page flicker.
- [x] Mobile viewport (430x932) has zero horizontal overflow.
- [x] Zero backend files changed. Zero legacy HTML files changed.
