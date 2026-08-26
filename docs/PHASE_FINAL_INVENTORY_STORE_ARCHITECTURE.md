# Phase Final Inventory & Store Architecture

## Objective

Finalize the warehouse-centric operating model without creating a duplicate master-stock collection.

Canonical flow:

Product Master -> Physical Locations -> Warehouse -> Store Transfers -> Stores -> Store Sales

## Exact Problems Found

- Inventory command-center scoping only honored legacy `assignedStoreId`, so multi-store users could be narrowed to one store or handled inconsistently.
- Legacy store records did not expose a durable `locationType`, forcing warehouse detection through names and old `isWarehouse` flags.
- Transfers were ledger-backed but did not create a canonical `stock_transfers` lifecycle record.
- Atomic stock movement emitted inventory balance updates globally, which can leak store-sensitive stock changes outside authorized location rooms.
- Auth user normalization defaulted missing `assignedStores` to `['all']`, which could widen a store-scoped admin into global scope.
- Business profile edits invalidated cache but did not immediately update visible query data, causing a stale card after save.
- Inventory table row action buttons reused the same accessible name as the primary transfer button, creating strict locator ambiguity.

## Root Cause

The application already had the right core collections and most authorization primitives, but several consumers still used earlier single-store assumptions or legacy room names directly. The architectural gap was not a missing collection; it was inconsistent use of the canonical store/location and authorization contracts.

## Smallest Fix

- Kept stock authority in existing `inventory`, `product_batches`, and `inventory_ledger`.
- Added canonical `locationType` support to stores and inventory records.
- Added `completeStockTransfer()` as a lifecycle wrapper over existing atomic `transferStock()`.
- Added `stock_transfers` index definitions without creating duplicate stock storage.
- Changed command-center, summary, inventory list, and ledger reads to honor `getAuthorizedStoreIds()`.
- Added per-location replenishment suggestion fields from `reorderLevel` and `targetStock`; no automatic stock movement.
- Kept balance events location-scoped and added canonical `location:<id>` / `org:global` room aliases.
- Fixed auth normalization so missing `assignedStores` falls back to the concrete `assignedStoreId`.
- Added a read-only architecture audit script.

## Data Integrity

- Products remain global identity only; physical stock is not stored in `products`.
- Inventory joins remain `products.id === inventory.productId` and `stores.id === inventory.locationId`.
- Transfers preserve batch identity through existing `product_batches` movement behavior.
- New orphan inventory creation remains rejected by product master validation with `PRODUCT_MASTER_NOT_FOUND`.
- Transfer idempotency keys no longer create duplicate `stock_transfers` documents.

## Realtime

- `inventory.updated` remains location-scoped only.
- Location-scoped emits now reach both `store_<id>` and `location:<id>`.
- Global emits now reach both `sync_global` and `org:global`.
- Canonical transfer lifecycle emits:
  - `inventory.transfer.created`
  - `inventory.transfer.completed`

## Read-Only Audit

Added:

`scripts/migrations/audit_inventory_store_architecture.js`

The audit reports:

- Missing product references
- Invalid inventory locations
- Duplicate product/location balances
- Invalid user store assignments
- Missing invoice store IDs
- Batch product/location inconsistencies

It returns `mutated: false` and performs no writes.

## Tests

- `npx jest tests/inventory.test.js --runInBand`: 13/13 passed
- `npx jest tests/inventory.test.js tests/realtime.test.js tests/rbac.test.js tests/storeScoping.test.js --runInBand`: 68/68 passed
- `npm test -w apps/web -- --runInBand`: 83/83 suites, 362/362 tests passed
- `npm run typecheck -w apps/web`: passed
- `npm run build -w apps/web`: passed
- `npx playwright test`: 105/105 passed

Note: root `npx jest --runInBand` is not the valid monorepo verification command here; it pulls web TypeScript and Playwright specs through the root Jest config and fails unrelated parsing before project-specific configs are applied.

## New E2E Coverage

- `apps/web/tests/e2e/inventoryWarehouse.spec.ts`
- `apps/web/tests/e2e/stockTransfer.spec.ts`
- `apps/web/tests/e2e/storeReplenishment.spec.ts`
- `apps/web/tests/e2e/storeAuthorization.spec.ts`
- Existing `apps/web/tests/e2e/storeDashboard.spec.ts` was retained and verified.

## Result

The warehouse-to-store architecture is now represented through the existing domain collections with scoped authorization, location-aware realtime, canonical stock transfer lifecycle records, replenishment suggestions, and read-only migration/audit visibility.
