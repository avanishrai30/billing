# Inventory Architecture & Ledger Specifications (Stage 07)

This document specifies the authoritative Inventory Domain architecture, immutable movement ledger, atomic concurrency controls, and transaction rollback rules for the VC Organic ERP system.

---

## 1. Architectural Principles

1. **Inventory Balance is Authoritative**:
   - Real-time stock counts exist exclusively in the `inventory` collection.
   - `products.stock` and `products.store` are non-authoritative legacy aliases preserved only for backward compatibility with frontend template bindings.
2. **Canonical Location Identifier**:
   - `locationId` is the canonical identifier for all stock balances and ledger movements.
   - `locationType` supports `STORE` and `WAREHOUSE`.
   - `storeId` is maintained as a backward-compatible alias.
3. **Atomic Decrements (Zero Race Conditions)**:
   - Decrements use atomic MongoDB `$inc: { quantity: -N }` with a `$gte: N` filter.
   - No read-modify-write pattern is ever permitted for concurrent stock consumption.
4. **All-or-Nothing Basket Transactions**:
   - POS checkout (`consumeStockBatch`) processes multi-item baskets with rollback protection. If any product in the basket cannot be fulfilled, all preceding stock deductions are reverted, and the invoice creation is aborted.

---

## 2. Document Schemas

### A. Authoritative Balance Schema (`inventory`)
```typescript
interface InventoryRecord {
  _id?: ObjectId;
  productId: string;               // Reference to products.id
  locationId: string;              // Canonical location ID (e.g., 'store-banaswadi')
  storeId?: string;                // Legacy alias for locationId
  locationType: 'STORE' | 'WAREHOUSE'; // Facility type
  quantity: number;                // Current on-hand balance (authoritative)
  reservedQuantity: number;        // Future-proof placeholder (default: 0)
  reorderLevel: number;            // Alert threshold (default: 10)
  version: number;                 // Monotonic version counter
  updatedAt: string;               // ISO 8601 timestamp
}
```

### B. Immutable Movement Ledger Schema (`inventory_ledger`)
```typescript
interface InventoryLedgerRecord {
  _id?: ObjectId;
  movementId: string;              // Unique movement ID (e.g., 'mov-1723650000000-xyz')
  id?: string;                     // Legacy alias for movementId
  productId: string;               // Reference to products.id
  locationId: string;              // Canonical location identifier
  storeId?: string;                // Legacy alias for locationId
  locationType: 'STORE' | 'WAREHOUSE';
  type: 'OPENING' | 'PURCHASE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'SALE' | 'SALE_RETURN' | 'VOID' | 'ADJUSTMENT' | 'DAMAGE';
  quantity: number;                // Signed delta (+/- value)
  beforeQuantity: number;          // Stock before mutation
  afterQuantity: number;           // Stock after mutation
  unitCost?: number;               // Cost per unit at time of transaction
  totalValue?: number;             // Monetary value of movement (quantity * unitCost)
  referenceType: 'invoice' | 'purchase' | 'transfer' | 'manual_adjustment' | 'rollback';
  referenceId: string;             // External reference (Invoice #, Purchase #, Transfer #)
  performedBy: string;             // User/system identifier
  notes?: string;                  // Operational explanation
  createdAt: string;               // ISO 8601 timestamp
}
```

---

## 3. Concurrency & Transaction Strategy

### Atomic Stock Consumption
```javascript
// Atomically deduct stock ONLY IF sufficient quantity exists
const updateResult = await db.collection('inventory').findOneAndUpdate(
  {
    productId,
    $or: [{ locationId }, { storeId: locationId }],
    quantity: { $gte: requestedQuantity }
  },
  {
    $inc: { quantity: -requestedQuantity, version: 1 },
    $set: { updatedAt: new Date().toISOString() }
  },
  { returnDocument: 'after' }
);
```

### Compensating Rollback Writes Architecture & Failure Modes

Because standard self-hosted single-node MongoDB instances (`mongod` without replica sets) do not support multi-document ACID transactions (`session.withTransaction()`), `consumeStockBatch` and `addStockBatch` employ **Compensating Rollback Writes**:

1. **Pre-flight Availability**: `checkStockAvailability` pre-validates stock levels to prevent failed deductions.
2. **Item-level Atomic Increments**: Each item is decremented with atomic `$gte: requested` conditions.
3. **Compensating Rollback Execution**: If any item fails during batch processing:
   - All completed preceding item deductions are immediately credited back via compensating atomic writes (`type: 'VOID'`).
   - The invoice creation is aborted with HTTP `400` (`INSUFFICIENT_STOCK`).
4. **Zero Silent Failures**:
   - Every compensating write is tracked.
   - If any compensating write itself fails (e.g. database network disconnect midway through rollback), a high-severity `CRITICAL_ROLLBACK_FAILURE` audit event is logged with full item tracing, and the error object contains `err.rollbackStatus = { attempted, succeeded, failed, failures }`.
5. **Replica-Set Compatibility**: If MongoDB is upgraded to a replica set in the future, `session.withTransaction()` can wrap these calls seamlessly.

---

## 4. API Endpoints

| Endpoint | Method | Purpose | Auth |
| :--- | :--- | :--- | :--- |
| `/api/v1/inventory` | `GET` | Snapshot of active inventory balances (filterable by `storeId`, `productId`) | `verifyJWT` |
| `/api/v1/inventory/summary` | `GET` | Aggregated totals (`totalUnits`, `lowStockCount`, `outOfStockCount`, `inventoryValue`) | `verifyJWT` |
| `/api/v1/inventory/check-availability` | `POST` | Server-side validation of basket items before checkout | `verifyJWT` |
| `/api/v1/inventory/logs` | `GET` | Paginated immutable ledger movements (`limit`, `cursor`, `type`, `date`) | `verifyJWT` |
| `/api/v1/inventory/adjust` | `POST` | Manual stock adjustment with audit logging | `verifyJWT` |
| `/api/v1/inventory/transfer` | `POST` | Inter-store stock transfer (`TRANSFER_OUT` + `TRANSFER_IN`) | `verifyJWT` |

---

## 5. Database Indexes

| Collection | Index Key | Options | Purpose |
| :--- | :--- | :--- | :--- |
| `inventory` | `{ productId: 1, locationId: 1 }` | `{ unique: true, sparse: true }` | Single record per product per facility |
| `inventory` | `{ locationId: 1 }` | — | Fast store catalog lookups |
| `inventory_ledger` | `{ productId: 1, locationId: 1, createdAt: -1 }` | — | Product history timeline |
| `inventory_ledger` | `{ referenceType: 1, referenceId: 1 }` | — | Document audit tracing |

---

## 6. Audit & Real-time Integration
- **Audit Actions**: `STOCK_SALE`, `STOCK_PURCHASE`, `STOCK_TRANSFER`, `STOCK_ADJUSTMENT`, `STOCK_VOID`.
- **Real-time Event**: `inventory.updated` payload: `{ eventId, productId, locationId, storeId, quantity, version, timestamp }` emitted only **after** the database operation commits.
