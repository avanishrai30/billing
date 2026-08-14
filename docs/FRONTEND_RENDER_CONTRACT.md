# AIAVRO Frontend Render Contract

## 1. Logged-Out Render Contract
- **Initial First-Paint Surface**: `#login-screen-overlay.active` has `opacity: 1`, `pointer-events: auto`, `position: fixed`, covering the viewport deterministically.
- **Application Shell**: `.app-container` has `style="display:none"` inline, completely omitted from the layout tree and paint passes.
- **Login Form**: `<form id="login-form" novalidate>` prevents native browser tooltip popups. Input validation is handled cleanly in application JavaScript with user-friendly error banners.
- **Responsive Geometry**: `.login-card` maintains `width: min(440px, calc(100vw - 32px))` across all breakpoints, ensuring no mobile clipping.

## 2. Authenticated Shell Render Contract
- **Transition**: `initAuthentication()` removes `.active` from `#login-screen-overlay` (setting `opacity: 0; pointer-events: none;`), sets `.app-container.style.display = "grid"`, and activates `state.activeView`.
- **View Exclusivity**: Exactly ONE `.app-view.active` element participates in layout (`display: block`). All other `.app-view` elements are `display: none`.
- **No Specificity Leaks**: `.app-view.active` strictly controls visibility without conflicting `[data-view-state]` rules overriding its display property.

## 3. Active-View-Only Data Sync Contract
- **Initialization Scope**: When `syncStateWithServer()` completes, it re-renders **ONLY the currently visible view** (`state.activeView`).
- **No Background DOM Construction**: Inactive domain views (POS, Invoices, Purchases, Inventory, CRM) are never constructed or rendered in the background during state synchronization.

## 4. Lazy Navigation Render Contract
- **Navigation Flow**: When the user clicks a navigation link:
  1. `switchView(viewName)` validates role permissions.
  2. Inactive `.app-view` elements receive `data-view-state="hidden"` and have `.active` removed.
  3. The target view receives `.active` and `data-view-state="visible"`.
  4. The dedicated renderer for the target view is invoked **at navigation time** using cached state, then updated asynchronously if fresh data arrives.
