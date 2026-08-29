# AIAVRO Billing OS — Authentication, RBAC & Store-Scope Contract

This document specifies the authoritative security architecture, JWT token lifecycle, password encryption, role hierarchy, granular permission matrix, and store scoping rules implemented in [services/authzService.js](file:///Users/avanish/Documents/billing%20system/services/authzService.js) and [modules/auth.js](file:///Users/avanish/Documents/billing%20system/modules/auth.js).

---

## 1. Authentication Lifecycle & Token Management

### 1.1 Credential Verification & Bcrypt Hashing
- **Primary Encryption:** Bcrypt with 12 salt rounds (`bcrypt.hashSync(password, 12)`).
- **Authoritative Credential Field:** `user.passwordHash` in MongoDB `users` collection.
- **Automated Legacy Password Migration:**
  - If a legacy account has plaintext `user.password` and null `passwordHash`, successful authentication automatically generates `passwordHash`, increments `tokenVersion`, and unsets the plaintext `password` field via `$unset` ([modules/auth.js:44-67](file:///Users/avanish/Documents/billing%20system/modules/auth.js#L44-L67)).

### 1.2 JWT Token Architecture
- **Production Secret:** `process.env.JWT_SECRET` is required when `NODE_ENV=production`; startup fails clearly if it is missing.
- **Local/Test Secret:** development and test environments may use the documented local fallback from `services/startupConfig.js`.
- **Expiration:** 24 Hours (`expiresIn: '24h'`)
- **Token Payload Schema:**
  ```json
  {
    "id": "usr-1",
    "username": "admin",
    "role": "SUPER ADMIN",
    "category": "super admin",
    "assignedStoreId": "all",
    "tokenVersion": 1,
    "iat": 1786500000,
    "exp": 1786586400
  }
  ```

### 1.3 Active Session Invalidation (`tokenVersion`)
- Every user document in MongoDB maintains an integer `tokenVersion` (default `1`).
- On every protected request, `verifyJWT` ([modules/context.js:109-142](file:///Users/avanish/Documents/billing%20system/modules/context.js#L109-L142)) verifies that `dbUser.tokenVersion === decoded.tokenVersion`.
- **Immediate Invalidation Triggers:**
  1. `POST /api/v1/auth/change-password`: Increments `tokenVersion` by 1 and disconnects all active sockets.
  2. `POST /api/v1/users/:id/deactivate`: Sets status to `suspended` and disconnects all active sockets.
  3. Admin password reset.
- If `tokenVersion` mismatches, the server responds with `401 Unauthorized` (`SESSION_REVOKED`).

---

## 2. Canonical Roles & Permission Hierarchy

### 2.1 Role Normalization (`normalizeCategory`)
User roles in the database are normalized into four canonical categories ([services/authzService.js:104-111](file:///Users/avanish/Documents/billing%20system/services/authzService.js#L104-L111)):
1. **`super admin` / `owner`:** Unrestricted enterprise-wide access wildcard (`'*'`).
2. **`admin`:** Full administrative access across all store modules and settings.
3. **`employee`:** Day-to-day operational access (POS, inventory, purchases, customers, suppliers).
4. **`auditor`:** Read-only access to invoices, purchases, inventory balances, and audit logs.

### 2.2 Canonical Granular Permissions (`DEFAULT_ROLE_PERMISSIONS`)

```javascript
const DEFAULT_ROLE_PERMISSIONS = {
  'super admin': ['*'],
  'owner': ['*'],
  'admin': [
    'dashboard.view',
    'products.view', 'products.create', 'products.update', 'products.archive',
    'products.import.preview', 'products.import.commit',
    'inventory.view', 'inventory.adjust', 'inventory.transfer',
    'purchases.view', 'purchases.create', 'purchases.void',
    'invoices.view', 'invoices.create', 'invoices.void', 'invoices.print',
    'customers.view', 'customers.create', 'customers.update', 'customers.delete',
    'suppliers.view', 'suppliers.create', 'suppliers.update', 'suppliers.delete',
    'businesses.view', 'businesses.create', 'businesses.update', 'businesses.delete',
    'stores.view', 'stores.create', 'stores.update', 'stores.delete',
    'franchise.view', 'franchise.manage',
    'users.view', 'users.create', 'users.update', 'users.deactivate',
    'roles.view', 'roles.update',
    'audit.view',
    'settings.view', 'settings.update',
    'scanner.use'
  ],
  'employee': [
    'dashboard.view',
    'products.view',
    'inventory.view',
    'invoices.view', 'invoices.create', 'invoices.print',
    'purchases.view', 'purchases.create',
    'customers.view', 'customers.create', 'customers.update',
    'suppliers.view',
    'scanner.use'
  ],
  'auditor': [
    'dashboard.view',
    'products.view',
    'inventory.view',
    'purchases.view',
    'invoices.view', 'invoices.print',
    'audit.view'
  ]
};
```

### 2.3 Legacy Module Expansion Mapping (`LEGACY_MODULE_EXPANSION`)
When permissions are defined using legacy module names (e.g. from `role_permissions` matrix), the backend automatically expands them to granular strings:

| Legacy String | Granular Permissions Expanded |
| :--- | :--- |
| `dashboard` | `dashboard.view` |
| `billing` | `invoices.view`, `invoices.create`, `invoices.print` |
| `inventory` | `inventory.view` |
| `purchase` | `purchases.view`, `purchases.create` |
| `businesses` | `businesses.view`, `businesses.create`, `businesses.update` |
| `customers` | `customers.view`, `customers.create`, `customers.update` |
| `invoices` | `invoices.view`, `invoices.print` |
| `settings` | `settings.view`, `settings.update` |
| `auditor` | `audit.view` |
| `permissions` | `roles.view`, `roles.update`, `users.view`, `users.create`, `users.update` |
| `scanner` | `scanner.use` |
| `verification`| `products.view` |
| `remote-scanner` | `scanner.use` |
| `refunds` | `invoices.void` |

---

## 3. Store Scoping & Multi-Store Isolation

### 3.1 Store Assignment Model
- Every non-super admin user is assigned an outlet via `user.assignedStoreId` (e.g. `"st-1"`) or `user.assignedStores` (e.g. `["st-1", "st-2"]`).
- Super Admin and Owner accounts have `assignedStoreId: "all"` and bypass store filtering.

### 3.2 Mutation Enforcement (`requireStoreScope`)
- Mutation endpoints (`POST /api/v1/invoices`, `POST /api/v1/purchases`, `POST /api/v1/inventory/adjust`, `POST /api/v1/inventory/transfer`) enforce that the requested `locationId`/`storeId` matches the authenticated user's store assignment.
- If a user assigned to Store A attempts an operation targeting Store B:
  1. An `AUTHORIZATION_DENIED` event is recorded in `audit_logs`.
  2. The server responds with `403 Forbidden` (`STORE_ACCESS_DENIED`).

### 3.3 Query Filtering (`getStoreScopeFilter`)
- Read endpoints automatically apply a MongoDB query filter restricting queries to `user.assignedStoreId`:
  ```javascript
  { $or: [{ locationId: user.assignedStoreId }, { storeId: user.assignedStoreId }] }
  ```
