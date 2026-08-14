# AIAVRO Granular Permission Matrix

This document defines the canonical permission registry and default role mappings enforced across all API endpoints and UI controllers.

---

## 1. Permission Matrix by Role Category

| Permission Key | Description | Super Admin / Owner | Admin | Employee (Cashier / Staff) | Auditor |
|---|---|:---:|:---:|:---:|:---:|
| `*` | Wildcard Administrator Access | ✅ | ❌ | ❌ | ❌ |
| **DASHBOARD** | | | | | |
| `dashboard.view` | View sales metrics & analytics dashboard | ✅ | ✅ | ✅ | ✅ |
| **PRODUCT MASTER** | | | | | |
| `products.view` | View product catalog and variants | ✅ | ✅ | ✅ | ✅ |
| `products.create` | Add new products to catalog | ✅ | ✅ | ❌ | ❌ |
| `products.update` | Update prices, taxes, categories, SKUs | ✅ | ✅ | ❌ | ❌ |
| `products.archive` | Archive / soft-delete products | ✅ | ✅ | ❌ | ❌ |
| `products.import.preview` | Upload Excel files for import preview | ✅ | ✅ | ❌ | ❌ |
| `products.import.commit` | Commit bulk product import to database | ✅ | ✅ | ❌ | ❌ |
| **INVENTORY & LEDGER** | | | | | |
| `inventory.view` | View inventory stock levels and ledger | ✅ | ✅ | ✅ | ✅ |
| `inventory.adjust` | Manually adjust warehouse / store stock | ✅ | ✅ | ❌ | ❌ |
| `inventory.transfer` | Transfer stock between stores | ✅ | ✅ | ❌ | ❌ |
| **BILLING & POS** | | | | | |
| `invoices.view` | View POS invoices | ✅ | ✅ | ✅ | ✅ |
| `invoices.create` | Checkout POS invoices & deduct stock | ✅ | ✅ | ✅ | ❌ |
| `invoices.void` | Void invoices and revert inventory | ✅ | ✅ | ❌ | ❌ |
| `invoices.print` | Print thermal / A4 tax invoices | ✅ | ✅ | ✅ | ✅ |
| **PURCHASES & SUPPLIERS** | | | | | |
| `purchases.view` | View supplier purchase invoices | ✅ | ✅ | ✅ | ✅ |
| `purchases.create` | Record new supplier purchase entries | ✅ | ✅ | ✅ | ❌ |
| `purchases.void` | Void supplier purchase receipts | ✅ | ✅ | ❌ | ❌ |
| `suppliers.view` | View supplier directory | ✅ | ✅ | ✅ | ❌ |
| `suppliers.create` | Add new suppliers | ✅ | ✅ | ❌ | ❌ |
| `suppliers.update` | Edit supplier details | ✅ | ✅ | ❌ | ❌ |
| `suppliers.delete` | Delete supplier records | ✅ | ✅ | ❌ | ❌ |
| **CUSTOMERS (CRM)** | | | | | |
| `customers.view` | View customer directory | ✅ | ✅ | ✅ | ❌ |
| `customers.create` | Register new customers | ✅ | ✅ | ✅ | ❌ |
| `customers.update` | Update customer profiles | ✅ | ✅ | ✅ | ❌ |
| `customers.delete` | Delete customer records | ✅ | ✅ | ❌ | ❌ |
| **OUTLETS & BUSINESSES** | | | | | |
| `businesses.view` | View registered business configurations | ✅ | ✅ | ❌ | ❌ |
| `businesses.create` | Register new business entities | ✅ | ✅ | ❌ | ❌ |
| `businesses.update` | Edit GSTIN, terms, bank details | ✅ | ✅ | ❌ | ❌ |
| `businesses.delete` | Remove business entities | ✅ | ❌ | ❌ | ❌ |
| `stores.view` | View store outlets list | ✅ | ✅ | ❌ | ❌ |
| `stores.create` | Create new store outlets | ✅ | ✅ | ❌ | ❌ |
| `stores.update` | Edit store outlet details | ✅ | ✅ | ❌ | ❌ |
| `stores.delete` | Remove store outlets | ✅ | ❌ | ❌ | ❌ |
| **FRANCHISE CRM** | | | | | |
| `franchise.view` | View franchise profiles & orders | ✅ | ✅ | ❌ | ❌ |
| `franchise.manage` | Create / edit franchise orders | ✅ | ✅ | ❌ | ❌ |
| **USERS & RBAC** | | | | | |
| `users.view` | List user accounts & presences | ✅ | ✅ | ❌ | ❌ |
| `users.create` | Create new staff accounts | ✅ | ✅ | ❌ | ❌ |
| `users.update` | Edit user roles, stores, permissions | ✅ | ✅ | ❌ | ❌ |
| `users.deactivate` | Suspend user accounts & revoke tokens | ✅ | ✅ | ❌ | ❌ |
| `roles.view` | View role-permissions matrix | ✅ | ✅ | ❌ | ❌ |
| `roles.update` | Modify role-permissions matrix | ✅ | ❌ | ❌ | ❌ |
| **AUDIT & SETTINGS** | | | | | |
| `audit.view` | View security & compliance audit logs | ✅ | ✅ | ❌ | ✅ |
| `settings.view` | View portal branding settings | ✅ | ✅ | ❌ | ❌ |
| `settings.update` | Edit portal branding settings | ✅ | ❌ | ❌ | ❌ |
| `scanner.use` | Pair mobile scanner simulator | ✅ | ✅ | ✅ | ❌ |

---

## 2. Backward-Compatible Legacy Expansion Mapping

When legacy permissions are stored in `role_permissions` (e.g. `['billing', 'inventory', 'purchase']`), `services/authzService.js` expands them automatically:

```javascript
const LEGACY_MODULE_EXPANSION = {
  'dashboard': ['dashboard.view'],
  'billing': ['invoices.view', 'invoices.create', 'invoices.print'],
  'inventory': ['inventory.view'],
  'purchase': ['purchases.view', 'purchases.create'],
  'businesses': ['businesses.view', 'businesses.create', 'businesses.update'],
  'customers': ['customers.view', 'customers.create', 'customers.update'],
  'invoices': ['invoices.view', 'invoices.print'],
  'settings': ['settings.view', 'settings.update'],
  'auditor': ['audit.view'],
  'permissions': ['roles.view', 'roles.update', 'users.view', 'users.create', 'users.update'],
  'scanner': ['scanner.use'],
  'verification': ['products.view'],
  'remote-scanner': ['scanner.use'],
  'refunds': ['invoices.void']
};
```
