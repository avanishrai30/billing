# AIAVRO Billing OS — Authoritative API Contracts Freeze

This document catalogs the complete, immutable backend REST API surface as implemented in the Express backend.
**Rule:** No backend routes will be added, modified, or deleted during frontend modernization.

---

## 1. Authentication & Session Management

### `POST /api/v1/auth/login`
- **File:** [modules/auth.js:10](file:///Users/avanish/Documents/billing%20system/modules/auth.js#L10)
- **Auth Required:** No
- **Rate Limit:** 150 requests / 15 minutes (`authLimiter`)
- **Request Body (Zod `loginSchema`):**
  ```json
  {
    "username": "admin",
    "password": "secretpassword"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr-1",
      "name": "Super Administrator",
      "username": "admin",
      "role": "SUPER ADMIN",
      "category": "super admin",
      "assignedStoreId": "all",
      "assignedStores": ["all"],
      "avatar": "/uploads/users/avatar-1.webp"
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: `{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid username or password" } }`
  - `403 Forbidden`: `{ "success": false, "error": { "code": "ACCOUNT_SUSPENDED", "message": "Your account is suspended" } }`

### `GET /api/v1/auth/verify`
- **File:** [modules/auth.js:113](file:///Users/avanish/Documents/billing%20system/modules/auth.js#L113)
- **Auth Required:** Yes (`verifyJWT`)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "id": "usr-1",
      "username": "admin",
      "role": "SUPER ADMIN",
      "category": "super admin",
      "assignedStoreId": "all",
      "tokenVersion": 1,
      "iat": 1786500000,
      "exp": 1786586400
    }
  }
  ```

### `POST /api/v1/auth/logout`
- **File:** [modules/auth.js:117](file:///Users/avanish/Documents/billing%20system/modules/auth.js#L117)
- **Auth Required:** Yes (`verifyJWT`)
- **Success Response (200 OK):**
  ```json
  { "success": true, "message": "Logged out successfully" }
  ```

### `POST /api/v1/auth/change-password`
- **File:** [modules/auth.js:126](file:///Users/avanish/Documents/billing%20system/modules/auth.js#L126)
- **Auth Required:** Yes (`verifyJWT`)
- **Request Body:**
  ```json
  {
    "currentPassword": "oldPassword123",
    "newPassword": "newPassword456"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Password updated successfully. All other sessions have been logged out.",
    "tokenVersion": 2
  }
  ```

---

## 2. User Accounts & Access Control

### `GET /api/v1/users`
- **File:** [modules/users.js:9](file:///Users/avanish/Documents/billing%20system/modules/users.js#L9)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('users.view')`)
- **Success Response (200 OK):** Array of User objects (backward-compatible direct array).

