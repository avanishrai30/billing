# Phase 26.4 Permission Coverage

## References

| Reference | Local SKILL.md |
| --- | --- |
| pbakaus/impeccable | `/Users/avanish/Documents/billing system/.agents/skills/impeccable/SKILL.md` |
| leonxlnx/taste-skill | `/Users/avanish/.codex/skills/leonxlnx/taste-skill/SKILL.md` |
| emilkowalski/skills | `/Users/avanish/Documents/billing system/.agents/skills/emil-design-eng/SKILL.md` |
| andrej-karpathy-skills / karpathy-guidelines | `/Users/avanish/.codex/skills/forrestchang/karpathy-guidelines/SKILL.md` |

## Finding

The application had complete route-level RBAC for normal protected modules, but two escalation paths were still too permissive:

1. A non-super admin with `users.update` or `roles.update` could submit a tampered payload granting permissions outside their own effective permission boundary.
2. The role-permissions fallback still returned legacy module slugs instead of canonical granular permissions.

The smallest fix keeps the existing provider, shell, realtime, and API architecture intact:

- `authzService.assertCanGrantPermissions` rejects non-super admin grants outside the actor effective permission set.
- `authzService.assertRoleMatrixUpdateAllowed` rejects protected role-template keys and out-of-bound matrix permissions.
- User save and override paths call the shared grant-boundary helper.
- Role matrix saves call the shared matrix-boundary helper.
- Role matrix defaults now return canonical permission names.
- Stale frontend aliases were removed for product archive/import and invoice POS links.
- Employee/Cashier defaults retain canonical `settings.view` for read-only Settings access, while `settings.update` remains admin-controlled.

## Canonical Permission Vocabulary

The canonical permissions used by frontend, backend, and tests are:

`audit.view`, `businesses.create`, `businesses.delete`, `businesses.update`, `businesses.view`, `customers.create`, `customers.delete`, `customers.update`, `customers.view`, `dashboard.view`, `franchise.manage`, `franchise.view`, `inventory.adjust`, `inventory.transfer`, `inventory.view`, `invoices.create`, `invoices.print`, `invoices.view`, `invoices.void`, `products.archive`, `products.create`, `products.import.commit`, `products.import.preview`, `products.update`, `products.view`, `purchases.create`, `purchases.view`, `purchases.void`, `roles.update`, `roles.view`, `scanner.use`, `settings.update`, `settings.view`, `stores.create`, `stores.delete`, `stores.update`, `stores.view`, `suppliers.create`, `suppliers.delete`, `suppliers.update`, `suppliers.view`, `users.create`, `users.deactivate`, `users.update`, `users.view`.

Legacy module slugs are only accepted by backend expansion for backward compatibility. They are not emitted as the role matrix fallback.

## Coverage Matrix

