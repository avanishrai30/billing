# Current API Map - VC Organic ERP V3

This document lists all active backend routes and REST endpoints mounted under `/api/v1` in the system, detailing their methods, authentication requirements, and files.

---

## 1. Authentication Domain (`/api/v1/auth`)
**Handler File**: [`modules/auth.js`](file:///Users/avanish/Documents/billing%20system/modules/auth.js)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | `POST` | None | Validates username/password, returns signed JWT and user info. |
| `/api/v1/auth/verify` | `GET` | `verifyJWT` | Checks JWT validity, returns success status. |

---

## 2. User Directory Domain (`/api/v1/users`)
**Handler File**: [`modules/users.js`](file:///Users/avanish/Documents/billing%20system/modules/users.js)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/users` | `GET` | `verifyJWT` | Returns a raw list of all registered users (passwords excluded). |
| `/api/v1/users` | `POST` | `verifyJWT` | Creates a new user profile or updates existing (Owner-only). |
| `/api/v1/users/profile` | `POST` | `verifyJWT` | Updates current logged-in user name, email, and phone. |
| `/api/v1/users/avatar` | `POST` | `verifyJWT` | Updates avatar profile picture path. |
| `/api/v1/users/change-password` | `POST` | `verifyJWT` | Securely alters account password. |
| `/api/v1/users/presences` | `GET` | `verifyJWT` | Returns a list of all currently active session cashiers. |

---

## 3. Product Catalog Domain (`/api/v1/products`)
**Handler File**: [`modules/products.js`](file:///Users/avanish/Documents/billing%20system/modules/products.js)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/products` | `GET` | `verifyJWT` | Returns a raw list of all non-archived products. |
| `/api/v1/products` | `POST` | `verifyJWT` | Inserts a new product document or updates existing specs. |
| `/api/v1/products/import` | `POST` | `verifyJWT` | Processes batch uploaded spreadsheet JSON rows. |

---

## 4. Inventory Domain (`/api/v1/inventory`)
**Handler File**: [`modules/inventory.js`](file:///Users/avanish/Documents/billing%20system/modules/inventory.js)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/inventory` | `GET` | `verifyJWT` | Returns a raw list of store-specific inventory allocations. |
| `/api/v1/inventory/adjust` | `POST` | `verifyJWT` | Performs manual stock balance override. |
| `/api/v1/inventory/transfer` | `POST` | `verifyJWT` | Transfers inventory between two outlets. |

---

## 5. Billing Invoices Domain (`/api/v1/invoices`)
**Handler File**: [`modules/billing.js`](file:///Users/avanish/Documents/billing%20system/modules/billing.js)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/invoices` | `GET` | `verifyJWT` | Returns a raw list of all sales invoices. |
| `/api/v1/invoices` | `POST` | `verifyJWT` | Processes a retail checkout, decrementing inventory counts. |
| `/api/v1/invoices/:id/void` | `POST` | `verifyJWT` | Flags invoice as void, restoring inventory balances. |

---

## 6. Purchase Receipts Domain (`/api/v1/purchases`)
**Handler File**: [`modules/purchases.js`](file:///Users/avanish/Documents/billing%20system/modules/purchases.js)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/purchases` | `GET` | `verifyJWT` | Returns a raw list of all supplier invoices. |
| `/api/v1/purchases` | `POST` | `verifyJWT` | Records stock receipt delivery, incrementing inventory counts. |

---

## 7. Franchise CRM Domain (`/api/v1/franchises` / `/api/v1/franchise-supply-orders`)
**Handler File**: [`modules/franchise.js`](file:///Users/avanish/Documents/billing%20system/modules/franchise.js)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/franchises` | `GET` | `verifyJWT` | Lists all franchise details. |
| `/api/v1/franchises` | `POST` | `verifyJWT` | Creates or updates franchise partner records. |
| `/api/v1/franchises/:id` | `DELETE` | `verifyJWT` | Removes franchise partner profiles. |
| `/api/v1/franchise-supply-orders` | `GET` | `verifyJWT` | Lists dispatched supply orders. |
| `/api/v1/franchise-supply-orders` | `POST` | `verifyJWT` | Dispatches store inventory batches. |

---

## 8. Customers Directory Domain (`/api/v1/customers`)
**Handler File**: [`modules/franchise.js`](file:///Users/avanish/Documents/billing%20system/modules/franchise.js)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/customers` | `GET` | `verifyJWT` | Returns raw list of registered retail clients. |
| `/api/v1/customers` | `POST` | `verifyJWT` | Saves customer profile. |

---

## 9. Suppliers Directory Domain (`/api/v1/suppliers`)
**Handler File**: [`modules/franchise.js`](file:///Users/avanish/Documents/billing%20system/modules/franchise.js)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/suppliers` | `GET` | `verifyJWT` | Returns raw list of partner suppliers. |
| `/api/v1/suppliers` | `POST` | `verifyJWT` | Saves supplier profile. |

---

## 10. Stores & Businesses Context Domain (`/api/v1/stores` / `/api/v1/businesses` / `/api/v1/server-info`)
**Handler File**: [`modules/franchise.js`](file:///Users/avanish/Documents/billing%20system/modules/franchise.js)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/stores` | `GET` | `verifyJWT` | Returns list of store outlets. |
| `/api/v1/businesses` | `GET` | `verifyJWT` | Returns list of active businesses. |
| `/api/v1/businesses` | `POST` | `verifyJWT` | Configures business credentials and parameters. |
| `/api/v1/businesses/:id` | `DELETE` | `verifyJWT` | Removes business profile. |
| `/api/v1/server-info` | `GET` | `verifyJWT` | Returns server IP configuration. |

---

## 11. Settings & Permissions Domain (`/api/v1/role-permissions` / `/api/v1/settings`)
**Handler File**: [`modules/settings.js`](file:///Users/avanish/Documents/billing%20system/modules/settings.js)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/role-permissions` | `GET` | `verifyJWT` | Returns the dynamic role-permissions matrix. |
| `/api/v1/role-permissions` | `POST` | `verifyJWT` | Saves modified permissions mappings (Admin-only). |
| `/api/v1/public/settings` | `GET` | None | Returns title and logo details. |
| `/api/v1/settings` | `POST` | `verifyJWT` | Configures branding metadata (Owner-only). |

---

## 12. Audit Trail Domain (`/api/v1/audit-logs`)
**Handler File**: [`modules/audit.js`](file:///Users/avanish/Documents/billing%20system/modules/audit.js)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/audit-logs` | `GET` | `verifyJWT` | Returns raw audit trail lists (filtered by user privileges). |
