# Domain Ownership Architecture (V3 ERP)

This document specifies the exact domain boundaries, routers, services, collections, endpoints, and events for the VC Organic Enterprise ERP System.

---

## 1. Domain Matrix

| Domain | Router (`modules/`) | Service (`services/`) | Primary Collection(s) | REST Base Endpoint | Socket Events |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth & Session** | `auth.js` | `userService.js` | `users` | `/api/v1/auth` | `user_updated` |
| **Users & RBAC** | `users.js` | `userService.js` | `users`, `role_permissions` | `/api/v1/users` | `user_updated`, `rbac_updated` |
| **Products & Catalog** | `products.js` | — | `products`, `product_barcodes`, `product_images` | `/api/v1/products` | `product_updated`, `product_deleted`, `products_imported` |
| **Inventory & Ledger** | `inventory.js` | `inventoryService.js` | `inventory`, `inventory_ledger` | `/api/v1/inventory` | `inventory.updated` |
| **Billing & POS** | `billing.js` | `inventoryService.js` | `invoices` | `/api/v1/invoices` | `invoice_created`, `invoice_voided` |
| **Purchases** | `purchases.js` | `inventoryService.js` | `purchases` | `/api/v1/purchases` | `purchase_created`, `purchase_deleted` |
| **Businesses / Outlets** | `businesses.js` | — | `businesses` | `/api/v1/businesses` | `business_updated`, `business_deleted` |
| **Stores** | `stores.js` | — | `stores` | `/api/v1/stores` | `store_updated`, `store_deleted` |
| **Customers CRM** | `customers.js` | — | `customers` | `/api/v1/customers` | `customer_updated`, `customer_deleted` |
| **Suppliers CRM** | `suppliers.js` | — | `suppliers` | `/api/v1/suppliers` | `supplier_updated`, `supplier_deleted` |
| **Franchise CRM** | `franchise.js` | — | `franchises`, `franchise_supply_orders` | `/api/v1/franchises` | `franchise_updated`, `franchise_deleted`, `franchise_order_created` |
| **Audit Logs** | `audit.js` | `auditService.js` | `audit_logs` | `/api/v1/audit-logs` | — |
| **Settings & Branding** | `settings.js` | `auditService.js` | `settings`, `role_permissions` | `/api/v1/settings`, `/api/v1/role-permissions` | `settings_updated`, `rbac_updated` |
| **System Info** | `system.js` | — | — | `/api/v1/server-info` | — |
| **Media / Uploads** | `upload.js` | — | `product_images` | `/api/v1/upload`, `/api/upload` | — |
| **Scanner Emulator** | `scanner.js` | — | `products`, `product_barcodes` | `/api/v1/scan`, `/api/scan` | `PRODUCT_ADDED`, `PRODUCT_NOT_FOUND` |

---

## 2. Cross-Domain Data Mutation Rules

1. **Inventory Collection Isolation**:
   - Only `services/inventoryService.js` has permission to write directly to `inventory` and `inventory_ledger`.
   - Routers (`billing.js`, `purchases.js`, `inventory.js`) invoke `inventoryService.consumeStock(...)`, `inventoryService.addStock(...)`, `inventoryService.revertStock(...)`, `inventoryService.adjustStock(...)`, or `inventoryService.transferStock(...)`.
2. **Audit Logging Centralization**:
   - All domain state mutations call `services/auditService.writeAuditLog(...)`.
   - `modules/audit.js` is strictly a read-only query router.
3. **User Password Modification**:
   - Both `/api/v1/auth/change-password` and `/api/v1/users/change-password` invoke `services/userService.changePassword(...)`.
4. **Businesses & Stores Sync**:
   - `modules/businesses.js` manages outlet profiles in `businesses` collection and updates `stores` collection to maintain legacy compatibility.

---

## 3. Route Mounting Table (`server.js`)

```
/api/v1/auth                 -> modules/auth.js
/api/v1/users                -> modules/users.js
/api/v1/products             -> modules/products.js
/api/v1/inventory            -> modules/inventory.js
/api/v1/invoices             -> modules/billing.js
/api/v1/purchases            -> modules/purchases.js
/api/v1/businesses           -> modules/businesses.js
/api/v1/stores               -> modules/stores.js
/api/v1/customers            -> modules/customers.js
/api/v1/suppliers            -> modules/suppliers.js
/api/v1/audit-logs           -> modules/audit.js
/api/v1/franchises           -> modules/franchise.js
/api/v1/franchise-supply-orders -> modules/franchise.js
/api/v1/role-permissions     -> modules/settings.js
/api/v1/settings             -> modules/settings.js
/api/v1/public/settings      -> modules/settings.js
/api/v1/server-info          -> modules/system.js
/api/v1/scan                 -> modules/scanner.js
/api/v1/upload               -> modules/upload.js
/api/scan                    -> modules/scanner.js (compatibility alias)
/api/upload                  -> modules/upload.js (compatibility alias)
```
