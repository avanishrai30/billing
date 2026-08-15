# AIAVRO Billing OS — Realtime & Socket.IO Contracts Freeze

This document specifies the authoritative Socket.IO real-time event architecture, room partitioning, event envelopes, and client subscription policies.
**Rule:** No Socket.IO event names, rooms, or emission envelopes will be altered during frontend modernization.

---

## 1. Socket.IO Gateway & Authentication

### 1.1 Connection & Handshake Authentication
- **Gateway Setup:** [server.js:73-117](file:///Users/avanish/Documents/billing%20system/server.js#L73-L117)
- **Token Transport:** Handshake auth token (`socket.handshake.auth.token`) or handshake query (`socket.handshake.query.token`).
- **Token Verification:**
  - Decodes and validates JWT against `JWT_SECRET`.
  - Performs live MongoDB user verification (`db.collection('users').findOne({ id: decoded.id })`).
  - Verifies user is neither `suspended` nor `inactive`.
  - Verifies `dbUser.tokenVersion === decoded.tokenVersion`.
- **Rejection Errors:**
  - `AUTHENTICATION_REQUIRED`: Missing token or deleted user.
  - `INVALID_TOKEN`: Malformed or expired token signature.
  - `ACCOUNT_SUSPENDED`: User account deactivated.
  - `SESSION_REVOKED`: User changed password or admin revoked sessions.

### 1.2 User Socket Registry & Lifecycle
- `realtimeService.registerUserSocket(userId, socket)` tracks active client connections.
- On disconnect, `realtimeService.unregisterUserSocket(userId, socket.id)` cleans up the registry.
- When an account changes password or is deactivated, `realtimeService.revokeUserSockets(userId)` emits `SESSION_REVOKED` and forcibly disconnects all client sockets for that user.

---

## 2. Room Architecture & Subscription Security

| Room Name | Scope / Purpose | Access Rule | Allowed Realtime Events |
| :--- | :--- | :--- | :--- |
| `sync_global` | Enterprise-wide metadata | All authenticated clients | `business_updated`, `business_deleted`, `customer_updated`, `customer_deleted`, `supplier_updated`, `supplier_deleted`, `store_updated`, `store_deleted`, `product_updated`, `product_deleted`, `franchise_updated`, `franchise_deleted`, `franchise_order_created`, `rbac_updated`, `settings_updated` |
| `store_<storeId>` | Store Outlet Data | Super Admin OR user assigned to `storeId` | `inventory.updated`, `invoice_created`, `invoice_voided`, `purchase_created`, `purchase_deleted` |
| `<sessionId>` | Scanner Pairing | Clients holding active pairing session ID | `PRODUCT_ADDED`, `PRODUCT_NOT_FOUND` |

### Client-to-Server Events

#### `JOIN_SYNC`
- **Direction:** Client $\to$ Server
- **Payload:** `{ "storeId": "st-1" }`
- **Security:** Checks if `storeId` is authorized for the connecting user. If unauthorized, emits `AUTHORIZATION_DENIED` with `{ "code": "STORE_ACCESS_DENIED", "message": "Access denied to store room 'store_<storeId>'" }`.
- **Idempotency:** Re-joining an already joined room is safely ignored without duplicate listener bindings.

#### `JOIN_SESSION`
- **Direction:** Client (POS Desktop or Mobile Scanner) $\to$ Server
- **Payload:** `{ "sessionId": "WF-C1-9988" }`
- **Behavior:** Joins the mobile scanner room.

#### `USER_HEARTBEAT`
- **Direction:** Client $\to$ Server
- **Payload:** `{ "userId": "usr-1", "username": "admin", "storeId": "st-1" }`
- **Behavior:** Updates server-side `activePresences` map.

---

## 3. Server-to-Client Canonical Event Envelopes

All standard mutation events emitted via [services/realtimeService.js](file:///Users/avanish/Documents/billing%20system/services/realtimeService.js) adhere to the standard envelope format:

```ts
interface RealtimeEventEnvelope<T = Record<string, any>> {
  eventId: string;     // Unique event identifier (e.g. "evt-1786500-a1b2c3")
  entity: string;      // Domain entity name (e.g. "inventory", "invoice", "purchase", "product")
  action: string;      // Action verb ("updated", "created", "voided", "deleted")
  entityId: string;    // Authoritative entity ID
  locationId: string | null; // Scoped store location ID
  version: number;     // Monotonically increasing document version
  timestamp: string;   // ISO-8601 UTC timestamp
  data: T;             // Domain payload
}
```

### Event Catalog

#### 1. `inventory.updated`
- **Room:** `store_<locationId>`
- **Emitted By:** [services/inventoryService.js:122, 193](file:///Users/avanish/Documents/billing%20system/services/inventoryService.js#L122)
- **Payload Envelope:**
  ```json
  {
    "eventId": "evt-1786500123-x9y8z7",
    "entity": "inventory",
    "action": "updated",
    "entityId": "prod-1",
    "locationId": "st-1",
    "version": 5,
    "timestamp": "2026-08-16T05:00:00.000Z",
    "data": {
      "productId": "prod-1",
      "storeId": "st-1",
      "locationId": "st-1",
      "quantity": 145,
      "previousQuantity": 150,
      "version": 5
    }
  }
  ```

#### 2. `invoice_created`
- **Room:** `store_<locationId>`
- **Emitted By:** [modules/billing.js:264](file:///Users/avanish/Documents/billing%20system/modules/billing.js#L264)
- **Payload Envelope:**
  ```json
  {
    "eventId": "evt-1786500124-a1b2c3",
    "entity": "invoice",
    "action": "created",
    "entityId": "INV-2026-0089",
    "locationId": "st-1",
    "version": 1,
    "timestamp": "2026-08-16T05:00:00.000Z",
    "data": {
      "invoiceNumber": "INV-2026-0089",
      "grandTotal": 472.50,
      "customerName": "Ramesh Kumar"
    }
  }
  ```

#### 3. `invoice_voided`
- **Room:** `store_<locationId>`
- **Emitted By:** [modules/billing.js:385](file:///Users/avanish/Documents/billing%20system/modules/billing.js#L385)
- **Payload Envelope:** `{ "entity": "invoice", "action": "voided", "entityId": "INV-2026-0089", "locationId": "st-1", "data": { "invoiceId": "INV-2026-0089" } }`

#### 4. `purchase_created`
- **Room:** `store_<locationId>`
- **Emitted By:** [modules/purchases.js:216](file:///Users/avanish/Documents/billing%20system/modules/purchases.js#L216)
- **Payload Envelope:** `{ "entity": "purchase", "action": "created", "entityId": "PO-2026-0045", "locationId": "st-1", "data": { "purchaseNo": "PO-2026-0045", "grandTotal": 12600.00 } }`

#### 5. `purchase_deleted`
- **Room:** `store_<locationId>`
- **Emitted By:** [modules/purchases.js:326](file:///Users/avanish/Documents/billing%20system/modules/purchases.js#L326)
- **Payload Envelope:** `{ "entity": "purchase", "action": "deleted", "entityId": "PO-2026-0045", "locationId": "st-1", "data": { "purchaseId": "PO-2026-0045" } }`

#### 6. Metadata Events (`sync_global`)
- `product_updated` & `product_deleted` ([modules/products.js:398, 432](file:///Users/avanish/Documents/billing%20system/modules/products.js#L398))
- `business_updated` & `business_deleted` ([modules/businesses.js:85, 140](file:///Users/avanish/Documents/billing%20system/modules/businesses.js#L85))
- `customer_updated` & `customer_deleted` ([modules/customers.js:55, 98](file:///Users/avanish/Documents/billing%20system/modules/customers.js#L55))
- `supplier_updated` & `supplier_deleted` ([modules/suppliers.js:55, 98](file:///Users/avanish/Documents/billing%20system/modules/suppliers.js#L55))
- `store_updated` & `store_deleted` ([modules/stores.js:57, 100](file:///Users/avanish/Documents/billing%20system/modules/stores.js#L57))
- `rbac_updated` ([modules/settings.js:40](file:///Users/avanish/Documents/billing%20system/modules/settings.js#L40))
- `settings_updated` ([modules/settings.js:74](file:///Users/avanish/Documents/billing%20system/modules/settings.js#L74))

#### 7. Scanner Pairing Events (`<sessionId>`)
- `PRODUCT_ADDED`: `{ "product": { ... } }` ([modules/scanner.js:42](file:///Users/avanish/Documents/billing%20system/modules/scanner.js#L42))
- `PRODUCT_NOT_FOUND`: `{ "barcode": "89010309999" }` ([modules/scanner.js:45](file:///Users/avanish/Documents/billing%20system/modules/scanner.js#L45))

---

## 4. Frontend Query Invalidation Strategy

In the new frontend, incoming Socket.IO events MUST trigger targeted TanStack Query invalidation rather than full-page refreshes:

| Incoming Socket Event | TanStack Query Key Invalidated | Cache Update Policy |
| :--- | :--- | :--- |
| `inventory.updated` | `['inventory', locationId]`<br>`['inventory-summary', locationId]` | Optimistically patch stock balance using `event.data.quantity` |
| `invoice_created` | `['invoices', locationId]`<br>`['dashboard-metrics', locationId]` | Invalidate invoices query; refetch recent transactions |
| `invoice_voided` | `['invoices', locationId]`<br>`['inventory', locationId]` | Invalidate invoice status; trigger inventory cache refresh |
| `purchase_created` | `['purchases', locationId]`<br>`['inventory', locationId]` | Invalidate purchases list; update inventory |
| `purchase_deleted` | `['purchases', locationId]`<br>`['inventory', locationId]` | Invalidate purchases list; update inventory |
| `product_updated` | `['products']`<br>`['product', entityId]` | Invalidate product catalog queries |
| `rbac_updated` | `['role-permissions']` | Invalidate permissions matrix |
| `SESSION_REVOKED` | None (Auth boundary action) | Clear session and redirect to `/login` |
