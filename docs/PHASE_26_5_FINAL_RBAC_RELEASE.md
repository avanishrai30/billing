# Phase 26.5 Final RBAC Release

## Release Decision

STATUS = RELEASE CANDIDATE / RBAC FROZEN

No release-blocking defect was found during Phase 26.5. No application code, package files, login code, shell lifecycle, Button/IconSlot, permission model, or realtime transport was changed in this phase.

HEAD remains:

```text
be28689 fix(rbac): complete permission security coverage
```

## References Used

| Reference | Local SKILL.md |
| --- | --- |
| pbakaus/impeccable | `/Users/avanish/Documents/billing system/.agents/skills/impeccable/SKILL.md` |
| leonxlnx/taste-skill | `/Users/avanish/.codex/skills/leonxlnx/taste-skill/SKILL.md` |
| emilkowalski/skills | `/Users/avanish/Documents/billing system/.agents/skills/emil-design-eng/SKILL.md` |
| andrej-karpathy-skills / karpathy-guidelines | `/Users/avanish/.codex/skills/forrestchang/karpathy-guidelines/SKILL.md` |

## Source And Branch

```text
git rev-parse --short HEAD                  be28689
git rev-parse --short origin/migration/frontend-v2  be28689
git diff --check                            PASS
```

The worktree still contains unrelated pre-existing local UI/POS/product dirty files. They were not staged or modified by Phase 26.5.

## Final Architecture

The authorization system remains a layered model:

| Layer | Responsibility |
| --- | --- |
| `verifyJWT` | Validates token, active user status, token version, and resolves current DB-backed effective permissions. |
| `authzService` | Defines role defaults, legacy permission expansion, effective permission resolution, direct permission checks, store-scope filters, grant-boundary checks, and 403 audit logging. |
| Backend route middleware | Uses `requirePermission`, `requireAnyPermission`, and `requireStoreScope` for direct API enforcement. |
| Frontend `AuthProvider` | Holds session state, exposes `hasPermission`, and refreshes active sessions after realtime access changes. |
| Protected pages and sidebar | Render only authorized routes/actions and show `AccessDeniedState` for unauthorized direct route access. |
| Realtime layer | Emits `user_access_updated`, `rbac_updated`, and domain events without remounting the protected shell. |

## Role Model

| Role category | Access behavior |
| --- | --- |
| `super admin` / owner | Wildcard access. Not editable through the role matrix. Cannot remove the final active Super Admin protection. |
| `admin` | Broad operational, catalog, inventory, user, RBAC, audit, settings, store, and franchise permissions. Cannot create or modify Super Admin accounts unless actor is Super Admin. |
| `employee` | Operational cashier defaults, including dashboard, catalog view, inventory view, invoices, purchases, customers, suppliers view, read-only settings, and scanner use. |
| `auditor` | Read-only operational and audit access for dashboard, products, inventory, purchases, invoices, invoice print, and audit logs. |

## Effective Permission Model

Effective permissions are resolved as:

```text
role template permissions
+ explicit permissionGrants
- explicit permissionDenies
= effectivePermissions
```

Security boundaries:

- Super Admin retains wildcard access.
- Non-super admins cannot grant wildcard access.
- Non-super admins cannot grant permissions outside their own effective permissions.
- Role template updates are limited to Admin, Employee, and Auditor templates.
- Direct tampered API requests receive `403`.
- Authorization denials write audit entries.

## Realtime Model

Realtime access changes are delivered through the existing Phase 26 transport:

- User category, store scope, grant, and deny changes emit `user_access_updated`.
- Role matrix changes emit `rbac_updated`.
- Target sessions refresh permission state in place.
- Protected shell, sidebar, topbar, and workspace remain mounted.
- No logout or page reload is required for grant, deny, promote, or demote flows.

## Self-Service Model

All authenticated users can:

- Open My Profile.
- Edit allowed personal fields: name, email, phone.
- Upload a profile avatar through the user upload path.
- View own activity through `/api/v1/users/me/activity`.
- Change own password through the protected self-service endpoint.

Users cannot self-edit:

- Role/category.
- Permission grants or denies.
- Store scope.
- Account status or privileged account state.

Global Audit remains controlled by `audit.view`; My Activity is own-actor only.

## Staging Topology

| Target | Verification | Result |
| --- | --- | --- |
| `https://staging.billing.vcorganics.com` | HTTPS status | `200` |
| `https://api-staging.vcorganics.com/api/v1/auth/verify` without token | Unauthorized response | `401` |
| `https://api-staging.vcorganics.com/socket.io/?EIO=4&transport=polling` | Socket.IO polling path | `200` |
| `https://api-staging.vcorganics.com/api/v1/server-info` | Runtime port | `{"port":"8281"}` |
| `https://api-staging.vcorganics.com/health` | API and DB health | `{"status":"healthy","database":"connected"}` |
| `https://api-staging.vcorganics.com/api/v1/public/settings` | Tenant branding | `VC ORGANIC'S` |

Production topology was confirmed from checked-in deployment documentation and config only. No production API request was made during Phase 26.5.

| Target | Evidence |
| --- | --- |
| `api.vcorganics.com -> /opt/vc-organic -> 8181` | `ecosystem.config.js`, `scripts/vps-setup.sh`, `docs/PHASE_18A_PRODUCTION_PREFLIGHT.md`, `docs/PRODUCTION_HARDENING_GAP_REPORT.md` |
| `api-staging.vcorganics.com -> 8281` | live staging `/api/v1/server-info` response |

The checked-in repo does not contain a staging PM2 config file naming `/opt/vc-organic-staging`; the live staging runtime confirms port `8281`.

## Test Results

| Gate | Result |
| --- | --- |
| Backend RBAC | `26/26` PASS |
| Web Jest | `78/78` suites, `309/309` tests PASS |
| TypeScript | PASS |
| Production build | PASS |
| Full Playwright | `72/72` PASS |
| Real-auth staging RBAC harness | `1/1` PASS |
| Staging frontend HTTPS | `200` |
| Staging API unauthenticated verify | `401` |
| Staging Socket.IO polling | `200` |

## Acceptance Coverage

| Acceptance area | Evidence |
| --- | --- |
| Super Admin to Employee to Admin realtime promotion | Real-auth two-browser harness PASS |
| Admin to Employee demotion | Real-auth two-browser harness PASS |
| `inventory.adjust` grant, deny, remove override | Real-auth two-browser harness PASS |
| No logout, reload, or AppShell remount | Real-auth two-browser harness PASS |
| `/permissions`, `/users`, `/settings`, `/audit` restricted routes | Playwright role access and settings suites PASS |
| Profile, avatar upload, own activity | Playwright profile suite PASS |
| Global Audit permission control | Backend RBAC and Playwright audit/role suites PASS |
| Desktop and mobile visual sanity | Playwright screenshots and mobile viewport suites PASS |
| Sidebar and dashboard permission-aware widgets | Playwright auth shell, sidebar, dashboard, and role access suites PASS |

## Known Limitations

- Phase 26.5 did not alter RBAC architecture or add permissions.
- The repo has unrelated pre-existing dirty files outside this freeze scope.
- Staging internal filesystem path `/opt/vc-organic-staging` is not present in checked-in config; only the live staging port `8281` was verifiable from the app endpoint.
- Production API was intentionally not touched.

## Freeze Notes

RBAC is frozen at commit `be28689`.

Future work should move back to the broader product UI/UX roadmap unless a production security incident requires a focused authorization hotfix.
