# `syncStateWithServer()` Frontend API Audit & Namespace Verification

This document audits every `api.*` expression invoked during initial application synchronization (`syncStateWithServer()`) in `aiavro_billing_system.html`.

---

## Complete API Call Matrix

| Expression | Frontend Module | Method | Defined? | Script Loaded? | Backend Route | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `api.businesses.list()` | `frontend-api/businesses.js` | `list()` | ✅ YES (`window.api.businesses.list`) | ✅ `/frontend-api/businesses.js` | `GET /api/v1/businesses` | Active |
| `api.products.list()` | `frontend-api/products.js` | `list()` | ✅ YES (`window.api.products.list`) | ✅ `/frontend-api/products.js` | `GET /api/v1/products` | Active |
| `api.customers.list()` | `frontend-api/customers.js` | `list()` | ✅ YES (`window.api.customers.list`) | ✅ `/frontend-api/customers.js` | `GET /api/v1/customers` | Active |
| `api.invoices.list()` | `frontend-api/invoices.js` | `list()` | ✅ YES (`window.api.invoices.list`) | ✅ `/frontend-api/invoices.js` | `GET /api/v1/invoices` | Active |
| `api.purchases.list()` | `frontend-api/purchases.js` | `list()` | ✅ YES (`window.api.purchases.list`) | ✅ `/frontend-api/purchases.js` | `GET /api/v1/purchases` | Active |
| `api.franchises.list()` | `frontend-api/franchise.js` | `list()` | ✅ YES (`window.api.franchises.list`) | ✅ `/frontend-api/franchise.js` | `GET /api/v1/franchises` | Fixed & Verified |
| `api.franchiseSupplyOrders.list()` | `frontend-api/franchise.js` | `list()` | ✅ YES (`window.api.franchiseSupplyOrders.list`) | ✅ `/frontend-api/franchise.js` | `GET /api/v1/franchise-supply-orders` | Fixed & Verified |
| `api.suppliers.list()` | `frontend-api/suppliers.js` | `list()` | ✅ YES (`window.api.suppliers.list`) | ✅ `/frontend-api/suppliers.js` | `GET /api/v1/suppliers` | Active |
| `api.stores.list()` | `frontend-api/stores.js` | `list()` | ✅ YES (`window.api.stores.list`) | ✅ `/frontend-api/stores.js` | `GET /api/v1/stores` | Active |
| `api.settings.getRolePermissions()` | `frontend-api/settings.js` | `getRolePermissions()` | ✅ YES (`window.api.settings.getRolePermissions`) | ✅ `/frontend-api/settings.js` | `GET /api/v1/role-permissions` | Active |
| `api.users.list()` | `frontend-api/users.js` | `list()` | ✅ YES (`window.api.users.list`) | ✅ `/frontend-api/users.js` | `GET /api/v1/users` | Active |
| `api.audit.list()` | `frontend-api/audit.js` | `list()` | ✅ YES (`window.api.audit.list`) | ✅ `/frontend-api/audit.js` | `GET /api/v1/audit-logs` | Active |
| `api.inventory.list()` | `frontend-api/inventory.js` | `list()` | ✅ YES (`window.api.inventory.list`) | ✅ `/frontend-api/inventory.js` | `GET /api/v1/inventory` | Active |
| `api.inventory.logs()` | `frontend-api/inventory.js` | `logs()` | ✅ YES (`window.api.inventory.logs`) | ✅ `/frontend-api/inventory.js` | `GET /api/v1/inventory/logs` | Active |

---

## Root Cause Analysis & Resolution

1. **Root Cause**: `frontend-api/franchise.js` previously attached only to `api.franchise`. During `syncStateWithServer()`, lines 6376 and 6380 called `api.franchises.list()` and `api.franchiseSupplyOrders.list()`. Because `api.franchises` was undefined, evaluating `.list()` threw `TypeError: Cannot read properties of undefined (reading 'list')`.
2. **Resolution Applied**:
   - Updated `frontend-api/franchise.js` to explicitly mount `window.api.franchise`, `window.api.franchises`, and `window.api.franchiseSupplyOrders`.
   - Updated all 18 modules in `frontend-api/` to use explicit `window.api = window.api || {};` initialization.
   - Hardened `initSyncSocket` to pass the JWT authentication token and handle connection failures without blocking REST data synchronization.
