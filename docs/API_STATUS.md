# API Status - VC Organic ERP V3 (Stage 05 Clean Architecture)

This document classifies every endpoint contract status following Stage 05 Domain Extraction & Service Layer modularization.

---

## Endpoint Classification Specifications

### 1. Authentication Domain (`modules/auth.js` -> `services/userService.js`)
- `POST /api/v1/auth/login` -> **PASS**
- `GET /api/v1/auth/verify` -> **PASS**
- `POST /api/v1/auth/change-password` -> **PASS** (Delegates to `userService.changePassword`)

### 2. User Directory Domain (`modules/users.js` -> `services/userService.js`)
- `GET /api/v1/users` -> **PASS**
- `GET /api/v1/users/:id` -> **PASS**
- `POST /api/v1/users` -> **PASS**
- `POST /api/v1/users/profile` -> **PASS**
- `POST /api/v1/users/avatar` -> **PASS**
- `POST /api/v1/users/change-password` -> **PASS** (Delegates to `userService.changePassword`)
- `GET /api/v1/users/presences` -> **PASS**

### 3. Product Catalog Domain (`modules/products.js`)
- `GET /api/v1/products` -> **PASS**
- `GET /api/v1/products/:id` -> **PASS**
- `POST /api/v1/products` -> **PASS**
- `DELETE /api/v1/products/:id` -> **PASS** (Soft archive)
- `POST /api/v1/products/import` -> **PASS**

### 4. Inventory Domain (`modules/inventory.js` -> `services/inventoryService.js`)
- `GET /api/v1/inventory` -> **PASS** (Normalized defensively via `api.inventory.list()`)
- `GET /api/v1/inventory/logs` -> **PASS** (Paginated ledger records from `inventory_ledger`)
- `POST /api/v1/inventory/adjust` -> **PASS** (Invokes `inventoryService.adjustStock`)
- `POST /api/v1/inventory/transfer` -> **PASS** (Invokes `inventoryService.transferStock`)

### 5. Billing Invoices Domain (`modules/billing.js` -> `services/inventoryService.js`)
- `GET /api/v1/invoices` -> **PASS**
- `GET /api/v1/invoices/:id` -> **PASS**
- `POST /api/v1/invoices` -> **PASS** (Invokes `inventoryService.consumeStock`)
- `POST /api/v1/invoices/:id/void` -> **PASS** (Invokes `inventoryService.revertStock`)
- `GET /api/v1/invoices/:invoiceNumber/pdf` -> **PASS**

### 6. Purchase Receipts Domain (`modules/purchases.js` -> `services/inventoryService.js`)
- `GET /api/v1/purchases` -> **PASS**
- `GET /api/v1/purchases/:id` -> **PASS**
- `POST /api/v1/purchases` -> **PASS** (Invokes `inventoryService.addStock`)
- `DELETE /api/v1/purchases/:id` -> **PASS** (Invokes `inventoryService.revertStock`)

### 7. Franchise Domain (`modules/franchise.js`)
- `GET /api/v1/franchises` -> **PASS**
- `GET /api/v1/franchises/:id` -> **PASS**
- `POST /api/v1/franchises` -> **PASS**
- `DELETE /api/v1/franchises/:id` -> **PASS**
- `GET /api/v1/franchise-supply-orders` -> **PASS**
- `POST /api/v1/franchise-supply-orders` -> **PASS**

### 8. Businesses Domain (`modules/businesses.js`)
- `GET /api/v1/businesses` -> **PASS**
- `GET /api/v1/businesses/:id` -> **PASS**
- `POST /api/v1/businesses` -> **PASS**
- `PATCH /api/v1/businesses/:id` -> **PASS**
- `DELETE /api/v1/businesses/:id` -> **PASS**

### 9. Stores Domain (`modules/stores.js`)
- `GET /api/v1/stores` -> **PASS**
- `GET /api/v1/stores/:id` -> **PASS**
- `POST /api/v1/stores` -> **PASS**
- `PATCH /api/v1/stores/:id` -> **PASS**
- `DELETE /api/v1/stores/:id` -> **PASS**

### 10. Customers CRM Domain (`modules/customers.js`)
- `GET /api/v1/customers` -> **PASS**
- `GET /api/v1/customers/:id` -> **PASS**
- `POST /api/v1/customers` -> **PASS**
- `PATCH /api/v1/customers/:id` -> **PASS**
- `DELETE /api/v1/customers/:id` -> **PASS**

### 11. Suppliers CRM Domain (`modules/suppliers.js`)
- `GET /api/v1/suppliers` -> **PASS**
- `GET /api/v1/suppliers/:id` -> **PASS**
- `POST /api/v1/suppliers` -> **PASS**
- `PATCH /api/v1/suppliers/:id` -> **PASS**
- `DELETE /api/v1/suppliers/:id` -> **PASS**

### 12. Settings & Permissions Domain (`modules/settings.js`)
- `GET /api/v1/role-permissions` -> **PASS**
- `POST /api/v1/role-permissions` -> **PASS**
- `GET /api/v1/public/settings` -> **PASS**
- `POST /api/v1/settings` -> **PASS**

### 13. System Information (`modules/system.js`)
- `GET /api/v1/server-info` -> **PASS**

### 14. Security Audit Domain (`modules/audit.js` -> `services/auditService.js`)
- `GET /api/v1/audit-logs` -> **PASS**

### 15. Media Upload Domain (`modules/upload.js`)
- `POST /api/v1/upload` -> **PASS**
- `POST /api/upload` -> **PASS** (Legacy compatibility alias)

### 16. Scanner Emulator Domain (`modules/scanner.js`)
- `POST /api/v1/scan` -> **PASS**
- `POST /api/scan` -> **PASS** (Legacy compatibility alias)
