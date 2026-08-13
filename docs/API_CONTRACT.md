# API Contract Specifications - VC Organic ERP V3 (Stage 05 Clean Architecture)

This document lists the strict specification constraints for every frontend network request and its matching backend endpoint handler.

---

## 1. Authentication Domain (`modules/auth.js`)

### Login (`POST /api/v1/auth/login`)
- **URL**: `/api/v1/auth/login`
- **Method**: `POST`
- **Auth**: None
- **Body**: `{ username, password }`
- **Response**: `{ success: true, token, user: { id, name, username, role, category, assignedStoreId, assignedStores, avatar } }`
- **Service**: `services/userService.js`
- **Audit**: `auth_login`

### Token Verification (`GET /api/v1/auth/verify`)
- **URL**: `/api/v1/auth/verify`
- **Method**: `GET`
- **Auth**: `verifyJWT` (Bearer token)
- **Response**: `{ success: true, user }`

### Change Password (`POST /api/v1/auth/change-password`)
- **URL**: `/api/v1/auth/change-password`
- **Method**: `POST`
- **Auth**: `verifyJWT`
- **Body**: `{ currentPassword, newPassword }`
- **Response**: `{ success: true, message: "Password updated successfully" }`
- **Service**: `services/userService.changePassword`

---

## 2. User Directory Domain (`modules/users.js`)

### Fetch Users (`GET /api/v1/users`)
- **URL**: `/api/v1/users`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response**: `Array<User>` (passwords excluded)

### Create/Update User (`POST /api/v1/users`)
- **URL**: `/api/v1/users`
- **Method**: `POST`
- **Auth**: `verifyJWT` (Admin / Super Admin)
- **Body**: `{ name, username, role, assignedStoreId, password, email, phone, status }`
- **Response**: `{ success: true, user }`
- **Service**: `services/userService.saveUser`
- **Socket**: Broadcasts `user_updated`

### Update Profile (`POST /api/v1/users/profile`)
- **URL**: `/api/v1/users/profile`
- **Method**: `POST`
- **Auth**: `verifyJWT`
- **Body**: `{ name, email, phone }`
- **Response**: `{ success: true, user }`

### Update Avatar (`POST /api/v1/users/avatar`)
- **URL**: `/api/v1/users/avatar`
- **Method**: `POST`
- **Auth**: `verifyJWT`
- **Body**: `{ avatar }`
- **Response**: `{ success: true, avatar }`

---

## 3. Product Catalog Domain (`modules/products.js`)

### Fetch Products (`GET /api/v1/products`)
- **URL**: `/api/v1/products`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response**: `Array<Product>`

### Create/Update Product (`POST /api/v1/products`)
- **URL**: `/api/v1/products`
- **Method**: `POST`
- **Auth**: `verifyJWT`
- **Body**: Zod validated `productSchema`
- **Response**: `{ success: true, product }`
- **Socket**: `product_updated`

### Soft Delete Product (`DELETE /api/v1/products/:id`)
- **URL**: `/api/v1/products/:id`
- **Method**: `DELETE`
- **Auth**: `verifyJWT`
- **Response**: `{ success: true }`
- **Socket**: `product_deleted`

### Bulk Import (`POST /api/v1/products/import`)
- **URL**: `/api/v1/products/import`
- **Method**: `POST`
- **Auth**: `verifyJWT`
- **Body**: `{ newProducts: [...], logs: [...] }`
- **Response**: `{ success: true, imported: count }`
- **Socket**: `products_imported`

---

## 4. Inventory & Ledger Domain (`modules/inventory.js` -> `services/inventoryService.js`)

### Fetch Inventory Snapshot (`GET /api/v1/inventory`)
- **URL**: `/api/v1/inventory`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Query**: `?storeId=...&productId=...`
- **Response**: `{ success: true, inventory: Array<Record> }` (Normalized to flat array in client)

