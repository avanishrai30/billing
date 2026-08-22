# Phase 26.3 - Permission-Aware UI

## Shared Authorization Hook

Frontend visibility now has one small abstraction:

- `useAuthorization().can(permission)`
- `useAuthorization().canAny(permissions)`
- `useAuthorization().canAll(permissions)`

The hook delegates to `AuthProvider.hasPermission`, which reads the backend-resolved `user.permissions` effective permission list. Role/category names are not the primary authorization mechanism for UI actions.

## Route Permission Map

| Route | Required Permission | Notes |
| --- | --- | --- |
| `/dashboard` | `dashboard.view` | Partial widgets are hidden by domain permission. |
| `/pos` | `invoices.create` | POS creates invoices. |
| `/products` | `products.view` | Create/edit/archive/import are action-gated. |
| `/inventory` | `inventory.view` | Adjust and transfer are action-gated. |
| `/purchases` | `purchases.view` | New entry requires `purchases.create`; void requires `purchases.void`. |
| `/invoices` | `invoices.view` | POS link requires `invoices.create`; void requires `invoices.void`. |
| `/customers` | `customers.view` | Create/update/delete are action-gated. |
| `/suppliers` | `suppliers.view` | Create/update/delete are action-gated. |
| `/stores` | `stores.view` | Store/business edits use store/business update permissions. |
| `/franchises` | `franchise.view` | Management actions require `franchise.manage`. |
| `/users` | `users.view` | Create/update/deactivate are action-gated. |
| `/permissions` | `roles.view` | Role template updates require `roles.update`; user access editing requires `users.update`. |
| `/audit` | `audit.view` | Global audit remains permission-controlled. |
| `/tax` | `invoices.view` | Tax ledger derives from invoice visibility. |
| `/settings` | `settings.view` | Editing requires `settings.update` or module-specific update permissions. |
| `/profile` | authenticated user | Self-service only; privileged fields stay read-only. |

## Action Permission Map

| Area | Action | Permission |
| --- | --- | --- |
| Products | create | `products.create` |
| Products | edit | `products.update` |
| Products | archive | `products.archive` |
| Products | import preview | `products.import.preview` or `products.import` |
| Products | import commit | `products.import.commit` |
| Inventory | adjust stock | `inventory.adjust` |
| Inventory | transfer stock | `inventory.transfer` |
| Purchases | create inward purchase | `purchases.create` |
| Purchases | void purchase | `purchases.void` |
| Invoices | create/POS | `invoices.create` |
| Invoices | void | `invoices.void` |
| Users | create | `users.create` |
| Users | update role/scope/profile | `users.update` |
| Users | deactivate | `users.deactivate` |
| RBAC | view role templates | `roles.view` |
| RBAC | update role templates | `roles.update` |
| RBAC | user-specific overrides | `users.update` |
| Settings | portal settings | `settings.update` |
| Settings | store/business settings | `stores.update` / `businesses.update` |

## Sidebar Rules

Sidebar links are filtered by `useAuthorization().can(...)`.

Permission grants and denies update the sidebar after `user_access_updated` refreshes the authenticated user. The filter does not use role/category labels except for display elsewhere in the app.

## Dashboard Rules

Dashboard route access requires `dashboard.view`.

Widgets then render by domain permission:

- sales chart: `invoices.view`
- recent sales: `invoices.view`
- low-stock watchlist: `inventory.view`
- recent purchases: `purchases.view`

The page remains useful for partial permissions instead of blanking the whole dashboard.

## Realtime Behavior

Phase 26.2's real-auth Socket.IO path remains the update channel:

1. backend emits `user_access_updated`
2. `RealtimeProvider` calls `refreshSession`
3. `/api/v1/auth/verify` returns backend-effective permissions
4. `AuthProvider` updates `user.permissions`
5. sidebar, route guards, and action buttons re-render in place

No logout, full reload, or AppShell remount is required.

## Security Boundaries

Frontend checks are only UX. Backend middleware remains authoritative and continues returning `403` for unauthorized direct API mutation.

CSS hiding is not used as the security boundary; unauthorized controls are not rendered or are disabled with backend enforcement still required.

## Consistency Notes

Known canonical identifiers align with backend middleware:

- `products.update` instead of role-name checks for edit controls
- `inventory.adjust` and `inventory.transfer` for stock actions
- `purchases.create` and `purchases.void` for procurement actions
- `settings.update` for settings edit language
- `users.view` for Users navigation
- `roles.view` / `roles.update` for RBAC templates

Display-only category badges still use `category` because they are labels, not authorization decisions.

## Test Coverage

Added/updated coverage:

- shared `useAuthorization` hook unit test
- sidebar effective-permission grant test
- purchase history void-action visibility test
- real-auth harness now grants and denies `inventory.adjust`, `users.view`, `settings.view`, and `products.update`

Regression targets:

- `npm test -w apps/web`
- `npm run typecheck -w apps/web`
- `npm run build -w apps/web`
- `npx playwright test`
- gated staging real-auth RBAC harness
