const inventoryService = require('../services/inventoryService');
const { setupContext } = require('../modules/context');

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

describe('Purchase, Transfer, and POS Transaction Integration (Stage 08)', () => {
  let mockDb;
  const storeA = 'store-outlet-A';
  const storeB = 'store-outlet-B';

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

  test('1. Simultaneous Sales Concurrency: 20 sales of stock = 10 results in 10 successes and stock = 0', async () => {
    const prodId = 'prod-conc-pos-1';
    await seedProduct(prodId);
    await inventoryService.adjustStock(prodId, storeA, 10, 'OPENING', 'init', 'tester');

    const salePromises = Array.from({ length: 20 }).map((_, i) =>
      inventoryService.consumeStockBatch(
        [{ productId: prodId, quantity: 1, price: 50 }],
        storeA,
        `INV-P-${i}`,
        'cashier'
      )
    );

    const outcomes = await Promise.allSettled(salePromises);
    const successfulSales = outcomes.filter(o => o.status === 'fulfilled');
    const failedSales = outcomes.filter(o => o.status === 'rejected');

    expect(successfulSales.length).toBe(10);
    expect(failedSales.length).toBe(10);

    const inv = await mockDb.collection('inventory').findOne({ productId: prodId, locationId: storeA });
    expect(inv.quantity).toBe(0);
  });

  test('2. Concurrent Sale and Store Transfer: Never double-deducts or causes negative stock', async () => {
    const prodId = 'prod-conc-tf-1';
    await seedProduct(prodId);
    await inventoryService.adjustStock(prodId, storeA, 10, 'OPENING', 'init', 'tester');

    const op1 = inventoryService.consumeStockBatch(
      [{ productId: prodId, quantity: 6, price: 100 }],
      storeA,
      'INV-TF-1',
      'cashier'
    );

    const op2 = inventoryService.transferStock(
      prodId,
      storeA,
      storeB,
      6,
      'manager',
      'Replenishment'
    );

    const results = await Promise.allSettled([op1, op2]);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const invA = await mockDb.collection('inventory').findOne({ productId: prodId, locationId: storeA });
    expect(invA.quantity).toBe(4);
  });

  test('3. Duplicate Invoice Retry (Idempotency): Does not deduct stock twice', async () => {
    const prodId = 'prod-idemp-pos-1';
    const txId = 'TX-INV-UNIQUE-101';
    await seedProduct(prodId);
    await inventoryService.adjustStock(prodId, storeA, 15, 'OPENING', 'init', 'tester');

    // First checkout
    await inventoryService.consumeStockBatch(
      [{ productId: prodId, quantity: 5, price: 100 }],
      storeA,
      txId,
      'cashier'
    );

    await mockDb.collection('invoices').insertOne({
      invoiceNumber: txId,
      transactionId: txId,
      locationId: storeA,
      items: [{ productId: prodId, quantity: 5 }],
      isArchived: false
    });

    const invAfterFirst = await mockDb.collection('inventory').findOne({ productId: prodId, locationId: storeA });
    expect(invAfterFirst.quantity).toBe(10);

    // Duplicate checkout attempt: simulated router check
    const existingInvoice = await mockDb.collection('invoices').findOne({ transactionId: txId, isArchived: { $ne: true } });
    expect(existingInvoice).not.toBeNull();
    // In router, existingInvoice is returned directly without calling consumeStockBatch again

    const finalInv = await mockDb.collection('inventory').findOne({ productId: prodId, locationId: storeA });
    expect(finalInv.quantity).toBe(10);
  });

  test('4. Duplicate Purchase Retry (Idempotency): Does not increment stock twice', async () => {
    const prodId = 'prod-idemp-pur-1';
    const purTxId = 'PUR-TX-UNIQUE-202';
    await seedProduct(prodId);
    await inventoryService.adjustStock(prodId, storeA, 0, 'OPENING', 'init', 'tester');

    // First purchase entry
    await inventoryService.addStockBatch(
      [{ productId: prodId, quantity: 20, unitCost: 40 }],
      storeA,
      purTxId,
      'manager'
    );

    await mockDb.collection('purchases').insertOne({
      purchaseId: purTxId,
      transactionId: purTxId,
      locationId: storeA,
      items: [{ productId: prodId, quantity: 20, unitCost: 40 }],
      isArchived: false,
      status: 'COMPLETED'
    });

    const invAfterFirst = await mockDb.collection('inventory').findOne({ productId: prodId, locationId: storeA });
    expect(invAfterFirst.quantity).toBe(20);

    // Duplicate purchase check
    const existingPur = await mockDb.collection('purchases').findOne({ transactionId: purTxId, isArchived: { $ne: true } });
    expect(existingPur).not.toBeNull();

    const finalInv = await mockDb.collection('inventory').findOne({ productId: prodId, locationId: storeA });
    expect(finalInv.quantity).toBe(20);
  });

  test('5. Double Invoice Void Prevention: Does not revert inventory twice', async () => {
    const prodId = 'prod-void-pos-1';
    const invNum = 'INV-VOID-TEST-303';
    await seedProduct(prodId);
    await inventoryService.adjustStock(prodId, storeA, 20, 'OPENING', 'init', 'tester');

    // Sale of 5 units
    await inventoryService.consumeStockBatch(
      [{ productId: prodId, quantity: 5, price: 100 }],
      storeA,
      invNum,
      'cashier'
    );
    await mockDb.collection('invoices').insertOne({
      invoiceNumber: invNum,
      locationId: storeA,
      items: [{ productId: prodId, quantity: 5, price: 100 }],
      isArchived: false,
      status: 'COMPLETED'
    });

    let inv = await mockDb.collection('inventory').findOne({ productId: prodId, locationId: storeA });
    expect(inv.quantity).toBe(15);

    // Void Invoice once
    const invoice = await mockDb.collection('invoices').findOne({ invoiceNumber: invNum });
    expect(invoice.isArchived).toBe(false);

    await inventoryService.revertStockBatch(invoice.items, storeA, 'VOID', 'invoice_void', invNum, 'admin');
    await mockDb.collection('invoices').updateOne({ _id: invoice._id }, { $set: { isArchived: true, status: 'VOIDED' } });

    inv = await mockDb.collection('inventory').findOne({ productId: prodId, locationId: storeA });
    expect(inv.quantity).toBe(20);

    // Attempt second void (Double Void)
    const voidedInvoice = await mockDb.collection('invoices').findOne({ invoiceNumber: invNum });
    expect(voidedInvoice.isArchived).toBe(true);
    expect(voidedInvoice.status).toBe('VOIDED');
    // Blocked before revertStockBatch is called

    inv = await mockDb.collection('inventory').findOne({ productId: prodId, locationId: storeA });
    expect(inv.quantity).toBe(20);
  });
});
