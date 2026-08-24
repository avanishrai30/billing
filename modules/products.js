const express = require('express');
const { getContext, verifyJWT, validateBody, schemas } = require('./context');
const { requirePermission, requireAnyPermission, requireStoreScope } = require('../services/authzService');
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
router.get('/', verifyJWT, requirePermission('products.view'), async (req, res) => {
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

// GET /api/v1/products/by-sku/:sku - Exact SKU lookup
router.get('/by-sku/:sku', verifyJWT, requirePermission('products.view'), async (req, res) => {
  const { db } = getContext();
  try {
    const product = await db.collection('products').findOne({
      sku: req.params.sku.trim(),
      isArchived: { $ne: true }
    });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product by SKU" });
  }
});

// GET /api/v1/products/by-barcode/:barcode - Universal Barcode resolver
router.get('/by-barcode/:barcode', verifyJWT, requirePermission('products.view'), async (req, res) => {
  const { db } = getContext();
  const cleanBarcode = req.params.barcode.trim();

  try {
    // 1. Direct match on primary barcode or SKU
    let product = await db.collection('products').findOne({
      $or: [{ barcode: cleanBarcode }, { sku: cleanBarcode }],
      isArchived: { $ne: true }
    });

    // 2. Secondary match in product_barcodes table
    if (!product) {
      const mapping = await db.collection('product_barcodes').findOne({
        barcode: cleanBarcode,
        active: true
      });
      if (mapping) {
        product = await db.collection('products').findOne({
          id: mapping.productId,
          isArchived: { $ne: true }
        });
        if (product) {
          product.matchedVariantName = mapping.variantName;
          product.matchedBarcodeType = mapping.type;
        }
      }
    }

    if (!product) return res.status(404).json({ success: false, message: "Barcode not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product by barcode" });
  }
});

/**
 * Helper to generate next unique AIA barcode sequence atomically via MongoDB counters
 */
async function generateNextAIABarcodeAtomic(db) {
  // Initialize sequence counter if not present
  const existingCounter = await db.collection('counters').findOne({ _id: 'product_barcode_sequence' });
  if (!existingCounter) {
    const products = await db.collection('products').find({ barcode: { $regex: /^AIA\d+$/i } }, { projection: { barcode: 1 } }).toArray();
    const barcodeMappings = await db.collection('product_barcodes').find({ barcode: { $regex: /^AIA\d+$/i } }, { projection: { barcode: 1 } }).toArray();

    let maxNum = 0;
    const checkNum = (code) => {
      if (typeof code === 'string' && code.toUpperCase().startsWith('AIA')) {
        const numPart = code.substring(3);
        if (/^\d+$/.test(numPart)) {
          const val = parseInt(numPart, 10);
          if (val > maxNum) maxNum = val;
        }
      }
    };

    products.forEach(p => checkNum(p.barcode));
    barcodeMappings.forEach(b => checkNum(b.barcode));

    await db.collection('counters').updateOne(
      { _id: 'product_barcode_sequence' },
      { $setOnInsert: { seq: maxNum, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  }

  let candidate = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 50) {
    attempts++;
    const res = await db.collection('counters').findOneAndUpdate(
      { _id: 'product_barcode_sequence' },
      { $inc: { seq: 1 }, $set: { updatedAt: new Date().toISOString() } },
      { returnDocument: 'after', upsert: true }
    );

    const doc = res ? (res.value || res) : null;
    const seqNum = doc && typeof doc.seq === 'number' ? doc.seq : (Date.now() % 1000000);
    candidate = 'AIA' + String(seqNum).padStart(6, '0');

    const conflictProd = await db.collection('products').findOne({
      $or: [{ barcode: candidate }, { sku: candidate }],
      isArchived: { $ne: true }
    });
    const conflictMapping = await db.collection('product_barcodes').findOne({
      barcode: candidate,
      active: true
    });

    if (!conflictProd && !conflictMapping) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    candidate = `AIA${Date.now().toString().slice(-6)}`;
  }

  return candidate;
}

// POST /api/v1/products/barcodes - Atomically generate & reserve next unique AIA barcode
router.post('/barcodes', verifyJWT, requirePermission('products.create'), async (req, res) => {
  const { db } = getContext();
  try {
    const barcode = await generateNextAIABarcodeAtomic(db);
    res.json({ success: true, barcode });
  } catch (err) {
    console.error("Failed to generate unique barcode:", err);
    res.status(500).json({ success: false, message: "Server error generating unique barcode" });
  }
});

// POST & GET /api/v1/products/generate-barcode - Compatibility endpoints for barcode generation
router.post('/generate-barcode', verifyJWT, requirePermission('products.create'), async (req, res) => {
  const { db } = getContext();
  try {
    const barcode = await generateNextAIABarcodeAtomic(db);
    res.json({ success: true, barcode });
  } catch (err) {
    console.error("Failed to generate unique barcode:", err);
    res.status(500).json({ success: false, message: "Server error generating unique barcode" });
  }
});

router.get('/generate-barcode', verifyJWT, requirePermission('products.create'), async (req, res) => {
  const { db } = getContext();
  try {
    const barcode = await generateNextAIABarcodeAtomic(db);
    res.json({ success: true, barcode });
  } catch (err) {
    console.error("Failed to generate unique barcode:", err);
    res.status(500).json({ success: false, message: "Server error generating unique barcode" });
  }
});

// GET /api/v1/products/:id/batches - Fetch batches & lots for a product
router.get('/:id/batches', verifyJWT, requirePermission('products.view'), async (req, res) => {
  const { db } = getContext();
  const productId = req.params.id;

  try {
    const product = await db.collection('products').findOne({
      $or: [{ id: productId }, { sku: productId }],
      isArchived: { $ne: true }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const batches = await db.collection('product_batches')
      .find({
        productId: product.id,
        status: { $ne: 'archived' }
      })
      .sort({ expiryDate: 1, createdAt: -1 })
      .toArray();

    // If no explicit batches recorded, synthesize opening stock batch if product has doe/dom
    if (batches.length === 0 && (product.doe || product.dom || product.lotNumber)) {
      batches.push({
        id: `batch-opening-${product.id}`,
        batchId: `batch-opening-${product.id}`,
        productId: product.id,
        lotNumber: product.lotNumber || 'LOT-OPENING',
        manufactureDate: product.dom || undefined,
        expiryDate: product.doe || undefined,
        receivedQuantity: product.stock || 0,
        remainingQuantity: product.stock || 0,
        unitCost: product.costPrice || product.purchasePrice || product.cost || 0,
        sellingPrice: product.sellingPrice || product.price || 0,
        status: 'active',
        isOpeningBatch: true,
        createdAt: product.createdAt || new Date().toISOString()
      });
    }

    res.json({ success: true, batches, productId: product.id });
  } catch (err) {
    console.error("Failed to fetch product batches:", err);
    res.status(500).json({ success: false, message: "Failed to fetch product batches" });
  }
});

// POST /api/v1/products/:id/batches - Create / record a new batch for a product
router.post('/:id/batches', verifyJWT, requirePermission('products.update'), async (req, res) => {
  const { db } = getContext();
  const productId = req.params.id;
  const {
    lotNumber,
    manufactureDate,
    expiryDate,
    receivedQuantity = 0,
    remainingQuantity,
    unitCost,
    sellingPrice,
    storeId,
    notes
  } = req.body;

  if (!lotNumber || !String(lotNumber).trim()) {
    return res.status(400).json({ success: false, message: "Lot/Batch number is required" });
  }

  try {
    const product = await db.collection('products').findOne({
      $or: [{ id: productId }, { sku: productId }],
      isArchived: { $ne: true }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const cleanLot = String(lotNumber).trim();
    const batchId = `bat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const batchDoc = {
      id: batchId,
      batchId,
      productId: product.id,
      lotNumber: cleanLot,
      manufactureDate: manufactureDate || null,
      expiryDate: expiryDate || null,
      receivedQuantity: parseFloat(receivedQuantity) || 0,
      remainingQuantity: remainingQuantity !== undefined ? parseFloat(remainingQuantity) : (parseFloat(receivedQuantity) || 0),
      unitCost: unitCost !== undefined ? parseFloat(unitCost) : (product.purchasePrice || 0),
      sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : (product.sellingPrice || 0),
      storeId: storeId || 'all',
      notes: notes || '',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: req.user ? req.user.username : 'system'
    };

    await db.collection('product_batches').insertOne(batchDoc);
    await auditService.writeAuditLog('batch_created', 'inventory', batchId, null, batchDoc, req);

    res.json({ success: true, batch: batchDoc });
  } catch (err) {
    console.error("Failed to create product batch:", err);
    res.status(500).json({ success: false, message: "Failed to create product batch" });
  }
});

// GET /api/v1/products/:id - Fetch single product master record
router.get('/:id', verifyJWT, requirePermission('products.view'), async (req, res) => {
  const { db } = getContext();
  try {
    const product = await db.collection('products').findOne({
      $or: [{ id: req.params.id }, { sku: req.params.id }],
      isArchived: { $ne: true }
    });

    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// POST /api/v1/products - Create or update product master
router.post('/', verifyJWT, validateBody(schemas.productSchema), async (req, res, next) => {
  const isUpdating = !!req.validatedBody.id;
  const perm = isUpdating ? 'products.update' : 'products.create';
  return requirePermission(perm)(req, res, next);
}, async (req, res) => {
  const { db, io } = getContext();
  const productData = req.validatedBody;

  try {
    const productId = productData.id || `prd-${Date.now()}`;
    const cleanBarcode = (productData.barcode !== undefined && productData.barcode !== null) ? String(productData.barcode).trim() : '';
    const primaryBarcode = cleanBarcode !== '' ? cleanBarcode : null;
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

    // 2. Barcode Uniqueness check across products and product_barcodes (ONLY for non-empty barcodes)
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
          message: "Barcode already belongs to another product."
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
          message: "Barcode already belongs to another product."
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
              message: "Barcode already belongs to another product."
            });
          }
        }
      }
    }

    // Canonical price normalization
    const sellingPrice = productData.sellingPrice !== undefined ? productData.sellingPrice : (productData.price || 0);
    const purchasePrice = productData.purchasePrice !== undefined ? productData.purchasePrice : (productData.costPrice !== undefined ? productData.costPrice : (productData.cost || 0));

    // Barcode Source Resolution
    let resolvedSource = null;
    if (primaryBarcode) {
      if (productData.barcodeSource && ['AIAVRO', 'EXTERNAL', 'MANUAL'].includes(productData.barcodeSource)) {
        resolvedSource = productData.barcodeSource;
      } else if (primaryBarcode.toUpperCase().startsWith('AIA')) {
        resolvedSource = 'AIAVRO';
      } else if ((productData.type || 'OWN').toUpperCase() === 'EXTERNAL') {
        resolvedSource = 'EXTERNAL';
      } else {
        resolvedSource = 'MANUAL';
      }
    }

    const defaultExpiryDate = (productData.defaultExpiryDate || productData.doe || '').trim() || null;

    const productDoc = {
      ...productData,
      id: productId,
      sku: cleanSku,
      sellingPrice,
      purchasePrice,
      price: sellingPrice,      // legacy alias
      cost: purchasePrice,      // legacy alias
      costPrice: purchasePrice, // legacy alias
      type: (productData.type || 'OWN').toUpperCase(),
      sellingMode: productData.sellingMode || 'packaged',
      status: productData.status || 'active',
      barcodeSource: resolvedSource,
      barcodeType: productData.barcodeType || 'PRIMARY',
      isArchived: false,
      updatedAt: new Date().toISOString()
    };

    if (defaultExpiryDate) {
      productDoc.defaultExpiryDate = defaultExpiryDate;
      productDoc.doe = defaultExpiryDate;
    } else {
      delete productDoc.defaultExpiryDate;
      delete productDoc.doe;
    }

    if (primaryBarcode) {
      productDoc.barcode = primaryBarcode;
    } else {
      delete productDoc.barcode;
      delete productDoc.barcodeSource;
    }

    let finalPrimaryBarcode = primaryBarcode;

    if (!productData.id) {
      productDoc.createdAt = new Date().toISOString();
      await db.collection('products').insertOne(productDoc);
      await auditService.writeAuditLog('product_created', 'inventory', productId, null, productDoc, req);
    } else {
      const existingProduct = await db.collection('products').findOne({ id: productId });
      const updatePayload = { $set: productDoc };

      if (!defaultExpiryDate) {
        updatePayload.$unset = { ...updatePayload.$unset, defaultExpiryDate: "", doe: "" };
      }

      if (!primaryBarcode) {
        if (existingProduct && existingProduct.barcode) {
          // Preserve existing valid barcode when incoming barcode is blank/null
          productDoc.barcode = existingProduct.barcode;
          productDoc.barcodeSource = existingProduct.barcodeSource || (existingProduct.barcode.toUpperCase().startsWith('AIA') ? 'AIAVRO' : 'MANUAL');
          updatePayload.$set.barcode = existingProduct.barcode;
          updatePayload.$set.barcodeSource = productDoc.barcodeSource;
          finalPrimaryBarcode = existingProduct.barcode;
        } else {
          updatePayload.$unset = { ...updatePayload.$unset, barcode: "", barcodeSource: "" };
        }
      }

      await db.collection('products').updateOne({ id: productId }, updatePayload);
      await auditService.writeAuditLog('product_updated', 'inventory', productId, null, productDoc, req);
    }

    // Synchronize product_barcodes table (only if a valid barcode exists)
    await syncProductBarcodes(
      db,
      productId,
      finalPrimaryBarcode,
      productData.barcodes || [],
      productData.variants || []
    );

    if (io) {
      const realtimeService = require('../services/realtimeService');
      const envelope = realtimeService.createEventEnvelope('product', 'updated', productId, null, { product: productDoc });
      io.to('sync_global').emit('product_updated', envelope);
    }
    res.json({ success: true, product: productDoc });
  } catch (err) {
    if (err && (err.code === 11000 || String(err.message).includes('E11000'))) {
      const isBarcode = String(err.message).includes('barcode');
      return res.status(409).json({
        success: false,
        code: isBarcode ? "PRODUCT_BARCODE_ALREADY_EXISTS" : "PRODUCT_SKU_ALREADY_EXISTS",
        message: isBarcode ? "Barcode already belongs to another product." : "Product SKU is already registered."
      });
    }
    console.error("Failed to save product:", err);
    res.status(500).json({ success: false, message: "Server error saving product" });
  }
});

// DELETE /api/v1/products/:id - Soft delete (archive) product
router.delete('/:id', verifyJWT, requirePermission('products.archive'), async (req, res) => {
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
    if (io) {
      const realtimeService = require('../services/realtimeService');
      const envelope = realtimeService.createEventEnvelope('product', 'archived', productId, null, { productId });
      io.to('sync_global').emit('product_deleted', envelope);
    }
    res.json({ success: true, message: "Product archived successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error archiving product" });
  }
});

// ==================== STAGE 09 INTELLIGENT BULK IMPORT ENDPOINTS ====================
const bulkImportService = require('../services/bulkImportService');

// POST /api/v1/products/import/preview - Read-only Pre-validation & Preview
router.post('/import/preview', verifyJWT, requirePermission('products.import.preview'), async (req, res) => {
  const { db } = getContext();
  const rawRows = req.body.rows || req.body.products || req.body.newProducts;
  if (!Array.isArray(rawRows)) {
    return res.status(400).json({ success: false, message: "Rows array is required for preview" });
  }

  try {
    const previewResult = await bulkImportService.validateAndPreview(db, rawRows, {
      columnMapping: req.body.columnMapping,
      importId: req.body.importId,
      strategy: req.body.strategy,
      defaultLocationId: req.body.defaultLocationId || req.user?.assignedStoreId || 'default',
      confirmedAmbiguousMappings: req.body.confirmedAmbiguousMappings || []
    });

    res.json(previewResult);
  } catch (err) {
    console.error("[BulkImport] Preview error:", err);
    res.status(500).json({ success: false, message: err.message || "Error generating import preview" });
  }
});

// POST /api/v1/products/import/commit - Transactional Batch Commit with Authoritative Inventory
router.post('/import/commit', verifyJWT, requirePermission('products.import.commit'), requireStoreScope(req => req.body.options?.defaultLocationId || req.body.defaultLocationId), async (req, res) => {
  const { db, io } = getContext();
  const { importId, rows, options } = req.body;
  if (!importId || !Array.isArray(rows)) {
    return res.status(400).json({ success: false, message: "importId and rows array are required for commit" });
  }

  try {
    const commitResult = await bulkImportService.commitImport(
      db,
      io,
      importId,
      rows,
      options || {},
      req.user,
      req
    );

    res.json(commitResult);
  } catch (err) {
    console.error("[BulkImport] Commit error:", err);
    res.status(500).json({ success: false, message: err.message || "Error executing import commit" });
  }
});

// GET /api/v1/products/import/:importId - Status of an import session
router.get('/import/:importId', verifyJWT, requirePermission('products.import.preview'), async (req, res) => {
  const { db } = getContext();
  try {
    const session = await db.collection('import_sessions').findOne({ importId: req.params.importId });
    if (!session) return res.status(404).json({ success: false, message: "Import session not found" });
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching import session status" });
  }
});

// GET /api/v1/products/import/:importId/errors - Detailed error log for an import session
router.get('/import/:importId/errors', verifyJWT, requirePermission('products.import.preview'), async (req, res) => {
  const { db } = getContext();
  try {
    const session = await db.collection('import_sessions').findOne({ importId: req.params.importId });
    if (!session) return res.status(404).json({ success: false, message: "Import session not found" });
    res.json({ success: true, errors: session.summary?.errors || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching import error log" });
  }
});

// POST /api/v1/products/import - Legacy Wrapper (backward-compatible)
router.post('/import', verifyJWT, requirePermission('products.import.commit'), requireStoreScope(req => req.user?.assignedStoreId), async (req, res) => {
  const { db, io } = getContext();
  const products = req.body.newProducts || req.body.products;
  if (!Array.isArray(products)) {
    return res.status(400).json({ success: false, message: "Products array is required" });
  }

  try {
    const importId = `imp-leg-${Date.now()}`;
    const preview = await bulkImportService.validateAndPreview(db, products, {
      strategy: 'ADD_AND_UPDATE',
      defaultLocationId: req.user?.assignedStoreId || 'default'
    });

    const commitResult = await bulkImportService.commitImport(
      db,
      io,
      importId,
      preview.rows,
      { strategy: 'ADD_AND_UPDATE', defaultLocationId: req.user?.assignedStoreId || 'default' },
      req.user,
      req
    );

    res.json({
      success: true,
      imported: (commitResult.summary.imported || 0) + (commitResult.summary.updated || 0),
      summary: commitResult.summary
    });
  } catch (err) {
    console.error("Bulk import failed:", err);
    res.status(500).json({ success: false, message: "Server error importing products" });
  }
});

module.exports = router;
module.exports.syncProductBarcodes = syncProductBarcodes;

