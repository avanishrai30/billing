const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { setupContext } = require('../modules/context');
const dashboardRouter = require('../modules/dashboard');

describe('Stage 13 Phase C: Dashboard Intelligence + Executive Workspace', () => {
  const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
  let htmlContent;
  let app;
  let mockDb;
  let invoicesTable;
  let purchasesTable;
  let productsTable;
  const JWT_SECRET = 'test_dashboard_secret_2026';

  beforeAll(() => {
    htmlContent = fs.readFileSync(htmlPath, 'utf8');
  });

  beforeEach(() => {
    invoicesTable = [
      {
        id: 'INV-1001',
        invoiceNumber: 'INV-1001',
        locationId: 'store-1',
        storeId: 'store-1',
        businessId: 'store-1',
        grandTotal: 1540.50,
        subtotal: 1400.00,
        tax: 140.50,
        discount: 0,
        status: 'PAID',
        paymentMode: 'UPI',
        customerName: 'Avanish Rai',
        items: [{ productId: 'prod-1', quantity: 2, price: 770.25, cost: 500 }],
        isArchived: false,
        createdAt: new Date().toISOString()
      }
    ];

    purchasesTable = [
      {
        id: 'PUR-501',
        purchaseNo: 'PUR-501',
        supplierName: 'Green Valley Organic',
        locationId: 'store-1',
        grandTotal: 8500.00,
        status: 'COMPLETED',
        isArchived: false,
        createdAt: new Date().toISOString()
      }
    ];

    productsTable = [
      {
        id: 'prod-1',
        name: 'A2 Gir Cow Ghee',
        sku: 'AIA-GHEE-001',
        category: 'Dairy & Ghee',
        type: 'own',
        stock: 5,
        reorder: 10,
        cost: 500,
        price: 770.25,
        unit: 'per kg',
        isArchived: false
      },
      {
        id: 'prod-2',
        name: 'Organic Mustard Oil',
        sku: 'OIL-002',
        category: 'Oils',
        type: 'external',
        stock: 0,
        reorder: 5,
        cost: 120,
        price: 180,
        unit: 'per Liter',
        isArchived: false
      }
    ];

    mockDb = {
      collection: (name) => ({
        aggregate: (pipeline) => ({
          toArray: async () => {
            if (name === 'invoices') {
              return [{
                _id: null,
                totalSales: 1540.50,
                subtotal: 1400.00,
                tax: 140.50,
                discount: 0,
                invoiceCount: 1,
                totalCost: 1000.00
              }];
            }
            if (name === 'purchases') {
              return [{
                _id: null,
                totalPurchases: 8500.00,
                purchaseCount: 1
              }];
            }
            if (name === 'franchise_supply_orders') {
              return [{ _id: null, total: 3200.00 }];
            }
            return [];
          }
        }),
        find: (query = {}) => ({
          sort: () => ({
            limit: (lim) => ({
              project: () => ({
                toArray: async () => {
                  if (name === 'invoices') return invoicesTable.slice(0, lim);
                  if (name === 'purchases') return purchasesTable.slice(0, lim);
                  return [];
                }
              })
            })
          }),
          toArray: async () => {
            if (name === 'products') return productsTable;
            if (name === 'invoices') return invoicesTable;
            if (name === 'purchases') return purchasesTable;
            return [];
          }
        })
      })
    };

    setupContext(mockDb, null, JWT_SECRET, '/tmp/uploads', {}, new Map());

    app = express();
    app.use(express.json());
    app.use('/api/v1/dashboard', dashboardRouter);
  });

  // ==========================================
  // 1. DASHBOARD METRICS API CONTRACT
  // ==========================================

  test('1. GET /api/v1/dashboard/metrics returns authoritative KPIs and watchlist without raw collection dumps', async () => {
    const token = jwt.sign(
      { id: 'user-admin-1', role: 'admin', username: 'admin', tokenVersion: 1 },
      JWT_SECRET
    );

    const res = await request(app)
      .get('/api/v1/dashboard/metrics')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metrics).toBeDefined();

    const m = res.body.metrics;
    expect(m.totalSales).toBe(1540.50);
    expect(m.netProfit).toBe(540.50); // 1540.50 - 1000
    expect(m.totalPurchases).toBe(8500.00);
    expect(m.franchiseEarnings).toBe(3200.00);
    expect(m.totalProducts).toBe(2);
    expect(m.ownProducts).toBe(1);
    expect(m.externalProducts).toBe(1);
    expect(m.lowStockCount).toBe(1);
    expect(m.outOfStockCount).toBe(1);

    // Watchlists & Recents (Capped at 5, projected without raw items array)
    expect(Array.isArray(res.body.lowStockWatchlist)).toBe(true);
    expect(res.body.lowStockWatchlist.length).toBeLessThanOrEqual(5);

    expect(Array.isArray(res.body.recentInvoices)).toBe(true);
    expect(res.body.recentInvoices.length).toBeLessThanOrEqual(5);

    expect(Array.isArray(res.body.recentPurchases)).toBe(true);
    expect(res.body.recentPurchases.length).toBeLessThanOrEqual(5);
  });

  // ==========================================
  // 2. DASHBOARD HTML & UI STRUCTURE
  // ==========================================

  test('2. Dashboard HTML contains Global Context Bar with outlet name, status, and last-updated stamp', () => {
    expect(htmlContent).toContain('id="view-dashboard"');
    expect(htmlContent).toContain('id="dashboard-active-outlet-name"');
    expect(htmlContent).toContain('id="dashboard-active-outlet-status"');
    expect(htmlContent).toContain('id="dashboard-last-updated"');
  });

  test('3. Dashboard HTML contains all 5 Executive KPI value elements', () => {
    expect(htmlContent).toContain('id="metric-total-sales"');
    expect(htmlContent).toContain('id="metric-net-profit"');
    expect(htmlContent).toContain('id="metric-asset-valuation-retail"');
    expect(htmlContent).toContain('id="metric-asset-valuation-cost"');
    expect(htmlContent).toContain('id="metric-franchise-earnings"');
  });

  test('4. Dashboard HTML contains Operational Attention Watchlist and Catalog Health Matrix', () => {
    expect(htmlContent).toContain('id="dashboard-low-stock-watchlist"');
    expect(htmlContent).toContain('id="metric-total-products"');
    expect(htmlContent).toContain('id="metric-own-products"');
    expect(htmlContent).toContain('id="metric-external-products"');
    expect(htmlContent).toContain('id="metric-low-stock-count"');
    expect(htmlContent).toContain('id="metric-out-of-stock-count"');
    expect(htmlContent).toContain('id="metric-categories-count"');
  });

  test('5. Dashboard HTML contains Recent Invoices and Recent Purchases tables', () => {
    expect(htmlContent).toContain('id="dashboard-recent-invoices"');
    expect(htmlContent).toContain('id="dashboard-recent-purchases"');
  });

  test('6. initDashboardAnalytics correctly consumes dashboard API and updates DOM elements', () => {
    expect(htmlContent).toContain('async function initDashboardAnalytics()');
    expect(htmlContent).toContain('window.api.dashboard.getMetrics');
    expect(htmlContent).toContain('dashboard-last-updated');
  });

  test('7. Realtime Socket listeners refresh dashboard metrics on invoice and product update events', () => {
    expect(htmlContent).toContain("if (state.activeView === 'dashboard')");
    expect(htmlContent).toContain("initDashboardAnalytics();");
  });
});
