# AIAVRO Billing OS — Comprehensive Test Strategy & Baseline Inventory

This document inventories the existing backend and integration test suites, maps current test coverage, identifies testing gaps, and defines the verification strategy for the modern frontend migration.

---

## 1. Existing Test Suite Inventory (`tests/*.js`)

The repository contains 19 comprehensive test suites comprising **190 automated unit and integration tests** passing with zero regressions:

| Test File | Domain / Subject | Test Count | Key Invariants Verified |
| :--- | :--- | :--- | :--- |
| [tests/authMigration.test.js](file:///Users/avanish/Documents/billing%20system/tests/authMigration.test.js) | Auth & Bcrypt Migration | 8 | Automated legacy plaintext password upgrade to Bcrypt 12 rounds; unsetting legacy `password` field; token version increments. |
| [tests/clientAuth.test.js](file:///Users/avanish/Documents/billing%20system/tests/clientAuth.test.js) | Frontend API Client Auth | 6 | API client base URL resolution, `Authorization: Bearer <token>` injection, 401 session expiration handling. |
| [tests/rbac.test.js](file:///Users/avanish/Documents/billing%20system/tests/rbac.test.js) | RBAC & Security Hardening | 14 | 401 unauthenticated, 403 unauthorized, Super Admin wildcard access, suspended account login block, tokenVersion revocation, store-scoping isolation. |
| [tests/realtime.test.js](file:///Users/avanish/Documents/billing%20system/tests/realtime.test.js) | Socket.IO Realtime Sync | 16 | Socket handshake JWT auth, store room partitioning (`store_<id>`), canonical event envelopes, batch event suppression, socket disconnection on password change. |
| [tests/indexReconciliation.test.js](file:///Users/avanish/Documents/billing%20system/tests/indexReconciliation.test.js) | Database Indexes | 10 | Idempotent index creation across all 8 core collections; semantic key/option comparison; zero data mutation on boot. |
| [tests/bulkImport.test.js](file:///Users/avanish/Documents/billing%20system/tests/bulkImport.test.js) | File Parser & Bulk Import | 13 | Multi-row hierarchical header extraction, smart column candidate profiling, state machine transitions (`REVIEW_REQUIRED` $\to$ `CONFIRMED`), atomic commitment. |
| [tests/barcodeImport.test.js](file:///Users/avanish/Documents/billing%20system/tests/barcodeImport.test.js) | Barcode Management | 9 | Primary vs variant vs alternate barcode mapping, duplicate barcode prevention, blank barcode normalization to null. |
| [tests/inventory.test.js](file:///Users/avanish/Documents/billing%20system/tests/inventory.test.js) | Inventory & Movements | 12 | Atomic stock increment/decrement, immutable ledger entries, store transfer concurrency, stock availability pre-flight check. |
| [tests/transactions.test.js](file:///Users/avanish/Documents/billing%20system/tests/transactions.test.js) | Invoices & Purchases | 14 | POS checkout stock deduction, supplier purchase stock increment, idempotency tokens, transaction voiding and stock reversal. |
| [tests/print.test.js](file:///Users/avanish/Documents/billing%20system/tests/print.test.js) | Thermal & PDF Invoices | 8 | A4 PDF document generation stream, 58mm thermal receipt formatting, tax/GST breakdown calculations. |
| [tests/vpsFixes.test.js](file:///Users/avanish/Documents/billing%20system/tests/vpsFixes.test.js) | Production VPS Hardening | 11 | Empty barcode normalization, index collision resolution, idempotent `JOIN_SYNC` handling, unauthorized room rejection. |
| [tests/performance.test.js](file:///Users/avanish/Documents/billing%20system/tests/performance.test.js) | Backend Performance | 10 | Query execution performance on indexed collections, sub-100ms response on paginated invoice/product reads. |
| [tests/frontendBaseline.test.js](file:///Users/avanish/Documents/billing%20system/tests/frontendBaseline.test.js) | Frontend DOM Baseline | 15 | Root containers, login overlay, navigation bar, all 10 core application views, zero syntax errors on inline JS. |
| [tests/loginBrandSync.test.js](file:///Users/avanish/Documents/billing%20system/tests/loginBrandSync.test.js) | Public Branding Sync | 5 | Dynamic portal title and logo fetching via `/api/v1/public/settings`. |
| [tests/loginFinalPolish.test.js](file:///Users/avanish/Documents/billing%20system/tests/loginFinalPolish.test.js) | Login Visual Polish | 8 | Login screen typography, responsive split card, password visibility toggle, accessible labels. |
| [tests/loginFocusFlicker.test.js](file:///Users/avanish/Documents/billing%20system/tests/loginFocusFlicker.test.js) | Login Focus Stability | 7 | Input focus retention, elimination of layout thrashing during authentication, autocomplete attribute verification. |
| [tests/loginSmokeyBackground.test.js](file:///Users/avanish/Documents/billing%20system/tests/loginSmokeyBackground.test.js) | Visual Aesthetic Tests | 8 | Background canvas rendering, dark theme palette tokens, radial gradient overlays. |
| [tests/loginTypography.test.js](file:///Users/avanish/Documents/billing%20system/tests/loginTypography.test.js) | Typography Integrity | 6 | Font scale tokens, Google Font preconnect tags, zero FOUT/FOUC. |
| [tests/loginVisualRedesign.test.js](file:///Users/avanish/Documents/billing%20system/tests/loginVisualRedesign.test.js) | Login Visual Layout | 8 | CSS grid/flex layout verification, responsive mobile drawer, brand card badges. |

---

## 2. Coverage Analysis & Identified Gaps

### 2.1 Strong Existing Coverage
- Backend REST endpoints and Zod schema validation (100% covered).
- Auth token lifecycle, password Bcrypt hashing, and session revocation (100% covered).
- RBAC permissions matrix and store-scoping isolation (100% covered).
- Authoritative inventory ledger and movement integrity (100% covered).
- Realtime Socket.IO room security and canonical envelopes (100% covered).
- Database indexes and query performance (100% covered).

### 2.2 Identified Gaps (To be addressed in Modern Frontend)
1. **End-to-End Browser Workflows (E2E):**
   - The legacy application lacked automated Playwright E2E suites verifying multi-view user flows (e.g. login $\to$ POS barcode scan $\to$ invoice generation $\to$ stock balance decrease).
2. **Component Isolation & Accessibility Testing:**
   - React component unit tests (testing form validation, keyboard navigation, screen reader accessibility) must be introduced in the new frontend workspace.
3. **Optimistic Mutation Rollback Tests:**
   - Client-side cache testing for TanStack Query mutations (verifying that failed mutations gracefully rollback UI state).
4. **Cross-Browser Visual Regression Testing:**
   - Automated screenshot diffing at mobile (375px), tablet (768px), and desktop (1280px) breakpoints.

---

## 3. Frontend Migration Testing Strategy

During the incremental migration of modules into Next.js App Router:

1. **Gate 1 — Unit & Hook Tests (Vitest/Jest):**
   - Every custom React hook and API transport wrapper must have 100% unit test coverage.
2. **Gate 2 — Integration Tests:**
   - Test TanStack Query hooks against mock handlers and live API responses.
3. **Gate 3 — Playwright Smoke & E2E Tests:**
   - Every migrated module must pass an automated Playwright spec testing:
     - Initial load with zero layout shift.
     - Form input and validation error display.
     - Successful submission and API mutation.
     - Real-time cache update on incoming Socket.IO events.
4. **Gate 4 — Anti-Flicker & Performance Assertions:**
   - No `transition: all` or uncontrolled layout animations.
   - Zero layout shift during common interactions.
   - First Contentful Paint (FCP) < 0.8s; Cumulative Layout Shift (CLS) < 0.05.
