# Stage 11: Realtime Architecture & Synchronization Guide

**Version:** 1.0 (Stage 11 Hardened)  
**Protocol:** Socket.IO v4.7.5 + REST Synchronous Fallback  
**Transport:** WebSocket (preferred) with HTTP Long-Polling fallback  

---

## 1. Overview & Core Philosophy

The billing system implements an **Advisory Realtime Architecture**. 

1. **REST is Authoritative:** All state mutations (billing checkout, purchases, inventory adjustments, user updates) are executed synchronously via REST endpoints.
2. **Realtime is Advisory:** Realtime WebSocket events notify connected clients of database changes for immediate, fluid UI updates without polling.
3. **Graceful Fallback:** If Socket.IO disconnects or is blocked by network firewalls, the entire application remains 100% operational through standard REST communication.

```mermaid
flowchart TD
    Client[Browser Client: aiavro_billing_system.html]
    REST[REST Endpoints /api/v1/*]
    DB[(MongoDB Database)]
    DomainSvc[Domain Services]
    IO[Socket.IO Server]
    StoreRoom[store_StoreId Room]
    GlobalRoom[sync_global Room]

    Client -->|1. Mutate State| REST
    REST -->|2. Authorize & Validate| DomainSvc
    DomainSvc -->|3. Atomic Persistence| DB
    DB -->>|4. Commit Success| DomainSvc
    DomainSvc -->|5. Dispatch Realtime Envelope| IO
    IO -->|Store Scoped| StoreRoom
    IO -->|Global Metadata| GlobalRoom
    StoreRoom -->|6. Advise UI| Client
    GlobalRoom -->|6. Advise UI| Client
```

---

## 2. Authentication & Session Revocation

### 2.1 Connection Handshake Validation (`server.js`)
All Socket.IO handshakes require a JWT passed via `socket.handshake.auth.token`.

During `io.use`:
1. The JWT cryptographic signature and expiration are verified against `JWT_SECRET`.
2. The user record is fetched from MongoDB `users` collection.
3. The server enforces:
   - User existence $\rightarrow$ Rejects with `AUTHENTICATION_REQUIRED`
   - Active status $\rightarrow$ Rejects suspended/inactive users with `ACCOUNT_SUSPENDED`
   - Matching `tokenVersion` $\rightarrow$ Rejects stale sessions with `SESSION_REVOKED`

### 2.2 Instant Active Socket Revocation (`services/realtimeService.js`)
When a user changes their password, an administrator updates credentials, or an account is deactivated:
1. `tokenVersion` is atomically incremented in MongoDB.
2. `realtimeService.revokeUserSockets(userId)` looks up all active socket connections for that user across all tabs/devices.
3. Each active socket receives a `SESSION_REVOKED` event and is immediately disconnected (`sock.disconnect(true)`).

---

## 3. Room Architecture & Store Isolation

| Room Name | Scope | Authorization Rule | Permitted Events |
|---|---|---|---|
| `store_<storeId>` | Store Outlet | Super Admin OR user whose `assignedStoreId` or `assignedStores` contains `<storeId>` | `inventory.updated`, `inventory.bulk_updated`, `invoice_created`, `invoice_voided`, `purchase_created`, `purchase_deleted` |
| `sync_global` | Global | All authenticated connections | `product_updated`, `product_deleted`, `products_imported`, `import_completed`, `customer_updated`, `customer_deleted`, `supplier_updated`, `supplier_deleted`, `business_updated`, `business_deleted`, `store_updated`, `store_deleted`, `user_updated`, `rbac_updated`, `settings_updated` |
| `<sessionId>` | Scanner Pairing | Ephemeral pairing token | `PRODUCT_ADDED`, `PRODUCT_NOT_FOUND` |

### Strict Multi-Tenant Store Isolation:
- `purchase_created` and `purchase_deleted` are **strictly scoped to `store_<storeId>`**. They are never broadcast to `sync_global`.
- Unauthorized attempts to join other store rooms via `JOIN_SYNC` are rejected with `AUTHORIZATION_DENIED`.

