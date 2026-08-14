# Audit Logging & Security Event Architecture

## 1. Overview
The AIAVRO Business OS implements an immutable, structured audit logging system centralized in [`services/auditService.js`](file:///Users/avanish/Documents/billing%20system/services/auditService.js). Every critical business mutation, authorization denial, and authentication event is persisted directly to the `audit_logs` collection.

---

## 2. Audit Document Schema

Each record in `audit_logs` contains standard compliance metadata:

```json
{
  "_id": "66bc8d1234567890abcdef12",
  "eventType": "invoice_voided",
  "entity": "billing",
  "entityId": "INV-1786523120000",
  "before": {},
  "after": {
    "invoiceId": "INV-1786523120000",
    "locationId": "store-blr-1"
  },
  "performedBy": "manager_rajesh",
  "user": "Rajesh Sharma (@manager_rajesh)",
  "role": "ADMIN",
  "action": "delete",
  "view": "invoices",
  "details": "Voided Invoice #INV-1786523120000 and reverted items back to warehouse stock",
  "businessId": "store-blr-1",
  "businessName": "Bengaluru Outlet",
  "ip": "192.168.1.45",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  "requestId": "req-1786676000000",
  "timestamp": "2026-08-14T01:45:00.000Z"
}
```

---

## 3. Supported Security & Business Event Types

| Event Type | Entity | Description | Action Category |
|---|---|---|---|
| `LOGIN_SUCCESS` / `auth_login` | `auth` | Successful user session authentication | `auth` |
| `LOGIN_FAILED` | `auth` | Failed authentication attempt (invalid credentials or suspended account) | `auth` |
| `LOGOUT` / `auth_logout` | `auth` | User session termination | `auth` |
| `AUTHORIZATION_DENIED` | `security` | 403 Forbidden security denial (missing permission or store scope mismatch) | `security` |
| `user_created` | `permissions` | Creation of a new user account | `create` |
| `user_updated` | `permissions` | User account update (profile, avatar, or password change) | `update` |
| `user_deactivated` | `permissions` | User account suspension and instant session revocation | `delete` |
| `rbac_updated` | `permissions` | Role-permissions matrix configuration update | `update` |
| `product_created` | `inventory` | New product catalog item added | `create` |
| `product_updated` | `inventory` | Product details, pricing, or tax updated | `update` |
| `product_archived` | `inventory` | Product soft-deleted/archived | `delete` |
| `import_completed` | `inventory` | Batch bulk import session committed | `create` |
| `inventory_updated` | `inventory` | Stock level manual adjustment | `update` |
| `inventory_transfer` | `inventory` | Inter-store stock transfer | `transfer` |
| `invoice_created` | `billing` | POS sales transaction completed | `billing` |
| `invoice_voided` | `invoices` | POS invoice voided and stock reverted | `delete` |
| `purchase_created` | `purchase` | Supplier purchase receipt created and stock added | `create` |
| `purchase_deleted` | `purchase` | Supplier purchase receipt voided | `delete` |
| `business_updated` | `businesses` | Business entity profile saved | `update` |
| `business_deleted` | `businesses` | Business entity removed | `delete` |
| `store_created` / `store_updated` | `stores` | Store outlet created or updated | `create` / `update` |
| `store_deleted` | `stores` | Store outlet removed | `delete` |
| `customer_created` / `customer_updated` | `customers` | Customer CRM profile saved | `create` / `update` |
| `customer_deleted` | `customers` | Customer CRM profile deleted | `delete` |
| `supplier_created` / `supplier_updated` | `suppliers` | Supplier directory record saved | `create` / `update` |
| `supplier_deleted` | `suppliers` | Supplier directory record deleted | `delete` |
| `settings_updated` | `settings` | Portal branding and landing settings modified | `update` |

---

## 4. Privacy & Secret Sanitization
`auditService.sanitizePayload()` guarantees that secrets are never written to audit trails:
- Passwords (`password`, `passwordHash`, `currentPassword`, `newPassword`) are replaced with `[REDACTED]`.
- Tokens and secrets (`token`, `secret`, `jwt`, `authorization`) are replaced with `[REDACTED]`.

---

## 5. Audit Log vs Operational Activity Feed

1. **`audit_logs` (Security & Compliance):**
   - Authoritative historical trail for financial, inventory, and access changes.
   - Preserves IP addresses, user agents, request IDs, and security events.
   - Protected by `audit.view` permission (accessible only to `super admin`, `admin`, and `auditor`).
   - Store-scoped so outlet managers only see their store's audit events.

2. **Operational Activity Feed:**
   - Lightweight, human-friendly timeline derived from `audit_logs` using the `details` field.
   - Rendered in the Auditor UI tab for fast operational monitoring.
