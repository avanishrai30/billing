# Phase 26.7 - Authoritative User Role Propagation

## Diagnostic Matrix

Real staging diagnostic used one dynamically discovered active employee user. No staging username was hardcoded.

User id: `usr-1786982762741`

After `employee -> admin`:

```text
POST category: admin
RESPONSE category: admin
DETAIL GET category: admin
LIST GET category: admin
EFFECTIVE category: admin
REALTIME category: admin
```

Updated timestamps matched across the authoritative backend surfaces:

```text
RESPONSE updatedAt: 2026-08-22T21:17:06.894Z
DETAIL GET updatedAt: 2026-08-22T21:17:06.894Z
LIST GET updatedAt: 2026-08-22T21:17:06.894Z
REALTIME updatedAt: 2026-08-22T21:17:06.894Z
```

The user was reverted after the diagnostic.

## Root Cause

Backend persistence, list reads, detail reads, effective-permission reads, and realtime transport were all correct.

The broken layer was frontend query propagation. `useSaveUserMutation` and `user_updated` only invalidated queries, so a stale `users.list` cache could continue rendering `category=employee` until a refetch replaced it.

## Fix

- Treat `POST /api/v1/users` `response.user` as authoritative immediately.
- Patch `userQueryKeys.list()` with `response.user`.
- Patch `userQueryKeys.detail(response.user.id)` with `response.user`.
- Patch the effective-permissions cache category and override arrays when that cache exists.
- Continue invalidating/refetching in the background.
- Patch `user_updated` realtime payloads immediately when `payload.user` exists.
- Guard realtime cache patches by `updatedAt` so older payloads cannot overwrite newer local/server state.

## Realtime Harness

The real-auth harness now verifies both directions:

- Browser A saves Employee -> Admin.
- POST response category is `admin`.
- Users table immediately renders `Admin`.
- `user_updated` realtime payload category is `admin`.
- Detail GET category is `admin`.
- List GET category is `admin`.
- Effective-permissions category is `admin`.
- Browser B receives refreshed auth state with admin permissions and no AppShell remount.
- Browser A saves Admin -> Employee.
- The same assertions pass for `employee`.
- Browser B loses admin-only permissions with no logout, reload, or AppShell remount.

## Verification

- `npx jest tests/userRoleAssignment.test.js --runInBand`: 1 suite, 2 tests passed.
- `npm test -w apps/web -- --runInBand`: 78 suites, 312 tests passed.
- `npm run typecheck -w apps/web`: passed.
- `npm run build -w apps/web`: passed.
- `npx playwright test --config apps/web/playwright.config.ts`: 72 tests passed.
- Real-auth staging harness against `https://api-staging.vcorganics.com`: 1 test passed.
