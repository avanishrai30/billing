# Phase 14A — Audit & Activity Log Domain & Contract Analysis

## 1. Executive Summary & Domain Scope

The **System Audit & Activity Logging** domain represents the immutable security ledger of the AIAVRO Billing OS. It provides an append-only, tamper-resistant record of every system event, user login, checkout transaction, inventory adjustment, catalog change, role modification, and security authorization failure across all enterprise stores.

### Key Architectural Pillars:
1. **Append-Only Immutability:** Audit records can only be created by server-side domain services. There are **zero** update, patch, or delete endpoints for audit logs in the backend.
2. **Server-Side Payload Sanitization:** Automatic redaction of sensitive credentials (`password`, `passwordHash`, `token`, `secret`, `jwt`) prior to database persistence.
3. **Multi-Tenant Store Scoping:** Non-super-admin users restricted to a specific store automatically have their audit queries constrained to `businessId: req.user.assignedStoreId`, while management/super admins can query across all stores or filter by specific outlet.
4. **Comprehensive Event Mapping:** Structured normalization mapping 30+ event types to canonical actions (`auth`, `security`, `create`, `update`, `delete`, `billing`, `transfer`) and originating modules (`login`, `inventory`, `billing`, `invoices`, `purchase`, `customers`, `suppliers`, `stores`, `businesses`, `permissions`, `settings`, `security`).

---

## 2. Verified Backend Endpoints & Route Registration

