const express = require('express');
const { getContext, verifyJWT, validateBody, schemas } = require('./context');
const auditService = require('../services/auditService');

const router = express.Router();

/**
 * Helper to sync product_barcodes table consistently
 */
async function syncProductBarcodes(db, productId, primaryBarcode, barcodeList = [], variantList = []) {
  // Remove existing mappings for this product
  await db.collection('product_barcodes').deleteMany({ productId });

  const entries = [];
  const now = new Date().toISOString();
  const seenBarcodes = new Set();

  // 1. Primary barcode mapping
  if (primaryBarcode && String(primaryBarcode).trim()) {
    const cleanPrimary = String(primaryBarcode).trim();
    seenBarcodes.add(cleanPrimary);
    entries.push({
      productId,
      barcode: cleanPrimary,
      type: 'PRIMARY',
      variantId: null,
      variantName: 'Primary Unit',
      active: true,
      createdAt: now,
      updatedAt: now
    });
  }

  // 2. Additional / Alternate / Variant barcode entries
  if (Array.isArray(barcodeList)) {
    for (const b of barcodeList) {
      const code = String(b.barcode || '').trim();
      if (code && !seenBarcodes.has(code)) {
        seenBarcodes.add(code);
        entries.push({
          productId,
          barcode: code,
          type: (b.type || (b.variantName ? 'VARIANT' : 'ALTERNATE')).toUpperCase(),
          variantId: b.variantId || null,
          variantName: b.variantName || 'Alternate Unit',
          active: b.active !== false,
          createdAt: now,
          updatedAt: now
        });
      }
    }
  }

  // 3. Variant object barcodes if variants array present
  if (Array.isArray(variantList)) {
    for (const v of variantList) {
      const vCode = String(v.barcode || '').trim();
      if (vCode && !seenBarcodes.has(vCode)) {
        seenBarcodes.add(vCode);
        entries.push({
          productId,
          barcode: vCode,
          type: 'VARIANT',
          variantId: v.id || `var-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          variantName: v.name || 'Variant',
          active: v.status !== 'inactive',
          createdAt: now,
          updatedAt: now
        });
      }
    }
  }

  if (entries.length > 0) {
    await db.collection('product_barcodes').insertMany(entries);
  }
}

// GET /api/v1/products - Fetch products with optional search, filter, and pagination
router.get('/', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const {
      search,
      category,
      brand,
      sellingMode,
      type,
      status,
      limit,
      page = 1
    } = req.query;

    const filter = {};

    // Soft delete filter: exclude archived unless explicitly requested
    if (status === 'archived') {
      filter.isArchived = true;
    } else if (status === 'all') {
      // return both active and archived
    } else {
      filter.isArchived = { $ne: true };
      if (status && status !== 'active') {
        filter.status = status;
      }
    }

    // Text search by name, SKU, or primary barcode
    if (search && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { name: { $regex: s, $options: 'i' } },
        { sku: { $regex: s, $options: 'i' } },
        { barcode: { $regex: s, $options: 'i' } }
      ];
    }

    // Category filter
    if (category && category.trim()) {
      filter.$or = filter.$or || [];
      const catFilter = [
        { category: category.trim() },
        { categoryId: category.trim() }
      ];
      if (filter.$or.length > 0) {
        filter.$and = [{ $or: filter.$or }, { $or: catFilter }];
        delete filter.$or;
      } else {
        filter.$or = catFilter;
      }
    }

    // Brand filter
    if (brand && brand.trim()) {
      filter.$or = filter.$or || [];
      const brandFilter = [
        { brand: brand.trim() },
        { brandId: brand.trim() }
      ];
      if (filter.$or.length > 0) {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: brandFilter });
      } else {
        filter.$or = brandFilter;
      }
    }

    // Selling mode filter
    if (sellingMode && sellingMode.trim()) {
      filter.sellingMode = sellingMode.trim().toLowerCase();
    }

    // Product type filter (OWN vs EXTERNAL)
    if (type && type.trim()) {
      filter.type = { $regex: new RegExp(`^${type.trim()}$`, 'i') };
    }

    let query = db.collection('products').find(filter).sort({ name: 1 });

    if (limit) {
      const l = Math.min(Math.max(parseInt(limit) || 50, 1), 500);
      const p = Math.max(parseInt(page) || 1, 1);
      query = query.skip((p - 1) * l).limit(l);
    }

    const products = await query.toArray();

    // Standardize canonical and legacy fields
    const normalized = products.map(prod => ({
      ...prod,
      price: prod.sellingPrice !== undefined ? prod.sellingPrice : (prod.price || 0),
      cost: prod.purchasePrice !== undefined ? prod.purchasePrice : (prod.costPrice !== undefined ? prod.costPrice : (prod.cost || 0)),
      sellingPrice: prod.sellingPrice !== undefined ? prod.sellingPrice : (prod.price || 0),
      purchasePrice: prod.purchasePrice !== undefined ? prod.purchasePrice : (prod.costPrice !== undefined ? prod.costPrice : (prod.cost || 0)),
      type: (prod.type || 'OWN').toUpperCase(),
      sellingMode: prod.sellingMode || 'packaged',
      status: prod.status || 'active'
    }));

    res.json(normalized); // Return array directly for backward compatibility
  } catch (err) {
    console.error("Failed to fetch products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/v1/products/by-sku/:sku - Lookup single product by SKU
router.get('/by-sku/:sku', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const product = await db.collection('products').findOne({
      sku: req.params.sku,
      isArchived: { $ne: true }
    });
    if (!product) return res.status(404).json({ success: false, message: "Product not found by SKU" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product by SKU" });
  }
});

// GET /api/v1/products/by-barcode/:barcode - Lookup single product by barcode (primary or variant)
router.get('/by-barcode/:barcode', verifyJWT, async (req, res) => {
  const { db } = getContext();
  const rawBarcode = String(req.params.barcode).trim();
  try {
    // 1. Check primary product document
    let product = await db.collection('products').findOne({
      $or: [{ barcode: rawBarcode }, { sku: rawBarcode }],
      isArchived: { $ne: true }
    });

    // 2. Check product_barcodes lookup table
    if (!product) {
      const mapping = await db.collection('product_barcodes').findOne({
        barcode: rawBarcode,
        active: true
      });
      if (mapping) {
        product = await db.collection('products').findOne({
          id: mapping.productId,
          isArchived: { $ne: true }
        });
        if (product) {
          product.scannedVariantName = mapping.variantName;
          product.scannedBarcodeType = mapping.type;
        }
      }
    }

    if (!product) return res.status(404).json({ success: false, message: "Product not found by barcode" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product by barcode" });
  }
});

// GET /api/v1/products/:id - Fetch single product by ID (with fallback to SKU/Barcode)
router.get('/:id', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const idParam = req.params.id;
    let product = await db.collection('products').findOne({
      id: idParam,
      isArchived: { $ne: true }
    });

    // Fallback for legacy calls querying by sku or barcode via :id
    if (!product) {
      product = await db.collection('products').findOne({
        $or: [{ sku: idParam }, { barcode: idParam }],
        isArchived: { $ne: true }
      });
    }

    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// POST /api/v1/products - Create or update product master
router.post('/', verifyJWT, validateBody(schemas.productSchema), async (req, res) => {
  const { db, io } = getContext();
  const productData = req.validatedBody;

  try {
    const productId = productData.id || `prd-${Date.now()}`;
    const primaryBarcode = (productData.barcode || productData.sku || '').trim();
    const cleanSku = (productData.sku || '').trim();

    // 1. SKU Uniqueness check
    const existingSku = await db.collection('products').findOne({
      sku: cleanSku,
      id: { $ne: productId },
      isArchived: { $ne: true }
    });
    if (existingSku) {
      return res.status(409).json({
        success: false,
        code: "PRODUCT_SKU_ALREADY_EXISTS",
        message: `Product SKU '${cleanSku}' is already registered to product '${existingSku.name}'`
      });
    }

    // 2. Barcode Uniqueness check across products and product_barcodes
    if (primaryBarcode) {
      const conflictProduct = await db.collection('products').findOne({
        barcode: primaryBarcode,
        id: { $ne: productId },
        isArchived: { $ne: true }
      });
      if (conflictProduct) {
        return res.status(409).json({
          success: false,
          code: "PRODUCT_BARCODE_ALREADY_EXISTS",
          message: `Primary barcode '${primaryBarcode}' already belongs to product '${conflictProduct.name}'`
        });
      }

      const conflictMapping = await db.collection('product_barcodes').findOne({
        barcode: primaryBarcode,
        productId: { $ne: productId },
        active: true
      });
      if (conflictMapping) {
        return res.status(409).json({
          success: false,
          code: "PRODUCT_BARCODE_ALREADY_EXISTS",
          message: `Barcode '${primaryBarcode}' is already registered as an alternate/variant barcode for another product`
        });
      }
    }

    // Check additional barcodes uniqueness
    if (Array.isArray(productData.barcodes)) {
      for (const b of productData.barcodes) {
        const bCode = String(b.barcode || '').trim();
        if (bCode) {
          const conflict = await db.collection('product_barcodes').findOne({
            barcode: bCode,
            productId: { $ne: productId },
            active: true
          });
          if (conflict) {
            return res.status(409).json({
              success: false,
              code: "PRODUCT_BARCODE_ALREADY_EXISTS",
              message: `Variant barcode '${bCode}' is already registered to another active product`
            });
          }
        }
      }
    }

    // Canonical price normalization
    const sellingPrice = productData.sellingPrice !== undefined ? productData.sellingPrice : (productData.price || 0);
    const purchasePrice = productData.purchasePrice !== undefined ? productData.purchasePrice : (productData.costPrice !== undefined ? productData.costPrice : (productData.cost || 0));

    const productDoc = {
      ...productData,
      id: productId,
      sku: cleanSku,
      barcode: primaryBarcode,
      sellingPrice,
      purchasePrice,
      price: sellingPrice,      // legacy alias
      cost: purchasePrice,      // legacy alias
      costPrice: purchasePrice, // legacy alias
      type: (productData.type || 'OWN').toUpperCase(),
      sellingMode: productData.sellingMode || 'packaged',
      status: productData.status || 'active',
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

    // Synchronize product_barcodes table
    await syncProductBarcodes(
      db,
      productId,
      primaryBarcode,
      productData.barcodes || [],
      productData.variants || []
    );

    if (io) io.to('sync_global').emit('product_updated', { productId });
    res.json({ success: true, product: productDoc });
  } catch (err) {
    console.error("Failed to save product:", err);
    res.status(500).json({ success: false, message: "Server error saving product" });
  }
});

// DELETE /api/v1/products/:id - Soft delete (archive) product
router.delete('/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const productId = req.params.id;

  try {
    const result = await db.collection('products').updateOne(
      { id: productId },
      { $set: { isArchived: true, status: 'archived', updatedAt: new Date().toISOString() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Deactivate barcode mappings so barcode can be freed
    await db.collection('product_barcodes').updateMany(
      { productId },
      { $set: { active: false, updatedAt: new Date().toISOString() } }
    );

    await auditService.writeAuditLog('product_archived', 'inventory', productId, null, null, req);
    if (io) io.to('sync_global').emit('product_deleted', { productId });
    res.json({ success: true, message: "Product archived successfully" });
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
    let importedCount = 0;
    const now = new Date().toISOString();

    for (const prod of products) {
      if (!prod.sku || !prod.name) continue;

      const productId = prod.id || `prd-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const cleanSku = String(prod.sku).trim();
      const primaryBarcode = String(prod.barcode || cleanSku).trim();
      const sellingPrice = prod.sellingPrice !== undefined ? prod.sellingPrice : (prod.price || 0);
      const purchasePrice = prod.purchasePrice !== undefined ? prod.purchasePrice : (prod.costPrice !== undefined ? prod.costPrice : (prod.cost || 0));

      const productDoc = {
        ...prod,
        id: productId,
        sku: cleanSku,
        barcode: primaryBarcode,
        sellingPrice,
        purchasePrice,
        price: sellingPrice,
        cost: purchasePrice,
        costPrice: purchasePrice,
        type: (prod.type || 'OWN').toUpperCase(),
        sellingMode: prod.sellingMode || 'packaged',
        status: prod.status || 'active',
        isArchived: false,
        updatedAt: now
      };

      await db.collection('products').updateOne(
        { sku: cleanSku },
        {
          $set: productDoc,
          $setOnInsert: { createdAt: now }
        },
        { upsert: true }
      );

      await syncProductBarcodes(db, productId, primaryBarcode, prod.barcodes || [], prod.variants || []);
      importedCount++;
    }

    await auditService.writeAuditLog('product_imported', 'inventory', 'bulk', null, { count: importedCount }, req);
    if (io) io.to('sync_global').emit('products_imported', { count: importedCount });
    res.json({ success: true, imported: importedCount });
  } catch (err) {
    console.error("Bulk import failed:", err);
    res.status(500).json({ success: false, message: "Server error importing products" });
  }
});

module.exports = router;
