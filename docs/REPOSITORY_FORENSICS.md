# AIAVRO Billing OS — Repository & Runtime Forensics

## 1. System Architecture & Entry Points

### 1.1 Backend Runtime
- **Primary Process Entry Point:** [server.js](file:///Users/avanish/Documents/billing%20system/server.js)
- **Runtime Environment:** Node.js (CommonJS modules), Express 4.18+, HTTP server with Socket.IO 4.7+.
- **Default Port:** `process.env.PORT || 8181`
- **Reverse Proxy Trust:** `app.set('trust proxy', 1)` enabled.
- **Process Health Endpoint:** `GET /health` returns `{ status: "healthy"|"unhealthy", database: "connected"|"disconnected", uptime: "<seconds>s" }`.

### 1.2 Global Context & Initialization Pipeline
1. `server.js` boots HTTP listener and attaches Socket.IO.
2. `initDB()` connects to MongoDB via `process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vc_organic'`.
3. `setupContext(db, io, JWT_SECRET, UPLOAD_ROOT, UPLOAD_SUBDIRS, activePresences)` in [modules/context.js](file:///Users/avanish/Documents/billing%20system/modules/context.js) injects database and socket handles to all downstream routers.
4. `realtimeService.setup(io, () => db)` in [services/realtimeService.js](file:///Users/avanish/Documents/billing%20system/services/realtimeService.js) initializes the centralized real-time event dispatcher.
5. `databaseIndexService.syncIndexes(db)` in [services/databaseIndexService.js](file:///Users/avanish/Documents/billing%20system/services/databaseIndexService.js) verifies and registers all required database indexes without modifying data.
6. All modular Express routers mounted under `/api/v1/*`.

### 1.3 HTTP Middleware Stack
- **Security Headers:** `helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false, crossOriginEmbedderPolicy: false })` in `server.js:227-231`.
- **CORS Whitelist:** Whitelists `https://billing.vcorganics.com`, `https://vcorganics.com`, `https://www.vcorganics.com`, `*.vcorganics.com`, `*.vercel.app`, `http://localhost:*`, `http://127.0.0.1:*`.
- **Allowed Headers:** `Content-Type`, `Authorization`, `X-Requested-With`, `Accept`, `X-Request-Id`, `x-request-id`.
- **JSON Body Parser:** `express.json({ limit: '15mb' })`.
- **Rate Limiters:**
  - `authLimiter`: 150 requests per 15 minutes on `/api/v1/auth/*` (`server.js:273-278`).
  - `uploadLimiter`: 100 requests per 15 minutes on `/api/upload` and `/api/v1/upload` (`server.js:280-285`).
- **Static Asset Serving:**
  - `/uploads` $\to$ `process.env.UPLOAD_PATH` or `/opt/vc-organics/uploads` or `./uploads` with `max-age=31536000`.
  - `/frontend-api` $\to$ `./frontend-api`.
  - `/ui` $\to$ `./ui`.
  - `/` $\to$ [aiavro_billing_system.html](file:///Users/avanish/Documents/billing%20system/aiavro_billing_system.html).

---

## 2. Mounted Routers & Module Breakdown

| URL Mount Path | Router File | Primary Responsibility | Backing Collections |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth` | [modules/auth.js](file:///Users/avanish/Documents/billing%20system/modules/auth.js) | Authentication, token verification, logout, password change | `users`, `audit_logs` |
| `/api/v1/users` | [modules/users.js](file:///Users/avanish/Documents/billing%20system/modules/users.js) | User management, profile updates, avatar upload, presences | `users`, `audit_logs` |
| `/api/v1/products` | [modules/products.js](file:///Users/avanish/Documents/billing%20system/modules/products.js) | Product master, variant barcodes, search, bulk import pipeline | `products`, `product_barcodes`, `product_images`, `audit_logs` |
| `/api/v1/inventory` | [modules/inventory.js](file:///Users/avanish/Documents/billing%20system/modules/inventory.js) | Authoritative stock balances, manual adjustments, inter-store transfers, ledger logs | `inventory`, `inventory_ledger`, `audit_logs` |
| `/api/v1/invoices` | [modules/billing.js](file:///Users/avanish/Documents/billing%20system/modules/billing.js) | POS checkout, invoice listing, voiding & stock reversal, PDF generation | `invoices`, `inventory`, `inventory_ledger`, `audit_logs` |
| `/api/v1/purchases` | [modules/purchases.js](file:///Users/avanish/Documents/billing%20system/modules/purchases.js) | Supplier procurement entry, purchase listing, voiding & stock reversal | `purchases`, `inventory`, `inventory_ledger`, `audit_logs` |
| `/api/v1/dashboard` | [modules/dashboard.js](file:///Users/avanish/Documents/billing%20system/modules/dashboard.js) | Server-side aggregated financial metrics, asset valuations, low stock & sales lists | `invoices`, `products`, `purchases`, `franchise_supply_orders` |
| `/api/v1/businesses` | [modules/businesses.js](file:///Users/avanish/Documents/billing%20system/modules/businesses.js) | Business profiles, enterprise metadata, synchronized store profiles | `businesses`, `stores`, `audit_logs` |
| `/api/v1/stores` | [modules/stores.js](file:///Users/avanish/Documents/billing%20system/modules/stores.js) | Outlet location directory and store metadata | `stores`, `audit_logs` |
| `/api/v1/customers` | [modules/customers.js](file:///Users/avanish/Documents/billing%20system/modules/customers.js) | Customer CRM registry and contact management | `customers`, `audit_logs` |
| `/api/v1/suppliers` | [modules/suppliers.js](file:///Users/avanish/Documents/billing%20system/modules/suppliers.js) | Supplier and vendor contact management | `suppliers`, `audit_logs` |
| `/api/v1/audit-logs` | [modules/audit.js](file:///Users/avanish/Documents/billing%20system/modules/audit.js) | Immutable security and operational audit trail | `audit_logs` |
| `/api/v1/franchises`<br>`/api/v1/franchise-supply-orders` | [modules/franchise.js](file:///Users/avanish/Documents/billing%20system/modules/franchise.js) | Franchise partner registry and supply chain orders | `franchises`, `franchise_supply_orders`, `audit_logs` |
| `/api/v1/role-permissions`<br>`/api/v1/public/settings`<br>`/api/v1/settings` | [modules/settings.js](file:///Users/avanish/Documents/billing%20system/modules/settings.js) | RBAC permissions matrix and portal branding settings | `role_permissions`, `settings`, `audit_logs` |
| `/api/v1/server-info` | [modules/system.js](file:///Users/avanish/Documents/billing%20system/modules/system.js) | Local IPv4 address and gateway port discovery | None (OS network interfaces) |
| `/api/v1/scan` & `/api/scan` | [modules/scanner.js](file:///Users/avanish/Documents/billing%20system/modules/scanner.js) | Barcode scanner lookup and live pairing bridge | `products`, `product_barcodes` |
| `/api/v1/upload` & `/api/upload` | [modules/upload.js](file:///Users/avanish/Documents/billing%20system/modules/upload.js) | Base64 media upload and Sharp WebP compression pipeline | `product_images`, local filesystem |

---

## 3. Frontend API Client (`frontend-api/*.js`)

The legacy single-page application and modern frontend rely on thin client wrappers loaded under the `window.api` namespace:

1. **[frontend-api/client.js](file:///Users/avanish/Documents/billing%20system/frontend-api/client.js):**
   - Core `request(url, options)` transport wrapper.
   - Computes `getApiBaseUrl()` via `resolveBackendUrl()`.
   - Attaches `Authorization: Bearer <aiavro_jwt_token>` and `X-Request-ID`.
   - Normalizes non-2xx responses into structured Error objects (`err.code`, `err.status`, `err.data`).
   - Automatically handles session expiration on `401 Unauthorized` for authenticated requests.
2. **Domain Clients:**
   - `window.api.auth` in [frontend-api/auth.js](file:///Users/avanish/Documents/billing%20system/frontend-api/auth.js)
   - `window.api.users` in [frontend-api/users.js](file:///Users/avanish/Documents/billing%20system/frontend-api/users.js)
   - `window.api.products` in [frontend-api/products.js](file:///Users/avanish/Documents/billing%20system/frontend-api/products.js)
   - `window.api.inventory` in [frontend-api/inventory.js](file:///Users/avanish/Documents/billing%20system/frontend-api/inventory.js)
   - `window.api.invoices` in [frontend-api/invoices.js](file:///Users/avanish/Documents/billing%20system/frontend-api/invoices.js)
   - `window.api.purchases` in [frontend-api/purchases.js](file:///Users/avanish/Documents/billing%20system/frontend-api/purchases.js)
   - `window.api.dashboard` in [frontend-api/dashboard.js](file:///Users/avanish/Documents/billing%20system/frontend-api/dashboard.js)
   - `window.api.businesses` in [frontend-api/businesses.js](file:///Users/avanish/Documents/billing%20system/frontend-api/businesses.js)
   - `window.api.stores` in [frontend-api/stores.js](file:///Users/avanish/Documents/billing%20system/frontend-api/stores.js)
   - `window.api.customers` in [frontend-api/customers.js](file:///Users/avanish/Documents/billing%20system/frontend-api/customers.js)
   - `window.api.suppliers` in [frontend-api/suppliers.js](file:///Users/avanish/Documents/billing%20system/frontend-api/suppliers.js)
   - `window.api.franchise` in [frontend-api/franchise.js](file:///Users/avanish/Documents/billing%20system/frontend-api/franchise.js)
   - `window.api.settings` in [frontend-api/settings.js](file:///Users/avanish/Documents/billing%20system/frontend-api/settings.js)
   - `window.api.scanner` in [frontend-api/scanner.js](file:///Users/avanish/Documents/billing%20system/frontend-api/scanner.js)
   - `window.api.audit` in [frontend-api/audit.js](file:///Users/avanish/Documents/billing%20system/frontend-api/audit.js)
   - `window.api.brands` in [frontend-api/brands.js](file:///Users/avanish/Documents/billing%20system/frontend-api/brands.js)
   - `window.api.categories` in [frontend-api/categories.js](file:///Users/avanish/Documents/billing%20system/frontend-api/categories.js)

---

## 4. Legacy Frontend Hazards & Anti-Patterns to Eliminate

Forensic audit of [aiavro_billing_system.html](file:///Users/avanish/Documents/billing%20system/aiavro_billing_system.html) revealed severe structural anti-patterns that MUST NOT be carried into the new Next.js application:

1. **Global Unbounded REST Fetch Loop (`syncStateWithServer`)**:
   - The legacy HTML executed 14 un-paginated parallel API calls (`Promise.all`) on page loads, view changes, and checkouts, downloading tens of megabytes of redundant JSON.
   - *Modern Solution:* TanStack Query hooks fetching only the active view's data with standard cursor/page pagination.
2. **Destructive DOM Re-rendering (`innerHTML = ...`)**:
   - The monolithic HTML wiped and recreated complete table and card DOM trees on every state change or keystroke, breaking focus and causing layout flicker.
   - *Modern Solution:* React component trees with deterministic virtual DOM diffing and stable keys.
3. **In-Memory Non-Authoritative Stock & Financial Recalculation**:
   - Legacy frontend attempted to calculate enterprise totals and product stock balances on client state arrays instead of consuming backend aggregations.
   - *Modern Solution:* Authoritative consumption of `/api/v1/dashboard/metrics` and `/api/v1/inventory/summary`.
4. **Scattered `localStorage` State & Stale Overrides**:
   - Legacy code read from multiple ad-hoc keys (`aiavro_user`, `aiavro_logged_in_user`, `aiavro_active_biz_id`, `aiavro_active_biz_name`).
   - *Modern Solution:* Centralized Zustand store for client session state with strict hydration guards.
5. **Lack of Centralized Error Boundaries**:
   - Exceptions in individual UI widgets (e.g. SVG chart rendering) could abort the entire application lifecycle.
   - *Modern Solution:* React Error Boundaries on each route layout and widget.
