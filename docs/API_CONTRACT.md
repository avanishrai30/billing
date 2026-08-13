# API Contract Specifications - VC Organic ERP V3

This document lists the strict specification constraints for every frontend network request and its matching backend endpoint handler.

---

## 1. Authentication Domain

### Login (`POST /api/v1/auth/login`)
1. **URL**: `/api/v1/auth/login`
2. **HTTP Method**: `POST`
3. **Authentication**: None
4. **RBAC Permission**: None (Pre-auth endpoint)
5. **Request Body**: `{ username, password }`
6. **Query Parameters**: None
7. **Backend Route**: `POST /api/v1/auth/login` in [`modules/auth.js`](file:///Users/avanish/Documents/billing%20system/modules/auth.js)
8. **Response Shape**: `{ success: true, token, user }`
9. **Frontend Expected Shape**: `{ success, token, user }`
10. **Error Behavior**: Returns `400` / `401` with error message.
11. **Socket Event**: None

### Token Verification (`GET /api/v1/auth/verify`)
1. **URL**: `/api/v1/auth/verify`
2. **HTTP Method**: `GET`
3. **Authentication**: `verifyJWT` (Bearer token in header)
4. **RBAC Permission**: None
5. **Request Body**: None
6. **Query Parameters**: None
7. **Backend Route**: `GET /api/v1/auth/verify` in [`modules/auth.js`](file:///Users/avanish/Documents/billing%20system/modules/auth.js)
8. **Response Shape**: `{ success: true, user }`
9. **Frontend Expected Shape**: `{ success, user }`
10. **Error Behavior**: Returns `401` on invalid token.
11. **Socket Event**: None

---

## 2. User Directory Domain

### Fetch Users (`GET /api/v1/users`)
1. **URL**: `/api/v1/users`
2. **HTTP Method**: `GET`
3. **Authentication**: `verifyJWT`
4. **RBAC Permission**: `admin` or `super admin`
5. **Request Body**: None
6. **Query Parameters**: None
7. **Backend Route**: `GET /api/v1/users` in [`modules/users.js`](file:///Users/avanish/Documents/billing%20system/modules/users.js)
8. **Response Shape**: `Array<User>` (passwords excluded)
9. **Frontend Expected Shape**: `Array<User>`
10. **Error Behavior**: Returns `500` on database failure.
11. **Socket Event**: None

### Create/Update User (`POST /api/v1/users`)
1. **URL**: `/api/v1/users`
2. **HTTP Method**: `POST`
3. **Authentication**: `verifyJWT`
4. **RBAC Permission**: `owner` or `super admin`
5. **Request Body**: `{ name, username, role, assignedStoreId, password }`
6. **Query Parameters**: None
7. **Backend Route**: `POST /api/v1/users` in [`modules/users.js`](file:///Users/avanish/Documents/billing%20system/modules/users.js)
8. **Response Shape**: `{ success: true, user }`
9. **Frontend Expected Shape**: `{ success, user }`
10. **Error Behavior**: Returns `400` on validation error, `403` if forbidden.
11. **Socket Event**: Broadcasts `user_updated` room sync.

### Change Password (`POST /api/v1/users/change-password`)
1. **URL**: `/api/v1/users/change-password`
2. **HTTP Method**: `POST`
3. **Authentication**: `verifyJWT`
4. **RBAC Permission**: None
5. **Request Body**: `{ currentPassword, newPassword }`
6. **Query Parameters**: None
7. **Backend Route**: `POST /api/v1/users/change-password` in [`modules/users.js`](file:///Users/avanish/Documents/billing%20system/modules/users.js)
8. **Response Shape**: `{ success: true }`
9. **Frontend Expected Shape**: `{ success }`
10. **Error Behavior**: Returns `400` on wrong current password.
11. **Socket Event**: Broadcasts `user_updated` room sync.

---

## 3. Product Catalog Domain

### Fetch Products (`GET /api/v1/products`)
1. **URL**: `/api/v1/products`
2. **HTTP Method**: `GET`
3. **Authentication**: `verifyJWT`
4. **RBAC Permission**: `billing`, `inventory`, `purchase`
5. **Request Body**: None
6. **Query Parameters**: None
7. **Backend Route**: `GET /api/v1/products` in [`modules/products.js`](file:///Users/avanish/Documents/billing%20system/modules/products.js)
8. **Response Shape**: `Array<Product>`
9. **Frontend Expected Shape**: `Array<Product>`
10. **Error Behavior**: Returns `500` on backend query failure.
11. **Socket Event**: None

### Create/Update Product (`POST /api/v1/products`)
1. **URL**: `/api/v1/products`
2. **HTTP Method**: `POST`
3. **Authentication**: `verifyJWT`
4. **RBAC Permission**: `inventory`
5. **Request Body**: `{ id, name, category, emoji, sku, price, cost, stock, reorder, maxStock, brand, supplier, store, image, images, status, dom, doe, gst, type, sellingMode, weightUnit, barcodes }`
6. **Query Parameters**: None
7. **Backend Route**: `POST /api/v1/products` in [`modules/products.js`](file:///Users/avanish/Documents/billing%20system/modules/products.js)
8. **Response Shape**: `{ success: true, product }`
9. **Frontend Expected Shape**: `{ success, product }`
10. **Error Behavior**: Returns `400` on validator failures.
11. **Socket Event**: Broadcasts `product.updated` granular socket notifications.

---

## 4. Inventory Domain

### Fetch Inventory Allocations (`GET /api/v1/inventory`)
1. **URL**: `/api/v1/inventory`
2. **HTTP Method**: `GET`
3. **Authentication**: `verifyJWT`
4. **RBAC Permission**: `inventory`
5. **Request Body**: None
6. **Query Parameters**: None
7. **Backend Route**: `GET /api/v1/inventory` in [`modules/inventory.js`](file:///Users/avanish/Documents/billing%20system/modules/inventory.js)
8. **Response Shape**: `{ success: true, inventory: [...] }`
9. **Frontend Expected Shape**: `Array<InventoryRecord>` (Normalized in client layer)
10. **Error Behavior**: Returns `500` on database error.
11. **Socket Event**: None

### Adjust Stock (`POST /api/v1/inventory/adjust`)
1. **URL**: `/api/v1/inventory/adjust`
2. **HTTP Method**: `POST`
3. **Authentication**: `verifyJWT`
4. **RBAC Permission**: `inventory`
5. **Request Body**: `{ productId, storeId, quantity, type, referenceId }`
6. **Query Parameters**: None
7. **Backend Route**: `POST /api/v1/inventory/adjust` in [`modules/inventory.js`](file:///Users/avanish/Documents/billing%20system/modules/inventory.js)
8. **Response Shape**: `{ success: true, quantity }`
9. **Frontend Expected Shape**: `{ success, quantity }`
10. **Error Behavior**: Returns `400` on missing required parameters.
11. **Socket Event**: Broadcasts `inventory_updated` or audit log.

---

## 5. Billing Invoices Domain

### Fetch Invoices (`GET /api/v1/invoices`)
1. **URL**: `/api/v1/invoices`
2. **HTTP Method**: `GET`
3. **Authentication**: `verifyJWT`
4. **RBAC Permission**: `invoices`, `auditor`
5. **Request Body**: None
6. **Query Parameters**: None
7. **Backend Route**: `GET /api/v1/invoices` in [`modules/billing.js`](file:///Users/avanish/Documents/billing%20system/modules/billing.js)
8. **Response Shape**: `Array<Invoice>`
9. **Frontend Expected Shape**: `Array<Invoice>`
10. **Error Behavior**: Returns `500` on query failure.
11. **Socket Event**: None

### Checkout Cart (`POST /api/v1/invoices`)
1. **URL**: `/api/v1/invoices`
2. **HTTP Method**: `POST`
3. **Authentication**: `verifyJWT`
4. **RBAC Permission**: `billing`
5. **Request Body**: `{ customerName, customerPhone, items: [...], total, paymentMethod, transactionId }`
6. **Query Parameters**: None
7. **Backend Route**: `POST /api/v1/invoices` in [`modules/billing.js`](file:///Users/avanish/Documents/billing%20system/modules/billing.js)
8. **Response Shape**: `{ success: true, invoice }`
9. **Frontend Expected Shape**: `{ success, invoice }`
10. **Error Behavior**: Returns `400` on invalid payload or double transactions.
11. **Socket Event**: Broadcasts `invoice_created` room sync.

---

## 6. Purchase Receipts Domain

### Fetch Purchases (`GET /api/v1/purchases`)
1. **URL**: `/api/v1/purchases`
2. **HTTP Method**: `GET`
3. **Authentication**: `verifyJWT`
4. **RBAC Permission**: `purchase`
5. **Request Body**: None
6. **Query Parameters**: None
7. **Backend Route**: `GET /api/v1/purchases` in [`modules/purchases.js`](file:///Users/avanish/Documents/billing%20system/modules/purchases.js)
8. **Response Shape**: `Array<Purchase>`
9. **Frontend Expected Shape**: `Array<Purchase>`
10. **Error Behavior**: Returns `500` on query error.
11. **Socket Event**: None

### Record Purchase (`POST /api/v1/purchases`)
1. **URL**: `/api/v1/purchases`
2. **HTTP Method**: `POST`
3. **Authentication**: `verifyJWT`
4. **RBAC Permission**: `purchase`
5. **Request Body**: `{ supplierId, storeId, items: [...], grandTotal, billNo, paymentMethod }`
6. **Query Parameters**: None
7. **Backend Route**: `POST /api/v1/purchases` in [`modules/purchases.js`](file:///Users/avanish/Documents/billing%20system/modules/purchases.js)
8. **Response Shape**: `{ success: true, purchase }`
9. **Frontend Expected Shape**: `{ success, purchase }`
10. **Error Behavior**: Returns `400` on validation failures.
11. **Socket Event**: Broadcasts `purchase_created` sync.
