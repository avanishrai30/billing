const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { setupContext } = require('../modules/context');
const billingRouter = require('../modules/billing');
const purchasesRouter = require('../modules/purchases');
const dashboardRouter = require('../modules/dashboard');
const databaseIndexService = require('../services/databaseIndexService');

describe('Stage 12 P0 + P1: Production Hardening, Pagination & Performance', () => {
  let app;
  let mockDb;
  let invoicesTable;
  let purchasesTable;
  let productsTable;
  let usersTable;
  let indexesMap;
  const JWT_SECRET = 'test_performance_secret_2026';

  beforeEach(() => {
    invoicesTable = [];
    purchasesTable = [];
    productsTable = [];
    usersTable = new Map();
    indexesMap = new Map();

    // Populate mock invoices (120 invoices across 2 stores)
    for (let i = 1; i <= 120; i++) {
      const storeId = i % 2 === 0 ? 'store-north' : 'store-south';
      invoicesTable.push({
        id: `INV-${i}`,
        invoiceNumber: `INV-${i}`,
        locationId: storeId,
        storeId: storeId,
        businessId: storeId,
        grandTotal: 100 + i,
        subtotal: 90 + i,
        tax: 10,
        discount: 0,
        status: 'COMPLETED',
        paymentMode: 'CASH',
        items: [
          { productId: 'prod-1', quantity: 2, price: 50, cost: 30 }
        ],
        isArchived: false,
        createdAt: new Date(Date.now() - (120 - i) * 3600000).toISOString()
      });
    }

    // Populate mock purchases (60 purchases)
    for (let i = 1; i <= 60; i++) {
      const storeId = i % 2 === 0 ? 'store-north' : 'store-south';
      purchasesTable.push({
        id: `PUR-${i}`,
        purchaseId: `PUR-${i}`,
        purchaseNo: `PUR-${i}`,
        locationId: storeId,
        storeId: storeId,
        supplierId: i % 3 === 0 ? 'sup-organic' : 'sup-general',
        supplier: i % 3 === 0 ? 'Organic Farm' : 'General Mills',
        total: 500 + i,
        grandTotal: 500 + i,
        totalCost: 500 + i,
        itemsCount: 5,
        isArchived: false,
        createdAt: new Date(Date.now() - (60 - i) * 3600000).toISOString()
      });
    }

    // Populate mock products
    productsTable = [
      { id: 'prod-1', name: 'A2 Ghee 500ml', sku: 'AIA-GHEE-500', stock: 25, reorder: 10, cost: 300, price: 450, category: 'Dairy', type: 'own' },
      { id: 'prod-2', name: 'Raw Honey 250g', sku: 'HONEY-250', stock: 4, reorder: 5, cost: 120, price: 180, category: 'Grocery', type: 'external' },
      { id: 'prod-3', name: 'Organic Mustard Oil 1L', sku: 'AIA-OIL-1L', stock: 0, reorder: 8, cost: 150, price: 220, category: 'Oils', type: 'own' }
    ];

    mockDb = {
      collection: (name) => ({
        find: (filter = {}) => {
          let rows = [];
          if (name === 'invoices') rows = [...invoicesTable];
          else if (name === 'purchases') rows = [...purchasesTable];
          else if (name === 'products') rows = [...productsTable];

          // Apply filters
          if (filter.isArchived !== undefined) {
            if (filter.isArchived.$ne !== undefined) {
              rows = rows.filter(r => r.isArchived !== filter.isArchived.$ne);
            }
          }
          if (filter.status) {
            rows = rows.filter(r => r.status === filter.status);
          }
          if (filter.supplierId) {
            rows = rows.filter(r => r.supplierId === filter.supplierId);
          }
          if (filter.$or) {
            rows = rows.filter(r => filter.$or.some(c => {
              if (c.locationId) return r.locationId === c.locationId;
              if (c.storeId) return r.storeId === c.storeId;
              if (c.businessId) return r.businessId === c.businessId;
              return false;
            }));
          }
          if (filter.createdAt) {
            if (filter.createdAt.$gte) rows = rows.filter(r => r.createdAt >= filter.createdAt.$gte);
            if (filter.createdAt.$lte) rows = rows.filter(r => r.createdAt <= filter.createdAt.$lte);
          }

          let sortSpec = null;
          let skipNum = 0;
          let limitNum = rows.length;

          const cursor = {
            sort: (s) => {
              sortSpec = s;
              if (s && s.createdAt === -1) {
                rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              }
              return cursor;
            },
            skip: (n) => {
              skipNum = n;
              return cursor;
            },
            limit: (n) => {
              limitNum = n;
              return cursor;
            },
            project: () => cursor,
            toArray: async () => rows.slice(skipNum, skipNum + limitNum)
          };
          return cursor;
        },
        countDocuments: async (filter = {}) => {
          let rows = (name === 'invoices') ? invoicesTable : (name === 'purchases') ? purchasesTable : productsTable;
          if (filter.$or) {
            rows = rows.filter(r => filter.$or.some(c => r.locationId === c.locationId || r.storeId === c.storeId));
          }
          return rows.length;
        },
        aggregate: (pipeline) => ({
          toArray: async () => {
            if (name === 'invoices') {
              const match = pipeline[0]?.$match || {};
              let matched = invoicesTable.filter(inv => !inv.isArchived);
              if (match.$or) {
                matched = matched.filter(inv => match.$or.some(c => inv.locationId === c.locationId || inv.storeId === c.storeId));
              }
              const totalSales = matched.reduce((s, i) => s + i.grandTotal, 0);
              const subtotal = matched.reduce((s, i) => s + i.subtotal, 0);
              const tax = matched.reduce((s, i) => s + i.tax, 0);
              const totalCost = matched.reduce((s, i) => s + i.items.reduce((acc, item) => acc + (item.quantity * item.cost), 0), 0);
              return [{
                _id: null,
                totalSales,
                subtotal,
                tax,
                discount: 0,
                invoiceCount: matched.length,
                totalCost
              }];
            }
            if (name === 'purchases') {
              const match = pipeline[0]?.$match || {};
              let matched = purchasesTable.filter(pur => !pur.isArchived);
              if (match.$or) {
                matched = matched.filter(pur => match.$or.some(c => pur.locationId === c.locationId || pur.storeId === c.storeId));
              }
              const totalPurchases = matched.reduce((s, p) => s + p.total, 0);
              return [{
                _id: null,
                totalPurchases,
                purchaseCount: matched.length
              }];
            }
            return [];
          }
        }),
        listIndexes: () => ({
          toArray: async () => indexesMap.get(name) || [{ key: { _id: 1 }, name: "_id_" }]
        }),
        createIndex: async (keys, options) => {
          if (!indexesMap.has(name)) indexesMap.set(name, [{ key: { _id: 1 }, name: "_id_" }]);
          const list = indexesMap.get(name);
          list.push({ key: keys, name: options?.name || Object.keys(keys).join('_') });
          return options?.name || "index_created";
        }
      })
    };

    setupContext(mockDb, null, JWT_SECRET, '/tmp', {}, new Map());

    app = express();
    app.use(express.json());
    app.use('/api/v1/invoices', billingRouter);
    app.use('/api/v1/purchases', purchasesRouter);
    app.use('/api/v1/dashboard', dashboardRouter);
  });

  function getAuthHeader(user) {
    const token = jwt.sign(
      {
        id: user.id || 'usr-1',
        username: user.username || 'admin',
        role: user.role || 'super admin',
        permissions: user.permissions || ['invoices.view', 'purchases.view', 'dashboard.view'],
        assignedStoreId: user.assignedStoreId || 'all',
        tokenVersion: 1
      },
      JWT_SECRET
    );
    return `Bearer ${token}`;
  }

  // 1. Invoice default pagination
  test('1. GET /api/v1/invoices returns paginated envelope with default limit = 50', async () => {
    const res = await request(app)
      .get('/api/v1/invoices')
      .set('Authorization', getAuthHeader({ role: 'super admin' }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.invoices)).toBe(true);
    expect(res.body.invoices.length).toBe(50); // Default limit 50
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(50);
    expect(res.body.pagination.total).toBe(120);
    expect(res.body.pagination.hasNext).toBe(true);
  });

  // 2. Invoice maximum limit enforcement
  test('2. GET /api/v1/invoices caps limit to maximum of 100', async () => {
    const res = await request(app)
      .get('/api/v1/invoices?limit=500')
      .set('Authorization', getAuthHeader({ role: 'super admin' }));

    expect(res.status).toBe(200);
    expect(res.body.invoices.length).toBe(100); // Capped at 100
    expect(res.body.pagination.limit).toBe(100);
  });

  // 3. Invoice store scope enforcement
  test('3. Cashier assigned to store-north receives only store-north invoices', async () => {
    const res = await request(app)
      .get('/api/v1/invoices')
      .set('Authorization', getAuthHeader({ role: 'employee', assignedStoreId: 'store-north' }));

    expect(res.status).toBe(200);
    expect(res.body.invoices.every(inv => inv.locationId === 'store-north')).toBe(true);
  });

  // 4. Invoice date filtering
  test('4. GET /api/v1/invoices filters by startDate and endDate correctly', async () => {
    const startDate = new Date(Date.now() - 20 * 3600000).toISOString();
    const res = await request(app)
      .get(`/api/v1/invoices?startDate=${startDate}`)
      .set('Authorization', getAuthHeader({ role: 'super admin' }));

    expect(res.status).toBe(200);
    expect(res.body.invoices.every(inv => inv.createdAt >= startDate)).toBe(true);
  });

  // 5. Purchase pagination & metadata
  test('5. GET /api/v1/purchases returns paginated envelope with total count', async () => {
    const res = await request(app)
      .get('/api/v1/purchases?page=2&limit=20')
      .set('Authorization', getAuthHeader({ role: 'super admin' }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.purchases.length).toBe(20);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.pagination.limit).toBe(20);
    expect(res.body.pagination.total).toBe(60);
    expect(res.body.pagination.hasNext).toBe(true);
    expect(res.body.pagination.hasPrev).toBe(true);
  });

  // 6. Purchase store scope & supplier filtering
  test('6. GET /api/v1/purchases filters by supplierId and respects store scope', async () => {
    const res = await request(app)
      .get('/api/v1/purchases?supplierId=sup-organic')
      .set('Authorization', getAuthHeader({ role: 'employee', assignedStoreId: 'store-north' }));

    expect(res.status).toBe(200);
    expect(res.body.purchases.every(p => p.supplierId === 'sup-organic' && p.locationId === 'store-north')).toBe(true);
  });

  // 7. Dashboard metrics aggregation pipeline
  test('7. GET /api/v1/dashboard/metrics computes pre-aggregated KPIs server-side', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/metrics')
      .set('Authorization', getAuthHeader({ role: 'super admin' }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metrics).toBeDefined();
    expect(res.body.metrics.totalSales).toBeGreaterThan(0);
    expect(res.body.metrics.netProfit).toBeGreaterThan(0);
    expect(res.body.metrics.totalProducts).toBe(3);
    expect(res.body.metrics.lowStockCount).toBe(1); // Raw Honey stock 4 <= 5
    expect(res.body.metrics.outOfStockCount).toBe(1); // Mustard oil stock 0
    expect(res.body.lowStockWatchlist).toBeDefined();
    expect(res.body.recentInvoices).toBeDefined();
    expect(res.body.recentPurchases).toBeDefined();
  });

  // 8. Dashboard store scoping
  test('8. Dashboard metrics scope calculations strictly to user store', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/metrics')
      .set('Authorization', getAuthHeader({ role: 'employee', assignedStoreId: 'store-north' }));

    expect(res.status).toBe(200);
    expect(res.body.activeStoreId).toBe('store-north');
  });

  // 9. Central Index Manager idempotency
  test('9. DatabaseIndexService idempotently registers all required indexes', async () => {
    const res1 = await databaseIndexService.syncIndexes(mockDb);
    expect(res1.success).toBe(true);
    expect(res1.synced).toBeGreaterThan(0);

    // Second run should verify and skip already created indexes
    const res2 = await databaseIndexService.syncIndexes(mockDb);
    expect(res2.success).toBe(true);
    expect(res2.synced).toBe(0);
    expect(res2.skipped).toBe(res1.synced);
    expect(res2.errors.length).toBe(0);
  });

  // 10. areKeySpecsEquivalent utility verification
  test('10. areKeySpecsEquivalent correctly compares compound index specs', () => {
    expect(databaseIndexService.areKeySpecsEquivalent({ sku: 1 }, { sku: 1 })).toBe(true);
    expect(databaseIndexService.areKeySpecsEquivalent({ locationId: 1, createdAt: -1 }, { locationId: 1, createdAt: -1 })).toBe(true);
    expect(databaseIndexService.areKeySpecsEquivalent({ locationId: 1, createdAt: -1 }, { locationId: 1, createdAt: 1 })).toBe(false);
    expect(databaseIndexService.areKeySpecsEquivalent({ locationId: 1 }, { locationId: 1, createdAt: -1 })).toBe(false);
  });
});
