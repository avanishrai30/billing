# Frontend Render Architecture

This document records the rendering contracts for the single-file AIAVRO frontend. The stabilization pass is frontend-only; backend routes, API contracts, business rules, realtime event names, and production data are unchanged.

## Render Layers

The shared token system defines seven ordered layers:

1. Foundation: `html` and `body` canvas.
2. Shell: persistent sidebar, header, and main workspace container.
3. Auth: the login surface while no session is active.
4. View: the one active page view inside the shell.
5. Overlay: shared modal and drawer backdrops.
6. Modal: modal and drawer content above the backdrop.
7. Toast: transient alerts and critical notifications.

Existing z-index aliases remain available for compatibility, but resolve to these layer tokens. New surfaces should use `data-render-layer` and the token aliases instead of numeric z-index values.

## Shell And View Lifecycle

`.app-container` is rendered once and is only shown or hidden by authentication state. Navigation changes the active view inside that container. Every view carries `data-view-state` and `aria-hidden`; inactive views are `display: none` and do not occupy layout. Entering state may use opacity and transform after first paint, but never changes width, height, margin, or layout participation.

The initial markup has one visible dashboard view for the authenticated shell template, one active login surface in pending auth state, and a hidden app shell. `initAuthentication()` is the authority that switches between those two boot states.

## Overlay And Modal Manager

All modal and drawer surfaces use the existing `.modal-backdrop` primitive. `ModalManager` normalizes active overlays, tracks the active stack, applies `body.modal-open`, marks top versus stacked overlays, and provides open, close, and close-all operations. The mutation observer keeps direct legacy open/close functions synchronized with the same manager.

## State And Rendering

State updates should call the smallest renderer that owns the affected surface. Realtime purchase and invoice handlers use row upsert/void functions and preserve the open detail drawer. CRM handlers update targeted rows and close only a detail drawer whose record was deleted. Cross-view data is kept in state without forcing navigation or rebuilding the whole shell.

## Diagnostics

On a local development host, append `?renderDiagnostics=1` to enable temporary diagnostics. The mode is disabled by default and refuses non-local hosts. It reports render-layer bounding boxes, display, visibility, opacity, z-index, class/style and child-list mutations, plus `layout-shift` entries and the largest observed shift. It is intended for reproducing first paint and navigation churn, not for production UX.

## Flicker Root Causes And Regression Strategy

The recurring failures came from implicit visibility contracts, overlay state being spread across direct class toggles, and transitions being allowed to participate in initial paint. The login surface now paints directly, inactive views are removed from layout, and overlay state is centrally normalized.

Regression coverage lives in `tests/renderArchitecture.test.js` alongside the login flicker tests. Browser QA should capture cold loads and navigation at 100ms, 250ms, 500ms, 1000ms, and 2000ms across desktop and mobile sizes. A passing run must show one shell, one active view, no full-screen loading block, no orphaned active overlay, and stable toolbar/table geometry.

## Boundaries

This architecture pass does not alter authentication calculations, POS/cart/checkout behavior, inventory semantics, purchase/invoice business logic, CRM APIs, RBAC, store authorization, print contracts, or Socket.IO event contracts.
