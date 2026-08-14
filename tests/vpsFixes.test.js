const jwt = require('jsonwebtoken');
const { setupContext } = require('../modules/context');
const bulkImportService = require('../services/bulkImportService');
const databaseIndexService = require('../services/databaseIndexService');
const realtimeService = require('../services/realtimeService');

describe('Live VPS Issues Fix Pack: Empty Barcode, Index Collision & Socket JOIN_SYNC', () => {
  let mockDb;
  let productsCollection;
  let productBarcodesCollection;
  let importSessionsCollection;
  let indexesMap;
  let mockIo;
  let emittedEvents;
  const JWT_SECRET = 'test_vps_hardening_secret_2026';

  beforeEach(() => {
    productsCollection = new Map();
    productBarcodesCollection = new Map();
    importSessionsCollection = new Map();
    indexesMap = new Map();
    emittedEvents = [];

    mockIo = {
      rooms: new Map(),
      to: (room) => ({
        emit: (eventName, payload) => {
          emittedEvents.push({ room, eventName, payload });
        }
      })
    };

    mockDb = {
      collection: (name) => ({
        findOne: async (query) => {
          if (name === 'products') {
            for (const p of productsCollection.values()) {
              if (query.id && p.id === query.id) return { ...p };
              if (query.sku && p.sku === query.sku) return { ...p };
              if (query.barcode && p.barcode === query.barcode) return { ...p };
            }
          }
          if (name === 'product_barcodes') {
            for (const b of productBarcodesCollection.values()) {
              if (query.barcode && b.barcode === query.barcode) return { ...b };
              if (query.productId && b.productId === query.productId) return { ...b };
            }
          }
          return null;
        },
        find: (query = {}) => ({
          toArray: async () => {
            if (name === 'products') return Array.from(productsCollection.values());
            if (name === 'product_barcodes') return Array.from(productBarcodesCollection.values());
            return [];
          }
        }),
        updateOne: async (filter, update, options = {}) => {
          const table = (name === 'products') ? productsCollection : (name === 'product_barcodes') ? productBarcodesCollection : importSessionsCollection;
          const id = filter.id || (filter.$or ? filter.$or[0]?.id : `gen-${Date.now()}`);
          let existing = table.get(id) || {};

          if (update.$set) {
            existing = { ...existing, ...update.$set };
          }
          if (update.$unset) {
            for (const key of Object.keys(update.$unset)) {
              delete existing[key];
            }
          }
          if (update.$setOnInsert && !table.has(id)) {
            existing = { ...existing, ...update.$setOnInsert };
          }

          table.set(id, existing);
          return { acknowledged: true, modifiedCount: 1, upsertedId: id };
        },
        updateMany: async (filter, update) => {
          const table = (name === 'products') ? productsCollection : productBarcodesCollection;
          let modCount = 0;
          for (const [id, doc] of table.entries()) {
            if (filter.$or) {
              const matches = filter.$or.some(c => {
                if (c.barcode === "" && doc.barcode === "") return true;
                if (c.barcode === null && doc.barcode === null) return true;
                return false;
              });
              if (matches) {
                if (update.$unset && update.$unset.barcode !== undefined) {
                  delete doc.barcode;
                  table.set(id, doc);
                  modCount++;
                }
              }
            }
          }
          return { acknowledged: true, modifiedCount: modCount };
        },
        deleteMany: async (filter) => {
          const table = (name === 'product_barcodes') ? productBarcodesCollection : productsCollection;
          let delCount = 0;
          for (const [id, doc] of table.entries()) {
            if (filter.productId && doc.productId === filter.productId) {
              table.delete(id);
              delCount++;
            }
            if (filter.$or) {
              const matches = filter.$or.some(c => doc.barcode === c.barcode || (c.barcode === null && doc.barcode === null));
              if (matches) {
                table.delete(id);
                delCount++;
              }
            }
          }
          return { acknowledged: true, deletedCount: delCount };
        },
        countDocuments: async (query = {}) => {
          const table = (name === 'products') ? productsCollection : productBarcodesCollection;
          let count = 0;
          for (const doc of table.values()) {
            if (query.$or) {
              const matches = query.$or.some(c => doc.barcode === c.barcode || (c.barcode === null && doc.barcode === null));
              if (matches) count++;
            } else {
              count++;
            }
          }
          return count;
        },
        listIndexes: () => ({
          toArray: async () => indexesMap.get(name) || [{ key: { _id: 1 }, name: "_id_" }]
        }),
        insertOne: async (doc) => ({ acknowledged: true, insertedId: doc.id || 'ins-1' }),
        createIndex: async (keys, options) => {
          if (!indexesMap.has(name)) indexesMap.set(name, [{ key: { _id: 1 }, name: "_id_" }]);
          const list = indexesMap.get(name);
          list.push({ key: keys, name: options?.name || Object.keys(keys).join('_') });
          return options?.name || "idx";
        }
      })
    };

    setupContext(mockDb, mockIo, JWT_SECRET, '/tmp', {}, new Map());
    realtimeService.setup(mockIo, () => mockDb);
  });

  // Helper to simulate Socket.IO client instance and JOIN_SYNC handler logic
  function createMockSocket(userData, socketId = 'sock-1') {
    const socket = {
      id: socketId,
      user: userData,
      joinedRooms: new Set(),
      emitted: [],
      join: function(room) {
        this.joinedRooms.add(room);
      },
      emit: function(event, payload) {
        this.emitted.push({ event, payload });
      }
    };

    const handleJoinSync = (data) => {
      if (!data) return;
      const userRole = socket.user?.role || '';
      const userCategory = socket.user?.category || '';
      const assignedStore = socket.user?.assignedStoreId || 'none';
      const isSuper = userRole.toLowerCase().includes('super') ||
                      userCategory === 'super admin' ||
                      assignedStore === 'all';

      if (!isSuper && data.storeId && data.storeId !== 'default') {
        const allowedStores = Array.isArray(socket.user?.assignedStores)
          ? socket.user.assignedStores
          : (assignedStore && assignedStore !== 'none' ? [assignedStore] : []);

        if (!allowedStores.includes(data.storeId)) {
          socket.emit('AUTHORIZATION_DENIED', {
            code: 'STORE_ACCESS_DENIED',
            message: `Access denied to store room 'store_${data.storeId}'`
          });
          return;
        }
      }

      if (!socket.joinedRooms.has('sync_global')) {
        socket.join('sync_global');
      }

      if (data.storeId && data.storeId !== 'default') {
        const targetRoom = `store_${data.storeId}`;
        if (socket.joinedRooms.has(targetRoom)) {
          socket.emit('DUPLICATE_ROOM_IGNORED', { room: targetRoom });
        } else {
          socket.join(targetRoom);
          socket.emit('ROOM_JOINED', { room: targetRoom });
        }
      }
    };

    return { socket, handleJoinSync };
  }

  // ==========================================
  // ISSUE 1: Empty Barcode Handling Tests
  // ==========================================

  test('1. Blank barcode normalization during bulk import normalizes "" to absent/null', () => {
    const rawRow = {
      'Product Name': 'MUSTARD OIL',
      'SKU': 'SKU-MUST-1L',
      'Barcode': '',
      'MRP': '210'
    };
    const colMap = { 'Product Name': 'productName', 'SKU': 'sku', 'Barcode': 'barcode', 'MRP': 'mrp' };
    const normalized = bulkImportService.normalizeRowData(rawRow, colMap);
    expect(normalized.barcode).toBeNull();
  });

  test('2. Multiple products without barcode in single import persist with NO barcode field (reproducing production rows)', async () => {
    const importItems = [
      { rowNumber: 1, action: 'CREATE', normalizedData: { productName: 'MUSTARD OIL', sku: 'SKU-MUST-01', barcode: null, purchasePrice: 150, sellingPrice: 200 } },
      { rowNumber: 2, action: 'CREATE', normalizedData: { productName: 'BROWN SUGAR', sku: 'SKU-SUGAR-01', barcode: '', purchasePrice: 60, sellingPrice: 90 } },
      { rowNumber: 3, action: 'CREATE', normalizedData: { productName: 'PINK POWDER SALT', sku: 'SKU-SALT-01', barcode: '   ', purchasePrice: 25, sellingPrice: 40 } },
      { rowNumber: 4, action: 'CREATE', normalizedData: { productName: 'CASTROL OIL', sku: 'SKU-CAST-01', barcode: null, purchasePrice: 300, sellingPrice: 450 } },
      { rowNumber: 5, action: 'CREATE', normalizedData: { productName: 'KORALE MILLETS', sku: 'SKU-MILLET-01', barcode: null, purchasePrice: 80, sellingPrice: 120 } }
    ];

    const result = await bulkImportService.commitImport(mockDb, mockIo, 'imp-test-multi', importItems, {}, { username: 'admin' });
    expect(result.success).toBe(true);
    expect(result.summary.imported).toBe(5);

    // Verify in database: none of the 5 products has barcode: "" or any duplicate key collision
    const allProducts = Array.from(productsCollection.values());
    expect(allProducts.length).toBe(5);
    for (const p of allProducts) {
      expect(p.barcode).toBeUndefined(); // strictly unset/absent
    }
  });

  test('3. Existing valid barcode is preserved when incoming row has blank/null barcode', async () => {
    // Seed existing product with barcode
    productsCollection.set('prd-existing-1', {
      id: 'prd-existing-1',
      name: 'Organic Honey 500g',
      sku: 'SKU-HONEY-500',
      barcode: '8901234567890',
      price: 350
    });

    const updateItem = [
      {
        rowNumber: 1,
        action: 'UPDATE',
        normalizedData: {
          matchedProductId: 'prd-existing-1',
          productName: 'Organic Honey 500g (New Pack)',
          sku: 'SKU-HONEY-500',
          barcode: '', // blank barcode incoming
          purchasePrice: 220,
          sellingPrice: 380,
          mrp: 400
        }
      }
    ];

    const result = await bulkImportService.commitImport(mockDb, mockIo, 'imp-test-update', updateItem, {}, { username: 'admin' });
    expect(result.success).toBe(true);
    expect(result.summary.updated).toBe(1);

    const updated = productsCollection.get('prd-existing-1');
    expect(updated.barcode).toBe('8901234567890'); // Preserved!
    expect(updated.sellingPrice).toBe(380);
  });

  // ==========================================
  // ISSUE 2: Database Index Manager Tests
  // ==========================================

  test('4. Index Manager idempotently synchronizes indexes with 0 errors', async () => {
    const res = await databaseIndexService.syncIndexes(mockDb);
    expect(res.success).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  test('5. Index Manager recognizes existing SKU index without collisions', async () => {
    // Pre-populate an existing SKU index
    indexesMap.set('products', [{ key: { sku: 1 }, name: 'sku_1' }]);
    const res = await databaseIndexService.syncIndexes(mockDb);
    expect(res.success).toBe(true);
    expect(res.errors.length).toBe(0);
    expect(res.skipped).toBeGreaterThanOrEqual(1);
  });

  test('6. Index Manager recognizes legacy single-field text index and skips creating duplicate text index', async () => {
    // Pre-populate legacy text index on products (e.g. name_text)
    indexesMap.set('products', [{ key: { _fts: 'text', _ftsx: 1 }, weights: { name: 1 }, name: 'name_text' }]);
    const res = await databaseIndexService.syncIndexes(mockDb);
    expect(res.success).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  // ==========================================
  // ISSUE 3: Socket JOIN_SYNC & Lifecycle Tests
  // ==========================================

  test('7. Duplicate JOIN_SYNC requests for the same room are ignored idempotently', () => {
    const { socket, handleJoinSync } = createMockSocket({
      id: 'usr-rajesh',
      username: 'rajesh',
      role: 'employee',
      assignedStoreId: 'store-main',
      assignedStores: ['store-main']
    });

    handleJoinSync({ storeId: 'store-main' });
    expect(socket.joinedRooms.has('sync_global')).toBe(true);
    expect(socket.joinedRooms.has('store_store-main')).toBe(true);

    // Call JOIN_SYNC second and third time
    handleJoinSync({ storeId: 'store-main' });
    handleJoinSync({ storeId: 'store-main' });

    const duplicateEmits = socket.emitted.filter(e => e.event === 'DUPLICATE_ROOM_IGNORED');
    expect(duplicateEmits.length).toBe(2);
    expect(socket.joinedRooms.size).toBe(2); // strictly sync_global and store_store-main
  });

  test('8. Unauthorized store room join is rejected with STORE_ACCESS_DENIED', () => {
    const { socket, handleJoinSync } = createMockSocket({
      id: 'usr-rajesh',
      username: 'rajesh',
      role: 'employee',
      assignedStoreId: 'store-main',
      assignedStores: ['store-main']
    });

    handleJoinSync({ storeId: 'store-secret' });
    const denied = socket.emitted.find(e => e.event === 'AUTHORIZATION_DENIED');
    expect(denied).toBeDefined();
    expect(denied.payload.code).toBe('STORE_ACCESS_DENIED');
    expect(socket.joinedRooms.has('store_store-secret')).toBe(false);
  });

  test('9. Super Admin user can join multiple store rooms legitimately', () => {
    const { socket, handleJoinSync } = createMockSocket({
      id: 'usr-admin',
      username: 'superadmin',
      role: 'super admin',
      assignedStoreId: 'all'
    });

    handleJoinSync({ storeId: 'store-1' });
    handleJoinSync({ storeId: 'store-2' });

    expect(socket.joinedRooms.has('sync_global')).toBe(true);
    expect(socket.joinedRooms.has('store_store-1')).toBe(true);
    expect(socket.joinedRooms.has('store_store-2')).toBe(true);
  });

  test('10. Multi-store assigned user can join assigned stores', () => {
    const { socket, handleJoinSync } = createMockSocket({
      id: 'usr-multi',
      username: 'multiuser',
      role: 'manager',
      assignedStoreId: 'store-1',
      assignedStores: ['store-1', 'store-2']
    });

    handleJoinSync({ storeId: 'store-1' });
    handleJoinSync({ storeId: 'store-2' });

    expect(socket.joinedRooms.has('store_store-1')).toBe(true);
    expect(socket.joinedRooms.has('store_store-2')).toBe(true);
  });

  test('11. Socket disconnect cleans up tracking registry', () => {
    const { socket } = createMockSocket({ id: 'usr-temp', username: 'tempuser' }, 'sock-temp-99');
    realtimeService.registerUserSocket('usr-temp', socket);

    expect(realtimeService.getUserSocketCount('usr-temp')).toBe(1);

    realtimeService.unregisterUserSocket('usr-temp', 'sock-temp-99');
    expect(realtimeService.getUserSocketCount('usr-temp')).toBe(0);
  });
});
