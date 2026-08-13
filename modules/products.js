const express = require('express');
const { getContext, verifyJWT, validateBody, schemas } = require('./context');
const auditService = require('../services/auditService');

const router = express.Router();

// GET /api/v1/products - Fetch all active products
router.get('/', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const products = await db.collection('products').find({ isArchived: { $ne: true } }).toArray();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/v1/products/:id - Fetch single product
router.get('/:id', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const product = await db.collection('products').findOne({
      $or: [{ id: req.params.id }, { sku: req.params.id }, { barcode: req.params.id }],
      isArchived: { $ne: true }
    });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// POST /api/v1/products - Create or update product
router.post('/', verifyJWT, validateBody(schemas.productSchema), async (req, res) => {
  const { db, io } = getContext();
  const productData = req.validatedBody;

  try {
    const productId = productData.id || `prd-${Date.now()}`;
    const productDoc = {
      ...productData,
      id: productId,
      isArchived: false,
      updatedAt: new Date().toISOString()
    };

    if (!productData.id) {
      productDoc.createdAt = new Date().toISOString();
      await db.collection('products').insertOne(productDoc);
      await auditService.writeAuditLog('product_created', 'inventory', productId, null, productDoc, req);
    } else {
      await db.collection('products').updateOne({ id: productId }, { $set: productDoc });
      await auditService.writeAuditLog('product_updated', 'inventory', productId, null, productDoc, req);
    }

    if (io) io.to('sync_global').emit('product_updated', { productId });
    res.json({ success: true, product: productDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error saving product" });
  }
});

// DELETE /api/v1/products/:id - Soft delete (archive) product
router.delete('/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const productId = req.params.id;

  try {
    await db.collection('products').updateOne(
      { id: productId },
      { $set: { isArchived: true, updatedAt: new Date().toISOString() } }
    );
    await auditService.writeAuditLog('product_archived', 'inventory', productId, null, null, req);
    if (io) io.to('sync_global').emit('product_deleted', { productId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error archiving product" });
  }
});

// POST /api/v1/products/import - Bulk import products
router.post('/import', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const products = req.body.newProducts || req.body.products;
  if (!Array.isArray(products)) {
    return res.status(400).json({ success: false, message: "Products array is required" });
  }

  try {
    for (const prod of products) {
      const productId = prod.id || `prd-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await db.collection('products').updateOne(
        { sku: prod.sku },
        { 
          $set: { ...prod, id: productId, isArchived: false, updatedAt: new Date().toISOString() },
          $setOnInsert: { createdAt: new Date().toISOString() }
        },
        { upsert: true }
      );
    }
    await auditService.writeAuditLog('product_imported', 'inventory', 'bulk', null, { count: products.length }, req);
    if (io) io.to('sync_global').emit('products_imported', { count: products.length });
    res.json({ success: true, imported: products.length });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error importing products" });
  }
});

module.exports = router;
