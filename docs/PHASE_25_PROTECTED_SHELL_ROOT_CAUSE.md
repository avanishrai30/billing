# Phase 25 Protected Shell Root Cause

## Exact Reproduction

The protected shell was instrumented temporarily in:

- `AuthProvider`
- `StoreScopeProvider`
- `ProtectedLayout`
- `AppShell`
- `Sidebar`
- `Topbar`
- `Workspace`
- public settings and store hooks
- API client 401 handling

Manual flow reproduced the destructive transition:

1. Start authenticated on `/dashboard`.
2. Confirm `AppShell`, `Sidebar`, `Topbar`, and `Workspace` are mounted.
3. Navigate to `/customers`.
4. Return `401` from `/api/v1/customers` while `/api/v1/auth/verify` still returns `200`.

## Exact Runtime State Transition

Before the fix, a protected module request returning `401` caused:

```text
AuthProvider: authenticated -> session-expired
ProtectedLayout: shell -> null
AppShell: unmount
Sidebar: unmount
Topbar: unmount
Workspace: unmount
router: /customers -> /login
```

The transition was not caused by public settings loading, store loading, route keys, Suspense, or route navigation itself. Normal route navigation kept `ProtectedLayout` in the authenticated shell state.

## Root Cause

`apps/web/lib/api/client.ts` treated every authenticated, non-login `401` response as proof that the session had expired.

That meant a module-level `401` from customers, suppliers, products, RBAC, or store-scoped data could clear local session state and trigger the global session-expired callback before proving that the token itself was expired.

## Smallest Fix

The API client now verifies the token before dispatching global session expiration for non-auth module requests:

- `/auth/verify` or `/auth/logout` returning `401` still expires the session immediately.
- Other protected endpoint `401` responses call `/api/v1/auth/verify` with the current token.
- If verification returns `401`, the session expires.
- If verification succeeds or is inconclusive, the module request fails in place and the protected shell remains mounted.

## Targeted Verification

Manual reproduction after the fix:

- `/api/v1/customers` returns `401`
- `/api/v1/auth/verify` returns `200`
- URL remains `/customers`
- `Sidebar` remains mounted
- `Topbar` remains mounted
- login form is not shown

Expired-token verification:

- `/api/v1/customers` returns `401`
- follow-up `/api/v1/auth/verify` returns `401`
- URL changes to `/login`
- session-expired banner is shown

Targeted E2E:

```text
npx playwright test tests/e2e/authShell.spec.ts tests/e2e/dashboard.spec.ts tests/e2e/storeScope.spec.ts tests/e2e/customers.spec.ts tests/e2e/suppliers.spec.ts tests/e2e/products.spec.ts tests/e2e/rbac.spec.ts tests/e2e/roleAccess.spec.ts
28 passed
```

Focused unit verification:

```text
npm test -w apps/web -- tests/unit/apiClient.test.ts
1 suite passed
4 tests passed
```

## Full Verification

```text
npx playwright test
68 passed
```

```text
npm test -w apps/web
77 passed, 77 total
304 passed, 304 total
```

```text
npm run typecheck -w apps/web
0 TypeScript errors
```

```text
npm run build -w apps/web
Compiled successfully
```

Temporary instrumentation was removed before final verification.
