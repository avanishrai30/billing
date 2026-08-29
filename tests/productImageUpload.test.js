const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { setupContext } = require('../modules/context');
const uploadRouter = require('../modules/upload');

const JWT_SECRET = 'product-image-upload-test-secret';
const ONE_PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function getByPath(doc, pathKey) {
  return pathKey.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), doc);
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
      continue;
    }

    if (actual !== val) return false;
  }
  return true;
}

function createMockDb() {
  const tables = new Map();

  function table(name) {
    if (!tables.has(name)) tables.set(name, []);
    return tables.get(name);
  }

  return {
    table,
    collection(name) {
      const rows = table(name);
      return {
        async findOne(filter = {}) {
          return rows.find(row => matchesFilter(row, filter)) || null;
        },
        async insertOne(doc) {
          const next = { _id: doc._id || `${name}-${rows.length + 1}`, ...doc };
          rows.push(next);
          return { acknowledged: true, insertedId: next._id };
        },
        async updateOne(filter = {}, update = {}) {
          const doc = rows.find(row => matchesFilter(row, filter));
          if (!doc) return { matchedCount: 0, modifiedCount: 0 };
          if (update.$set) Object.assign(doc, update.$set);
          return { matchedCount: 1, modifiedCount: 1 };
        }
      };
    }
  };
}

describe('Product image upload association', () => {
  let app;
  let db;
  let uploadRoot;
  let authHeader;

  beforeEach(async () => {
    db = createMockDb();
    uploadRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'product-image-upload-'));
    setupContext(db, null, JWT_SECRET, uploadRoot, {
      products: path.join(uploadRoot, 'products'),
      users: path.join(uploadRoot, 'users'),
      stores: path.join(uploadRoot, 'stores'),
      businesses: path.join(uploadRoot, 'businesses'),
      logos: path.join(uploadRoot, 'logos')
    }, new Map());

    await db.collection('users').insertOne({
      id: 'usr-admin',
      username: 'admin',
      role: 'Super Admin',
      category: 'super admin',
      assignedStoreId: 'all',
      status: 'active',
      tokenVersion: 1
    });
    await db.collection('products').insertOne({
      id: 'prod-ghee-1',
      name: 'A2 Cow Ghee',
      sku: 'GHEE-1',
      isArchived: false
    });

    authHeader = `Bearer ${jwt.sign({
      id: 'usr-admin',
      username: 'admin',
      tokenVersion: 1
    }, JWT_SECRET)}`;

    app = express();
    app.use(express.json({ limit: '5mb' }));
    app.use('/api/v1/upload', uploadRouter);
  });

  afterEach(() => {
    fs.rmSync(uploadRoot, { recursive: true, force: true });
  });

  test('product upload with valid productId returns 200 and associates product_images record', async () => {
    const res = await request(app)
      .post('/api/v1/upload?type=products&productId=prod-ghee-1')
      .set('Authorization', authHeader)
      .send({ fileName: 'A2 Ghee.png', base64Data: ONE_PIXEL_PNG });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.productId).toBe('prod-ghee-1');
    expect(res.body.imagePath).toMatch(/^\/uploads\/products\/a2-ghee-\d+\.webp$/);

    const image = db.table('product_images')[0];
    expect(image.productId).toBe('prod-ghee-1');
    expect(image.productId).not.toBe('');
    expect(fs.existsSync(image.filepath)).toBe(true);

    const product = await db.collection('products').findOne({ id: 'prod-ghee-1' });
    expect(product.image).toBe(res.body.imagePath);
    expect(product.imageId).toBe(res.body.imageId);
  });

  test('product upload without productId returns 400 and creates no product_images row', async () => {
    const res = await request(app)
      .post('/api/v1/upload?type=products')
      .set('Authorization', authHeader)
      .send({ fileName: 'A2 Ghee.png', base64Data: ONE_PIXEL_PNG });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PRODUCT_ID_REQUIRED');
    expect(db.table('product_images')).toHaveLength(0);
  });

  test('product upload with invalid productId returns 400 and creates no product_images row', async () => {
    const res = await request(app)
      .post('/api/v1/upload?type=products&productId=missing-product')
      .set('Authorization', authHeader)
      .send({ fileName: 'A2 Ghee.png', base64Data: ONE_PIXEL_PNG });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PRODUCT_MASTER_NOT_FOUND');
    expect(db.table('product_images')).toHaveLength(0);
  });

  test('existing user, store, and business/logo uploads remain unaffected by productId validation', async () => {
    const res = await request(app)
      .post('/api/v1/upload?type=users')
      .set('Authorization', authHeader)
      .send({ fileName: 'Profile.png', base64Data: ONE_PIXEL_PNG });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.imagePath).toMatch(/^\/uploads\/users\/profile-\d+\.webp$/);
    expect(res.body.productId).toBeUndefined();
    expect(db.table('product_images')).toHaveLength(0);
    expect(fs.existsSync(path.join(uploadRoot, 'users'))).toBe(true);

    const storeRes = await request(app)
      .post('/api/v1/upload?type=stores')
      .set('Authorization', authHeader)
      .send({ fileName: 'Store.png', base64Data: ONE_PIXEL_PNG });

    expect(storeRes.status).toBe(200);
    expect(storeRes.body.imagePath).toMatch(/^\/uploads\/stores\/store-\d+\.webp$/);

    const logoRes = await request(app)
      .post('/api/v1/upload?type=logos')
      .set('Authorization', authHeader)
      .send({ fileName: 'Business Logo.png', base64Data: ONE_PIXEL_PNG });

    expect(logoRes.status).toBe(200);
    expect(logoRes.body.imagePath).toMatch(/^\/uploads\/logos\/business-logo-\d+\.webp$/);
    expect(db.table('product_images')).toHaveLength(0);
  });
});
