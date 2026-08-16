# Phase 13A — Users, Roles & RBAC Domain & Contract Analysis

## 1. Executive Summary & Domain Scope

The **User Identity, Roles & Role-Based Access Control (RBAC)** domain manages authentication credentials, user accounts, role definitions, granular permissions, dynamic role-permission matrices, and multi-tenant store scope assignments.

### Three Distinct Authorization Dimensions:
1. **Authentication (`Who are you?`):** Verified by JWT bearer token and tracked via database `tokenVersion` for instantaneous session revocation.
2. **Authorization (`What may you do?`):** Enforced by `requirePermission(perm)` and `requireAnyPermission([perms])` against granular permissions and dynamic RBAC matrices.
3. **Store Scope (`Where may you do it?`):** Enforced by `requireStoreScope(extractor)` and `getStoreScopeFilter(user)` ensuring restricted cashiers/employees cannot view or mutate records outside their `assignedStoreId`.

---

## 2. Verified Backend Endpoints & Route Registration

All user routes are mounted in `server.js` at line 322: `app.use('/api/v1/users', usersRouter)` from [`modules/users.js`](file:///Users/avanish/Documents/billing%20system/modules/users.js), and role-permission matrix routes in [`modules/settings.js`](file:///Users/avanish/Documents/billing%20system/modules/settings.js).

| HTTP Method | Route Path | Permission Middleware | Request Body | Response Shape | Realtime & Audit Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`GET`** | `/api/v1/users` | `verifyJWT`, `requirePermission('users.view')` | *None* | `UserDoc[]` *(Direct Array)* | Returns users without password hashes. |
| **`GET`** | `/api/v1/users/presences` | `verifyJWT` | *None* | `UserPresenceDoc[]` | Returns active connected sockets. |
| **`GET`** | `/api/v1/users/:id` | `verifyJWT`, `requirePermission('users.view')` | *None* | `UserDoc` | Returns `404 USER_NOT_FOUND` if absent. |
| **`POST`** | `/api/v1/users` | `verifyJWT`, `validateBody(userSchema)`, `requireAnyPermission(['users.create', 'users.update'])` | `UserFormPayload` | `{ success: true, user: UserDoc }` | Audit `user_created` / `user_updated`. Emits `user_updated` to `sync_global`. If password changed, revokes user sockets & increments `tokenVersion`. |
| **`POST`** | `/api/v1/users/:id/deactivate` | `verifyJWT`, `requirePermission('users.deactivate')` | *None* | `{ success: true, message: string, user: UserDoc }` | Sets `status: 'suspended'`, revokes user sockets, increments `tokenVersion`, audit `user_deactivated`, emits `user_updated` to `sync_global`. |
| **`POST`** | `/api/v1/users/profile` | `verifyJWT` *(Self)* | `{ name, email, phone }` | `{ success: true, user: UserDoc }` | Audit `user_updated`, emits `user_updated` to `sync_global`. |
| **`POST`** | `/api/v1/users/avatar` | `verifyJWT` *(Self)* | `{ avatar: string }` | `{ success: true, avatar: string }` | Audit `user_updated`, emits `user_updated` to `sync_global`. |
| **`POST`** | `/api/v1/users/change-password` | `verifyJWT` *(Self)* | `{ currentPassword, newPassword }` | `{ success: true, message: string }` | Validates current password, updates bcrypt hash, increments `tokenVersion`, revokes other sockets, audit `user_updated`, emits `user_updated`. |
| **`GET`** | `/api/v1/role-permissions` | `verifyJWT`, `requirePermission('roles.view')` | *None* | `RolePermissionsMatrix` | Returns `{ admin: [...], employee: [...], auditor: [...] }`. |
| **`POST`** | `/api/v1/role-permissions` | `verifyJWT`, `requirePermission('roles.update')` | `{ permissions: RolePermissionsMatrix }` | `{ success: true, message: string }` | Persists matrix in `role_permissions` collection (`key: "matrix"`), audit `rbac_updated`, emits `rbac_updated` to `sync_global`. |

---

## 3. Authoritative Data Models

### 3.1 User Account Document (`users` collection)
```typescript
export type UserCategory = 'super admin' | 'admin' | 'employee' | 'auditor';
export type UserStatus = 'active' | 'suspended' | 'inactive';

export interface UserDoc {
  id: string;               // e.g. "usr-1723812345678"
  name: string;             // Full display name
  username: string;         // Unique login handle (lowercase)
  email?: string;           // Optional contact email
  phone?: string;           // Optional contact phone
  role: string;             // Custom display role title (e.g. "Branch Cashier", "Floor Manager")
  category: UserCategory;   // Canonical authorization role category
  assignedStoreId?: string; // 'all' or specific store ID (e.g. "store-1")
  assignedStores?: string[];// Array of store IDs allowed for this user
  permissions?: string[];   // Explicit per-user override permissions
  status: UserStatus;       // 'active' | 'suspended' | 'inactive'
  tokenVersion?: number;    // Monotonically increasing session invalidation counter
  avatar?: string;          // Relative path to uploaded avatar
  createdAt: string;        // ISO 8601 timestamp
  updatedAt?: string;       // ISO 8601 timestamp
}
```

### 3.2 Role Permissions Matrix (`role_permissions` collection, `key: "matrix"`)
```typescript
export interface RolePermissionsMatrix {
  admin: string[];
  employee: string[];
  auditor: string[];
}
```

---

## 4. Canonical Role Model & Permission Hierarchy

### 4.1 Canonical Role Categories
1. **`super admin` / `owner`:**
   - **Access:** Wildcard `['*']` with full unrestricted privileges across every feature and store outlet.
   - **Bypass:** Bypasses `requirePermission` and `requireStoreScope` checks.
   - **Store Scope:** Always evaluates to `'all'`.
2. **`admin`:**
   - **Access:** Default access to all operational features (`dashboard`, `products`, `inventory`, `purchases`, `invoices`, `customers`, `suppliers`, `businesses`, `stores`, `franchise`, `users`, `roles`, `audit`, `settings`, `scanner`).
   - **Store Scope:** Can access all stores or manage enterprise operations.
3. **`employee` / `cashier`:**
   - **Access:** Standard POS checkout, customer creation, stock browsing, scanner.
   - **Store Scope:** Strictly locked to their `assignedStoreId`.
4. **`auditor`:**
   - **Access:** Read-only ledger inspection (`invoices.view`, `invoices.print`, `audit.view`, `dashboard.view`).
   - **Mutation:** Strictly forbidden from creating or modifying products, prices, invoices, or users.

---

## 5. Store Scope & Restriction Architecture

### 5.1 Backend Enforcement (`services/authzService.js`)
```javascript
function requireStoreScope(targetLocationExtractor) {
  return (req, res, next) => {
    if (isSuperAdmin(req.user) || !req.user.assignedStoreId || req.user.assignedStoreId === 'all') {
      return next();
    }
    const targetLocationId = typeof targetLocationExtractor === 'function'
      ? targetLocationExtractor(req)
      : (req.body.locationId || req.body.storeId || req.query.locationId || req.query.storeId);

    if (targetLocationId && targetLocationId !== 'all' && targetLocationId !== req.user.assignedStoreId) {
      return sendForbiddenResponse(res, req, `Forbidden: Store scope mismatch`, 'STORE_ACCESS_DENIED');
    }
    next();
  };
}
```

### 5.2 Store Scope Read Filtering
For MongoDB queries on invoices, purchases, inventory, and audit logs:
```javascript
function getStoreScopeFilter(user, fieldNames = ['locationId', 'storeId']) {
  if (!user || isSuperAdmin(user) || !user.assignedStoreId || user.assignedStoreId === 'all') {
    return {};
  }
  return { [fieldNames[0]]: user.assignedStoreId };
}
```

---

## 6. Password Security & Session Invalidation Mechanics

1. **Bcrypt Hashing:** All passwords are encrypted with `bcryptjs` using 12 salt rounds (`bcrypt.hashSync(password, 12)`). Plaintext passwords are never saved.
2. **`tokenVersion` Revocation:**
   - When a user changes password, is edited, or deactivated, `tokenVersion` is incremented.
   - On every request, `verifyJWT` checks `decoded.tokenVersion === dbUser.tokenVersion`. If mismatched, it returns `401 SESSION_REVOKED`.
3. **Socket Revocation:** `realtimeService.revokeUserSockets(userId)` forcefully disconnects all active WebSocket connections for the user upon credential mutation.

---

## 7. Real-Time WebSocket Events & Cache Invalidation

| Event Name | Producer | Room | Payload | Query Invalidation Target |
| :--- | :--- | :--- | :--- | :--- |
| **`user_updated`** | `POST /api/v1/users`, `deactivate`, `change-password` | `sync_global` | `{ user: UserDoc }` or `{ userId: string }` | `['users', 'list']`, `['users', 'detail', id]`, `['auth', 'me']` |
| **`rbac_updated`** | `POST /api/v1/role-permissions` | `sync_global` | `RolePermissionsMatrix` | `['role-permissions']`, `['auth', 'permissions']` |

---

## 8. Error Contract & Error Codes

- `400 INVALID_CREDENTIALS` — Incorrect username/password on login or password change.
- `400 REQUEST_VALIDATION_FAILED` — Zod schema validation failed on user form.
- `401 UNAUTHORIZED` / `TOKEN_EXPIRED` — Missing or expired JWT token.
- `401 SESSION_REVOKED` — Password changed or user session invalidated elsewhere.
- `403 FORBIDDEN` — User lacks required permission for this endpoint.
- `403 ACCOUNT_SUSPENDED` / `ACCOUNT_DEACTIVATED` — User account status is `suspended` or `inactive`.
- `403 STORE_ACCESS_DENIED` — Restricted user attempted an action on a foreign store.
- `404 USER_NOT_FOUND` — User ID does not exist.
- `500 SERVER_ERROR` — Internal database or server exception.

---

## 9. Legacy Risk Audit & Anti-Flicker Strategy

1. **Local State Duplication:** Legacy HTML stored users in `localStorage.aiavro_users` while also fetching from API, causing desynchronization.
2. **Plaintext Password Leaks in UI:** Legacy UI displayed user passwords in alert modals.
3. **In-Memory DOM Toggling:** `syncRoleBasedUI()` directly modified `style.display = "none"` on `<li>` tags, resulting in noticeable layout flickers on page load.
4. **Anti-Flicker Mandate for Phase 13B:**
   - The new typed React frontend (`apps/web/features/users/` and `features/permissions/`) will use declarative React state, `AuthProvider`, and `StoreScopeProvider` with zero DOM mutations.

---

## 10. Proposed Phase 13B Frontend Architecture Blueprint

```
apps/web/features/users/
├── types.ts                   # UserDoc, UserCategory, UserStatus, Presence
├── schemas.ts                 # Zod schemas for user create/edit and password change
├── api.ts                     # Typed API client for /api/v1/users
├── hooks.ts                   # TanStack Query & Mutation hooks
├── components/
│   ├── UserHeader.tsx         # User directory header with stats & "Add User" button
│   ├── UserTable.tsx          # Tabulated directory with role badge, store scope, status
│   ├── UserModal.tsx          # Create / Edit user modal with role & store selector
│   ├── UserStatusDialog.tsx   # Suspend / Activate confirmation dialog
│   └── UserPasswordModal.tsx  # Password reset modal
└── index.ts

apps/web/features/permissions/
├── types.ts                   # RolePermissionsMatrix, PermissionGroup
├── api.ts                     # Typed API client for /api/v1/role-permissions
├── hooks.ts                   # TanStack Query & Mutation hooks
├── components/
│   ├── PermissionMatrixHeader.tsx
│   ├── PermissionMatrixTable.tsx  # Interactive RBAC checkbox matrix
│   └── PermissionAuditCard.tsx
└── index.ts
```

### Protected Routes:
- [`apps/web/app/(protected)/users/page.tsx`](file:///Users/avanish/Documents/billing%20system/apps/web/app/%28protected%29/users/page.tsx) — User Account Management view.
- [`apps/web/app/(protected)/permissions/page.tsx`](file:///Users/avanish/Documents/billing%20system/apps/web/app/%28protected%29/permissions/page.tsx) — RBAC Permissions Matrix view.

---

## 11. Test Strategy for Phase 13B

1. **Unit Tests:**
   - `tests/unit/userSchemas.test.ts`: Validate user creation and password reset schemas.
   - `tests/unit/userQuery.test.ts`: Validate API endpoint mappings and query keys.
   - `tests/unit/rbacMatrix.test.ts`: Validate role permission resolution, legacy mapping expansion, and store scoping.
   - `tests/unit/userComponents.test.tsx`: Test user table, modal form triggers, and status toggle dialog.
2. **E2E Tests:**
   - `tests/e2e/users.spec.ts`: Super Admin $\to$ Users $\to$ Create User $\to$ Assign Store $\to$ Change Role $\to$ Suspend Account $\to$ RBAC Matrix update.
   - `tests/e2e/rbacIsolation.spec.ts`: Login as restricted cashier $\to$ verify store lock $\to$ verify forbidden routes blocked with `403`.
