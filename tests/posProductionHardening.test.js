const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { setupContext } = require('../modules/context');
const billingRouter = require('../modules/billing');
const customersRouter = require('../modules/customers');
const inventoryService = require('../services/inventoryService');

function getByPath(doc, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), doc);
}

function matchesFilter(doc, filter = {}) {
  for (const [key, val] of Object.entries(filter)) {
    if (key === '$or' && Array.isArray(val)) {
      if (!val.some(subFilter => matchesFilter(doc, subFilter))) return false;
      continue;
    }

    const actual = getByPath(doc, key);
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (val.$ne !== undefined && actual === val.$ne) return false;
      if (val.$gte !== undefined && (actual === undefined || actual < val.$gte)) return false;
      if (val.$nin !== undefined && val.$nin.includes(actual)) return false;
      if (val.$in !== undefined && !val.$in.includes(actual)) return false;
      if (val.$regex !== undefined) {
        const regex = new RegExp(val.$regex, val.$options || '');
        if (!regex.test(actual || '')) return false;
      }
      continue;
    }

    if (actual !== val) return false;
  }
  return true;
}

function createMockDb(failures = {}) {
  const collections = new Map();

  function table(name) {
    if (!collections.has(name)) collections.set(name, []);
    return collections.get(name);
  }

  const db = {
    collection(name) {
      const rows = table(name);
      return {
        async findOne(filter = {}) {
          return rows.find(row => matchesFilter(row, filter)) || null;
        },
        find(filter = {}) {
          let result = rows.filter(row => matchesFilter(row, filter));
          const cursor = {
            sort(sortSpec = {}) {
              const [[field, dir] = []] = Object.entries(sortSpec);
              if (field) {
                result = [...result].sort((a, b) => {
                  const av = getByPath(a, field);
                  const bv = getByPath(b, field);
                  return dir === -1 ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
                });
              }
              return cursor;
            },
            skip() { return cursor; },
            limit(n) {
              return { toArray: async () => result.slice(0, n) };
            },
            toArray: async () => result
          };
          return cursor;
        },
        async insertOne(doc) {
          if (failures.insertOnce === name) {
            failures.insertOnce = null;
            throw new Error(`forced ${name} insert failure`);
          }
          const newDoc = { _id: doc._id || `${name}-${rows.length + 1}`, ...doc };
          rows.push(newDoc);
          return { acknowledged: true, insertedId: newDoc._id };
        },
        async updateOne(filter, update) {
          const doc = rows.find(row => matchesFilter(row, filter));
          if (!doc) return { matchedCount: 0, modifiedCount: 0 };
          if (update.$set) Object.assign(doc, update.$set);
          if (update.$inc) {
            for (const [key, value] of Object.entries(update.$inc)) {
              doc[key] = (doc[key] || 0) + value;
            }
          }
          return { matchedCount: 1, modifiedCount: 1 };
        },
        async findOneAndUpdate(filter, update, options = {}) {
          let doc = rows.find(row => matchesFilter(row, filter));
          if (!doc && options.upsert) {
            doc = { _id: `${name}-${rows.length + 1}`, ...(update.$setOnInsert || {}) };
            rows.push(doc);
          }
          if (!doc) return null;
          if (update.$inc) {
            for (const [key, value] of Object.entries(update.$inc)) {
              doc[key] = (doc[key] || 0) + value;
            }
          }
          if (update.$set) Object.assign(doc, update.$set);
          return { value: doc };
        },
        async deleteOne(filter = {}) {
          const idx = rows.findIndex(row => matchesFilter(row, filter));
          if (idx < 0) return { deletedCount: 0 };
          rows.splice(idx, 1);
          return { deletedCount: 1 };
        }
      };
    },
    table
  };

  return db;
}

