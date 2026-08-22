# Phase 26.2 - Real-Auth RBAC Realtime E2E

## Why Mock JWTs Were Insufficient

The standard Playwright suite uses synthetic tokens in `localStorage`.

`apps/web/lib/realtime/socket.ts` intentionally refuses to connect Socket.IO for `mock-*`, `jwt-*`, and `test-token` tokens, so those tests can validate UI permissions but cannot prove live socket propagation.

## Real-Auth Test Strategy

The real-auth harness is `apps/web/tests/e2e/rbacRealtime.real-auth.spec.ts`.

It uses:

- real `/api/v1/auth/login`
- real JWTs stored by the normal login flow
- actual Socket.IO handshake from the browser
- actual backend user mutation endpoints
- actual audit log lookup
- two independent browser contexts

The test is env-gated so credentials are never committed.

Required environment:

```bash
REAL_AUTH_RBAC_E2E=1
REAL_AUTH_API_BASE_URL=http://localhost:8181
REAL_AUTH_SUPER_ADMIN_USERNAME=...
REAL_AUTH_SUPER_ADMIN_PASSWORD=...
REAL_AUTH_TARGET_USERNAME=...
REAL_AUTH_TARGET_PASSWORD=...
```

The Playwright web server forwards `REAL_AUTH_API_BASE_URL` to `NEXT_PUBLIC_API_BASE_URL`, so the browser talks to the same real backend used by the harness.

## Test User Provisioning

Provision one controlled target account in the selected test/staging database:

- status: `active`
- category: `employee`
- valid password credential
- not a production human account
- inherited `inventory.view`
- no permanent `inventory.adjust` grant

The harness resets the target before the flow and restores its original role, grants, denies, status, and store scope in cleanup.

## Socket Authentication

Socket.IO uses the same JWT issued by `/api/v1/auth/login`.

The backend socket middleware verifies:

- JWT signature
- user exists in MongoDB
- account is active
- token version matches

The test waits for the browser console event emitted by the real client connection: `[Realtime] Connected to backend gateway`.

## Two-Browser Flow

Browser B logs in as the target Employee and remains open.

Browser A logs in as Super Admin, opens `/users`, selects the target user from real backend data, and changes role assignment through the Users UI.

The target browser remains authenticated throughout the flow.

## Role-Change Propagation

The test verifies:

- Employee cannot see `Roles & Access`
- direct `/permissions` shows `AccessDeniedState`
- Browser A changes Employee to Admin through the Users UI
- backend response returns `category: admin`
- audit log contains `user_updated` for the target user
- Browser B receives the access update toast
- Browser B local auth context changes to `admin`
- `Roles & Access` appears without logout or reload
- `/permissions` becomes accessible

## Permission Grant Propagation

While the user is Employee, the harness grants `inventory.adjust`.

The test verifies:

- backend effective permissions include `inventory.adjust`
- Browser B receives the realtime access update
- Browser B auth context includes `inventory.adjust`
- `Stock Adjustment` appears on `/inventory`

## Permission Deny Propagation

The harness removes the grant and applies an explicit deny for `inventory.adjust`.

The test verifies:

- backend effective permissions no longer include `inventory.adjust`
- Browser B receives the realtime access update
- Browser B auth context no longer includes `inventory.adjust`
- `Stock Adjustment` disappears without logout

## Remove Override

The harness removes grants and denies.

The test verifies that `inventory.adjust` returns to the inherited Employee role-template state, which is absent by default.

## DOM Stability

Browser B marks the live Sidebar, Topbar, and Workspace DOM nodes before access changes.

After each realtime authorization update, the test asserts the same nodes still carry the marker attributes. This proves the AppShell structure remained mounted and was not replaced by a full reload.

## Security Verification

The harness also verifies direct API escalation attempts with the Employee token:

- role mutation returns `403`
- permission grant mutation returns `403`

Socket delivery is only a notification path. Authority continues to come from `/api/v1/auth/verify` and backend permission middleware.

## Final Test Results

Local mock-suite regression remains:

- Jest: `77/77` suites, `306/306` tests
- TypeScript: pass
- Build: pass
- Playwright mock suite: `72/72`

Real-auth realtime test command:

```bash
REAL_AUTH_RBAC_E2E=1 \
REAL_AUTH_API_BASE_URL=http://localhost:8181 \
REAL_AUTH_SUPER_ADMIN_USERNAME=... \
REAL_AUTH_SUPER_ADMIN_PASSWORD=... \
REAL_AUTH_TARGET_USERNAME=... \
REAL_AUTH_TARGET_PASSWORD=... \
npx playwright test tests/e2e/rbacRealtime.real-auth.spec.ts
```
