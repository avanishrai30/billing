# Phase 26.8 - Stale Selected User Modal State

## Root Cause

The Users page stored the selected user as an object:

```ts
const [activeUser, setActiveUser] = useState<UserDoc | null>(null);
```

That object became a stale snapshot after mutations and realtime updates. React Query correctly refreshed the authoritative `users` list, but open or subsequent selected-user surfaces could still render the old object.

This produced the inconsistent state:

```text
Users table: Admin
Edit User modal: Employee
```

Backend persistence, detail reads, list reads, effective permissions, and realtime transport were already proven correct in Phase 26.7.

## Fix

- Replaced persistent selected user object state with `selectedUserId`.
- Derived `selectedUser` from the authoritative `users` query:

```ts
users.find((u) => u.id === selectedUserId)
```

- Passed the derived user to `UserModal`, `UserDetailDrawer`, and `UserDeactivateDialog`.
- Kept the selected id synchronized with `response.user.id` after saves.
- Updated `UserModal` form reset boundaries to follow `user.id` plus `user.updatedAt` or `user.createdAt`.
- Avoided resetting the form on every parent render.

## Regression Coverage

- Added a `UserModal` unit regression that keeps the modal open, changes the same selected user's authoritative `updatedAt/category`, and verifies the form resets from Employee to Admin.
- Existing Users E2E verifies table role rendering after save.
- Real-auth staging harness verifies two-browser realtime role propagation, effective permissions, and AppShell preservation.

## Verification

- `npm test -w apps/web -- tests/unit/userComponents.test.tsx --runInBand`: 5 tests passed.
- `npx playwright test --config apps/web/playwright.config.ts apps/web/tests/e2e/users.spec.ts`: 2 tests passed.
- Real-auth staging harness against `https://api-staging.vcorganics.com`: 1 test passed.
- `npm test -w apps/web -- --runInBand`: 78 suites, 313 tests passed.
- `npm run typecheck -w apps/web`: passed.
- `npm run build -w apps/web`: passed.
- `npx playwright test --config apps/web/playwright.config.ts`: 72 tests passed.
