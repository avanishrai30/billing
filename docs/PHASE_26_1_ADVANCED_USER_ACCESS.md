# Phase 26.1 - Advanced Enterprise User Access

## Canonical User Role

`category` is the canonical authorization role.

- `role` is a display title.
- `category` is one of `super admin`, `admin`, `employee`, or `auditor`.
- Users table and access editors display `category` as the authoritative role assignment.

## Role Template Model

Role templates remain global and are edited on `/permissions` under the `Roles` tab.

Editable templates:

- `admin`
- `employee`
- `auditor`

Super Admin / Owner keeps wildcard access and is not edited through the role matrix.

## User Override Model

Per-user overrides are separate from role templates.

- `permissionGrants`: explicit user grants
- `permissionDenies`: explicit user denies
- no override means inherited role-template behavior

The RBAC page now has separate `Roles`, `Users`, `Overrides`, and `Audit` layers.

## Effective Permission Calculation

Backend-authoritative calculation:

```text
effectivePermissions = rolePermissions + permissionGrants - permissionDenies
```

React may display effective state, but security enforcement remains in backend middleware.

## API Contracts

- `GET /api/v1/users/:id/effective-permissions`
  - returns role permissions, grants, denies, and effective permissions
- `POST /api/v1/users/:id/permissions`
  - validates grant/deny arrays
  - persists user-specific overrides
  - requires `users.update` or `roles.update`
- `POST /api/v1/users`
  - persists canonical `category`
  - preserves role/category consistency
- `GET /api/v1/users/me/activity`
  - returns current user's own audit events without granting global audit access
- `POST /api/v1/users/profile`
  - updates own `name`, `email`, and `phone`
- `POST /api/v1/upload?type=users`
  - uploads optimized profile image via existing media pipeline
- `POST /api/v1/users/avatar`
  - accepts only `/uploads/users/...` avatar paths

## Realtime Event

Access changes emit targeted `user_access_updated` only to the affected user's sockets.

Payload includes:

- `targetUserId`
- `userId`
- `changedFields`
- `authorizationVersion`
- `updatedAt`

Sensitive permission details are not broadcast globally.

## Session Refresh

The target browser handles `user_access_updated` by calling `/api/v1/auth/verify`.

`verifyJWT` rebuilds the session user from the live DB and resolves effective permissions, so role and override changes apply without logout, page refresh, or AppShell remount.

## Navigation Visibility

Sidebar navigation is generated from `hasPermission`, which uses backend-resolved effective permissions when present.

`/profile` is available to all authenticated users.

`/design-system` now has a direct route guard matching its sidebar permission.

## Dashboard Visibility

Dashboard route access still requires `dashboard.view`.

Domain sections are hidden when their source permission is missing:

- sales chart and recent sales require `invoices.view`
- low stock requires `inventory.view`
- recent purchases require `purchases.view`

Backend endpoints remain protected separately.

## Self-Service Profile

Every authenticated user can access `/profile` for:

- profile picture upload
- name, email, and phone edits
- read-only username, role, and store scope
- own activity history

Users cannot edit their own role, permissions, store scope, or account status from this page.

## Avatar / Media Handling

Profile images reuse the existing upload infrastructure:

1. Browser validates image type and 5 MB max size.
2. Client uploads to `/api/v1/upload?type=users`.
3. Backend optimizes to WebP.
4. Client saves returned `/uploads/users/...` path through `/api/v1/users/avatar`.
5. Auth session refresh updates the topbar avatar in place.

## Personal Activity Audit

`/profile` renders `My Activity` from `GET /api/v1/users/me/activity`.

Global audit remains protected by `audit.view`.

## Security Boundaries

Backend blocks:

- employee/admin direct Super Admin escalation
- wildcard grants by non-Super Admin users
- self-demotion from Super Admin
- self-deactivation
- last active Super Admin removal
- invalid override payloads
- avatar paths outside `/uploads/users/`
- user presence disclosure without `users.view`

## Test Strategy

Verified layers:

- backend RBAC/security regression tests
- web unit suite
- realtime unit contract for targeted `user_access_updated` session refresh
- TypeScript
- production build
- targeted Playwright for Users, RBAC, Profile, Role Access, Dashboard, Products
- full Playwright regression

True two-browser realtime E2E is not currently possible in the mocked Playwright harness because mock/test JWTs intentionally skip live Socket.IO connections. Current coverage validates the backend event contract, frontend session-refresh path, and browser behavior around effective permissions. A future real-auth Playwright project can validate live socket propagation with non-mock tokens.