| Module | Route | View | Create | Update | Delete / Void | Frontend visibility | Backend guard | Direct-route guard | Realtime update |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | `/dashboard` | `dashboard.view` | N/A | N/A | N/A | Page and sidebar require `dashboard.view` | `GET /api/v1/dashboard/metrics` requires `dashboard.view` | Unauthorized route renders `AccessDeniedState` | Inventory/dashboard queries refresh on `inventory.updated` |
| POS | `/pos` | `invoices.create` | `invoices.create` | N/A | N/A | Page and sidebar require `invoices.create` | `POST /api/v1/invoices` requires `invoices.create` and store scope | Unauthorized route renders `AccessDeniedState` | Invoice create emits global sync through billing flow |
| Products | `/products` | `products.view` | `products.create` | `products.update` | `products.archive` | Page, create, edit, import, archive controls use canonical product permissions | Product read/create/update/archive/import endpoints require matching product permissions | Unauthorized route renders `AccessDeniedState` | Product save/archive emits product realtime events |
| Inventory | `/inventory` | `inventory.view` | N/A | `inventory.adjust`, `inventory.transfer` | N/A | Page, adjustment, and transfer controls use inventory permissions | Inventory read/adjust/transfer endpoints require matching inventory permissions and store scope | Unauthorized route renders `AccessDeniedState` | Inventory mutations emit `inventory.updated` |
| Purchases | `/purchases` | `purchases.view` | `purchases.create` | N/A | `purchases.void` | Page, new entry, and void controls use purchase permissions | Purchase read/create/delete endpoints require matching purchase permissions and store scope | Unauthorized route renders `AccessDeniedState` | Purchase mutations emit sync events through purchase flow |
| Invoices | `/invoices` | `invoices.view` | `invoices.create` | N/A | `invoices.void` | Page, POS link, and void controls use invoice permissions | Invoice read/create/void/print endpoints require matching invoice permissions and store scope | Unauthorized route renders `AccessDeniedState` | Invoice mutations emit sync events through billing flow |
| Customers | `/customers` | `customers.view` | `customers.create` | `customers.update` | `customers.delete` | Page and CRUD controls use customer permissions | Customer endpoints require matching customer permissions | Unauthorized route renders `AccessDeniedState` | Covered by global data invalidation, no user-access remount |
| Suppliers | `/suppliers` | `suppliers.view` | `suppliers.create` | `suppliers.update` | `suppliers.delete` | Page and CRUD controls use supplier permissions | Supplier endpoints require matching supplier permissions | Unauthorized route renders `AccessDeniedState` | Covered by global data invalidation, no user-access remount |
| Stores | `/stores` | `stores.view` | `stores.create` | `stores.update` | `stores.delete` | Page and CRUD controls use store permissions | Store endpoints require matching store permissions | Unauthorized route renders `AccessDeniedState` | Store changes propagate through normal query invalidation |
| Businesses | `/stores` business panel | `businesses.view` | `businesses.create` | `businesses.update` | `businesses.delete` | Business edit controls use business create/update permissions | Business endpoints require matching business permissions | Guarded through protected Stores surface | Business changes propagate through normal query invalidation |
| Franchises | `/franchises` | `franchise.view` | `franchise.manage` | `franchise.manage` | `franchise.manage` | Page and management controls use franchise permissions | Franchise and supply-order endpoints require `franchise.view` or `franchise.manage` | Unauthorized route renders `AccessDeniedState` | Franchise changes propagate through normal query invalidation |
| Users | `/users` | `users.view` | `users.create` | `users.update` | `users.deactivate` | Page, create/edit, and deactivate controls use user permissions | User list/save/override/deactivate endpoints require matching user permissions | Unauthorized route renders `AccessDeniedState` | Access changes emit `user_access_updated`; deactivation revokes sockets |
| RBAC | `/permissions` | `roles.view`, `users.view` | N/A | `roles.update`, `users.update` | N/A | Role matrix and user override controls require role/user permissions | Role matrix and user override endpoints require role/user permissions plus grant-boundary checks | Unauthorized route renders `AccessDeniedState` | Role saves emit `rbac_updated`; user overrides emit `user_access_updated` |
| Audit | `/audit` | `audit.view` | N/A | N/A | N/A | Page and global audit link require `audit.view` | `GET /api/v1/audit-logs` requires `audit.view` | Unauthorized route renders `AccessDeniedState`; My Activity remains own-only | Authorization denials and mutations write audit records |
| Tax | `/tax` | `invoices.view` | N/A | N/A | N/A | Page and sidebar require `invoices.view` | Reads invoice-derived data through invoice permission boundary | Unauthorized route renders `AccessDeniedState` | Follows invoice data refresh |
| Settings | `/settings` | `settings.view` | N/A | `settings.update`, `stores.update` for store/business settings | N/A | Page and save controls use settings/store permissions | `POST /api/v1/settings` requires `settings.update` | Unauthorized route renders `AccessDeniedState` | Settings saves emit `settings_updated` |
| Profile | `/profile` | Authenticated user | N/A | Own `name`, `email`, `phone`, avatar | N/A | All authenticated users can update allowed self-service fields; role/scope fields are read-only | Profile, avatar, password, and own activity endpoints require authentication only | Protected shell auth guard; no global permission needed | Profile changes emit `user_updated`; password change revokes active sessions |

## Security Assertions

| Scenario | Result |
| --- | --- |
| Employee directly calls user directory | `403 FORBIDDEN` |
| Employee directly calls audit logs | `403 FORBIDDEN` |
| Employee directly saves role matrix | `403 FORBIDDEN` |
| Employee directly voids invoices | `403 FORBIDDEN` |
| Admin promotes user to Super Admin | `403 SUPER_ADMIN_REQUIRED` |
| Super Admin demotes own final Super Admin account | `403 SELF_DEMOTION_FORBIDDEN` |
| Super Admin deactivates self | `403 SELF_DEACTIVATION_FORBIDDEN` |
| Admin grants stale or out-of-bound permission | `403 PERMISSION_GRANT_FORBIDDEN` |
| Admin saves role matrix with stale or out-of-bound permission | `403 PERMISSION_GRANT_FORBIDDEN` |
| Role matrix payload includes `super admin` template | `403 ROLE_TEMPLATE_FORBIDDEN` |
| Super Admin grants canonical permission | `200 OK` |
| User-specific grant and deny overrides update effective permissions | `200 OK`, active sessions refresh through realtime |
| Own activity without `audit.view` | `200 OK`, own actor only |
| Avatar path outside `/uploads/users/` | `400 INVALID_AVATAR` |

## Verification

Targeted server RBAC suite:

```text
npx jest tests/rbac.test.js --runInBand
Test Suites: 1 passed, 1 total
Tests:       26 passed, 26 total
```

Full regression:

```text
npm test -w apps/web -- --runInBand
Test Suites: 78 passed, 78 total
Tests:       309 passed, 309 total

npm run typecheck -w apps/web
PASS

npm run build -w apps/web
PASS

npx playwright test
72 passed

REAL_AUTH_RBAC_E2E=1 ... npx playwright test --config apps/web/playwright.config.ts tests/e2e/rbacRealtime.real-auth.spec.ts
1 passed
```