The audit router is mounted in [`server.js`](file:///Users/avanish/Documents/billing%20system/server.js) at line 332:
```javascript
app.use('/api/v1/audit-logs', auditRouter);
```
Defined in [`modules/audit.js`](file:///Users/avanish/Documents/billing%20system/modules/audit.js) and backed by [`services/auditService.js`](file:///Users/avanish/Documents/billing%20system/services/auditService.js).

| HTTP Method | Route Path | Permission Middleware | Query Parameters | Response Shape | Error Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`GET`** | `/api/v1/audit-logs` | `verifyJWT`, `requirePermission('audit.view')` | `limit` (default: 200, max: 1000)<br>`skip` (default: 0)<br>`eventType` (e.g. `LOGIN_SUCCESS`)<br>`entity` (e.g. `customers`)<br>`startDate` (ISO string)<br>`endDate` (ISO string)<br>`storeId` (e.g. `store-1` or `all`) | `AuditLogDoc[]` *(Direct Array sorted by `timestamp: -1`)* | `401 UNAUTHORIZED`<br>`403 FORBIDDEN`<br>`500 SERVER_ERROR` |

> [!NOTE]
> There is **no** `GET /api/v1/audit-logs/:id` single-log endpoint, and **no** `POST`, `PUT`, `PATCH`, or `DELETE` endpoints. The audit ledger is purely queried as an array and mutated only internally by backend services.

---

## 3. Authoritative Audit Document Model

Stored in MongoDB collection: **`audit_logs`**

```typescript
export type AuditAction = 'auth' | 'security' | 'create' | 'update' | 'delete' | 'billing' | 'transfer';

export type AuditViewModule =
  | 'login'
  | 'security'
  | 'inventory'
  | 'purchase'
  | 'billing'
  | 'invoices'
  | 'customers'
  | 'suppliers'
  | 'stores'
  | 'businesses'
  | 'permissions'
  | 'settings'
  | 'system';

export interface AuditLogDoc {
  _id?: string;
  eventType: string;          // e.g. "invoice_created", "LOGIN_SUCCESS", "AUTHORIZATION_DENIED"
  entity: string;             // e.g. "billing", "customers", "inventory", "auth", "permissions"
  entityId: string;           // Target resource ID (e.g. "INV-1001", "usr-1723812345", "cust-10")
  before?: Record<string, any>; // State snapshot prior to mutation (sanitized)
  after?: Record<string, any>;  // State snapshot post mutation (sanitized)
  performedBy: string;        // Login username of actor (e.g. "admin", "ramesh.cashier") or "system"
  user: string;               // Display string e.g. "Ramesh Patil (@ramesh.cashier)" or "System"
  role: string;               // Normalized actor role in uppercase (e.g. "SUPER ADMIN", "CASHIER", "SYSTEM")
  action: AuditAction;        // Normalized high-level category
  view: AuditViewModule;      // Module/workspace section where the event occurred
  details: string;            // Human-readable formatted summary string
  businessId: string;         // Outlet store ID (e.g. "store-1", "ST-MUM") or "all"
  businessName: string;       // Store display name (e.g. "Mumbai Flagship") or "All Outlets"
  ip: string;                 // Client IP address (from x-forwarded-for or remoteAddress)
  userAgent: string;          // Client browser User-Agent header
  requestId: string;          // Correlation request ID (e.g. "req-1723812345678")
  timestamp: string;          // ISO 8601 UTC timestamp of log creation
}
```

---

## 4. Comprehensive Audit Event Taxonomy

| Domain | Event Type (`eventType`) | Entity (`entity`) | Action (`action`) | View (`view`) | Automated Details Format |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `LOGIN_SUCCESS` / `auth_login` | `auth` | `auth` | `login` | `User session authenticated successfully` |
| | `LOGIN_FAILED` | `auth` | `auth` | `login` | `Authentication attempt failed for username: <username>` |
| | `LOGOUT` / `auth_logout` | `auth` | `auth` | `login` | `User session terminated successfully` |
| **Security & RBAC** | `AUTHORIZATION_DENIED` | `auth` / `user` | `security` | `security` | `Security alert: Access denied for <user> on <METHOD> <URL> (<reason>)` |
| | `rbac_updated` | `permissions` | `update` | `permissions` | `rbac_updated` |
| **User Accounts** | `user_created` | `user` / `permissions` | `create` | `permissions` | `user_created` |
| | `user_updated` | `user` / `permissions` | `update` | `permissions` | `user_updated` (or `action: 'PASSWORD_CHANGED'`) |
| | `user_deactivated` | `user` / `permissions` | `delete` | `permissions` | `Deactivated user account: <entityId>` |
| **POS & Billing** | `invoice_created` | `billing` / `invoices` | `billing` | `billing` | `Completed POS transaction for customer '<cust>'. Created Invoice #<id> (Total: ₹<amount>)` |
| | `invoice_voided` | `invoices` | `delete` | `invoices` | `Voided Invoice #<id> and reverted items back to warehouse stock` |
| **Product Catalog** | `product_created` | `inventory` | `create` | `inventory` | `Added product '<name>' (SKU: <sku>, Price: ₹<price>)` |
| | `product_updated` | `inventory` | `update` | `inventory` | `Updated product '<name>' details (SKU: <sku>, Price: ₹<price>)` |
| | `product_archived` | `inventory` | `delete` | `inventory` | `Archived product ID: <entityId>` |
| | `import_completed` | `inventory` | `create` | `inventory` | `Committed bulk product import session <id> (<count> products)` |
| **Inventory** | `inventory_updated` | `inventory` | `update` | `inventory` | `Adjusted inventory stock levels for product ID <id> to <qty> units` |
| | `inventory_transfer` | `inventory` | `transfer` | `inventory` | `Transferred <qty> units of product ID <id> from store <from> to <to>` |
| **Purchases** | `purchase_created` | `purchase` | `create` | `purchase` | `Recorded supplier purchase entry (Supplier: <supplier>, Invoice: #<inv>, Total: ₹<amount>)` |
| | `purchase_deleted` | `purchase` | `delete` | `purchase` | `Deleted purchase entry ID: <entityId>` |
| **Customers** | `customer_created` | `customers` | `create` | `customers` | `customer_created` |
| | `customer_updated` | `customers` | `update` | `customers` | `customer_updated` |
| | `customer_deleted` | `customers` | `delete` | `customers` | `customer_deleted` |
| **Suppliers** | `supplier_created` | `suppliers` | `create` | `suppliers` | `supplier_created` |
| | `supplier_updated` | `suppliers` | `update` | `suppliers` | `supplier_updated` |
| | `supplier_deleted` | `suppliers` | `delete` | `suppliers` | `supplier_deleted` |
| **Stores & Branches** | `store_created` | `stores` | `create` | `stores` | `store_created` |
| | `store_updated` | `stores` | `update` | `stores` | `store_updated` |
| | `store_deleted` | `stores` | `delete` | `stores` | `store_deleted` |
| | `business_updated` | `business` | `update` | `businesses` | `business_updated` |
| | `business_deleted` | `business` | `delete` | `businesses` | `business_deleted` |
| **Franchise** | `franchise_created` | `businesses` | `create` | `businesses` | `franchise_created` |
| | `franchise_updated` | `businesses` | `update` | `businesses` | `franchise_updated` |
| | `franchise_deleted` | `businesses` | `delete` | `businesses` | `franchise_deleted` |
| | `franchise_order_created` | `purchase` | `create` | `purchase` | `franchise_order_created` |
| **Settings** | `settings_updated` | `settings` | `update` | `settings` | `settings_updated` |

---

## 5. Actor & Identity Attribution

1. **Authenticated Actor:**
   - Captured from `req.user`.
   - `performedBy`: `req.user.username` (e.g. `'vikram.s'`).
   - `user`: Formatted string `${req.user.name || req.user.username} (@${req.user.username})`.
   - `role`: Actor role category in uppercase (`'SUPER ADMIN'`, `'ADMIN'`, `'EMPLOYEE'`, `'AUDITOR'`).
   - `businessId`: Actor's assigned store (`req.user.assignedStoreId || 'all'`).
2. **System Background Actor:**
   - When mutations originate from cron tasks or startup migrations:
   - `performedBy`: `'system'`.
   - `user`: `'System'`.
   - `role`: `'SYSTEM'`.
   - `businessId`: `'all'`.
3. **Network & Client Metadata:**
   - `ip`: Client IP (`req.headers['x-forwarded-for'] || req.ip || 'unknown'`).
   - `userAgent`: Client User-Agent string.
   - `requestId`: Trace correlation ID (`req.headers['x-request-id'] || 'req-<timestamp>'`).

---

## 6. Multi-Tenant Store Scoping Semantics

In [`modules/audit.js`](file:///Users/avanish/Documents/billing%20system/modules/audit.js) lines 20–25:
```javascript
// If user is scoped to a specific store, restrict query to that store
if (!isSuperAdmin(req.user) && req.user.assignedStoreId && req.user.assignedStoreId !== 'all') {
  options.storeId = req.user.assignedStoreId;
} else if (req.query.storeId) {
  options.storeId = req.query.storeId;
}
```

### Store Scope Rules:
1. **Restricted Employees & Cashiers:** Cannot view tenant-wide logs; query is forcefully constrained to their assigned store (`businessId: user.assignedStoreId`).
2. **Super Admin / Unrestricted Management:** Can view all enterprise activity (`businessId: 'all'`) or filter logs for any specific store branch.

---

## 7. Security Display Model & Payload Redaction

### 7.1 Backend Redaction (`services/auditService.js:9-24`)
The backend recursively redacts:
`['password', 'passwordHash', 'token', 'secret', 'currentPassword', 'newPassword', 'jwt', 'authorization']` to `'[REDACTED]'`.

### 7.2 Frontend Defense-in-Depth Display Model
In the new typed React frontend (`apps/web/features/audit/`):
- **Never** render raw unescaped JSON.
- Provide a structured **`AuditPayloadViewer`** that inspects `before` and `after` diffs.
- Mask any key containing `/password|secret|token|hash|auth|jwt/i`.
- Format financial values with `₹` and date stamps in localized time (`en-IN`).

---

## 8. Cross-Module Audit Matrix

| Emitting Module | Mutation Trigger | Event Type | Target Entity | Sanitized Payloads |
| :--- | :--- | :--- | :--- | :--- |
| [`modules/auth.js`](file:///Users/avanish/Documents/billing%20system/modules/auth.js) | Login attempt, password migration, logout | `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `user_updated` | `auth`, `user` | `{ username }` |
| [`services/authzService.js`](file:///Users/avanish/Documents/billing%20system/services/authzService.js) | 403 Forbidden check failure | `AUTHORIZATION_DENIED` | `auth` | `{ endpoint, method, reason }` |
| [`modules/billing.js`](file:///Users/avanish/Documents/billing%20system/modules/billing.js) | POS cart checkout, invoice void | `invoice_created`, `invoice_voided` | `billing`, `invoices` | `{ invoiceId, grandTotal, items }` |
| [`modules/products.js`](file:///Users/avanish/Documents/billing%20system/modules/products.js) | Product create, edit, archive | `product_created`, `product_updated`, `product_archived` | `inventory` | Full product document |
| [`services/bulkImportService.js`](file:///Users/avanish/Documents/billing%20system/services/bulkImportService.js) | Excel/CSV bulk import commit | `import_completed`, `product_created`, `product_updated` | `inventory` | Summary counts & docs |
| [`modules/inventory.js`](file:///Users/avanish/Documents/billing%20system/modules/inventory.js) | Manual stock adjust, inter-store transfer | `inventory_updated`, `inventory_transfer` | `inventory` | `{ quantity, fromStoreId, toStoreId }` |
| [`modules/purchases.js`](file:///Users/avanish/Documents/billing%20system/modules/purchases.js) | Inward purchase bill, void purchase | `purchase_created`, `purchase_deleted` | `purchase` | Purchase invoice doc |
| [`modules/customers.js`](file:///Users/avanish/Documents/billing%20system/modules/customers.js) | Customer create, edit, delete | `customer_created`, `customer_updated`, `customer_deleted` | `customers` | Customer profile doc |
| [`modules/suppliers.js`](file:///Users/avanish/Documents/billing%20system/modules/suppliers.js) | Supplier create, edit, delete | `supplier_created`, `supplier_updated`, `supplier_deleted` | `suppliers` | Supplier profile doc |
| [`modules/stores.js`](file:///Users/avanish/Documents/billing%20system/modules/stores.js) | Store branch create, edit, delete | `store_created`, `store_updated`, `store_deleted` | `stores` | Store outlet doc |
| [`modules/businesses.js`](file:///Users/avanish/Documents/billing%20system/modules/businesses.js) | Business profile edit, delete | `business_updated`, `business_deleted` | `business` | Business entity doc |
| [`modules/franchise.js`](file:///Users/avanish/Documents/billing%20system/modules/franchise.js) | Franchise partner create, edit, delete, supply order | `franchise_created`, `franchise_updated`, `franchise_deleted`, `franchise_order_created` | `businesses`, `purchase` | Franchise partner / order doc |
| [`services/userService.js`](file:///Users/avanish/Documents/billing%20system/services/userService.js) | User create, edit, deactivation, password change | `user_created`, `user_updated`, `user_deactivated` | `user` | Sanitized user profile doc |
| [`modules/settings.js`](file:///Users/avanish/Documents/billing%20system/modules/settings.js) | RBAC matrix save, branding save | `rbac_updated`, `settings_updated` | `permissions`, `settings` | Matrix / branding payload |

---

## 9. Legacy UI Risk Audit & Anti-Flicker Strategy

1. **Legacy DOM Inefficiencies (`aiavro_billing_system.html:7546-7609`):**
   - Directly mutates `tbody.innerHTML = ""` with string concatenation.
   - Triggers `renderAuditLogsTable()` during startup even before tab selection.
   - Loads unbounded audit logs into memory without client-side or server-side streaming.
2. **Phase 14B Anti-Flicker Mandate:**
   - Implement declarative React components with TanStack Query.
   - Keep table rows wrapped in stable keys (`log._id || log.requestId || index`).
   - Paginate data cleanly with pagination controls (`limit: 50` / `100` / `200`).

---

## 10. Proposed Phase 14B Frontend Architecture Blueprint

```
apps/web/features/audit/
├── types.ts                   # AuditLogDoc, AuditAction, AuditFilters, AuditSummaryMetrics
├── schemas.ts                 # Zod validation schemas for query filters
├── api.ts                     # Typed API client for /api/v1/audit-logs
├── hooks.ts                   # TanStack Query hooks with store scope & filters
├── components/
│   ├── AuditHeader.tsx        # Title, export/refresh controls, total log count badge
│   ├── AuditSummaryCards.tsx  # KPI cards: Total Events, Logins, Mutations, Security Alerts
│   ├── AuditFilters.tsx       # Action filter, event filter, store scope filter, date range, search
│   ├── AuditTable.tsx         # Data table with actor, role, action badge, store, timestamp
│   ├── AuditDetailDrawer.tsx  # Slide-over drawer showing full event metadata & request details
│   ├── AuditPayloadViewer.tsx # Visual before/after diff & sanitized payload inspector
│   └── index.ts
└── index.ts
```

### Protected Route:
- [`apps/web/app/(protected)/audit/page.tsx`](file:///Users/avanish/Documents/billing%20system/apps/web/app/%28protected%29/audit/page.tsx) — System Audit Trail view.

---

## 11. Test Strategy for Phase 14B

1. **Unit Tests:**
   - `tests/unit/auditSchemas.test.ts`: Validate filter schemas, date parsing, and limit constraints.
   - `tests/unit/auditQuery.test.ts`: Validate API endpoint calls, query keys, and parameter serializations.
   - `tests/unit/auditComponents.test.tsx`: Test `AuditHeader`, `AuditSummaryCards`, `AuditTable`, `AuditFilters`, `AuditPayloadViewer`, and sensitive credential redaction assertions.
2. **E2E Tests:**
   - `tests/e2e/audit.spec.ts`:
     - Login as management user $\to$ Navigate to `/audit`.
     - Verify audit logs load with date, actor, action badges, and store names.
     - Filter by action (`billing`, `auth`, `create`, `delete`) and search text.
     - Inspect detail drawer $\to$ verify `AuditPayloadViewer` renders safely without exposing raw secrets.
     - Verify mobile responsiveness (`430x932` and `390x844`) with zero horizontal overflow.
     - Return to Dashboard $\to$ verify dashboard stability.
   - Verify restricted user:
     - Log in as cashier $\to$ verify access controls / store-scoped log containment.