### Read Ledger Logs (`GET /api/v1/inventory/logs`)
- **URL**: `/api/v1/inventory/logs`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Query**: `?productId=...&storeId=...&type=...&startDate=...&endDate=...&limit=50&cursor=...`
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "mov-...",
        "productId": "prd-...",
        "locationId": "biz-...",
        "type": "sale | purchase | adjustment | transfer_in | transfer_out | void_sale",
        "quantity": -2,
        "beforeQuantity": 25,
        "afterQuantity": 23,
        "referenceType": "invoice",
        "referenceId": "INV-...",
        "performedBy": "admin",
        "createdAt": "2026-08-14T..."
      }
    ],
    "pagination": {
      "limit": 50,
      "nextCursor": "..."
    }
  }
  ```

### Stock Adjustment (`POST /api/v1/inventory/adjust`)
- **URL**: `/api/v1/inventory/adjust`
- **Method**: `POST`
- **Auth**: `verifyJWT`
- **Body**: `{ productId, storeId, quantity, type, referenceId }`
- **Response**: `{ success: true, quantity: newQty }`

### Stock Transfer (`POST /api/v1/inventory/transfer`)
- **URL**: `/api/v1/inventory/transfer`
- **Method**: `POST`
- **Auth**: `verifyJWT`
- **Body**: `{ productId, fromStoreId, toStoreId, quantity }`
- **Response**: `{ success: true, message: "Transfer completed", referenceId: "tf-..." }`

---

## 5. Billing & Invoices Domain (`modules/billing.js`)

### Fetch Invoices (`GET /api/v1/invoices`)
- **URL**: `/api/v1/invoices`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response**: `Array<Invoice>`

### Create POS Invoice (`POST /api/v1/invoices`)
- **URL**: `/api/v1/invoices`
- **Method**: `POST`
- **Auth**: `verifyJWT`
- **Body**: `{ customerName, customerPhone, items: [...], grandTotal, paymentMethod, storeId, invoiceNumber }`
- **Response**: `{ success: true, invoice }`
- **Service**: Automatically calls `inventoryService.consumeStock(...)`
- **Socket**: `invoice_created` emitted to `store_${storeId}`

### Void Invoice (`POST /api/v1/invoices/:id/void`)
- **URL**: `/api/v1/invoices/:id/void`
- **Method**: `POST`
- **Auth**: `verifyJWT`
- **Response**: `{ success: true, message: "Invoice voided" }`
- **Service**: Automatically calls `inventoryService.revertStock(...)`
- **Socket**: `invoice_voided` emitted to `store_${storeId}`

---

## 6. Purchase Receipts Domain (`modules/purchases.js`)

### Fetch Purchases (`GET /api/v1/purchases`)
- **URL**: `/api/v1/purchases`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response**: `Array<Purchase>`

### Record Purchase (`POST /api/v1/purchases`)
- **URL**: `/api/v1/purchases`
- **Method**: `POST`
- **Auth**: `verifyJWT`
- **Body**: `{ supplierId, storeId, items: [...], grandTotal, invoiceNumber, billNo }`
- **Response**: `{ success: true, purchase }`
- **Service**: Automatically calls `inventoryService.addStock(...)`
- **Socket**: `purchase_created`

---

## 7. Businesses & Stores Domain (`modules/businesses.js` & `modules/stores.js`)

### Businesses CRUD (`/api/v1/businesses`)
- `GET /api/v1/businesses` -> `Array<Business>`
- `GET /api/v1/businesses/:id` -> `Business`
- `POST /api/v1/businesses` -> `{ success: true, business }`
- `PATCH /api/v1/businesses/:id` -> `{ success: true, business }`
- `DELETE /api/v1/businesses/:id` -> `{ success: true }`

### Stores CRUD (`/api/v1/stores`)
- `GET /api/v1/stores` -> `Array<Store>`
- `GET /api/v1/stores/:id` -> `Store`
- `POST /api/v1/stores` -> `{ success: true, store }`
- `PATCH /api/v1/stores/:id` -> `{ success: true, store }`
- `DELETE /api/v1/stores/:id` -> `{ success: true }`

---

## 8. Customers & Suppliers CRM (`modules/customers.js` & `modules/suppliers.js`)

### Customers CRUD (`/api/v1/customers`)
- `GET /api/v1/customers` -> `Array<Customer>`
- `GET /api/v1/customers/:id` -> `Customer`
- `POST /api/v1/customers` -> `{ success: true, customer }`
- `PATCH /api/v1/customers/:id` -> `{ success: true, customer }`
- `DELETE /api/v1/customers/:id` -> `{ success: true }`

### Suppliers CRUD (`/api/v1/suppliers`)
- `GET /api/v1/suppliers` -> `Array<Supplier>`
- `GET /api/v1/suppliers/:id` -> `Supplier`
- `POST /api/v1/suppliers` -> `{ success: true, supplier }`
- `PATCH /api/v1/suppliers/:id` -> `{ success: true, supplier }`
- `DELETE /api/v1/suppliers/:id` -> `{ success: true }`

---

## 9. Media & Scanner (`modules/upload.js` & `modules/scanner.js`)

### Upload (`POST /api/v1/upload` & `POST /api/upload`)
- **Body**: `{ fileName, base64Data }` (Query: `?type=products|logos|employees|invoices`)
- **Response**: `{ success: true, imagePath, imageId }`

### Scanner Scan (`POST /api/v1/scan` & `POST /api/scan`)
- **Body**: `{ sessionId, barcode }`
- **Response**: `{ success: true, product }`
- **Socket**: `PRODUCT_ADDED` / `PRODUCT_NOT_FOUND` emitted to `sessionId` room.
