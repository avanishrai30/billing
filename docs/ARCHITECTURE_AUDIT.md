# VC Organic Billing / ERP — Architecture Audit

This document presents a complete audit of the codebase, highlighting configurations, databases, routes, security, and technical debt in preparation for the ERP V3 Enterprise transition.

---

## 1. Current Frontend Architecture
- **Location**: [aiavro_billing_system.html](file:///Users/avanish/Documents/billing%20system/aiavro_billing_system.html)
- **Framework & Libraries**: Pure Single Page Application (SPA) written in raw HTML5/CSS3 and Vanilla JS.
  - Load-in scripts via CDNs: FontAwesome (icons), Google Fonts (Montserrat & Inter), Socket.IO client, SheetJS (`xlsx.full.min.js`), PDFKit (stubbed client side).
- **Core Modules**: POS billing grid, live product listings, customer registry directories, supplier entry boards, franchise CRM registries, user profile management cards, and administrative settings panels.
- **Routing & State**: Handled using a global `state` object. View changes toggle CSS `.active` classes on dashboard modules.
- **Asset Loading**: Cached brand preferences (logo, name) are loaded synchronously from local storage on bootstrap before server-side fetch to eliminate old VC Organic placeholders blinking.

---

## 2. Current Backend Architecture
- **Location**: [server.js](file:///Users/avanish/Documents/billing%20system/server.js)
- **Framework**: Express application integrated with HTTP server and Socket.IO listener.
- **Security & Middlewares**:
  - **Helmet**: Secures response headers, with Content Security Policy (CSP) and Cross-Origin Resource Policy (CORP) disabled to accommodate remote billing terminals.
  - **CORS**: Dynamically reflects request origin with authorization credentials enabled.
  - **Rate Limiting**: Configured for `/api/auth/` (150 requests/15 mins) and `/api/upload` (100 requests/15 mins).
  - **Express Trust Proxy**: Configured (`app.set('trust proxy', 1)`) to handle reverse proxy routing under Nginx securely.

---

## 3. Existing MongoDB Collections
- `users`: Log-in credentials, hashed passwords, active designations, and assigned store outlets.
- `stores`: Active retail store outlets registries.
- `businesses`: Tenant profile parameters (name, subtitle, GSTIN, bank details).
- `products`: Master product specifications catalog.
- `product_images`: File storage paths mapped to products.
- `customers`: CRM directory for retail client phones, emails, and GSTINs.
- `inventory`: Stock records mapped to store outlets (compound key).
- `product_barcodes`: Alternative SKU barcodes mapped to products.
- `purchases`: Supplier stock delivery receipts.
- `franchises`: CRM registry for franchise partners.
- `franchise_supply_orders`: Dispatched warehouse orders log.
- `audit_logs`: Immutable logs tracking user activity.
- `settings`: Persistent administrative matrices (specifically `role_permissions`).

---

## 4. Existing Indexes
- `users`: `{ username: 1 }` (unique), `{ email: 1 }` (unique, sparse), `{ phone: 1 }`, `{ role: 1 }`
- `stores`: `{ code: 1 }` (unique), `{ id: 1 }` (unique)
- `products`: `{ sku: 1 }` (unique), `{ barcode: 1 }` (unique, sparse), `{ name: "text" }`
- `product_images`: `{ id: 1 }` (unique), `{ productId: 1 }`
- `customers`: `{ phone: 1 }`, `{ email: 1 }`, `{ gstin: 1 }`
- `inventory`: `{ productId: 1, storeId: 1 }` (unique)
- `invoices`: `{ invoiceNumber: 1 }` (unique), `{ transactionId: 1 }` (unique, sparse)
- `product_barcodes`: `{ barcode: 1 }`, `{ productId: 1 }`
- `businesses`: `{ id: 1 }` (unique)

---

## 5. Existing API Endpoints
- **Authentication**:
  - `POST /api/auth/login` (Verify credentials and issue JWT)
  - `GET /api/auth/verify` (Token checks)
- **User Directories**:
  - `GET /api/users` (List user directories; admin-only)
  - `POST /api/users` (Add user account; admin-only)
  - `POST /api/users/profile` (Update own name and email)
  - `POST /api/users/change-password` (Update own login password)
- **Product Catalog**:
  - `GET /api/products` (Retrieve all products)
  - `POST /api/products` (Create/Update single product specifications)
  - `POST /api/products/import` (Sync batch uploaded products)
- **Invoices & Billing**:
  - `GET /api/invoices` (Retrieve sales logs)
  - `POST /api/invoices` (Record POS invoice checkout)
  - `POST /api/invoices/:id/void` (Void invoice and restore inventory levels)
- **Purchase Logs**:
  - `GET /api/purchases` (Retrieve supplier invoices)
  - `POST /api/purchases` (Record supplier invoice stock intake)
- **Franchise CRM**:
  - `GET /api/franchises`
  - `POST /api/franchises`
  - `DELETE /api/franchises/:id`
  - `GET /api/franchise-supply-orders`
  - `POST /api/franchise-supply-orders`
- **Audit Logs & RBAC Settings**:
  - `GET /api/audit-logs` (Personal or global log history)
  - `GET /api/role-permissions` (Retrieve permissions matrices)
  - `POST /api/role-permissions` (Save permissions matrices)
- **Asset Uploads**:
  - `POST /api/upload/image` (Multer file storage and Sharp compression)

---

## 6. Existing Socket.IO Events
- **Incoming events**:
  - `JOIN_SESSION`: Client joins a pairing session room for mobile camera scanners.
  - `JOIN_SYNC`: Client joins global sync rooms (`sync_global` and `store_<storeId>`).
  - `USER_HEARTBEAT`: Tracks cashier status in active maps.
- **Outgoing / Broadcast events**:
  - `rbac_updated`: Emits permissions matrix updates to force-evict revoked clients immediately.
  - `PRODUCTS_UPDATED` / `invoice_updated` / `purchase_created` / `franchise_updated` / `franchise_order_created`: Triggers frontend data updates.

---

## 7. Existing RBAC Implementation
- Permission configuration is dynamic and retrieved from database matrices (`settings` collection).
- Toggles view list access permissions for roles: `admin`, `employee`, and `auditor`.
- **Super Admin Bypass**: Accounts with `category: "super admin"` bypass client-side checks and access restriction logic.
- **Backend Authorization**: Verified using token credentials extracted inside route handlers (e.g. `req.user.role === 'admin'`).

---

## 8. Existing Audit Implementation
- Structured logs record:
  - `performedBy` (Username)
  - `role` (Role Designation)
  - `action` (e.g., `create`, `update`, `delete`, `billing`)
  - `view` (Target module name)
  - `details` (Exact product names, prices, invoice codes, or user names altered)
  - `storeOutlet` (Associated branch outlet)
  - `timestamp` & `ip` (Server resolved metadata)
- Self-healing log migration (`migrateAuditLogs()`) runs automatically on startup to backfill structural fields for legacy logs.

---

## 9. Existing Product/Inventory Logic
- **Inventory Mapping**: Map stock levels inside `inventory` records matching unique compound indexes of `{ productId, storeId }`.
- **Stock adjustments**: Direct POS checkouts decrement target quantities, voided invoices increment values back, and supplier receipts increment quantities.
- **Loose Items Weighing Modals**: Allows gram/ml quantity scaling matching unit base prices (e.g., *Loose Fresh Cow Milk* using per-liter rates).

---

## 10. Existing Import Logic
- **Header normalization mapping**: Translates column names using aliases (`Name`, `Barcode`, `Qty`, `Cost`, `Purchase`, etc.) to support varying spreadsheet templates.
- **Deduplication Check**: Performs duplicate checks on incoming rows. Offers dynamic strategies in the import modal:
  - *Merge Stock*: Increments current database counts.
  - *Replace Details*: Overwrites all fields.
  - *Skip Duplicates*: Skips existing records.
- **Missing Barcode Autofill**: Generates unique `VC[Timestamp][Index]` tags for local brands without standard EAN codes.

---

## 11. Existing localStorage Usage
- `aiavro_jwt_token`: Active authenticated session token.
- `aiavro_role_permissions`: Stored RBAC permissions matrix.
- `aiavro_brand_config`: Cached branding configuration (logo, name, subtitle, active outlet code). Used for synchronous hydration on cold-start to eliminate layout flicker.
- `aiavro_sidebar_width`: User preferred layout widths.
- `aiavro_offline_queue`: Stored offline checkouts waiting for network recovery.

---

## 12. Existing Vercel Deployment Configuration
- Configured via [vercel.json](file:///Users/avanish/Documents/billing%20system/vercel.json) in the root.
- Routes path `/` to `/aiavro_billing_system.html` so it is served directly.

---

## 13. Existing VPS Deployment Configuration
- Managed using PM2 ecosystem configurations [ecosystem.config.js](file:///Users/avanish/Documents/billing%20system/ecosystem.config.js).
- Runs `server.js` from `/opt/vc-organic` at port 8181 under reverse-proxy routing via Nginx.

---

## 14. Existing Security Problems
1. **Fallback JWT Secret**: Uses a hardcoded string `vc_organic_master_jwt_secret_2026` if `process.env.JWT_SECRET` is missing.
2. **Open Socket.IO Connections**: Anyone can connect to Socket.IO and join channel sync lists without validating JWT credentials.
3. **Local Database Connection Fallback**: Falls back to local `mongodb://127.0.0.1:27017` if `MONGODB_URI` env is missing.
4. **Runtime Executable Run Blocks**: Runs automatic dependency verification engines executing `execSync('npm install ...')` at backend initialization.

---

## 15. Existing Performance Problems
1. **Full Database Sync Payload**: Frontend retrieves complete product catalogs, invoice datasets, and user listings into browser memory on startup. This will cause lag as records scale.
2. **CDN Reliance**: All major stylesheet libraries and scripts are fetched from external CDNs, impacting offline capabilities and load speeds.

---

## 16. Existing Technical Debt
1. **Monolithic Files**: Root `server.js` and `aiavro_billing_system.html` contain all logic, styles, and modules.
2. **Unused Workspaces**: Nested folders under `apps/frontend`, `apps/backend`, and `packages/` are currently stubs or boilerplates. The application relies entirely on root legacy configurations.
3. **Database-Level Deletions**: Deletion endpoints remove raw entries physically rather than flagging them with soft archive states.
