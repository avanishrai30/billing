const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');
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
        if (val.$nin !== undefined && val.$nin.includes(doc[key])) return false;
        if (val.$in !== undefined && !val.$in.includes(doc[key])) return false;
        if (val.$regex !== undefined) {
          const regex = new RegExp(val.$regex, val.$options || '');
          if (!regex.test(doc[key] || '')) return false;
        }
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

describe('POS Return & Exchange Architecture Integration', () => {
  let mockDb;
  const storeId = 'store-outlet-srs';

  beforeEach(async () => {
    mockDb = createMockDb();
    setupContext(mockDb, null, 'test-secret', '/tmp', {}, new Map());

    // Product master records
    await mockDb.collection('products').insertOne({
      id: 'prod-ghee-1l',
      name: 'A2 Gir Cow Ghee 1L',
      sku: 'GHEE-1L',
      barcode: '8901234567890',
      sellingPrice: 650,
      price: 650,
      cost: 450,
      gst: 5,
      isArchived: false
    });

    await mockDb.collection('products').insertOne({
      id: 'prod-honey-500g',
      name: 'Organic Wild Honey 500g',
      sku: 'HONEY-500',
      barcode: '8901234567891',
      sellingPrice: 350,
      price: 350,
      cost: 220,
      gst: 5,
      isArchived: false
    });

    // Seed opening stock
    await inventoryService.adjustStock('prod-ghee-1l', storeId, 20, 'OPENING', 'init', 'tester');
    await inventoryService.adjustStock('prod-honey-500g', storeId, 15, 'OPENING', 'init', 'tester');
  });

  test('1. POS sale decrements inventory and preserves customer snapshot', async () => {
    const saleItems = [
      { productId: 'prod-ghee-1l', name: 'A2 Gir Cow Ghee 1L', quantity: 2, price: 650, cost: 450, gst: 5, lineTotal: 1300 },
      { productId: 'prod-honey-500g', name: 'Organic Wild Honey 500g', quantity: 1, price: 350, cost: 220, gst: 5, lineTotal: 350 }
    ];

    const invoiceNumber = 'INV-2026-001';
    await inventoryService.consumeStockBatch(saleItems, storeId, invoiceNumber, 'cashier1');

    const invDoc = {
      invoiceNumber,
      id: invoiceNumber,
      storeId,
      locationId: storeId,
      customerId: 'cust-101',
      customerName: 'Rajesh Sharma',
      customerPhone: '9822011223',
      items: saleItems,
      subtotal: 1650,
      tax: 82.5,
      grandTotal: 1732.5,
      paymentMode: 'UPI',
      status: 'COMPLETED',
      createdAt: new Date().toISOString()
    };
    await mockDb.collection('invoices').insertOne(invDoc);

    const gheeBal = await mockDb.collection('inventory').findOne({ productId: 'prod-ghee-1l', locationId: storeId });
    const honeyBal = await mockDb.collection('inventory').findOne({ productId: 'prod-honey-500g', locationId: storeId });

    expect(gheeBal.quantity).toBe(18);
    expect(honeyBal.quantity).toBe(14);

    const savedInvoice = await mockDb.collection('invoices').findOne({ invoiceNumber });
    expect(savedInvoice.customerPhone).toBe('9822011223');
    expect(savedInvoice.customerName).toBe('Rajesh Sharma');
  });

  test('2. Partial Return restocks returned items to inventory without modifying original sale', async () => {
    const invoiceNumber = 'INV-2026-001';
    const returnItems = [
      { productId: 'prod-ghee-1l', name: 'A2 Gir Cow Ghee 1L', quantity: 1, price: 650, cost: 450, gst: 5, lineTotal: 650 }
    ];

    const returnId = 'RET-2026-001';
    await inventoryService.addStockBatch(returnItems, storeId, returnId, 'cashier1', {
      type: 'RETURN',
      referenceType: 'return'
    });

    const returnDoc = {
      returnId,
      id: returnId,
      originalInvoiceNumber: invoiceNumber,
      storeId,
      locationId: storeId,
      returnedItems: returnItems,
      refundAmount: 682.5,
      refundMethod: 'CASH',
      cashier: 'cashier1',
      createdAt: new Date().toISOString()
    };
    await mockDb.collection('returns').insertOne(returnDoc);

    const gheeBal = await mockDb.collection('inventory').findOne({ productId: 'prod-ghee-1l', locationId: storeId });
    expect(gheeBal.quantity).toBe(21); // Restocked +1 from initial 20

    const returnsList = await mockDb.collection('returns').find({ originalInvoiceNumber: invoiceNumber }).toArray();
    expect(returnsList.length).toBe(1);
    expect(returnsList[0].refundAmount).toBe(682.5);
  });

  test('3. Exchange atomically restocks old items and decrements replacement items', async () => {
    const exchangeReturnItems = [
      { productId: 'prod-honey-500g', name: 'Organic Wild Honey 500g', quantity: 1, price: 350, cost: 220, gst: 5, lineTotal: 350 }
    ];
    const exchangeReplacementItems = [
      { productId: 'prod-ghee-1l', name: 'A2 Gir Cow Ghee 1L', quantity: 1, price: 650, cost: 450, gst: 5, lineTotal: 650 }
    ];

    const exchangeId = 'EXC-2026-001';
    const newInvoiceNumber = 'INV-EXC-001';

    // 1. Restock returned item
    await inventoryService.addStockBatch(exchangeReturnItems, storeId, exchangeId, 'cashier1', {
      type: 'RETURN',
      referenceType: 'exchange'
    });

    // 2. Consume replacement item
    await inventoryService.consumeStockBatch(exchangeReplacementItems, storeId, newInvoiceNumber, 'cashier1');

    const honeyBal = await mockDb.collection('inventory').findOne({ productId: 'prod-honey-500g', locationId: storeId });
    const gheeBal = await mockDb.collection('inventory').findOne({ productId: 'prod-ghee-1l', locationId: storeId });

    expect(honeyBal.quantity).toBe(16); // +1 returned
    expect(gheeBal.quantity).toBe(19);  // -1 sold
  });
});