describe('POS production hardening real route integration', () => {
  const JWT_SECRET = 'pos-production-hardening-secret';
  const storeId = 'store-srs';
  let app;
  let db;
  let failures;
  let authHeader;

  beforeEach(async () => {
    failures = {};
    db = createMockDb(failures);
    setupContext(db, null, JWT_SECRET, '/tmp', {}, new Map());

    await db.collection('users').insertOne({
      id: 'usr-admin',
      username: 'admin',
      name: 'Super Admin',
      role: 'Super Admin',
      category: 'super admin',
      assignedStoreId: 'all',
      status: 'active',
      tokenVersion: 1
    });
    await db.collection('stores').insertOne({ id: storeId, name: 'VC ORGANIC SRS' });
    await db.collection('businesses').insertOne({ id: storeId, name: 'VC ORGANIC SRS' });
    await db.collection('customers').insertOne({
      id: 'cust-rajesh',
      name: 'Rajesh Sharma',
      phone: '9822011223',
      phoneCanonical: '9822011223',
      normalizedPhone: '9822011223'
    });
    await db.collection('products').insertOne({
      id: 'prod-ghee',
      name: 'A2 Ghee 1L',
      sku: 'GHEE-1L',
      barcode: '8901234567890',
      sellingPrice: 650,
      price: 650,
      purchasePrice: 450,
      cost: 450,
      gst: 5,
      unit: 'tin',
      isArchived: false
    });
    await db.collection('products').insertOne({
      id: 'prod-honey',
      name: 'Wild Honey 500g',
      sku: 'HONEY-500',
      barcode: '8901234567891',
      sellingPrice: 500,
      price: 500,
      purchasePrice: 300,
      cost: 300,
      gst: 0,
      unit: 'jar',
      isArchived: false
    });
    await inventoryService.adjustStock('prod-ghee', storeId, 10, 'OPENING', 'seed', 'tester');
    await inventoryService.adjustStock('prod-honey', storeId, 3, 'OPENING', 'seed', 'tester');

    authHeader = `Bearer ${jwt.sign({
      id: 'usr-admin',
      username: 'admin',
      role: 'Super Admin',
      category: 'super admin',
      assignedStoreId: 'all',
      tokenVersion: 1
    }, JWT_SECRET)}`;

    app = express();
    app.use(express.json());
    app.use('/api/v1/invoices', billingRouter);
    app.use('/api/v1/customers', customersRouter);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('1. sale route creates invoice, consumes stock, normalizes customer snapshot, and writes audit', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', authHeader)
      .send({
        transactionId: 'txn-sale-real-1',
        invoiceNumber: 'INV-SALE-REAL-1',
        locationId: storeId,
        customerId: 'cust-rajesh',
        customerName: 'Wrong Client Name',
        customerPhone: '+91 98220 11223',
        paymentMode: 'CASH',
        amountPaid: 1500,
        items: [{ productId: 'prod-ghee', quantity: 2, price: 1, gst: 99 }],
        discount: 0
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.invoice.customerPhone).toBe('9822011223');
    expect(res.body.invoice.customerName).toBe('Rajesh Sharma');
    expect(res.body.invoice.items[0].price).toBe(650);
    expect(res.body.invoice.items[0].gst).toBe(5);
    expect(res.body.invoice.grandTotal).toBe(1365);
    expect(res.body.invoice.amountPaid).toBe(1500);
    expect(res.body.invoice.changeDue).toBe(135);

    const inventory = await db.collection('inventory').findOne({ productId: 'prod-ghee', locationId: storeId });
    expect(inventory.quantity).toBe(8);
    expect(db.table('audit_logs').some(log => log.eventType === 'STOCK_SALE' && log.view === 'billing')).toBe(true);
  });

  test('2. sale route rolls inventory back when invoice persistence fails', async () => {
    failures.insertOnce = 'invoices';

    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', authHeader)
      .send({
        transactionId: 'txn-sale-fail-1',
        invoiceNumber: 'INV-SALE-FAIL-1',
        locationId: storeId,
        paymentMode: 'UPI',
        items: [{ productId: 'prod-ghee', quantity: 1, price: 650 }],
        discount: 0
      });

    expect(res.status).toBe(500);
    const inventory = await db.collection('inventory').findOne({ productId: 'prod-ghee', locationId: storeId });
    expect(inventory.quantity).toBe(10);
    expect(await db.collection('invoices').findOne({ invoiceNumber: 'INV-SALE-FAIL-1' })).toBeNull();
  });

  test('3. return route enforces remaining returnable quantity and idempotent retry', async () => {
    await db.collection('invoices').insertOne({
      invoiceNumber: 'INV-RETURN-1',
      id: 'INV-RETURN-1',
      locationId: storeId,
      storeId,
      businessId: storeId,
      customerName: 'Rajesh Sharma',
      customerPhone: '9822011223',
      status: 'COMPLETED',
      isArchived: false,
      items: [{ productId: 'prod-ghee', name: 'A2 Ghee 1L', quantity: 2, price: 650, gst: 5, cost: 450 }]
    });

    const first = await request(app)
      .post('/api/v1/invoices/INV-RETURN-1/return')
      .set('Authorization', authHeader)
      .send({
        transactionId: 'ret-idempotent-1',
        returnedItems: [{ productId: 'prod-ghee', quantity: 1 }],
        refundMethod: 'CASH'
      });

    expect(first.status).toBe(200);
    expect(first.body.return.refundAmount).toBe(682.5);

    const retry = await request(app)
      .post('/api/v1/invoices/INV-RETURN-1/return')
      .set('Authorization', authHeader)
      .send({
        transactionId: 'ret-idempotent-1',
        returnedItems: [{ productId: 'prod-ghee', quantity: 1 }],
        refundMethod: 'CASH'
      });

    expect(retry.status).toBe(200);
    expect(retry.body.duplicate).toBe(true);

    const overReturn = await request(app)
      .post('/api/v1/invoices/INV-RETURN-1/return')
      .set('Authorization', authHeader)
      .send({
        transactionId: 'ret-over-1',
        returnedItems: [{ productId: 'prod-ghee', quantity: 2 }],
        refundMethod: 'CASH'
      });

    expect(overReturn.status).toBe(400);
    expect(overReturn.body.error.code).toBe('EXCEEDS_RETURNABLE_QUANTITY');

    const inventory = await db.collection('inventory').findOne({ productId: 'prod-ghee', locationId: storeId });
    expect(inventory.quantity).toBe(11);
    expect(db.table('returns')).toHaveLength(1);
  });

  test('4. exchange rollback reverses returned-stock restock when replacement consume fails', async () => {
    await db.collection('invoices').insertOne({
      invoiceNumber: 'INV-EXCHANGE-1',
      id: 'INV-EXCHANGE-1',
      locationId: storeId,
      storeId,
      businessId: storeId,
      customerName: 'Rajesh Sharma',
      customerPhone: '9822011223',
      status: 'COMPLETED',
      isArchived: false,
      items: [{ productId: 'prod-honey', name: 'Wild Honey 500g', quantity: 1, price: 500, gst: 0, cost: 300 }]
    });

    const beforeHoney = await db.collection('inventory').findOne({ productId: 'prod-honey', locationId: storeId });
    const beforeGhee = await db.collection('inventory').findOne({ productId: 'prod-ghee', locationId: storeId });

    const forced = new Error('forced replacement consume failure');
    forced.code = 'INSUFFICIENT_STOCK';
    jest.spyOn(inventoryService, 'consumeStockBatch').mockRejectedValueOnce(forced);

    const res = await request(app)
      .post('/api/v1/invoices/INV-EXCHANGE-1/exchange')
      .set('Authorization', authHeader)
      .send({
        transactionId: 'exc-rollback-1',
        returnedItems: [{ productId: 'prod-honey', quantity: 1 }],
        replacementItems: [{ productId: 'prod-ghee', quantity: 1, price: 650 }],
        paymentMode: 'CASH'
      });

    expect(res.status).toBe(500);
    const afterHoney = await db.collection('inventory').findOne({ productId: 'prod-honey', locationId: storeId });
    const afterGhee = await db.collection('inventory').findOne({ productId: 'prod-ghee', locationId: storeId });
    expect(afterHoney.quantity).toBe(beforeHoney.quantity);
    expect(afterGhee.quantity).toBe(beforeGhee.quantity);
    expect(db.table('returns')).toHaveLength(0);
    expect(db.table('invoices').filter(inv => inv.exchangeReference)).toHaveLength(0);
  });

  test('5. customer API normalizes phone variants and rejects duplicate canonical identities', async () => {
    const duplicate = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', authHeader)
      .send({
        name: 'Duplicate Rajesh',
        phone: '919822011223'
      });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('DUPLICATE_CUSTOMER_PHONE');

    const created = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', authHeader)
      .send({
        name: 'New POS Customer',
        phone: '09822011224'
      });

    expect(created.status).toBe(200);
    expect(created.body.customer.phone).toBe('9822011224');
    expect(created.body.customer.phoneCanonical).toBe('9822011224');
  });
});
