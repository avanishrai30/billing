# Phase 13B — Users, Permissions & RBAC Implementation Specification

## 1. Executive Summary & Domain Scope

Phase 13B implements **User Account Management** and the **Role-Based Access Control (RBAC) Matrix** in the typed frontend workspace under:
- `apps/web/features/users/` and [`apps/web/app/(protected)/users/page.tsx`](file:///Users/avanish/Documents/billing%20system/apps/web/app/%28protected%29/users/page.tsx)
- `apps/web/features/permissions/` and [`apps/web/app/(protected)/permissions/page.tsx`](file:///Users/avanish/Documents/billing%20system/apps/web/app/%28protected%29/permissions/page.tsx)

### Core Features Implemented:
1. **User Account Directory & Profile Administration:**
   - User registration (`name`, `username`, `email`, `phone`, `password`, `role`, `category`, `assignedStoreId`, `status`).
   - CRUD and account suspension via `GET /api/v1/users`, `GET /api/v1/users/:id`, `POST /api/v1/users`, and `POST /api/v1/users/:id/deactivate`.
   - Real-time connected presence indicator via `GET /api/v1/users/presences`.
2. **Multi-Tenant Store Scoping:**
   - Unrestricted enterprise access (`assignedStoreId: 'all'`) vs locked branch store assignments (`assignedStoreId: 'store-1'`).
   - Store selector locking for restricted employees and cashiers.
3. **Dynamic RBAC Permissions Matrix:**
   - Visual module-by-module matrix configuration for `Admin`, `Employee`, and `Auditor` roles.
   - Bulk group select/deselect controls.
   - Persistence to MongoDB `role_permissions` via `GET /api/v1/role-permissions` and `POST /api/v1/role-permissions`.
   - Clear documentation of Super Admin wildcard `['*']` master bypass policy.
4. **Session Invalidation & Revocation Mechanics:**
   - Accurate display and handling of server-driven session revocations on credential or role mutations.

---

## 2. Verified Endpoints & RBAC Matrix

| Endpoint | Method | Permission | Payload / Response | Side Effects |
| :--- | :---: | :---: | :--- | :--- |
| `/api/v1/users` | `GET` | `users.view` | `UserDoc[]` | Returns users list without password hashes |
| `/api/v1/users/presences` | `GET` | *Authenticated* | `UserPresenceDoc[]` | Active connected sockets |
| `/api/v1/users/:id` | `GET` | `users.view` | `UserDoc` | Returns `404` if not found |
| `/api/v1/users` | `POST` | `users.create` or `users.update` | `UserFormPayload` $\to$ `{ success, user }` | Bumps `tokenVersion` if password changed; revokes sockets; audit log; emits `user_updated` |
| `/api/v1/users/:id/deactivate` | `POST` | `users.deactivate` | `{ success, message, user }` | Sets `status: 'suspended'`; bumps `tokenVersion`; revokes sockets; audit log; emits `user_updated` |
| `/api/v1/role-permissions` | `GET` | `roles.view` | `RolePermissionsMatrix` | Returns `{ admin: [...], employee: [...], auditor: [...] }` |
| `/api/v1/role-permissions` | `POST` | `roles.update` | `{ permissions }` $\to$ `{ success, message }` | Upserts `role_permissions` collection; audit log; emits `rbac_updated` |

---

## 3. Realtime WebSocket Events & Query Invalidation

- **`user_updated`:** Invalidates `['users', 'list']`, `['users', 'detail', id]`, and `['auth', 'me']`.
- **`rbac_updated`:** Invalidates `['role-permissions', 'matrix']` and `['auth', 'permissions']`.

---

## 4. Architectural Safety & Anti-Flicker Decisions

1. **Zero Backend Modifications:** Backend files (`server.js`, `modules/users.js`, `services/authzService.js`, etc.) remain 100% frozen.
2. **Zero Legacy HTML Modifications:** `aiavro_billing_system.html` remains 100% frozen.
3. **Pure Declarative State:** Uses React Hook Form, Zod schemas, and TanStack Query with optimistic draft editing for the RBAC matrix.
4. **Security UX:** Passwords and hashes are never exposed or logged; session revocation is handled cleanly through standard 401 response propagation.