### `GET /api/v1/users/presences`
- **File:** [modules/users.js:19](file:///Users/avanish/Documents/billing%20system/modules/users.js#L19)
- **Auth Required:** Yes (`verifyJWT`)
- **Success Response (200 OK):** Array of active socket presence records `{ socketId, userId, username, storeId, lastSeen }`.

### `GET /api/v1/users/:id`
- **File:** [modules/users.js:25](file:///Users/avanish/Documents/billing%20system/modules/users.js#L25)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('users.view')`)
- **Success Response (200 OK):** User object.

### `POST /api/v1/users`
- **File:** [modules/users.js:36](file:///Users/avanish/Documents/billing%20system/modules/users.js#L36)
- **Auth Required:** Yes (`verifyJWT`, `requireAnyPermission(['users.create', 'users.update'])`)
- **Request Body (Zod `userSchema`):**
  ```json
  {
    "id": "usr-2",
    "name": "Jane Doe",
    "username": "janedoe",
    "email": "jane@vcorganics.com",
    "phone": "9876543210",
    "password": "initialPassword",
    "role": "STORE MANAGER",
    "category": "admin",
    "assignedStoreId": "st-1",
    "assignedStores": ["st-1"],
    "permissions": ["inventory.view", "invoices.create"],
    "status": "active"
  }
  ```
- **Success Response (200 OK):** `{ "success": true, "user": { ... } }`

### `POST /api/v1/users/:id/deactivate`
- **File:** [modules/users.js:48](file:///Users/avanish/Documents/billing%20system/modules/users.js#L48)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('users.deactivate')`)
- **Success Response (200 OK):** `{ "success": true, "message": "User account deactivated successfully", "user": { ... } }`

### `POST /api/v1/users/profile`
- **File:** [modules/users.js:59](file:///Users/avanish/Documents/billing%20system/modules/users.js#L59)
- **Auth Required:** Yes (`verifyJWT`)
- **Request Body:** `{ "name": "Jane Smith", "email": "jane.smith@vcorganics.com", "phone": "9876543210" }`
- **Success Response (200 OK):** `{ "success": true, "user": { ... } }`

### `POST /api/v1/users/avatar`
- **File:** [modules/users.js:77](file:///Users/avanish/Documents/billing%20system/modules/users.js#L77)
- **Auth Required:** Yes (`verifyJWT`)
- **Request Body:** `{ "avatar": "/uploads/users/avatar-user1.webp" }`
- **Success Response (200 OK):** `{ "success": true, "avatar": "/uploads/users/avatar-user1.webp" }`

---

## 3. Product Catalog & Inventory

### `GET /api/v1/products`
- **File:** [modules/products.js:81](file:///Users/avanish/Documents/billing%20system/modules/products.js#L81)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('products.view')`)
- **Query Parameters:**
  - `search`: Case-insensitive regex filter across `name`, `sku`, and `barcode`.
  - `category`: Filter by category name or ID.
  - `brand`: Filter by brand name or ID.
  - `sellingMode`: `'packaged'` or `'loose'`.
  - `type`: `'OWN'` or `'EXTERNAL'`.
  - `status`: `'active'`, `'archived'`, or `'all'` (default: non-archived).
  - `page`: Page number (1-indexed).
  - `limit`: Limit per page.
- **Success Response (200 OK):** Array of Product objects (or `{ success: true, products: [...] }`).

### `GET /api/v1/products/:id`
- **File:** [modules/products.js:275](file:///Users/avanish/Documents/billing%20system/modules/products.js#L275)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('products.view')`)
- **Success Response (200 OK):** Single Product document.

### `GET /api/v1/products/by-sku/:sku`
- **File:** [modules/products.js:296](file:///Users/avanish/Documents/billing%20system/modules/products.js#L296)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('products.view')`)
- **Success Response (200 OK):** Single Product document.

### `GET /api/v1/products/by-barcode/:barcode`
- **File:** [modules/products.js:317](file:///Users/avanish/Documents/billing%20system/modules/products.js#L317)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('products.view')`)
- **Success Response (200 OK):** Single Product document with matched variant mapping metadata.

### `POST /api/v1/products`
- **File:** [modules/products.js:338](file:///Users/avanish/Documents/billing%20system/modules/products.js#L338)
- **Auth Required:** Yes (`verifyJWT`, `requireAnyPermission(['products.create', 'products.update'])`, `validateBody(schemas.productSchema)`)
- **Request Body (Zod `productSchema`):** Full product document.
- **Success Response (200 OK):** `{ "success": true, "product": { ... } }`

### `DELETE /api/v1/products/:id`
- **File:** [modules/products.js:410](file:///Users/avanish/Documents/billing%20system/modules/products.js#L410)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('products.archive')`)
- **Success Response (200 OK):** `{ "success": true, "message": "Product archived successfully" }`

### Bulk Import Endpoints
- `POST /api/v1/products/import/preview` ([modules/products.js:443](file:///Users/avanish/Documents/billing%20system/modules/products.js#L443)): Read-only simulation preview.
- `POST /api/v1/products/import/commit` ([modules/products.js:464](file:///Users/avanish/Documents/billing%20system/modules/products.js#L464)): Transactional batch commit.
- `GET /api/v1/products/import/:id` ([modules/products.js:485](file:///Users/avanish/Documents/billing%20system/modules/products.js#L485)): Status of import session.
- `GET /api/v1/products/import/:id/errors` ([modules/products.js:506](file:///Users/avanish/Documents/billing%20system/modules/products.js#L506)): Error log for import session.
- `POST /api/v1/products/import` ([modules/products.js:527](file:///Users/avanish/Documents/billing%20system/modules/products.js#L527)): Legacy import wrapper.

---

## 4. Authoritative Inventory & Ledger

### `GET /api/v1/inventory`
- **File:** [modules/inventory.js:59](file:///Users/avanish/Documents/billing%20system/modules/inventory.js#L59)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('inventory.view')`)
- **Query Parameters:** `storeId` / `locationId`, `productId`.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "inventory": [
      {
        "_id": "60d5ecb8b3b3a1a1a1a1a1a1",
        "productId": "prod-1",
        "locationId": "st-1",
        "quantity": 150,
        "version": 4,
        "updatedAt": "2026-08-15T12:00:00.000Z"
      }
    ]
  }
  ```

### `GET /api/v1/inventory/summary`
- **File:** [modules/inventory.js:10](file:///Users/avanish/Documents/billing%20system/modules/inventory.js#L10)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('inventory.view')`)
- **Query Parameters:** `storeId` / `locationId`.
- **Success Response (200 OK):**
  ```json
  {
    "totalSKUs": 45,
    "totalUnits": 1240,
    "lowStockSKUs": 3,
    "outOfStockSKUs": 1,
    "totalValuationCost": 62000.00,
    "totalValuationRetail": 94000.00
  }
  ```

### `POST /api/v1/inventory/check-availability`
- **File:** [modules/inventory.js:30](file:///Users/avanish/Documents/billing%20system/modules/inventory.js#L30)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('inventory.view')`)
- **Request Body:**
  ```json
  {
    "locationId": "st-1",
    "items": [
      { "productId": "prod-1", "quantity": 2 },
      { "productId": "prod-2", "quantity": 10 }
    ]
  }
  ```
- **Success Response (200 OK):** `{ "available": true, "items": [...] }`

### `POST /api/v1/inventory/adjust`
- **File:** [modules/inventory.js:106](file:///Users/avanish/Documents/billing%20system/modules/inventory.js#L106)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('inventory.adjust')`, `requireStoreScope()`)
- **Request Body:**
  ```json
  {
    "productId": "prod-1",
    "locationId": "st-1",
    "quantity": 10,
    "type": "CYCLE_COUNT",
    "referenceId": "ADJ-1786500",
    "notes": "Physical count adjustment",
    "cost": 150.00
  }
  ```
- **Success Response (200 OK):** `{ "success": true, "message": "Inventory adjusted successfully", "record": { ... } }`

### `POST /api/v1/inventory/transfer`
- **File:** [modules/inventory.js:156](file:///Users/avanish/Documents/billing%20system/modules/inventory.js#L156)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('inventory.transfer')`)
- **Request Body:**
  ```json
  {
    "productId": "prod-1",
    "fromLocationId": "st-1",
    "toLocationId": "st-2",
    "quantity": 25,
    "transferId": "TRF-1786500",
    "notes": "Stock transfer for promotion"
  }
  ```
- **Success Response (200 OK):** `{ "success": true, "message": "Stock transfer completed successfully", "referenceId": "TRF-1786500", "transfer": { ... } }`

### `GET /api/v1/inventory/logs`
- **File:** [modules/inventory.js:85](file:///Users/avanish/Documents/billing%20system/modules/inventory.js#L85)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('inventory.view')`)
- **Query Parameters:** `storeId`/`locationId`, `productId`, `type`, `limit`, `cursor`.
- **Success Response (200 OK):** `{ "data": [ ... ], "nextCursor": "..." }`

---

## 5. POS Checkout & Invoices

### `GET /api/v1/invoices`
- **File:** [modules/billing.js:13](file:///Users/avanish/Documents/billing%20system/modules/billing.js#L13)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('invoices.view')`)
- **Query Parameters:** `status`, `customerId`, `locationId`/`storeId`, `startDate`, `endDate`, `page`, `limit`, `skip`.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "invoices": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 128,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    },
    "requestId": "req-1786500"
  }
  ```

### `GET /api/v1/invoices/:id`
- **File:** [modules/billing.js:81](file:///Users/avanish/Documents/billing%20system/modules/billing.js#L81)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('invoices.view')`)
- **Success Response (200 OK):** Single Invoice document.

### `POST /api/v1/invoices`
- **File:** [modules/billing.js:107](file:///Users/avanish/Documents/billing%20system/modules/billing.js#L107)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('invoices.create')`, `requireStoreScope()`)
- **Request Body:**
  ```json
  {
    "transactionId": "TXN-1786500123",
    "invoiceNumber": "INV-2026-0089",
    "locationId": "st-1",
    "customerId": "cust-1",
    "customerName": "Ramesh Kumar",
    "customerPhone": "9876543210",
    "paymentMode": "CASH",
    "subtotal": 500.00,
    "discount": 50.00,
    "tax": 22.50,
    "grandTotal": 472.50,
    "items": [
      {
        "productId": "prod-1",
        "name": "Organic A2 Ghee 500ml",
        "quantity": 1,
        "price": 500.00,
        "cost": 350.00,
        "gst": 5,
        "unit": "jar"
      }
    ]
  }
  ```
- **Success Response (200 OK):** `{ "success": true, "invoice": { ... } }`

### `POST /api/v1/invoices/:id/void`
- **File:** [modules/billing.js:296](file:///Users/avanish/Documents/billing%20system/modules/billing.js#L296)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('invoices.void')`)
- **Success Response (200 OK):** `{ "success": true, "message": "Invoice voided and inventory stock reverted successfully" }`

### `GET /api/v1/invoices/:invoiceNumber/pdf`
- **File:** [modules/billing.js:400](file:///Users/avanish/Documents/billing%20system/modules/billing.js#L400)
- **Auth Required:** Yes (`verifyJWT`, `requireAnyPermission(['invoices.print', 'invoices.view'])`)
- **Success Response (200 OK):** `application/pdf` binary stream (`Invoice-<invoiceNumber>.pdf`).

---

## 6. Supplier Procurement & Purchases

### `GET /api/v1/purchases`
- **File:** [modules/purchases.js:11](file:///Users/avanish/Documents/billing%20system/modules/purchases.js#L11)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('purchases.view')`)
- **Query Parameters:** `supplierId`, `status`, `locationId`/`storeId`, `startDate`, `endDate`, `page`, `limit`, `skip`.
- **Success Response (200 OK):** `{ "success": true, "purchases": [...], "pagination": { ... } }`

### `GET /api/v1/purchases/:id`
- **File:** [modules/purchases.js:73](file:///Users/avanish/Documents/billing%20system/modules/purchases.js#L73)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('purchases.view')`)
- **Success Response (200 OK):** Single Purchase document.

### `POST /api/v1/purchases`
- **File:** [modules/purchases.js:99](file:///Users/avanish/Documents/billing%20system/modules/purchases.js#L99)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('purchases.create')`, `requireStoreScope()`)
- **Request Body:**
  ```json
  {
    "transactionId": "PUR-TXN-1786500",
    "purchaseNo": "PO-2026-0045",
    "invoiceNumber": "SUP-INV-8910",
    "supplierId": "sup-1",
    "supplier": "Banaswadi Dairy Farms",
    "locationId": "st-1",
    "store": "Banaswadi Store",
    "subtotal": 12000.00,
    "tax": 600.00,
    "grandTotal": 12600.00,
    "paymentStatus": "paid",
    "paymentMode": "BANK",
    "items": [
      {
        "productId": "prod-1",
        "name": "Organic A2 Ghee 500ml",
        "quantity": 30,
        "purchasePrice": 350.00,
        "cost": 350.00,
        "sellingPrice": 500.00,
        "gst": 5,
        "unit": "jar"
      }
    ]
  }
  ```
- **Success Response (200 OK):** `{ "success": true, "purchase": { ... } }`

### `DELETE /api/v1/purchases/:id`
- **File:** [modules/purchases.js:237](file:///Users/avanish/Documents/billing%20system/modules/purchases.js#L237)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('purchases.void')`)
- **Success Response (200 OK):** `{ "success": true, "message": "Purchase voided and inventory stock reverted successfully" }`

---

## 7. Business Intelligence & Dashboard

### `GET /api/v1/dashboard/metrics`
- **File:** [modules/dashboard.js:12](file:///Users/avanish/Documents/billing%20system/modules/dashboard.js#L12)
- **Auth Required:** Yes (`verifyJWT`, `requirePermission('dashboard.view')`)
- **Query Parameters:** `storeId` / `locationId` / `businessId`.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "metrics": {
      "totalSales": 145820.50,
      "netProfit": 48210.00,
      "stockAssetValuationCost": 312000.00,
      "stockAssetValuationRetail": 485000.00,
      "franchiseEarnings": 18500.00,
      "totalProducts": 142,
      "ownProducts": 98,
      "externalProducts": 44,
      "lowStockCount": 6,
      "outOfStockCount": 2,
      "categoriesCount": 8,
      "brandsCount": 3,
      "suppliersCount": 12,
      "expiryWarningsCount": 4
    },
    "lowStockWatchlist": [ ... ],
    "recentInvoices": [ ... ],
    "recentPurchases": [ ... ],
    "requestId": "req-1786500"
  }
  ```

---

## 8. CRM, Stores, Businesses & Franchises

- `GET /api/v1/businesses` & `POST /api/v1/businesses` & `PATCH /api/v1/businesses/:id` & `DELETE /api/v1/businesses/:id` ([modules/businesses.js](file:///Users/avanish/Documents/billing%20system/modules/businesses.js))
- `GET /api/v1/stores` & `POST /api/v1/stores` & `PATCH /api/v1/stores/:id` & `DELETE /api/v1/stores/:id` ([modules/stores.js](file:///Users/avanish/Documents/billing%20system/modules/stores.js))
- `GET /api/v1/customers` & `POST /api/v1/customers` & `PATCH /api/v1/customers/:id` & `DELETE /api/v1/customers/:id` ([modules/customers.js](file:///Users/avanish/Documents/billing%20system/modules/customers.js))
- `GET /api/v1/suppliers` & `POST /api/v1/suppliers` & `PATCH /api/v1/suppliers/:id` & `DELETE /api/v1/suppliers/:id` ([modules/suppliers.js](file:///Users/avanish/Documents/billing%20system/modules/suppliers.js))
- `GET /api/v1/franchises` & `POST /api/v1/franchises` & `DELETE /api/v1/franchises/:id` ([modules/franchise.js](file:///Users/avanish/Documents/billing%20system/modules/franchise.js))
- `GET /api/v1/franchise-supply-orders` & `POST /api/v1/franchise-supply-orders` ([modules/franchise.js](file:///Users/avanish/Documents/billing%20system/modules/franchise.js))

---

## 9. Settings, RBAC & Utilities

- `GET /api/v1/role-permissions` & `POST /api/v1/role-permissions` ([modules/settings.js:9, 29](file:///Users/avanish/Documents/billing%20system/modules/settings.js))
- `GET /api/v1/public/settings` (Public, no auth) & `POST /api/v1/settings` ([modules/settings.js:48, 63](file:///Users/avanish/Documents/billing%20system/modules/settings.js))
- `GET /api/v1/audit-logs` ([modules/audit.js:9](file:///Users/avanish/Documents/billing%20system/modules/audit.js#L9))
- `GET /api/v1/server-info` ([modules/system.js:7](file:///Users/avanish/Documents/billing%20system/modules/system.js#L7))
- `POST /api/v1/scan` & `POST /api/scan` ([modules/scanner.js:7](file:///Users/avanish/Documents/billing%20system/modules/scanner.js#L7))
- `POST /api/v1/upload` & `POST /api/upload` ([modules/upload.js:10](file:///Users/avanish/Documents/billing%20system/modules/upload.js#L10))
