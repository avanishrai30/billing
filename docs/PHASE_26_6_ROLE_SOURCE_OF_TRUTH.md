# Phase 26.6 - User Role Assignment Source of Truth

## Root Cause

User records contain two related fields:

- `category`: canonical authorization role used to resolve permissions and access.
- `role`: descriptive job title / display title only.

The Users UI presented these concepts ambiguously. A user could appear as `Employee [Admin]`, which made the display title look like an authorization role even though effective permissions still came from `category=employee`.

## Fix

- Renamed the editable security field to `Authorization Role`.
- Added helper text: `This controls the user's permissions and application access.`
- Renamed the descriptive field to `Job Title / Display Title`.
- Added helper text: `This is a descriptive job title and does not control permissions.`
- Added a modal summary for `Authorization Role`, `Job Title`, and `Effective Access`.
- Changed the Users table heading to `Authorization / Title`.
- Rendered the authorization role as the badge and the job title as plain secondary text.
- Preserved custom job titles when authorization changes.
- Suggested the matching default title only when the current title is blank or already a default title.
- Updated save confirmation to use the backend-returned `category`.
- Updated RBAC user inspector category saves to preserve the existing job title.
- Removed display-title fallback from Super Admin checks when an explicit category exists.

## Source Of Truth

Authorization is resolved from `category`.

`role` remains a descriptive business/display title and does not grant permissions. A user with:

```json
{
  "category": "employee",
  "role": "Admin"
}
```

receives employee permissions, not admin permissions.

## Regression Coverage

- `tests/userRoleAssignment.test.js`
  - Proves `role="Super Admin"` with `category="employee"` does not grant wildcard or admin permissions.
  - Proves Employee -> Admin -> Employee category updates persist to the DB record.
  - Proves effective permissions change from `category`.
  - Proves category changes emit `user_access_updated`.
- `apps/web/tests/e2e/users.spec.ts`
  - Verifies the Users modal copy and fields.
  - Verifies Employee -> Admin changes the authorization badge while preserving the job title.
  - Verifies the save confirmation says `Authorization role updated to Admin`.
- `apps/web/tests/e2e/rbacRealtime.real-auth.spec.ts`
  - Verifies staging real-auth `role="Admin"` with `category="employee"` does not grant admin access.
  - Verifies promotion/demotion from backend-returned `category`.
  - Verifies target browser auth state updates through realtime without logout or AppShell remount.

## Staging Data Reconciliation

Read-only staging scan checked 5 users.

Mismatches where display title appears like an authorization role while `category` differs:

| Username | Category | Role |
| --- | --- | --- |
| nithin | employee | Admin |
| aiavro | employee | Admin |

No staging data was mutated.

## Verification

- `npx jest tests/userRoleAssignment.test.js --runInBand`: 1 suite, 2 tests passed.
- `npx jest tests/*.test.js --runInBand`: 20 suites, 204 tests passed.
- `npm test -w apps/web -- --runInBand`: 78 suites, 309 tests passed.
- `npm run typecheck -w apps/web`: passed.
- `npm run build -w apps/web`: passed.
- `npx playwright test --config apps/web/playwright.config.ts apps/web/tests/e2e/users.spec.ts`: 2 tests passed.
- `npx playwright test --config apps/web/playwright.config.ts`: 72 tests passed.
- Real-auth staging harness: 1 test passed against `https://api-staging.vcorganics.com`.
