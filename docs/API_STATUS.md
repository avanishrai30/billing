# API Status - VC Organic ERP V3

This document classifies every endpoint contract status following the API contract audit.

---

## Endpoint Classification Specifications

### 1. Authentication Domain
- `POST /api/v1/auth/login` -> **PASS**
- `GET /api/v1/auth/verify` -> **PASS**

### 2. User Directory Domain
- `GET /api/v1/users` -> **PASS**
- `POST /api/v1/users` -> **PASS**
- `POST /api/v1/users/profile` -> **PASS**
- `POST /api/v1/users/avatar` -> **PASS**
- `POST /api/v1/users/change-password` -> **PASS**
- `GET /api/v1/users/presences` -> **PASS**

### 3. Product Catalog Domain
- `GET /api/v1/products` -> **PASS**
- `POST /api/v1/products` -> **PASS**
- `POST /api/v1/products/import` -> **PASS**

### 4. Inventory Domain
- `GET /api/v1/inventory` -> **MISMATCH** (Returns `{ success: true, inventory: [...] }` wrapper; normalized defensively to array `state.inventory = [...]` in the central frontend API client layer).
- `POST /api/v1/inventory/adjust` -> **PASS**
- `POST /api/v1/inventory/transfer` -> **PASS**

### 5. Billing Invoices Domain
- `GET /api/v1/invoices` -> **PASS**
- `POST /api/v1/invoices` -> **PASS**
- `POST /api/v1/invoices/:id/void` -> **PASS**

### 6. Purchase Receipts Domain
- `GET /api/v1/purchases` -> **PASS**
- `POST /api/v1/purchases` -> **PASS**

### 7. Franchise Domain
- `GET /api/v1/franchises` -> **PASS**
- `POST /api/v1/franchises` -> **PASS**
- `DELETE /api/v1/franchises/:id` -> **PASS**
- `GET /api/v1/franchise-supply-orders` -> **PASS**
- `POST /api/v1/franchise-supply-orders` -> **PASS**

### 8. Customers CRM Domain
- `GET /api/v1/customers` -> **PASS**
- `POST /api/v1/customers` -> **PASS**

### 9. Suppliers Domain
- `GET /api/v1/suppliers` -> **PASS**
- `POST /api/v1/suppliers` -> **PASS**

### 10. Stores & Businesses Domain
- `GET /api/v1/stores` -> **PASS**
- `GET /api/v1/businesses` -> **PASS**
- `POST /api/v1/businesses` -> **PASS**
- `DELETE /api/v1/businesses/:id` -> **PASS**
- `GET /api/v1/server-info` -> **PASS**

### 11. Settings & Permissions Domain
- `GET /api/v1/role-permissions` -> **PASS**
- `POST /api/v1/role-permissions` -> **PASS** (Correctly maps settings permissions updates in matrix document format)
- `GET /api/v1/public/settings` -> **PASS**
- `POST /api/v1/settings` -> **PASS**

### 12. Security Audit Domain
- `GET /api/v1/audit-logs` -> **PASS**

### 13. Asset Upload Domain
- `POST /api/upload` -> **MISMATCH** (Backend mounts `/api/upload`, but frontend calls `/api/v1/upload` on lines 6121, 7985, 9674, and 10114. **Action**: Mount routing redirects or endpoints in backend `server.js` to ensure support for both paths).

---

## Identified Route Action items

### Resolve Upload Mismatch
Mount `/api/v1/upload` in `server.js` forwarding directly to the uploads controller, preventing 404s on product logo, user avatar, and business logo uploads.
