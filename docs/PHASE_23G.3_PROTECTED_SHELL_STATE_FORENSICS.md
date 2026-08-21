# Phase 23G.3 - Protected Shell State-Transition Forensics

## Actual State Transition

The protected shell risk was an auth invalidation transition caused by protected background work that could run outside an authenticated shell:

```text
AuthProvider: initializing/unauthenticated
StoreScopeProvider: mounted globally
useStoresQuery: requests /api/v1/stores
apiClient: receives 401 from a non-login endpoint
apiClient: invokes global session-expired callback
AuthProvider: user/token cleared and lifecycle = session-expired
ProtectedLayout: returns null or auth fallback
AppShell / Sidebar / Topbar / Workspace: detached as a consequence
```

The local suite was already reproducing green during this pass, but the source-level transition was real: an unauthenticated or pre-auth store query had authority to synthesize a session-expired state for the whole app.

## Evidence

- `StoreScopeProvider` is mounted from root `AppProviders`, so it exists on `/login`, root redirects, and during auth bootstrap.
- `StoreScopeProvider` called `useStoresQuery()` unconditionally.
- `useStoresQuery()` subscribed to store realtime invalidations and fetched `/api/v1/stores` without checking auth state.
- `apiClient` treated every non-login `401` as an active session expiry, even when no token was attached.
- `ProtectedLayout` replaces the full protected tree whenever auth is loading or unauthenticated, so the above transition can detach `AppShell`, `Sidebar`, `Topbar`, and `Workspace`.
- Search found no dynamic `key` on `AppShell`, `Sidebar`, `Topbar`, or `Workspace`; route navigation uses stable component identity. Motion wrappers and pathname keys were not the cause.

## Answers

| Question | Finding |
| --- | --- |
| A. Does AuthProvider transition from authenticated back to loading? | No evidence in the local run. The dangerous transition was unauthenticated/pre-auth background `401` to `session-expired`, not authenticated to loading. |
| B. Does public settings refresh replace the shell? | No. Public settings refresh changes Sidebar branding data only. |
| C. Does StoreScopeProvider refresh replace the shell? | It could indirectly trigger auth invalidation before the fix because its store query was ungated. It does not replace the shell directly. |
| D. Does ProtectedLayout return a fallback after auth is resolved? | Only if auth lifecycle is driven back to loading/unauthenticated/session-expired. The fix prevents store bootstrap from causing that. |
| E. Does any Suspense/loading boundary replace the whole workspace? | No app-level Suspense/loading boundary was found as the cause. |
| F. Does route navigation recreate Sidebar/Topbar? | No. They are under the protected layout shell with no pathname key. |
| G. Do motion wrappers or dynamic keys recreate the shell? | No shell-level motion wrapper or dynamic shell key was found. |

## Root Cause

The root cause was not a page-level route issue. It was a shared auth/session boundary bug:

- global store scope was allowed to perform protected store network work before authentication was resolved;
- the API client allowed any non-login `401` to broadcast session expiry, even if the request had no active token;
- protected layout correctly responded to that auth state by removing the protected shell.

## Exact Fix

- `apps/web/lib/api/client.ts`
  - only triggers the session-expired callback on `401` when a token exists and the request is not `skipAuth`.
- `apps/web/features/stores/hooks.ts`
  - added an `enabled` option to `useStoresQuery`;
  - skips store realtime subscriptions when the query is disabled.
- `apps/web/providers/StoreScopeProvider.tsx`
  - passes `enabled: isAuthenticated` to `useStoresQuery`.

No login visual files, `LoginMetamorphicBackground`, login branding/performance code, auth API endpoints, or POS `ProductCard` were modified. Temporary instrumentation was not left in source.

## Targeted Results

```text
npx playwright test tests/e2e/authShell.spec.ts       - 6 passed
npx playwright test tests/e2e/dashboard.spec.ts       - 4 passed
npx playwright test tests/e2e/customers.spec.ts       - 2 passed
npx playwright test tests/e2e/suppliers.spec.ts       - 2 passed
npx playwright test tests/e2e/storeScope.spec.ts      - 6 passed
npx playwright test tests/e2e/roleAccess.spec.ts      - 3 passed
```

## Full Results

```text
npx playwright test                 - 69 passed
npm test -w apps/web                - 77 suites passed, 304 tests passed
npm run typecheck -w apps/web       - PASS, 0 TypeScript errors
npm run build -w apps/web           - PASS, 21/21 static pages generated
```

The first build attempt failed inside the sandbox because Turbopack could not spawn/bind its internal worker process. The same command passed with the required local build permission.
