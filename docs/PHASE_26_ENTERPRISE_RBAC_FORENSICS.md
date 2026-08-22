# Phase 26 - Enterprise RBAC + User Access Control Forensics

## Mandatory Reference Status

| Reference | Local SKILL.md | Status |
| --- | --- | --- |
| pbakaus/impeccable | `/Users/avanish/Documents/billing system/.agents/skills/impeccable/SKILL.md` | AVAILABLE |
| leonxlnx/taste-skill | `/Users/avanish/.codex/skills/leonxlnx/taste-skill/SKILL.md` | AVAILABLE |
| emilkowalski/skills | `/Users/avanish/Documents/billing system/.agents/skills/emil-design-eng/SKILL.md` | AVAILABLE |
| andrej-karpathy-skills / karpathy-guidelines | `/Users/avanish/.codex/skills/forrestchang/karpathy-guidelines/SKILL.md` | AVAILABLE |

## Exact Failure

Changing a user from Employee to Admin could appear to save, then return as Employee after the Users list refetched. The visible table and access decisions use the canonical authorization `category`, while `role` is only a display title.

## Runtime Transition

The failing path was:

1. `UserModal` submitted both `role` and `category`.
2. `POST /api/v1/users` validated the payload through `schemas.userSchema`.
3. `schemas.userSchema` did not include `category`, so Zod stripped it from `req.validatedBody`.
4. `userService.saveUser` persisted only the stripped payload.
5. Existing `category: "employee"` stayed in MongoDB.
6. `GET /api/v1/users` returned the unchanged category, so the row badge and permissions returned to Employee.

For active sessions, `/auth/verify` previously returned token claims rather than the latest database user, so changed roles and permissions also remained stale until reload or re-login.

## Root Cause

The shared backend contract treated `role` and `category` inconsistently:

- Frontend: `category` is the authorization role.
- Backend validation: `category` was not accepted.
- Backend auth: `normalizeCategory(user)` prefers `category` over `role`.
- Session refresh: active auth state was not refreshed from the database after user access changes.

## Smallest Fix

- Added `category`, `permissionGrants`, and `permissionDenies` to the validated user schema.
- Made JWT verification merge the live database user into `req.user` and compute effective permissions on every protected request.
- Added user-specific grant/deny effective permission resolution:
  - `role template + permissionGrants + legacy permissions - permissionDenies`
- Added targeted `user_access_updated` realtime events without disconnecting the affected user.
- Added frontend session refresh on `user_access_updated`, `user_updated`, and `rbac_updated`.
- Fixed the socket subscription manager so handlers registered before connect are attached when the socket is created.
- Added minimal Users modal access controls for per-user grant/deny overrides.
- Added privilege guardrails:
  - Non-super admins cannot create or promote Super Admin accounts.
  - Super Admin self-demotion is blocked.
  - Self-deactivation is blocked.
  - Last active Super Admin deactivation/demotion is blocked.

## Verification

- `npx jest tests/rbac.test.js --runInBand`: 18/18 PASS
- `npm test -w apps/web -- --runInBand`: 77/77 suites PASS, 305/305 tests PASS
- `npm run typecheck -w apps/web`: PASS
- `npm run build -w apps/web`: PASS
- `npx playwright test tests/e2e/users.spec.ts tests/e2e/rbac.spec.ts tests/e2e/roleAccess.spec.ts`: 7/7 PASS
- `npx playwright test`: 70/70 PASS

## Notes

The first sandboxed build and backend Supertest runs failed because the sandbox blocked local process/port binding. The same commands passed with the required elevated execution permissions. No package files or npm dependencies were changed.
