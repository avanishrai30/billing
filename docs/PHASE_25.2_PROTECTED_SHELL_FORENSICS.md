# Phase 25.2 Protected Shell Forensics

## Exact Commit

- Local HEAD during investigation: `90b4fc5`
- HEAD subject: `fix(ui): correct runtime icon label alignment`
- Relevant prior shell commits in history:
  - `ec3d6fb fix(auth): stabilize protected shell session lifecycle`
  - `9abb5ad fix(shell): elevate StoreScopeProvider to root providers and eliminate route transition re-instantiation`
  - `0303164 fix(auth): eliminate hydration mismatch and stabilize protected route lifecycle`

## Exact Failure

The protected application shell could disappear after a protected module request returned `401`.

Affected visible surface:

- Dashboard page content
- Sidebar links
- Store selector in Topbar
- Product Master
- Customers and Suppliers
- RBAC / Roles & Access

The Suppliers "element detached from the DOM" symptom matches the shell being replaced during an in-flight interaction, not a table-specific bug.

## Runtime Transition

At committed `90b4fc5`, `apps/web/lib/api/client.ts` treated any authenticated protected API `401` as global session expiry:

1. A module request returned `401`.
2. `apiClient` cleared the stored session.
3. `apiClient` invoked the registered session-expired callback.
4. `AuthProvider` transitioned from authenticated state to `session-expired`.
5. `ProtectedLayout` redirected to `/login`.
6. `ProtectedLayout` returned `null` once `isAuthenticated` became false.
7. `AppShell`, `Sidebar`, `Topbar`, and `Workspace` unmounted.

Forensics probe after the fix forced `/api/v1/customers` to return `401` while `/api/v1/auth/verify` returned `200`. The logged sequence showed:

- `api.401` for `/api/v1/customers`
- `/auth/verify` confirmation status `200`
- `isSessionExpired: false`
- no `protected-layout.redirect-login`
- no `protected-layout.null-return`
- Sidebar, Topbar, and Workspace remained mounted

## Root Cause

The root cause was shell-wide session invalidation being triggered by module-level authorization failures.

A module endpoint can return `401` or an environment can expose a transient protected API `401` while the browser session is still valid. The previous API client converted that endpoint-level failure into a global auth failure, which removed the protected shell.

This explains why the failure clustered around protected routes and why the DOM detachment looked shared rather than route-local.

## Smallest Fix

The shared fix is in `apps/web/lib/api/client.ts`.

For authenticated protected `401` responses:

- `/auth/verify` and `/auth/logout` still expire the session immediately.
- Other protected endpoints first call `/api/v1/auth/verify`.
- The shell expires only if that verification request also returns `401`.
- If verification succeeds or cannot confirm expiry, the original module request still fails locally, but the shell remains mounted.

No `/login`, Button/IconSlot, backend, AppShell, Sidebar, Topbar, Workspace, or protected route redesign changes were needed.

## Targeted Results

Targeted reproduction commands were run before the full suite:

- `npx playwright test tests/e2e/authShell.spec.ts` - 6/6 passed
- `npx playwright test tests/e2e/dashboard.spec.ts` - 4/4 passed
- `npx playwright test tests/e2e/storeScope.spec.ts` - 6/6 passed
- `npx playwright test tests/e2e/customers.spec.ts` - 2/2 passed
- `npx playwright test tests/e2e/suppliers.spec.ts` - 2/2 passed
- `npx playwright test tests/e2e/products.spec.ts` - 3/3 passed
- `npx playwright test tests/e2e/rbac.spec.ts` - 2/2 passed
- `npx playwright test tests/e2e/roleAccess.spec.ts` - 3/3 passed

Targeted total: 28/28 passed.

## Full Results

Final post-fix regression:

- `npx playwright test` - 70/70 passed
- `npm test -w apps/web` - 77/77 suites passed, 305/305 tests passed
- `npm run typecheck -w apps/web` - passed, 0 TypeScript errors
- `npm run build -w apps/web` - passed

The E2E count is 70 in this workspace because Phase 25.1 added two runtime geometry checks. The protected-shell target remains green.

## Notes

The local workspace had unrelated dirty files during investigation. The shell fix is isolated to the shared frontend API client and does not depend on those unrelated changes.
