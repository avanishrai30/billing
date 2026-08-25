const inventoryService = require('../services/inventoryService');
const { setupContext } = require('../modules/context');

// Lightweight in-memory MongoDB mock engine for offline unit test execution
function createMockDb() {
  const collections = new Map();

  function getColl(name) {
    if (!collections.has(name)) collections.set(name, []);
    return collections.get(name);
  }

  function matchesFilter(doc, filter) {
    for (const [key, val] of Object.entries(filter)) {
      if (key === '$or' && Array.isArray(val)) {
        const anyMatch = val.some(subFilter => matchesFilter(doc, subFilter));
        if (!anyMatch) return false;
        continue;
      }
      if (typeof val === 'object' && val !== null) {
        if (val.$gte !== undefined && (doc[key] === undefined || doc[key] < val.$gte)) return false;
        if (val.$ne !== undefined && doc[key] === val.$ne) return false;
        if (val.$in !== undefined && !val.$in.includes(doc[key])) return false;
      } else {
        if (doc[key] !== val) return false;
      }
    }
    return true;
  }

  return {
    collection(name) {
      const items = getColl(name);
      return {
        async findOne(filter = {}) {
          return items.find(d => matchesFilter(d, filter)) || null;
        },
        find(filter = {}) {
          const res = items.filter(d => matchesFilter(d, filter));
          return {
            sort() { return this; },
            limit(n) { return { toArray: async () => res.slice(0, n) }; },
            toArray: async () => res
          };
        },
        async insertOne(doc) {
          const newDoc = { _id: `id-${Math.random()}`, ...doc };
          items.push(newDoc);
          return { insertedId: newDoc._id };
        },
        async findOneAndUpdate(filter, update, options = {}) {
          let idx = items.findIndex(d => matchesFilter(d, filter));
          let doc = idx >= 0 ? items[idx] : null;

          if (!doc && options.upsert) {
            doc = {
              _id: `id-${Math.random()}`,
              ...(options.$setOnInsert || {}),
              ...(update.$setOnInsert || {})
            };
            items.push(doc);
            idx = items.length - 1;
          }

          if (!doc) return null;

          if (update.$inc) {
            for (const [k, v] of Object.entries(update.$inc)) {
              doc[k] = (doc[k] || 0) + v;
            }
          }
          if (update.$set) {
            Object.assign(doc, update.$set);
          }

          return { value: doc, ...doc };
        },
        async updateOne(filter, update) {
          const doc = items.find(d => matchesFilter(d, filter));
          if (!doc) return { modifiedCount: 0 };
          if (update.$set) Object.assign(doc, update.$set);
          if (update.$inc) {
            for (const [k, v] of Object.entries(update.$inc)) {
              doc[k] = (doc[k] || 0) + v;
            }
          }
          return { modifiedCount: 1 };
        },
        async deleteMany(filter = {}) {
          const remaining = items.filter(d => !matchesFilter(d, filter));
          collections.set(name, remaining);
          return { deletedCount: items.length - remaining.length };
        }
      };
    }
  };
}

