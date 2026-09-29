const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { setupContext } = require('../modules/context');
const billingRouter = require('../modules/billing');
const productsRouter = require('../modules/products');
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

function createMockDb() {
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
          const result = rows.filter(row => matchesFilter(row, filter));
          const cursor = {
            sort(sortSpec) {
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
        async countDocuments(filter = {}) {
          return rows.filter(row => matchesFilter(row, filter)).length;
        },
        async insertOne(doc) {
          const newDoc = { _id: doc._id || `${name}-${rows.length + 1}`, ...doc };
          rows.push(newDoc);
          return { acknowledged: true, insertedId: newDoc._id };
        },
        async insertMany(docs) {
          for (const doc of docs) {
            rows.push({ _id: doc._id || `${name}-${rows.length + 1}`, ...doc });
          }
          return { acknowledged: true, insertedCount: docs.length };
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
        },
        async deleteMany(filter = {}) {
          let deleted = 0;
          for (let i = rows.length - 1; i >= 0; i--) {
            if (matchesFilter(rows[i], filter)) {
              rows.splice(i, 1);
              deleted++;
            }
          }
          return { deletedCount: deleted };
        }
      };
    },
    table
  };

  return db;
}

describe('POS Location-Aware Inventory Integration', () => {
  const JWT_SECRET = 'pos-location-aware-secret';
  const warehouseId = 'central-warehouse';
  const srsStoreId = 'st-srs';
  const templeStoreId = 'st-temple-stall';

  let app;
  let db;
  let superAdminToken;
  let templeCashierToken;

  beforeEach(async () => {
    db = createMockDb();
    setupContext(db, null, JWT_SECRET, '/tmp', {}, new Map());

    // 1. Setup Users
    await db.collection('users').insertOne({
      id: 'usr-super',
      username: 'superadmin',
      name: 'Super Admin',
      role: 'Super Admin',
      category: 'super admin',
      assignedStoreId: 'all',
      status: 'active',
      tokenVersion: 1
    });

    await db.collection('users').insertOne({
      id: 'usr-temple-cashier',
      username: 'templecashier',
      name: 'Temple Cashier',
      role: 'Employee',
      category: 'employee',
      assignedStoreId: templeStoreId,
      status: 'active',
      tokenVersion: 1
    });

    // 2. Setup Stores / Locations
    await db.collection('stores').insertOne({
      id: warehouseId,
      name: 'Central Warehouse Hub',
      isWarehouse: true,
      locationType: 'WAREHOUSE'
    });
    await db.collection('stores').insertOne({
      id: srsStoreId,
      name: 'VC Organic SRS',
      isWarehouse: false,
      locationType: 'STORE'
    });
    await db.collection('stores').insertOne({
      id: templeStoreId,
      name: 'VC Organic Temple Stall',
      isWarehouse: false,
      locationType: 'STORE'
    });

    await db.collection('businesses').insertOne({ id: warehouseId, name: 'Central Warehouse Hub' });
    await db.collection('businesses').insertOne({ id: srsStoreId, name: 'VC Organic SRS' });
    await db.collection('businesses').insertOne({ id: templeStoreId, name: 'VC Organic Temple Stall' });

    // 3. Setup Product Master
    // Product Master has master stock = 100 (historical legacy number)
    await db.collection('products').insertOne({
      id: 'prod-ghee-1l',
      name: 'A2 Vedic Bilona Ghee 1L',
      sku: 'GHEE-1L',
      barcode: '890123456001',
      price: 1200,
      sellingPrice: 1200,
      cost: 900,
      purchasePrice: 900,
      gst: 5,
      unit: 'tin',
      stock: 100, // Master stock
      isArchived: false,
      status: 'active'
    });

    // 4. Authoritative Location Stock balances:
    // Central Warehouse: 50
    // SRS Store: 10
    // Temple Stall: 0 (No inventory record or 0)
    await inventoryService.adjustStock('prod-ghee-1l', warehouseId, 50, 'OPENING', 'seed', 'system');
    await inventoryService.adjustStock('prod-ghee-1l', srsStoreId, 10, 'OPENING', 'seed', 'system');
    // Temple stall has 0 stock (no inventory record or explicitly 0)

    superAdminToken = `Bearer ${jwt.sign({
      id: 'usr-super',
      username: 'superadmin',
      role: 'Super Admin',
      category: 'super admin',
      assignedStoreId: 'all',
      tokenVersion: 1
    }, JWT_SECRET)}`;

    templeCashierToken = `Bearer ${jwt.sign({
      id: 'usr-temple-cashier',
      username: 'templecashier',
      role: 'Employee',
      category: 'employee',
      assignedStoreId: templeStoreId,
      tokenVersion: 1
    }, JWT_SECRET)}`;

    app = express();
    app.use(express.json());
    app.use('/api/v1/products', productsRouter);
    app.use('/api/v1/invoices', billingRouter);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('1. GET /api/v1/products?locationId=st-srs returns location-specific stock (10)', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .query({ locationId: srsStoreId })
      .set('Authorization', superAdminToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    const prod = res.body[0];
    expect(prod.id).toBe('prod-ghee-1l');
    expect(prod.stock).toBe(10);
    expect(prod.inventory).toBe(10);
    expect(prod.available).toBe(10);
    expect(prod.locationId).toBe(srsStoreId);
    expect(prod.rawMasterStock).toBe(100);
  });

  test('2. GET /api/v1/products?locationId=st-temple-stall returns 0 stock for outlet with no stock', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .query({ locationId: templeStoreId })
      .set('Authorization', superAdminToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    const prod = res.body[0];
    expect(prod.id).toBe('prod-ghee-1l');
    expect(prod.stock).toBe(0);
    expect(prod.inventory).toBe(0);
    expect(prod.available).toBe(0);
    expect(prod.locationId).toBe(templeStoreId);
    expect(prod.rawMasterStock).toBe(100);
  });

  test('3. Barcode & SKU lookup attach location-specific inventory for specified outlet', async () => {
    // Barcode lookup at SRS
    const resBarcodeSRS = await request(app)
      .get('/api/v1/products/by-barcode/890123456001')
      .query({ locationId: srsStoreId })
      .set('Authorization', superAdminToken);

    expect(resBarcodeSRS.status).toBe(200);
    expect(resBarcodeSRS.body.available).toBe(10);
    expect(resBarcodeSRS.body.stock).toBe(10);
    expect(resBarcodeSRS.body.locationId).toBe(srsStoreId);

    // Barcode lookup at Temple
    const resBarcodeTemple = await request(app)
      .get('/api/v1/products/by-barcode/890123456001')
      .query({ locationId: templeStoreId })
      .set('Authorization', superAdminToken);

    expect(resBarcodeTemple.status).toBe(200);
    expect(resBarcodeTemple.body.available).toBe(0);
    expect(resBarcodeTemple.body.stock).toBe(0);
    expect(resBarcodeTemple.body.locationId).toBe(templeStoreId);

    // SKU lookup at SRS
    const resSkuSRS = await request(app)
      .get('/api/v1/products/by-sku/GHEE-1L')
      .query({ locationId: srsStoreId })
      .set('Authorization', superAdminToken);

    expect(resSkuSRS.status).toBe(200);
    expect(resSkuSRS.body.available).toBe(10);
    expect(resSkuSRS.body.stock).toBe(10);
  });

  test('4. POS checkout at st-srs decrements SRS stock from 10 to 9 and does not touch warehouse', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', superAdminToken)
      .send({
        transactionId: 'txn-srs-sale-1',
        invoiceNumber: 'INV-SRS-001',
        locationId: srsStoreId,
        storeId: srsStoreId,
        paymentMode: 'CASH',
        amountPaid: 1200,
        items: [
          {
            productId: 'prod-ghee-1l',
            quantity: 1,
            price: 1200
          }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify SRS stock is now 9
    const srsInv = await db.collection('inventory').findOne({
      productId: 'prod-ghee-1l',
      $or: [{ locationId: srsStoreId }, { storeId: srsStoreId }]
    });
    expect(srsInv.quantity).toBe(9);

    // Verify Warehouse stock is still untouched at 50
    const whInv = await db.collection('inventory').findOne({
      productId: 'prod-ghee-1l',
      $or: [{ locationId: warehouseId }, { storeId: warehouseId }]
    });
    expect(whInv.quantity).toBe(50);
  });

  test('5. POS checkout at st-temple-stall fails with INSUFFICIENT_STOCK and never substitutes warehouse stock', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', superAdminToken)
      .send({
        transactionId: 'txn-temple-sale-1',
        invoiceNumber: 'INV-TEMPLE-001',
        locationId: templeStoreId,
        storeId: templeStoreId,
        paymentMode: 'CASH',
        amountPaid: 1200,
        items: [
          {
            productId: 'prod-ghee-1l',
            quantity: 1,
            price: 1200
          }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');

    // Confirm warehouse balance is still 50 and was not drained
    const whInv = await db.collection('inventory').findOne({
      productId: 'prod-ghee-1l',
      $or: [{ locationId: warehouseId }, { storeId: warehouseId }]
    });
    expect(whInv.quantity).toBe(50);
  });

  test('6. Store-restricted user cannot bill from another store', async () => {
    // Temple cashier tries to bill from SRS store
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', templeCashierToken)
      .send({
        transactionId: 'txn-unauth-sale-1',
        invoiceNumber: 'INV-UNAUTH-001',
        locationId: srsStoreId,
        storeId: srsStoreId,
        paymentMode: 'CASH',
        amountPaid: 1200,
        items: [
          {
            productId: 'prod-ghee-1l',
            quantity: 1,
            price: 1200
          }
        ]
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
