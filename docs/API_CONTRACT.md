# VC Organic V3 - API Contract Specifications

This document catalogs the version 1 API contracts, schemas, authorization requirements, and client-side normalization details for the Retail ERP integration.

---

## 1. Authentication Domain (`api.auth`)

### Login Request
- **Endpoint**: `/api/v1/auth/login`
- **Method**: `POST`
- **Auth**: `None`
- **Response Shape**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "id": "usr-12345",
      "name": "Administrator",
      "username": "admin",
      "role": "Super Admin",
      "assignedStoreId": "all"
    }
  }
  ```

---

## 2. User Directory Domain (`api.users`)

### Fetch Users
- **Endpoint**: `/api/v1/users`
- **Method**: `GET`
- **Auth**: `verifyJWT` (Strict Admin/Owner role)
- **Response Shape**: `Array<User>`
- **Frontend State Shape**: `state.users: Array<User>`
- **Normalization Function**:
  `api.users.list()` -> `Array.isArray(res) ? res : res.users || []`

### Fetch Presences
- **Endpoint**: `/api/v1/users/presences`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response Shape**: `Array<Presence>`
- **Frontend State Shape**: Direct console/UI binding
- **Normalization Function**:
  `api.users.presences()` -> `Array.isArray(res) ? res : res.presences || []`

---

## 3. Product Catalog Domain (`api.products`)

### Fetch Products
- **Endpoint**: `/api/v1/products`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response Shape**: `Array<Product>`
- **Frontend State Shape**: `state.products: Array<Product>`
- **Normalization Function**:
  `api.products.list()` -> `Array.isArray(res) ? res : res.products || []`

---

## 4. Inventory Domain (`api.inventory`)

### Fetch Store Inventory
- **Endpoint**: `/api/v1/inventory`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response Shape**:
  ```json
  {
    "success": true,
    "inventory": [
      {
        "productId": "prd-893",
        "storeId": "biz-8947",
        "quantity": 482.5,
        "updatedAt": "2026-08-13T14:41:08Z"
      }
    ]
  }
  ```
- **Frontend State Shape**: `state.inventory: Array<InventoryRecord>`
- **Normalization Function**:
  `api.inventory.list()` -> `Array.isArray(res) ? res : res.inventory || []`

### Fetch Inventory Logs
- **Endpoint**: `/api/v1/inventory/logs`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response Shape**: `Array<InventoryLog>`
- **Frontend State Shape**: `state.inventoryLogs: Array<InventoryLog>`
- **Normalization Function**:
  `api.inventory.logs()` -> `Array.isArray(res) ? res : res.logs || []`

---

## 5. Billing Invoices Domain (`api.invoices`)

### Fetch Invoices
- **Endpoint**: `/api/v1/invoices`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response Shape**: `Array<Invoice>`
- **Frontend State Shape**: `state.invoices: Array<Invoice>`
- **Normalization Function**:
  `api.invoices.list()` -> `Array.isArray(res) ? res : res.invoices || []`

---

## 6. Purchase Domain (`api.purchases`)

### Fetch Supplier Purchases
- **Endpoint**: `/api/v1/purchases`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response Shape**: `Array<Purchase>`
- **Frontend State Shape**: `state.purchases: Array<Purchase>`
- **Normalization Function**:
  `api.purchases.list()` -> `Array.isArray(res) ? res : res.purchases || []`

---

## 7. Business Registry Domain (`api.businesses`)

### Fetch Businesses
- **Endpoint**: `/api/v1/businesses`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response Shape**: `Array<Business>`
- **Frontend State Shape**: `state.businesses: Array<Business>`
- **Normalization Function**:
  `api.businesses.list()` -> `Array.isArray(res) ? res : res.businesses || []`

---

## 8. Store Locations Domain (`api.stores`)

### Fetch Stores
- **Endpoint**: `/api/v1/stores`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response Shape**: `Array<Store>`
- **Frontend State Shape**: `state.stores: Array<Store>`
- **Normalization Function**:
  `api.stores.list()` -> `Array.isArray(res) ? res : res.stores || []`

---

## 9. Customers CRM Domain (`api.customers`)

### Fetch Customers
- **Endpoint**: `/api/v1/customers`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response Shape**: `Array<Customer>`
- **Frontend State Shape**: `state.customers: Array<Customer>`
- **Normalization Function**:
  `api.customers.list()` -> `Array.isArray(res) ? res : res.customers || []`

---

## 10. Suppliers Registry Domain (`api.suppliers`)

### Fetch Suppliers
- **Endpoint**: `/api/v1/suppliers`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response Shape**: `Array<Supplier>`
- **Frontend State Shape**: `state.suppliers: Array<Supplier>`
- **Normalization Function**:
  `api.suppliers.list()` -> `Array.isArray(res) ? res : res.suppliers || []`

---

## 11. Security Audit Logs Domain (`api.auditLogs`)

### Fetch Audit Trails
- **Endpoint**: `/api/v1/audit-logs`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response Shape**: `Array<AuditLog>`
- **Frontend State Shape**: `state.auditLogs: Array<AuditLog>`
- **Normalization Function**:
  `api.auditLogs.list()` -> `Array.isArray(res) ? res : res.logs || []`

---

## 12. Settings Configuration Domain (`api.rolePermissions`)

### Fetch Permissions Matrix
- **Endpoint**: `/api/v1/role-permissions`
- **Method**: `GET`
- **Auth**: `verifyJWT`
- **Response Shape**:
  ```json
  {
    "admin": ["dashboard", "billing", "inventory", "purchase", "businesses", "customers", "invoices", "settings", "auditor", "permissions", "scanner", "verification", "remote-scanner", "refunds"],
    "employee": ["billing", "inventory", "purchase", "scanner", "verification"],
    "auditor": ["invoices", "auditor"]
  }
  ```
- **Frontend State Shape**: `state.rolePermissions: Object`
- **Normalization Function**:
  `api.rolePermissions.get()` -> `res || {}`
