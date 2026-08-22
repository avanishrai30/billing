const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { setupContext, getContext, verifyJWT } = require('../modules/context');
const authRouter = require('../modules/auth');
const usersRouter = require('../modules/users');
const billingRouter = require('../modules/billing');
const purchasesRouter = require('../modules/purchases');
const inventoryRouter = require('../modules/inventory');
const productsRouter = require('../modules/products');
const settingsRouter = require('../modules/settings');
const auditRouter = require('../modules/audit');
const authzService = require('../services/authzService');
const auditService = require('../services/auditService');

describe('Stage 10: RBAC, User Access, Audit & Security Hardening', () => {
  let app;
  let mockDb;
  let usersTable;
  let invoicesTable;
  let purchasesTable;
  let inventoryTable;
  let productsTable;
  let auditLogsTable;
  let rolePermissionsTable;
  const JWT_SECRET = 'test_rbac_secret_2026_xyz';

  beforeEach(() => {
    usersTable = new Map();
    invoicesTable = new Map();
    purchasesTable = new Map();
    inventoryTable = new Map();
    productsTable = new Map();
    auditLogsTable = [];
    rolePermissionsTable = new Map();

    mockDb = {
      collection: (name) => ({
        findOne: async (query) => {
          if (name === 'users') {
            if (query.id) return usersTable.get(query.id) || null;
            if (query.$or) {
              for (const cond of query.$or) {
                for (const u of usersTable.values()) {
                  if (cond.username && u.username.toLowerCase() === cond.username.toLowerCase()) return u;
                  if (cond.email && u.email && u.email.toLowerCase() === cond.email.toLowerCase()) return u;
                }
              }
            }
            return null;
          }
          if (name === 'invoices') {
            for (const inv of invoicesTable.values()) {
              if (query.invoiceNumber === inv.invoiceNumber || query.id === inv.id || (query.$or && query.$or.some(c => c.invoiceNumber === inv.invoiceNumber || c.id === inv.id))) {
                if (query.locationId && inv.locationId !== query.locationId && inv.storeId !== query.locationId) return null;
                return inv;
              }
            }
            return null;
          }
          if (name === 'purchases') {
            for (const p of purchasesTable.values()) {
              if (query.id === p.id || query.purchaseId === p.purchaseId || (query.$or && query.$or.some(c => c.id === p.id || c.purchaseId === p.purchaseId))) {
                if (query.locationId && p.locationId !== query.locationId && p.storeId !== query.locationId) return null;
                return p;
              }
            }
            return null;
          }
          if (name === 'products') {
            for (const p of productsTable.values()) {
              if (query.id === p.id || query.sku === p.sku || query.barcode === p.barcode) return p;
            }
            return null;
          }
          if (name === 'role_permissions') {
            return rolePermissionsTable.get(query.key) || null;
          }
          if (name === 'stores' || name === 'businesses') {
            return { id: query.id || 'store-blr-1', name: 'Bengaluru Outlet' };
          }
          return null;
        },
        find: (query = {}) => ({
          sort: () => ({
            skip: () => ({
              limit: (n) => ({
                toArray: async () => auditLogsTable.slice(0, n)
              })
            }),
            limit: (n) => ({
              toArray: async () => auditLogsTable.slice(0, n)
            }),
            toArray: async () => auditLogsTable
          }),
          project: () => ({
            toArray: async () => Array.from(usersTable.values())
          }),
          toArray: async () => {
            if (name === 'invoices') {
              return Array.from(invoicesTable.values()).filter(inv => {
                if (query.isArchived && inv.isArchived) return false;
                if (query.$or) {
                  return query.$or.some(c => c.locationId === inv.locationId || c.storeId === inv.storeId || c.businessId === inv.businessId);
                }
                return true;
              });
            }
            if (name === 'purchases') {
              return Array.from(purchasesTable.values()).filter(p => {
                if (query.isArchived && p.isArchived) return false;
                if (query.$or) {
                  return query.$or.some(c => c.locationId === p.locationId || c.storeId === p.storeId);
                }
                return true;
              });
            }
            return [];
          }
        }),
        insertOne: async (doc) => {
          if (name === 'users') usersTable.set(doc.id, doc);
          if (name === 'invoices') invoicesTable.set(doc.id || doc.invoiceNumber, doc);
          if (name === 'purchases') purchasesTable.set(doc.id || doc.purchaseId, doc);
          if (name === 'audit_logs') auditLogsTable.push(doc);
          if (name === 'products') productsTable.set(doc.id, doc);
          return { insertedId: doc.id || doc._id };
        },
        updateOne: async (filter, update) => {
          if (name === 'users') {
            const current = usersTable.get(filter.id);
            if (current) {
              if (update.$set) Object.assign(current, update.$set);
              if (update.$inc) {
                for (const [k, v] of Object.entries(update.$inc)) {
                  current[k] = (current[k] || 0) + v;
                }
              }
              usersTable.set(filter.id, current);
            }
          }
          if (name === 'invoices') {
            for (const [k, inv] of invoicesTable.entries()) {
              if (inv._id === filter._id || inv.id === filter.id) {
                if (update.$set) Object.assign(inv, update.$set);
              }
            }
          }
          if (name === 'purchases') {
            for (const [k, p] of purchasesTable.entries()) {
              if (p._id === filter._id || p.id === filter.id) {
                if (update.$set) Object.assign(p, update.$set);
              }
            }
          }
          if (name === 'role_permissions') {
            const current = rolePermissionsTable.get(filter.key) || { key: filter.key };
            if (update.$set) Object.assign(current, update.$set);
            rolePermissionsTable.set(filter.key, current);
          }
        },
        updateMany: async () => ({ modifiedCount: 1 }),
        deleteOne: async () => ({ deletedCount: 1 }),
        deleteMany: async () => ({ deletedCount: 1 })
      })
    };

    setupContext(mockDb, null, JWT_SECRET, '', {}, new Map());

    // Pre-populate test users
    const hash = bcrypt.hashSync('Password123!', 10);
    usersTable.set('usr-super-1', {
      id: 'usr-super-1',
      username: 'superadmin',
      name: 'Global Super Admin',
      role: 'Super Admin',
      category: 'super admin',
      assignedStoreId: 'all',
      status: 'active',
      passwordHash: hash,
      tokenVersion: 1
    });

    usersTable.set('usr-admin-1', {
      id: 'usr-admin-1',
      username: 'storeadmin',
      name: 'Store Manager',
      role: 'Admin',
      category: 'admin',
      assignedStoreId: 'store-blr-1',
      status: 'active',
      passwordHash: hash,
      tokenVersion: 1
    });

    usersTable.set('usr-cashier-1', {
      id: 'usr-cashier-1',
      username: 'cashier1',
      name: 'Cashier Staff',
      role: 'Employee',
      category: 'employee',
      assignedStoreId: 'store-blr-1',
      status: 'active',
      passwordHash: hash,
      tokenVersion: 1
    });

    usersTable.set('usr-deact-1', {
      id: 'usr-deact-1',
      username: 'inactiveuser',
      name: 'Deactivated User',
      role: 'Employee',
      category: 'employee',
      assignedStoreId: 'store-blr-1',
      status: 'suspended',
      passwordHash: hash,
      tokenVersion: 1
    });

    // Pre-populate an invoice in Store B
    invoicesTable.set('INV-STORE-B-001', {
      id: 'INV-STORE-B-001',
      invoiceNumber: 'INV-STORE-B-001',
      locationId: 'store-chn-2',
      storeId: 'store-chn-2',
      grandTotal: 1500,
      status: 'PAID',
      isArchived: false,
      items: [{ productId: 'prd-1', quantity: 2, price: 750 }]
    });

    // Create test Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/users', usersRouter);
    app.use('/api/v1/invoices', billingRouter);
    app.use('/api/v1/purchases', purchasesRouter);
    app.use('/api/v1/inventory', inventoryRouter);
    app.use('/api/v1/products', productsRouter);
    app.use('/api/v1', settingsRouter);
    app.use('/api/v1/audit-logs', auditRouter);
  });

  function generateToken(user, tokenVersion = 1) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        category: user.category,
        assignedStoreId: user.assignedStoreId,
        tokenVersion
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  describe('1. Authentication & Token Lifecycle Tests', () => {
    test('1. Unauthenticated request to protected route returns 401', async () => {
      const res = await request(app).get('/api/v1/users');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('2. Authenticated unauthorized user receives 403 Forbidden', async () => {
      const cashier = usersTable.get('usr-cashier-1');
      const token = generateToken(cashier);

      // Cashier does not have 'users.view' or 'roles.update'
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('3. Authorized Super Admin successfully accesses protected route', async () => {
      const superAdmin = usersTable.get('usr-super-1');
      const token = generateToken(superAdmin);

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('4. Deactivated (suspended) user cannot authenticate at login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'inactiveuser', password: 'Password123!' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });

    test('5. Password change increments tokenVersion and invalidates old JWT immediately', async () => {
      const cashier = usersTable.get('usr-cashier-1');
      const oldToken = generateToken(cashier, 1);

      // Verify old token works initially for basic info
      const preCheck = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${oldToken}`);
      expect(preCheck.status).toBe(200);

      // Change password
      const changeRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${oldToken}`)
        .send({ currentPassword: 'Password123!', newPassword: 'NewSecurePassword456!' });
      expect(changeRes.status).toBe(200);
      expect(changeRes.body.success).toBe(true);

      // User tokenVersion in DB is now 2
      expect(usersTable.get('usr-cashier-1').tokenVersion).toBe(2);

      // Old token with version 1 must now be rejected with 401 SESSION_REVOKED
      const postCheck = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${oldToken}`);
      expect(postCheck.status).toBe(401);
      expect(postCheck.body.error.code).toBe('SESSION_REVOKED');
    });
  });

  describe('1B. Enterprise User Access Persistence Tests', () => {
    test('6. User category updates persist and refresh active JWT authorization without logout', async () => {
      const admin = usersTable.get('usr-admin-1');
      const cashier = usersTable.get('usr-cashier-1');
      const adminToken = generateToken(admin);
      const cashierToken = generateToken(cashier);

      const before = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(before.status).toBe(403);

      const updateRes = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: cashier.id,
          name: cashier.name,
          username: cashier.username,
          role: 'Branch Admin',
          category: 'admin',
          assignedStoreId: cashier.assignedStoreId,
          assignedStores: [cashier.assignedStoreId],
          status: 'active'
        });

      expect(updateRes.status).toBe(200);
      expect(usersTable.get('usr-cashier-1').category).toBe('admin');

      const verifyRes = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.user.category).toBe('admin');
      expect(verifyRes.body.user.permissions).toContain('users.view');

      const after = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(after.status).toBe(200);
    });

    test('7. User grant and deny overrides are enforced for existing sessions', async () => {
      const superAdmin = usersTable.get('usr-super-1');
      const cashier = usersTable.get('usr-cashier-1');
      const superToken = generateToken(superAdmin);
      const cashierToken = generateToken(cashier);

      const grantRes = await request(app)
        .post('/api/v1/users/usr-cashier-1/permissions')
        .set('Authorization', `Bearer ${superToken}`)
        .send({ permissionGrants: ['users.view'], permissionDenies: ['invoices.create'] });

      expect(grantRes.status).toBe(200);
      expect(grantRes.body.permissions.permissionGrants).toContain('users.view');
      expect(grantRes.body.permissions.permissionDenies).toContain('invoices.create');
      expect(grantRes.body.permissions.effectivePermissions).toContain('users.view');
      expect(grantRes.body.permissions.effectivePermissions).not.toContain('invoices.create');

      const usersRes = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(usersRes.status).toBe(200);

      const invoiceRes = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          invoiceNumber: 'INV-DENIED-001',
          locationId: 'store-blr-1',
          storeId: 'store-blr-1',
          items: []
        });
      expect(invoiceRes.status).toBe(403);
    });

    test('8. Non-super admins cannot create or promote Super Admin accounts', async () => {
      const admin = usersTable.get('usr-admin-1');
      const cashier = usersTable.get('usr-cashier-1');
      const adminToken = generateToken(admin);

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: cashier.id,
          name: cashier.name,
          username: cashier.username,
          role: 'Super Admin',
          category: 'super admin',
          assignedStoreId: 'all',
          assignedStores: ['all'],
          status: 'active'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('SUPER_ADMIN_REQUIRED');
      expect(usersTable.get('usr-cashier-1').category).toBe('employee');
    });

    test('9. Super Admin cannot demote or deactivate the final Super Admin account', async () => {
      const superAdmin = usersTable.get('usr-super-1');
      const superToken = generateToken(superAdmin);

      const demoteRes = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${superToken}`)
        .send({
          id: superAdmin.id,
          name: superAdmin.name,
          username: superAdmin.username,
          role: 'Admin',
          category: 'admin',
          assignedStoreId: 'all',
          assignedStores: ['all'],
          status: 'active'
        });

      expect(demoteRes.status).toBe(403);
      expect(demoteRes.body.error.code).toBe('SELF_DEMOTION_FORBIDDEN');

      const deactivateRes = await request(app)
        .post('/api/v1/users/usr-super-1/deactivate')
        .set('Authorization', `Bearer ${superToken}`);

      expect(deactivateRes.status).toBe(403);
      expect(deactivateRes.body.error.code).toBe('SELF_DEACTIVATION_FORBIDDEN');
      expect(usersTable.get('usr-super-1').status).toBe('active');
    });
  });

  describe('2. Store-Scope & POS / Purchase Security Tests', () => {
    test('6. Store A user cannot access or void Store B invoice (Store Scoping)', async () => {
      const cashierA = usersTable.get('usr-cashier-1'); // assigned to store-blr-1
      const token = generateToken(cashierA);

      // Try to void Store B invoice
      const res = await request(app)
        .post('/api/v1/invoices/INV-STORE-B-001/void')
        .set('Authorization', `Bearer ${token}`);

      // Cashier is both missing invoices.void AND store scope
      expect(res.status).toBe(403);
    });

    test('7. Cashier cannot void POS invoice without invoices.void permission', async () => {
      const cashier = usersTable.get('usr-cashier-1');
      const token = generateToken(cashier);

      // Add an invoice in cashier's own store
      invoicesTable.set('INV-STORE-A-001', {
        id: 'INV-STORE-A-001',
        invoiceNumber: 'INV-STORE-A-001',
        locationId: 'store-blr-1',
        storeId: 'store-blr-1',
        grandTotal: 500,
        status: 'PAID',
        isArchived: false,
        items: []
      });

      const res = await request(app)
        .post('/api/v1/invoices/INV-STORE-A-001/void')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('8. Authorized Admin with invoices.void permission can void invoice in their store', async () => {
      const admin = usersTable.get('usr-admin-1'); // assigned to store-blr-1
      const token = generateToken(admin);

      invoicesTable.set('INV-STORE-A-002', {
        id: 'INV-STORE-A-002',
        invoiceNumber: 'INV-STORE-A-002',
        locationId: 'store-blr-1',
        storeId: 'store-blr-1',
        grandTotal: 1200,
        status: 'PAID',
        isArchived: false,
        items: []
      });

      const res = await request(app)
        .post('/api/v1/invoices/INV-STORE-A-002/void')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(invoicesTable.get('INV-STORE-A-002').status).toBe('VOIDED');
    });

    test('9. Store A user cannot transfer inventory from unauthorized Store B', async () => {
      const adminA = usersTable.get('usr-admin-1'); // assigned to store-blr-1
      const token = generateToken(adminA);

      const res = await request(app)
        .post('/api/v1/inventory/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: 'prd-ghee-1',
          fromLocationId: 'store-chn-2', // Store B (unauthorized for this user)
          toLocationId: 'store-blr-1',
          quantity: 5
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('STORE_ACCESS_DENIED');
    });
  });

  describe('3. Product Master & Bulk Import Security Tests', () => {
    test('10. Cashier without products.import.commit permission cannot commit bulk import', async () => {
      const cashier = usersTable.get('usr-cashier-1');
      const token = generateToken(cashier);

      const res = await request(app)
        .post('/api/v1/products/import/commit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          importId: 'imp-unauth-test',
          rows: []
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('11. Authorized Manager/Admin can commit bulk product import', async () => {
      const admin = usersTable.get('usr-admin-1');
      const token = generateToken(admin);

      const res = await request(app)
        .post('/api/v1/products/import/commit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          importId: 'imp-auth-test',
          rows: [
            {
              rowNumber: 1,
              status: 'READY',
              normalizedData: {
                productName: 'Organic Mustard Oil 1L',
                sku: 'SKU-MUSTARD-AUTH',
                sellingPrice: 280,
                purchasePrice: 200,
                openingStock: 0
              }
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('4. Settings, Role Management & Audit Trail Tests', () => {
    test('12. Audit endpoint requires audit.view permission', async () => {
      const cashier = usersTable.get('usr-cashier-1');
      const token = generateToken(cashier);

      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('13. Role permission matrix update requires roles.update permission', async () => {
      const cashier = usersTable.get('usr-cashier-1');
      const token = generateToken(cashier);

      const res = await request(app)
        .post('/api/v1/role-permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissions: { admin: ['dashboard'] } });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('14. Security authorization denial generates AUTHORIZATION_DENIED audit log entry', async () => {
      const cashier = usersTable.get('usr-cashier-1');
      const token = generateToken(cashier);

      // Trigger 403 authorization denial
      await request(app)
        .post('/api/v1/role-permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissions: {} });

      // Verify audit trail captured the denial
      const deniedLog = auditLogsTable.find(l => l.eventType === 'AUTHORIZATION_DENIED');
      expect(deniedLog).toBeDefined();
      expect(deniedLog.entity).toBe('security');
      expect(deniedLog.performedBy).toBe('cashier1');
    });
  });
});
