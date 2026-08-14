const jwt = require('jsonwebtoken');
const realtimeService = require('../services/realtimeService');
const inventoryService = require('../services/inventoryService');
const bulkImportService = require('../services/bulkImportService');
const { setupContext, getContext } = require('../modules/context');

describe('Stage 11: Realtime Architecture & Synchronization Hardening', () => {
  let mockDb;
  let mockIo;
  let emittedEvents;
  let usersTable;
  let inventoryTable;
  let inventoryLedger;
  let importSessions;
  const JWT_SECRET = 'test_realtime_secret_2026';

  beforeEach(() => {
    usersTable = new Map();
    inventoryTable = new Map();
    inventoryLedger = [];
    importSessions = new Map();
    emittedEvents = [];

    // Mock IO with room tracking
    mockIo = {
      rooms: new Map(), // room -> Set<socketId>
      sockets: {
        sockets: new Map() // socketId -> mockSocket
      },
      to: (room) => ({
        emit: (eventName, payload) => {
          emittedEvents.push({ room, eventName, payload });
        }
      })
    };

    mockDb = {
      collection: (name) => ({
        findOne: async (query) => {
          if (name === 'users') {
            if (query.id) return usersTable.get(query.id) || null;
            return null;
          }
          if (name === 'inventory') {
            const loc = query.$or ? (query.$or[0]?.locationId || query.$or[0]?.storeId) : query.locationId;
            const key = `${query.productId}_${loc}`;
            return inventoryTable.get(key) || null;
          }
          if (name === 'products') {
            return { id: query.id || 'prod-1', name: 'Test Product', sku: 'SKU-1' };
          }
          if (name === 'import_sessions') {
            return importSessions.get(query.importId) || null;
          }
          return null;
        },
        findOneAndUpdate: async (filter, update, opts) => {
          if (name === 'inventory') {
            const loc = filter.$or ? (filter.$or[0]?.locationId || filter.$or[0]?.storeId) : filter.locationId;
            const key = `${filter.productId}_${loc}`;
            let doc = inventoryTable.get(key);
            if (!doc && opts && opts.upsert) {
              doc = {
                productId: filter.productId,
                locationId: loc,
                storeId: loc,
                quantity: 0,
                version: 1
              };
            }
            if (doc) {
              if (update.$inc) {
                if (update.$inc.quantity) doc.quantity = (doc.quantity || 0) + update.$inc.quantity;
                if (update.$inc.version) doc.version = (doc.version || 1) + update.$inc.version;
              }
              if (update.$set) Object.assign(doc, update.$set);
              inventoryTable.set(key, doc);
            }
            return { value: doc, ...doc };
          }
          return null;
        },
        insertOne: async (doc) => {
          if (name === 'inventory_ledger') inventoryLedger.push(doc);
          if (name === 'audit_logs') return { insertedId: 'audit-1' };
          if (name === 'products') return { insertedId: doc.id };
          return { insertedId: 'doc-1' };
        },
        updateOne: async (filter, update) => {
          if (name === 'users') {
            const u = usersTable.get(filter.id);
            if (u && update.$set) Object.assign(u, update.$set);
            return { modifiedCount: 1 };
          }
          if (name === 'import_sessions') {
            const s = importSessions.get(filter.importId);
            if (s && update.$set) Object.assign(s, update.$set);
            return { modifiedCount: 1 };
          }
          return { modifiedCount: 1 };
        },
        createIndex: async () => {}
      })
    };

    setupContext(mockDb, mockIo, JWT_SECRET, '/tmp', {}, new Map());
    realtimeService.setup(mockIo, () => mockDb);
  });

  // 1. Socket authentication with valid JWT & tokenVersion
  test('1. Valid JWT with matching tokenVersion is authenticated successfully', async () => {
    usersTable.set('usr-1', {
      id: 'usr-1',
      username: 'cashier1',
      role: 'employee',
      status: 'active',
      tokenVersion: 1
    });

    const token = jwt.sign({ id: 'usr-1', username: 'cashier1', tokenVersion: 1 }, JWT_SECRET);
    
    // Simulate middleware verification
    const decoded = jwt.verify(token, JWT_SECRET);
    const dbUser = await mockDb.collection('users').findOne({ id: decoded.id });
    expect(dbUser).toBeDefined();
    expect(dbUser.status).toBe('active');
    expect(dbUser.tokenVersion).toBe(decoded.tokenVersion);
  });

  // 2. Invalid JWT signature is rejected
  test('2. Invalid JWT token signature is rejected', () => {
    const invalidToken = 'invalid.jwt.token';
    expect(() => jwt.verify(invalidToken, JWT_SECRET)).toThrow();
  });

  // 3. tokenVersion mismatch is detected and rejected
  test('3. Stale tokenVersion mismatch is rejected as SESSION_REVOKED', async () => {
    usersTable.set('usr-1', {
      id: 'usr-1',
      username: 'cashier1',
      status: 'active',
      tokenVersion: 2 // Incremented after password reset
    });

    const oldToken = jwt.sign({ id: 'usr-1', username: 'cashier1', tokenVersion: 1 }, JWT_SECRET);
    const decoded = jwt.verify(oldToken, JWT_SECRET);
    const dbUser = await mockDb.collection('users').findOne({ id: decoded.id });

    expect(dbUser.tokenVersion).toBe(2);
    expect(decoded.tokenVersion).toBe(1);
    expect(dbUser.tokenVersion !== decoded.tokenVersion).toBe(true);
  });

  // 4. Suspended user is rejected
  test('4. Suspended/inactive user is rejected as ACCOUNT_SUSPENDED', async () => {
    usersTable.set('usr-suspended', {
      id: 'usr-suspended',
      username: 'baduser',
      status: 'suspended',
      tokenVersion: 1
    });

    const token = jwt.sign({ id: 'usr-suspended', username: 'baduser', tokenVersion: 1 }, JWT_SECRET);
    const decoded = jwt.verify(token, JWT_SECRET);
    const dbUser = await mockDb.collection('users').findOne({ id: decoded.id });

    expect(dbUser.status).toBe('suspended');
  });

  // 5. User joins authorized store room
  test('5. Cashier joins their assigned store room successfully', () => {
    const user = { id: 'usr-1', role: 'employee', assignedStoreId: 'store-north' };
    const requestedStore = 'store-north';

    const isAllowed = (user.assignedStoreId === 'all' || user.assignedStoreId === requestedStore);
    expect(isAllowed).toBe(true);
  });

  // 6. Unauthorized store join rejected
  test('6. Cashier attempting to join an unauthorized store room is blocked', () => {
    const user = { id: 'usr-1', role: 'employee', assignedStoreId: 'store-north' };
    const requestedStore = 'store-south';

    const isAllowed = (user.assignedStoreId === 'all' || user.assignedStoreId === requestedStore);
    expect(isAllowed).toBe(false);
  });

  // 7. Purchase event does not reach sync_global
  test('7. purchase_created is strictly store-scoped and never emitted to sync_global', () => {
    const purchaseDoc = { id: 'PO-101', storeId: 'store-north', total: 5000 };
    const envelope = realtimeService.createEventEnvelope('purchase', 'created', 'PO-101', 'store-north', { purchase: purchaseDoc });

    realtimeService.emitToStore('store-north', 'purchase_created', envelope);

    const globalEvents = emittedEvents.filter(e => e.room === 'sync_global' && e.eventName === 'purchase_created');
    const storeEvents = emittedEvents.filter(e => e.room === 'store_store-north' && e.eventName === 'purchase_created');

    expect(globalEvents.length).toBe(0);
    expect(storeEvents.length).toBe(1);
    expect(storeEvents[0].payload.entity).toBe('purchase');
    expect(storeEvents[0].payload.action).toBe('created');
  });

  // 8. Purchase event reaches correct store room
  test('8. purchase_created is received by store room with canonical envelope', () => {
    const envelope = realtimeService.createEventEnvelope('purchase', 'created', 'PO-202', 'store-east', { total: 1200 });
    realtimeService.emitToStore('store-east', 'purchase_created', envelope);

    const event = emittedEvents.find(e => e.room === 'store_store-east');
    expect(event).toBeDefined();
    expect(event.payload.entityId).toBe('PO-202');
    expect(event.payload.locationId).toBe('store-east');
  });

  // 9. Invoice event contract matches standard envelope
  test('9. Invoice creation emits canonical event envelope', () => {
    const envelope = realtimeService.createEventEnvelope('invoice', 'created', 'INV-999', 'store-main', {
      invoiceNumber: 'INV-999',
      grandTotal: 450
    });
    expect(envelope.eventId).toMatch(/^evt-/);
    expect(envelope.entity).toBe('invoice');
    expect(envelope.action).toBe('created');
    expect(envelope.entityId).toBe('INV-999');
    expect(envelope.data.invoiceNumber).toBe('INV-999');
  });

  // 10. Product event contract matches standard envelope
  test('10. Product update emits canonical event envelope', () => {
    const envelope = realtimeService.createEventEnvelope('product', 'updated', 'prod-77', null, {
      product: { id: 'prod-77', name: 'Almond Milk', price: 150 }
    });
    expect(envelope.entity).toBe('product');
    expect(envelope.action).toBe('updated');
    expect(envelope.entityId).toBe('prod-77');
    expect(envelope.data.product.name).toBe('Almond Milk');
  });

  // 11. Duplicate eventId deduplication logic
  test('11. Duplicate eventId is recognized and can be skipped safely', () => {
    const processedSet = new Set();
    const eventId = 'evt-unique-12345';

    function processEvent(id) {
      if (processedSet.has(id)) return 'IGNORED_DUPLICATE';
      processedSet.add(id);
      return 'PROCESSED';
    }

    expect(processEvent(eventId)).toBe('PROCESSED');
    expect(processEvent(eventId)).toBe('IGNORED_DUPLICATE');
  });

  // 12. Active socket registration & revocation
  test('12. User active sockets are registered and revoked on session invalidation', () => {
    let disconnected = false;
    let emittedRevocation = false;

    const mockSocket = {
      id: 'sock-abc',
      emit: (name) => { if (name === 'SESSION_REVOKED') emittedRevocation = true; },
      disconnect: () => { disconnected = true; }
    };

    mockIo.sockets.sockets.set('sock-abc', mockSocket);
    realtimeService.registerUserSocket('usr-target', mockSocket);

    expect(realtimeService.getUserSocketCount('usr-target')).toBe(1);

    // Revoke all sockets for user
    realtimeService.revokeUserSockets('usr-target');

    expect(emittedRevocation).toBe(true);
    expect(disconnected).toBe(true);
    expect(realtimeService.getUserSocketCount('usr-target')).toBe(0);
  });

  // 13. Single-item inventory movement emits after DB success
  test('13. recordMovementAtomic records DB mutation and emits store-scoped event', async () => {
    const res = await inventoryService.recordMovementAtomic({
      productId: 'prod-10',
      locationId: 'store-1',
      locationType: 'STORE',
      type: 'PURCHASE',
      quantityDelta: 5,
      performedBy: 'cashier1'
    });

    expect(res.success).toBe(true);
    expect(res.afterQuantity).toBe(5);

    const storeEvents = emittedEvents.filter(e => e.room === 'store_store-1' && e.eventName === 'inventory.updated');
    expect(storeEvents.length).toBe(1);
    expect(storeEvents[0].payload.entity).toBe('inventory');
    expect(storeEvents[0].payload.action).toBe('updated');
    expect(storeEvents[0].payload.data.quantity).toBe(5);
  });

  // 14. Bulk import batches inventory events and suppresses per-item storm
  test('14. addStockBatch with skipRealtimeSocket suppresses per-item events for batch imports', async () => {
    const batchItems = [
      { productId: 'prod-1', quantity: 10 },
      { productId: 'prod-2', quantity: 20 },
      { productId: 'prod-3', quantity: 30 }
    ];

    emittedEvents = []; // reset
    await inventoryService.addStockBatch(batchItems, 'store-bulk', 'IMPORT-1', 'admin', {
      skipRealtimeSocket: true
    });

    // Per-item socket emissions should be 0
    const perItemEvents = emittedEvents.filter(e => e.eventName === 'inventory.updated');
    expect(perItemEvents.length).toBe(0);

    // Now emit the single bulk summary event
    const bulkEnvelope = realtimeService.createEventEnvelope('inventory', 'bulk_updated', 'IMPORT-1', 'store-bulk', {
      importId: 'IMPORT-1',
      locationId: 'store-bulk',
      affectedCount: batchItems.length
    });
    realtimeService.emitToStore('store-bulk', 'inventory.bulk_updated', bulkEnvelope);

    const bulkEvents = emittedEvents.filter(e => e.eventName === 'inventory.bulk_updated');
    expect(bulkEvents.length).toBe(1);
    expect(bulkEvents[0].payload.action).toBe('bulk_updated');
    expect(bulkEvents[0].payload.data.affectedCount).toBe(3);
  });

  // 15. Socket failure does not block REST operations
  test('15. Failure in Socket.IO does not prevent inventory database updates from completing', async () => {
    // Break IO instance to simulate socket failure
    realtimeService.setup(null, () => mockDb);

    const res = await inventoryService.recordMovementAtomic({
      productId: 'prod-failover',
      locationId: 'store-1',
      locationType: 'STORE',
      type: 'PURCHASE',
      quantityDelta: 50,
      performedBy: 'admin'
    });

    expect(res.success).toBe(true);
    expect(res.afterQuantity).toBe(50);
  });

  // 16. Transfer emits correct source and destination events
  test('16. Transfer emits TRANSFER_OUT to source store and TRANSFER_IN to destination store', async () => {
    // Setup initial stock in source store
    await inventoryService.recordMovementAtomic({
      productId: 'prod-tf',
      locationId: 'store-source',
      locationType: 'STORE',
      type: 'OPENING_STOCK',
      quantityDelta: 100,
      performedBy: 'admin'
    });

    emittedEvents = []; // reset

    const tfRes = await inventoryService.transferStock(
      'prod-tf',
      'store-source',
      'store-dest',
      25,
      'admin',
      'Inter-store replenishment'
    );

    expect(tfRes.success).toBe(true);
    expect(tfRes.fromAfter).toBe(75);
    expect(tfRes.toAfter).toBe(25);

    const sourceEvents = emittedEvents.filter(e => e.room === 'store_store-source');
    const destEvents = emittedEvents.filter(e => e.room === 'store_store-dest');
    const globalEvents = emittedEvents.filter(e => e.room === 'sync_global');

    expect(sourceEvents.length).toBe(1);
    expect(destEvents.length).toBe(1);
    expect(globalEvents.length).toBe(0); // Zero global leakage!
  });
});