---

## 4. Standard Canonical Event Envelope

All realtime events emitted across domain services adhere to a canonical envelope structure:

```json
{
  "eventId": "evt-1786634500123-a8f9",
  "entity": "invoice",
  "action": "created",
  "entityId": "INV-10024",
  "locationId": "store-main",
  "version": 1,
  "timestamp": "2026-08-14T03:55:00.123Z",
  "data": {
    "invoiceNumber": "INV-10024",
    "id": "INV-10024",
    "grandTotal": 1450.00,
    "status": "PAID"
  }
}
```

### Event Fields:
- `eventId`: Unique, timestamped identifier used by clients for deduplication.
- `entity`: Domain entity name (`inventory`, `invoice`, `purchase`, `product`, `customer`, `user`).
- `action`: Mutation verb (`created`, `updated`, `voided`, `deleted`, `bulk_updated`, `archived`).
- `entityId`: Unique identifier of the subject entity.
- `locationId`: Store/location ID for store-scoped events (or `null` for global events).
- `version`: Monotonically increasing document version (preventing stale overwrites).
- `timestamp`: ISO-8601 creation timestamp.
- `data`: Minimal payload required by the client to update local views.

---

## 5. Bulk Import Event Storm Elimination

During Stage 09 intelligent bulk imports (which can import thousands of rows with opening stock):
1. Individual stock ledger additions in `inventoryService.addStockBatch` pass `skipRealtimeSocket: true`.
2. Discrete per-item socket emissions are suppressed.
3. Upon batch completion, a single **bounded summary event** is emitted to each affected store room:

```json
{
  "eventId": "evt-bulk-1786634599999",
  "entity": "inventory",
  "action": "bulk_updated",
  "entityId": "imp-1786634500",
  "locationId": "store-main",
  "version": 1,
  "timestamp": "2026-08-14T03:56:00.000Z",
  "data": {
    "importId": "imp-1786634500",
    "locationId": "store-main",
    "storeId": "store-main",
    "affectedCount": 1500
  }
}
```

The client handles `inventory.bulk_updated` by executing a targeted inventory fetch for the active store rather than receiving thousands of individual socket events.

---

## 6. Client Socket Lifecycle & Deduplication (`aiavro_billing_system.html`)

1. **Idempotent Socket Connection (`initSyncSocket`)**:
   - If an active socket exists with the current user's token, recreation is skipped.
   - If user token changes, previous socket listeners and connections are torn down cleanly before establishing a new socket.
2. **Bounded Event Deduplication (`recordAndCheckDuplicateEvent`)**:
   - A ring buffer / Set of recent `eventId`s (max 300) prevents processing duplicate messages in cases of network reconnects or multiple listeners.
3. **Explicit Logout Cleanup (`triggerLogout`)**:
   - `syncSocket.removeAllListeners()` and `syncSocket.disconnect()` are called on logout.
   - `desktopSocket` and `phoneSocket` are similarly terminated.

---

## 7. Verification & Test Suite

The realtime architecture is tested in `tests/realtime.test.js` covering 16 distinct scenarios:
1. Valid JWT authentication
2. Invalid signature rejection
3. `tokenVersion` mismatch rejection (`SESSION_REVOKED`)
4. Suspended user rejection (`ACCOUNT_SUSPENDED`)
5. Authorized store room join
6. Unauthorized store room block (`AUTHORIZATION_DENIED`)
7. Store-scoped purchase emission (zero `sync_global` leak)
8. Correct store room routing
9. Canonical invoice event contract
10. Canonical product event contract
11. Event deduplication via `eventId`
12. User socket tracking and active revocation
13. Inventory emission after DB commit
14. Bulk import storm suppression and batch summary emission
15. REST functionality resilience during Socket.IO downtime
16. Inter-store transfer source/destination isolation
