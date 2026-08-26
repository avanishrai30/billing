# Phase 27: Store-Centric Operating Model & Hub Operations

## Architectural Overview
This phase establishes each physical store/branch outlet as the authoritative operational boundary of the enterprise while supporting flexible multi-employee store assignments and distribution hubs.

### Key Capabilities
1. **Store Master Entity**:
   - Canonical fields: `id`, `name`, `code`, `status`, `address`, `phone`, `isHub`, `hubPriority`, `employeeCount`, `createdAt`, `updatedAt`.
2. **Multi-Employee Store Assignment**:
   - `users.assignedStores` array of store IDs (`string[]`).
   - `users.assignedStoreId` preserved as primary/default store.
   - Non-admin staff are strictly restricted to assigned outlets and blocked from enterprise-wide "All Stores".
3. **Distribution Hubs**:
   - Super Admin can designate any active store as a Distribution Hub (`isHub: true`, `hubPriority`).
   - Hubs act as distribution hubs in transfers and inward procurement destinations.
4. **Store-Scoped Modules**:
   - Dashboard, Invoices, POS, Inventory, and Analytics enforce backend authorization with `assertStoreAccess()`.
   - Realtime events are strictly isolated using Socket.IO store rooms.
5. **UI & UX**:
   - Single-store locked state indicator for single-outlet personnel.
   - "My Stores" switcher dropdown for multi-store personnel.
   - Slide-over `StoreTeamDrawer` for managing store personnel.
   - Hub badges and 4-card metric summary for enterprise overview.

## Verification Matrix
- Backend Unit Tests: `tests/storeScoping.test.js` (12/12 passing)
- Web Frontend Unit Tests: 83 suites (361/361 tests passing)
- Playwright E2E Tests: `storeScopeStoreAssignment.spec.ts`, `storeDashboard.spec.ts`, `storeHub.spec.ts` (5/5 passing)
- Production Build: Next.js 16.2.9 Static & Route Optimization (23/23 routes passing)
