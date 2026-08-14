# AIAVRO Frontend V2 Architecture

Frontend V2 is a presentation-layer reset around the frozen backend. It does not change REST APIs, JWT/auth behavior, RBAC, inventory, billing, purchases, products, realtime contracts, print contracts, barcode rules, or database behavior.

## Product Direction

The visual language uses the AIAVRO premium login direction: warm white canvas, soft sage background, forest primary actions, emerald success, amber warning, and rose danger. Authenticated screens stay operational: dense tables, clear toolbar hierarchy, tabular figures, and restrained surfaces.

## Shell

The shell is declared with `data-frontend-version="2"` and `data-component="AppShell"`.

Core components:

- `AppShell`: persistent authenticated application frame.
- `Sidebar`: grouped navigation and account controls.
- `TopBar`: page title, context controls, scanner status, sync status, alerts.
- `MainWorkspace`: active page surface.
- `PageHeader`: title and subtitle binding.
- `ContextBar`: outlet, scanner, sync, and notification controls.
- `NotificationLayer`: toast/alert surface.
- `DrawerLayer`: drawer surfaces that also use the existing modal primitive.
- `ModalLayer`: modal/backdrop coordination.

Navigation must not rebuild the entire DOM. Existing view containers remain mounted, and only one view is active.

## Feature Flag

`window.AIAVROFrontendV2.featureFlag` is `true`. The legacy view DOM remains available until each screen is verified under the new shell contract.

## Navigation

The V2 registry groups screens as:

- Operations: Dashboard, POS, Inventory, Products/Purchases, Invoices, Scanner.
- Relationships: Customers, Suppliers/Stores.
- Control: Users/RBAC, Settings, Audit.

RBAC still comes from the existing user/session state and backend remains authoritative. `switchView()` still performs role checks, then delegates visibility to `AIAVROFrontendV2.navigation.setActiveView()`.

## State Model

State is separated by responsibility:

- App state: authentication, active view, active business, user permissions.
- Page state: existing page-specific state objects such as purchase, invoice, CRM, POS, inventory.
- Component state: modal stack, drawer state, shell state, and active view markers.

Inactive views use `display: none` through `data-view-state="hidden"` and `aria-hidden="true"`.

## Modal And Drawer Model

`ModalManager` owns overlay stack, body scroll lock, `aria-hidden`, and focus handoff for existing `.modal-backdrop` surfaces.

`AIAVROFrontendV2.drawers` normalizes drawer-specific state with `data-drawer-state="open|closed"` and syncs with `ModalManager`. This avoids duplicate modal backdrops and stale active overlays.

## Realtime Model

Realtime remains on the existing Socket.IO contracts. Events update affected rows/details only and preserve filters, pagination, and active drawer state. V2 does not add socket events or change payloads.

## Responsive Strategy

The shell has explicit CSS breakpoints for desktop, tablet, and mobile:

- Desktop: persistent sidebar and dense workspace tables.
- Tablet: wrapped context controls and stable workspace width.
- Mobile: single-column operational layout, compact page header, and sidebar overlay.

Target QA sizes: 1920, 1440, 1280, 1024, 768, 430, and 390 widths.

## Migration Order

Screens should migrate one at a time:

1. App Shell
2. Dashboard
3. POS
4. Products
5. Inventory
6. Purchases
7. Invoices
8. Customers
9. Suppliers
10. Settings
11. Users/RBAC

Legacy screen content should not be deleted until its V2 replacement is verified.

## Guardrails

- No backend changes.
- No database changes.
- No fake or sample data.
- No API contract changes.
- No full-screen loading layer.
- No duplicate modal backdrops.
- No full app rerender on navigation or realtime events.