describe('Inventory Architecture & Ledger Hardening (Stage 07)', () => {
  let mockDb;
  const testLocation = 'store-test-1';
  const targetLocation = 'store-test-2';

  beforeEach(() => {
    mockDb = createMockDb();
    setupContext(mockDb, null, 'test-secret', '/tmp', {}, new Map());
  });

  async function seedProduct(id) {
    await mockDb.collection('products').insertOne({
      id,
      name: `Product ${id}`,
      sku: `SKU-${id}`,
      isArchived: false
    });
  }

  async function seedStores() {
    await mockDb.collection('stores').insertOne({
      id: 'central-warehouse',
      name: 'Central Warehouse',
      code: 'WH-01',
      status: 'active',
      isWarehouse: true
    });
    await mockDb.collection('stores').insertOne({
      id: 'store-1',
      name: 'Store 1',
      code: 'ST-1',
      status: 'active',
      isWarehouse: false
    });
    await mockDb.collection('stores').insertOne({
      id: 'store-2',
      name: 'Store 2',
      code: 'ST-2',
      status: 'active',
      isWarehouse: false
    });
  }

  test('1. Concurrency Test: 10 simultaneous sales of stock = 10 must leave stock = 0 with no lost updates', async () => {
    const productId = 'prod-concurrency-1';
    await seedProduct(productId);
    // Initialize stock = 10
    await inventoryService.adjustStock(productId, testLocation, 10, 'OPENING', 'init', 'test-runner');

    // Launch 10 simultaneous sales of 1 unit each
    const salesPromises = Array.from({ length: 10 }).map((_, i) =>
      inventoryService.consumeStockBatch(
        [{ productId, quantity: 1, price: 100 }],
        testLocation,
        `INV-CONC-${i}`,
        'pos-terminal'
      )
    );

    const results = await Promise.allSettled(salesPromises);
    const successfulSales = results.filter(r => r.status === 'fulfilled');
    expect(successfulSales.length).toBe(10);

    // Verify final stock is exactly 0
    const inv = await mockDb.collection('inventory').findOne({ productId, locationId: testLocation });
    expect(inv.quantity).toBe(0);

    // 11th sale must fail with INSUFFICIENT_STOCK
    await expect(
      inventoryService.consumeStockBatch(
        [{ productId, quantity: 1, price: 100 }],
        testLocation,
        'INV-CONC-11',
        'pos-terminal'
      )
    ).rejects.toThrow(/Insufficient stock/);
  });

  test('2. Rollback Test: Basket with one failing item must rollback all preceding item deductions', async () => {
    const prodA = 'prod-basket-A';
    const prodB = 'prod-basket-B';
    const prodC = 'prod-basket-C';
    await seedProduct(prodA);
    await seedProduct(prodB);
    await seedProduct(prodC);

    // Seed stock: A=10, B=10, C=2
    await inventoryService.adjustStock(prodA, testLocation, 10, 'OPENING', 'init', 'test-runner');
    await inventoryService.adjustStock(prodB, testLocation, 10, 'OPENING', 'init', 'test-runner');
    await inventoryService.adjustStock(prodC, testLocation, 2, 'OPENING', 'init', 'test-runner');

    // Attempt basket: A=2, B=2, C=5 (C exceeds available stock of 2)
    const basket = [
      { productId: prodA, quantity: 2, price: 50 },
      { productId: prodB, quantity: 2, price: 50 },
      { productId: prodC, quantity: 5, price: 50 }
    ];

    await expect(
      inventoryService.consumeStockBatch(basket, testLocation, 'INV-FAIL-1', 'pos-terminal')
    ).rejects.toThrow(/Insufficient stock/);

    // Verify A, B, and C stock remain completely unchanged
    const invA = await mockDb.collection('inventory').findOne({ productId: prodA, locationId: testLocation });
    const invB = await mockDb.collection('inventory').findOne({ productId: prodB, locationId: testLocation });
    const invC = await mockDb.collection('inventory').findOne({ productId: prodC, locationId: testLocation });

    expect(invA.quantity).toBe(10);
    expect(invB.quantity).toBe(10);
    expect(invC.quantity).toBe(2);
  });

  test('3. Inter-Store Transfer: Atomic stock movement and dual ledger records', async () => {
    const prodId = 'prod-transfer-1';
    await seedProduct(prodId);
    await inventoryService.adjustStock(prodId, testLocation, 25, 'OPENING', 'init', 'test-runner');

    const transferResult = await inventoryService.transferStock(
      prodId,
      testLocation,
      targetLocation,
      10,
      'admin',
      'Test store replenishment'
    );

    expect(transferResult.success).toBe(true);
    expect(transferResult.fromAfter).toBe(15);
    expect(transferResult.toAfter).toBe(10);

    // Verify ledger has both TRANSFER_OUT and TRANSFER_IN
    const ledgerLogs = await mockDb.collection('inventory_ledger').find({ referenceId: transferResult.referenceId }).toArray();
    expect(ledgerLogs.length).toBe(2);
    expect(ledgerLogs.some(l => l.type === 'TRANSFER_OUT' && l.locationId === testLocation)).toBe(true);
    expect(ledgerLogs.some(l => l.type === 'TRANSFER_IN' && l.locationId === targetLocation)).toBe(true);
  });

  test('4. Stock Availability Check', async () => {
    const prodId = 'prod-avail-1';
    await seedProduct(prodId);
    await inventoryService.adjustStock(prodId, testLocation, 5, 'OPENING', 'init', 'test-runner');

    const checkPass = await inventoryService.checkStockAvailability(
      [{ productId: prodId, quantity: 3 }],
      testLocation
    );
    expect(checkPass.available).toBe(true);

    const checkFail = await inventoryService.checkStockAvailability(
      [{ productId: prodId, quantity: 10 }],
      testLocation
    );
    expect(checkFail.available).toBe(false);
    expect(checkFail.errors.length).toBe(1);
    expect(checkFail.errors[0].available).toBe(5);
  });

  test('5. New orphan inventory creation is rejected when Product Master is missing', async () => {
    await expect(
      inventoryService.adjustStock('prod-missing-master', testLocation, 5, 'OPENING', 'init', 'test-runner')
    ).rejects.toMatchObject({ code: 'PRODUCT_MASTER_NOT_FOUND', statusCode: 409 });
  });

  test('6. Command Center shows active Product Master SKUs even when inventory is absent', async () => {
    await seedStores();
    await mockDb.collection('products').insertOne({
      id: 'prod-zero-stock',
      name: 'Aloe Shampoo',
      sku: 'SKU-ALOE',
      barcode: '890000000001',
      brand: 'VC Organics',
      category: 'Personal Care',
      unit: 'bottle',
      reorderLevel: 5,
      purchasePrice: 80,
      sellingPrice: 140,
      isArchived: false,
      status: 'active'
    });

    const data = await inventoryService.getInventoryCommandCenter({
      category: 'super admin',
      assignedStoreId: 'all'
    });

    const item = data.networkBalances.find(row => row.productId === 'prod-zero-stock');
    expect(item).toBeDefined();
    expect(item.isOrphan).toBe(false);
    expect(item.productName).toBe('Aloe Shampoo');
    expect(item.sku).toBe('SKU-ALOE');
    expect(item.networkQuantity).toBe(0);
    expect(item.networkReserved).toBe(0);
    expect(item.networkAvailable).toBe(0);
    expect(item.locationBreakdown).toEqual(expect.arrayContaining([
      expect.objectContaining({ locationId: 'central-warehouse', quantity: 0, available: 0 }),
      expect.objectContaining({ locationId: 'store-1', quantity: 0, available: 0 }),
      expect.objectContaining({ locationId: 'store-2', quantity: 0, available: 0 })
    ]));
    expect(data.summary).toMatchObject({
      totalProducts: 1,
      catalogProducts: 1,
      stockedProducts: 0,
      networkStock: 0,
      centralStock: 0,
      storeStock: 0,
      outOfStockCount: 1
    });
  });

  test('7. Command Center overlays central and store inventory into network totals', async () => {
    await seedStores();
    await seedProduct('prod-network-total');
    await inventoryService.adjustStock('prod-network-total', 'central-warehouse', 100, 'OPENING', 'central', 'test-runner');
    await inventoryService.adjustStock('prod-network-total', 'store-1', 20, 'OPENING', 'store-1', 'test-runner');
    await inventoryService.adjustStock('prod-network-total', 'store-2', 10, 'OPENING', 'store-2', 'test-runner');

    const data = await inventoryService.getInventoryCommandCenter({
      category: 'super admin',
      assignedStoreId: 'all'
    });
    const item = data.networkBalances.find(row => row.productId === 'prod-network-total');

    expect(item.networkQuantity).toBe(130);
    expect(item.locationBreakdown).toEqual(expect.arrayContaining([
      expect.objectContaining({ locationId: 'central-warehouse', quantity: 100 }),
      expect.objectContaining({ locationId: 'store-1', quantity: 20 }),
      expect.objectContaining({ locationId: 'store-2', quantity: 10 })
    ]));
    expect(data.summary).toMatchObject({
      catalogProducts: 1,
      stockedProducts: 1,
      networkStock: 130,
      centralStock: 100,
      storeStock: 30
    });
  });

  test('8. Command Center keeps orphan inventory separate from valid zero-stock products', async () => {
    await seedStores();
    await seedProduct('prod-valid-zero');
    await mockDb.collection('inventory').insertOne({
      id: 'inv-orphan',
      productId: 'prod-missing-command-center',
      locationId: 'store-1',
      storeId: 'store-1',
      quantity: 17,
      reservedQuantity: 0,
      reorderLevel: 10
    });

    const data = await inventoryService.getInventoryCommandCenter({
      category: 'super admin',
      assignedStoreId: 'all'
    });
    const valid = data.networkBalances.find(row => row.productId === 'prod-valid-zero');
    const orphan = data.networkBalances.find(row => row.productId === 'prod-missing-command-center');

    expect(valid.isOrphan).toBe(false);
    expect(valid.networkQuantity).toBe(0);
    expect(orphan.isOrphan).toBe(true);
    expect(orphan.productName).toBe('Product Master Missing');
    expect(orphan.category).toBe('Missing Master');
  });

  test('9. Command Center restricts store-scoped users to their assigned store data', async () => {
    await seedStores();
    await seedProduct('prod-restricted-scope');
    await inventoryService.adjustStock('prod-restricted-scope', 'central-warehouse', 100, 'OPENING', 'central', 'test-runner');
    await inventoryService.adjustStock('prod-restricted-scope', 'store-1', 20, 'OPENING', 'store-1', 'test-runner');
    await inventoryService.adjustStock('prod-restricted-scope', 'store-2', 10, 'OPENING', 'store-2', 'test-runner');

    const data = await inventoryService.getInventoryCommandCenter({
      category: 'employee',
      assignedStoreId: 'store-1',
      assignedStores: ['store-1']
    });
    const item = data.networkBalances.find(row => row.productId === 'prod-restricted-scope');

    expect(data.stores).toEqual([expect.objectContaining({ id: 'store-1' })]);
    expect(item.locationBreakdown).toEqual([
      expect.objectContaining({ locationId: 'store-1', quantity: 20 })
    ]);
    expect(item.networkQuantity).toBe(20);
    expect(data.summary).toMatchObject({
      networkStock: 20,
      centralStock: 0,
      storeStock: 20
    });
  });

  test('10. Command Center transfer view keeps network total constant', async () => {
    await seedStores();
    await seedProduct('prod-transfer-command-center');
    await inventoryService.adjustStock('prod-transfer-command-center', 'central-warehouse', 100, 'OPENING', 'central', 'test-runner');

    const before = await inventoryService.getInventoryCommandCenter({
      category: 'super admin',
      assignedStoreId: 'all'
    });
    await inventoryService.transferStock(
      'prod-transfer-command-center',
      'central-warehouse',
      'store-1',
      30,
      'admin',
      'Store replenishment'
    );
    const after = await inventoryService.getInventoryCommandCenter({
      category: 'super admin',
      assignedStoreId: 'all'
    });
    const item = after.networkBalances.find(row => row.productId === 'prod-transfer-command-center');

    expect(before.summary.networkStock).toBe(100);
    expect(after.summary.networkStock).toBe(100);
    expect(item.locationBreakdown).toEqual(expect.arrayContaining([
      expect.objectContaining({ locationId: 'central-warehouse', quantity: 70 }),
      expect.objectContaining({ locationId: 'store-1', quantity: 30 })
    ]));
  });
});
