# Architecture Audit - VC Organic ERP V3

This document presents a complete audit of the codebase, detailing configurations, databases, routes, security mechanisms, and outstanding technical debt under the 16 checklist specifications.

---

## 1. Current Architecture
The system is built as a client-server web application:
- **Frontend**: A single large HTML file `aiavro_billing_system.html` containing CSS, HTML structures, and Vanilla JavaScript. It communicates with the backend via REST endpoints and Socket.IO real-time channels.
- **Backend**: Node.js and Express server structured with versioned endpoints (`/api/v1/...`) and modular sub-routers located in the `modules/` directory, backed by a MongoDB database.
- **Realtime**: Socket.IO handles event broadcasts and pairing scanner connections.

---

## 2. Current Frontend Architecture
- **Location**: [`aiavro_billing_system.html`](file:///Users/avanish/Documents/billing%20system/aiavro_billing_system.html)
- **Framework & Libraries**: Pure Single Page Application (SPA) written in raw HTML5, Vanilla CSS, and JavaScript.
- **State Management**: Managed locally in a global `state` object. Toggling views changes CSS `.active` classes on sections.
- **Branding**: Sync bootstrap reads cached logo, name, and subtitle from `localStorage` to avoid flash of default templates on initial cold-starts.
- **API Access Layer**: Calls the central `api` namespace client module, normalizing list query results into flat arrays.

---

## 3. Current Backend Architecture
- **Location**: [`server.js`](file:///Users/avanish/Documents/billing%20system/server.js) (app listener entry point) and [`modules/`](file:///Users/avanish/Documents/billing%20system/modules) (domain routing components).
- **Framework**: Express application integrated with HTTP server and Socket.IO listener.
- **Sub-routers**: Decoupled from the root context and mounted as middlewares under `/api/v1/`:
  - `auth` -> [`modules/auth.js`](file:///Users/avanish/Documents/billing%20system/modules/auth.js)
  - `users` -> [`modules/users.js`](file:///Users/avanish/Documents/billing%20system/modules/users.js)
  - `products` -> [`modules/products.js`](file:///Users/avanish/Documents/billing%20system/modules/products.js)
  - `inventory` -> [`modules/inventory.js`](file:///Users/avanish/Documents/billing%20system/modules/inventory.js)
  - `purchases` -> [`modules/purchases.js`](file:///Users/avanish/Documents/billing%20system/modules/purchases.js)
  - `billing` -> [`modules/billing.js`](file:///Users/avanish/Documents/billing%20system/modules/billing.js)
  - `franchise` -> [`modules/franchise.js`](file:///Users/avanish/Documents/billing%20system/modules/franchise.js)
  - `audit` -> [`modules/audit.js`](file:///Users/avanish/Documents/billing%20system/modules/audit.js)
  - `settings` -> [`modules/settings.js`](file:///Users/avanish/Documents/billing%20system/modules/settings.js)
  - `context` -> [`modules/context.js`](file:///Users/avanish/Documents/billing%20system/modules/context.js) (holds Shared MongoDB Context, JWT auth, schema checkers)

---

## 4. Current MongoDB Collections
- `users`: Credentials, hashed passwords, active designations, and store outlets.
- `stores`: Registries for active retail outlets.
- `businesses`: Tenant profile configurations (name, subtitle, GSTIN, bank info).
- `products`: Master product catalog.
- `product_images`: Multi-path image references.
- `customers`: Client CRM details.
- `suppliers`: Supplier directory.
- `inventory`: Stock balances indexed by compound keys `{ productId, storeId }`.
- `invoices`: Sales records and checks.
- `purchases`: Supplier stock receipts.
- `franchises`: Partner parameters.
- `franchise_supply_orders`: Warehouse dispatch orders.
- `audit_logs`: Activity log entries.
- `role_permissions`: Roles and matrix configurations (stored under `{ key: "matrix" }`).
- `settings`: System configurations (specifically landing logo/titles).

---

## 5. Current API Routes
See [`docs/CURRENT_API_MAP.md`](file:///Users/avanish/Documents/billing%20system/docs/CURRENT_API_MAP.md) for full endpoint schemas. All REST routes are prefix-versioned under `/api/v1`.

---

## 6. Current Socket.IO Events
- **Client to Server**:
  - `JOIN_SESSION`: Joins active scanner socket room.
  - `JOIN_SYNC`: Joins general global updates room (`sync_global`) or store room (`store_<storeId>`).
  - `USER_HEARTBEAT`: Dispatches heartbeat signals for cashier map.
- **Server to Client (Broadcast)**:
  - `rbac_updated`: Evicts users instantly if dynamic permissions change.
  - `settings_updated`: Synchronizes branding layout.
  - `products_updated` / `product.updated`: Triggers catalog refreshes.
  - `invoice_created` / `invoice.created`: Updates billing tables.

---

## 7. Current RBAC
- Dynamic matrix configuration is fetched from `role_permissions` under `{ key: "matrix" }`.
- Enforces view restrictions for roles: `admin`, `employee`, and `auditor`.
- **Super Admin Bypass**: Accounts configured with `category: "super admin"` bypass frontend checks and are allowed global access.

---

## 8. Current Audit System
- Logs track `performedBy` (username), `role`, `action` (e.g. `billing`, `inventory_updated`), `view` (target module), `details` (human-readable mutations), `storeOutlet`, `timestamp`, and client `ip`.
- Self-healing migrations run automatically on startup to normalize legacy structure fields.

---

## 9. Current Inventory Model
- Quantity metrics are tracked per store inside the compound-indexed `inventory` collection.
- Real-time stock levels are synchronized during checkout, voids, and purchase entry.
- Dynamic decimal calculations handle weight-based/volume-based loose items (grams, milliliters, etc.) matching rate structures (per kg, per L).

---

## 10. Current Product Model
- Single entry per product containing fields: `sku` (primary barcode), `barcode`, `name`, `category`, `brand`, `supplier`, `costPrice`, `sellingPrice`, `gst`, `unit`, `weightUnit`, `sellingMode` (loose vs packaged), and `barcodes` (nested array of variant alternate barcodes).

---

## 11. Current Deployment Flow
- **Frontend**: Configured in root [`vercel.json`](file:///Users/avanish/Documents/billing%20system/vercel.json) to serve `aiavro_billing_system.html` directly at `/`.
- **Backend**: Ecosystem configured in root [`ecosystem.config.js`](file:///Users/avanish/Documents/billing%20system/ecosystem.config.js) to run via PM2 on port 8181 under reverse-proxy routing via Nginx on the VPS.

---

## 12. Architecture Pieces That Already Exist
- Decoupled Express versioned routers (`/api/v1/...`).
- Compound-indexed per-store inventory allocation collection (`inventory` model).
- Defensive client-side normalizations mapping list collections to arrays (`state.products = [...]`).
- Synchronous hydration checks in IIFE to prevent branding flicker.
- Granular event mappings supporting dot-notation real-time broadcasts.

---

## 13. Architecture Pieces That Are Incomplete
- **Inventory Ledger**: Real-time sales checkouts directly update inventory quantities without logging transactional ledger changes under `inventory_ledger`.
- **Cross-Domain Mutation**: POS invoices and Purchase receipts mutate `inventory` counts directly instead of calling a centralized Inventory Service.

---

## 14. Architecture Pieces That Are Missing
- **Aggregation APIs**: POS dashboard charts download the complete historical dataset of invoices and purchases into client memory instead of requesting summarized aggregations from the backend.
- **Soft Deletion Flags**: Deleting items removes them physically from MongoDB rather than setting soft archive flags.

---

## 15. Conflicts Between Current & Target Architecture
- POS checkouts mutate inventory collections directly rather than passing through a dedicated backend Inventory Ledger Service.
- The dashboard is not optimized; it queries all database entries to build metrics locally in client memory.

---

## 16. Existing Functionality That Must Not Be Lost
- Dynamic weight-based pricing calculator (g/ml preset configurations).
- Invoices void/refund flow (must accurately restore inventory).
- Bulk spreadsheet importer (aliases, mapping header normalizations, duplicate merge strategies).
- Offline-fallback billing queue (`aiavro_offline_queue`).
- Socket.IO pairing scanner controller for mobile scanning terminals.
