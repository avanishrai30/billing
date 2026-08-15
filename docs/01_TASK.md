# AIAVRO Frontend Migration — Master Task File

## Current state

- Existing backend is Node/Express + MongoDB + Socket.IO.
- Existing REST API surface is the source of truth.
- Existing frontend is a large monolithic HTML/JS application.
- Recent flicker/debug history proves the current frontend is too tightly coupled for safe incremental redesign.
- Stable frontend baseline: `96806ca`.

## Phase 0 — Freeze baseline

### Tasks
- [ ] Confirm Git SHA and clean/expected worktree.
- [ ] Capture current API map.
- [ ] Capture current auth flow.
- [ ] Capture current Socket.IO events.
- [ ] Capture RBAC/permission names.
- [ ] Capture store-scope rules.
- [ ] Capture current module list.
- [ ] Capture current production routes.
- [ ] Create API compatibility matrix.
- [ ] Create browser baseline screenshots for critical modules.
- [ ] Add/verify Playwright smoke harness without changing production behavior.

### Gate
No migration code until the backend/API contract inventory is complete.

## Phase 1 — New frontend workspace

- [ ] Create `apps/web` Next.js App Router project.
- [ ] Enable TypeScript strict mode.
- [ ] Add Tailwind CSS v4.
- [ ] Add shadcn/ui primitives selectively.
- [ ] Add TanStack Query.
- [ ] Add Zod.
- [ ] Add React Hook Form.
- [ ] Add Socket.IO client.
- [ ] Add Playwright.
- [ ] Establish lint/format/typecheck/test commands.
- [ ] Establish env naming without exposing secrets.
- [ ] Establish CSP/CORS/base URL assumptions without backend changes.

### Gate
New app loads a blank protected-shell test route and talks to a health/read-only endpoint through the typed client.

## Phase 2 — API and auth boundary

- [ ] Build one `apiClient` wrapper.
- [ ] Centralize base URL resolution.
- [ ] Centralize Authorization header.
- [ ] Centralize JSON parsing.
- [ ] Centralize typed error normalization.
- [ ] Preserve existing JWT storage/session contract unless a documented compatibility reason exists.
- [ ] Add endpoint modules by domain.
- [ ] Add runtime schemas only where response variability makes them valuable.
- [ ] Add request IDs where existing backend supports them.

### Gate
Login, session restore, logout, and one protected GET work without direct fetch calls scattered across components.

## Phase 3 — Design system

- [ ] Define spacing scale.
- [ ] Define typography scale.
- [ ] Define colors and semantic states.
- [ ] Define radii.
- [ ] Define shadows.
- [ ] Define form controls.
- [ ] Define buttons.
- [ ] Define tables.
- [ ] Define drawers/dialogs.
- [ ] Define toast/error patterns.
- [ ] Define responsive breakpoints.
- [ ] Define motion policy.
- [ ] Define anti-flicker policy.

### Gate
Story/page for primitives at desktop, tablet, mobile.

## Phase 4 — Shell + login

- [ ] Protected layout
- [ ] Sidebar
- [ ] Header
- [ ] Outlet/store selector
- [ ] User menu
- [ ] Login page
- [ ] Dynamic public branding through existing settings endpoint
- [ ] Responsive mobile navigation
- [ ] Route guard/session restore

### Gate
Cold load, refresh, login, logout, mobile navigation, no blank frame/flicker.

## Phase 5 — Dashboard

- [ ] Existing metrics
- [ ] Current data sources
- [ ] Charts
- [ ] Watchlists
- [ ] Recent purchases/invoices
- [ ] Loading/empty/error states
- [ ] Realtime invalidation rules

### Gate
No regression against current values and navigation.

## Phase 6 — Purchase Entry

- [ ] Supplier/invoice header
- [ ] Product lines
- [ ] GST/discount calculations
- [ ] Optional transport/freight
- [ ] Other charges
- [ ] Grand total
- [ ] Submit existing POST `/api/v1/purchases`
- [ ] Existing inventory behavior preserved
- [ ] Purchase history
- [ ] Detail
- [ ] Void
- [ ] Pagination/filtering
- [ ] Realtime purchase events

### Gate
Create -> persist -> reload -> history -> detail -> void -> inventory verification.

## Phase 7 — POS

- [ ] Product catalog
- [ ] Search/barcode
- [ ] Cart
- [ ] Checkout
- [ ] Existing invoice endpoint
- [ ] Existing inventory decrement
- [ ] Existing scanner integrations

## Phase 8 — Inventory

- [ ] Product master
- [ ] Stock balances
- [ ] Adjustments
- [ ] Transfers
- [ ] Logs
- [ ] Scanner workflows

## Phase 9 — Management modules

- [ ] Invoices
- [ ] Customers
- [ ] Suppliers
- [ ] Businesses/stores
- [ ] Tax/GST
- [ ] User/RBAC
- [ ] Settings
- [ ] Backup

## Phase 10 — Production cutover

- [ ] Full browser matrix
- [ ] Performance baseline
- [ ] Accessibility pass
- [ ] API error matrix
- [ ] Socket event matrix
- [ ] Permission matrix
- [ ] Store-scope matrix
- [ ] Deployment rehearsal
- [ ] Rollback rehearsal
- [ ] Production cutover

## Rule for every agent

Before editing code, read:
- this task file
- the architecture document
- the API contract document
- the design system document
- the current phase task

After editing:
- show files changed
- show tests
- show typecheck/lint result
- show browser evidence for visual work
- do not claim completion from static tests alone
