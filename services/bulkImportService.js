const inventoryService = require('./inventoryService');
const auditService = require('./auditService');

// Canonical Header Alias Map
const HEADER_ALIASES = {
  productName: [
    'productname', 'name', 'itemname', 'title', 'product', 'item', 'description',
    'itemdescription', 'particulars', 'productservice', 'nameofitem', 'producttitle',
    'itemdesc', 'item_name', 'product_name', 'item_description'
  ],
  sku: [
    'sku', 'productsku', 'itemsku', 'skucode', 'itemcode', 'code', 'productcode',
    'item_sku', 'product_sku', 'item_code'
  ],
  barcode: [
    'barcode', 'barcodenumber', 'upc', 'ean', 'gtin', 'bar_code', 'barcode_number',
    'eancode', 'upccode', 'primarybarcode'
  ],
  category: [
    'category', 'categoryname', 'group', 'type', 'section', 'class', 'itemcategory',
    'productcategory', 'category_name', 'item_category'
  ],
  brand: [
    'brand', 'brandname', 'company', 'manufacturer', 'make', 'brand_name'
  ],
  supplier: [
    'supplier', 'suppliername', 'vendor', 'source', 'distributor', 'supplier_name'
  ],
  type: [
    'producttype', 'ownexternal', 'ownership', 'itemtype', 'type'
  ],
  unit: [
    'unit', 'uom', 'pack', 'packaging', 'measure', 'size', 'package', 'packsize'
  ],
  weight: [
    'weight', 'volume', 'netweight', 'quantityperpack', 'netweightvolume'
  ],
  weightUnit: [
    'weightunit', 'volumeunit', 'measurementunit'
  ],
  purchasePrice: [
    'purchaseprice', 'buyingprice', 'costprice', 'cost', 'buying', 'cp',
    'unitcost', 'purchase', 'wholesale', 'wholesaleprice', 'purchase_price', 'buying_price', 'cost_price'
  ],
  sellingPrice: [
    'sellingprice', 'saleprice', 'retailprice', 'price', 'mrp', 'sp', 'rate',
    'retail', 'selling', 'selling_price', 'sale_price', 'retail_price', 'unitprice'
  ],
  mrp: [
    'mrp', 'maximumretailprice', 'maxprice', 'listprice'
  ],
  gst: [
    'gst', 'gstslab', 'tax', 'vat', 'taxrate', 'gstrate', 'gst_rate', 'tax_rate'
  ],
  openingStock: [
    'openingstock', 'stock', 'initialstock', 'qty', 'quantity', 'count',
    'onhand', 'initialquantity', 'opening_stock', 'initial_stock'
  ],
  store: [
    'store', 'location', 'outlet', 'locationid', 'storeid', 'branch',
    'store_name', 'location_name', 'outlet_name'
  ],
  reorderLevel: [
    'reorderlevel', 'reorder', 'minstock', 'safety', 'threshold', 'min_stock'
  ],
  maxStock: [
    'maxstock', 'limit', 'maxcapacity', 'max_stock'
  ],
  dom: [
    'dom', 'mfgdate', 'manufacturingdate', 'mfg', 'dateofmfg', 'mfg_date'
  ],
  doe: [
    'doe', 'expiry', 'expdate', 'expirydate', 'useby', 'exp_date'
  ],
  imageUrl: [
    'imageurl', 'image', 'imagepath', 'productimage', 'picture', 'photo', 'image_url'
  ],
  description: [
    'longdescription', 'details', 'notes', 'remarks', 'productdetails'
  ],
  sellingMode: [
    'sellingmode', 'mode', 'weightmode', 'selling_mode'
  ]
};

// Clean string key for alias lookup (strips BOM, special chars, whitespace)
function cleanHeaderKey(key) {
  if (!key) return '';
  return String(key)
    .replace(/^\uFEFF/, '') // Strip Byte Order Mark (BOM)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Auto-detect matching canonical field for a raw spreadsheet column header
function detectCanonicalField(rawHeader) {
  const clean = cleanHeaderKey(rawHeader);
  if (!clean) return null;

  for (const [canonicalField, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(clean)) {
      return canonicalField;
    }
  }
  return null;
}

// Generate automatic column mapping from array of raw headers
function autoMapHeaders(rawHeaders = []) {
  const mapping = {};
  const usedCanonical = new Set();

  for (const header of rawHeaders) {
    const canonical = detectCanonicalField(header);
    if (canonical && !usedCanonical.has(canonical)) {
      mapping[header] = canonical;
      usedCanonical.add(canonical);
    } else {
      mapping[header] = 'ignore';
    }
  }
  return mapping;
}

// Normalize a single raw row object using column mapping
function normalizeRowData(rawRow, columnMapping = {}) {
  const normalized = {
    productName: '',
    sku: '',
    barcode: '',
    category: 'Dairy & Ghee',
    brand: 'VC Organic',
    supplier: 'Direct Farmer Market',
    type: 'OWN',
    unit: '1 Unit',
    weight: 0,
    weightUnit: 'g',
    purchasePrice: 0,
    sellingPrice: 0,
    mrp: 0,
    gst: 5,
    openingStock: 0,
    store: 'default',
    reorderLevel: 10,
    maxStock: 100,
    dom: new Date().toISOString().split('T')[0],
    doe: '',
    imageUrl: '',
    description: '',
    sellingMode: 'packaged'
  };

  for (const [rawCol, val] of Object.entries(rawRow)) {
    const canonicalField = columnMapping[rawCol] || detectCanonicalField(rawCol);
    if (canonicalField && canonicalField !== 'ignore' && val !== undefined && val !== null) {
      const strVal = String(val).trim();
      switch (canonicalField) {
        case 'purchasePrice':
        case 'sellingPrice':
        case 'mrp':
        case 'weight':
          normalized[canonicalField] = parseFloat(strVal) || 0;
          break;
        case 'openingStock':
        case 'reorderLevel':
        case 'maxStock':
          normalized[canonicalField] = parseFloat(strVal) || 0;
          break;
        case 'gst':
          normalized.gst = parseInt(strVal, 10) || 0;
          break;
        case 'type':
          normalized.type = strVal.toUpperCase().includes('EXT') ? 'EXTERNAL' : 'OWN';
          break;
        case 'sellingMode':
          normalized.sellingMode = strVal.toLowerCase().includes('loose') || strVal.toLowerCase().includes('weight') ? 'loose' : 'packaged';
          break;
        default:
          normalized[canonicalField] = strVal;
      }
    }
  }

  // Derive MRP if empty
  if (!normalized.mrp && normalized.sellingPrice > 0) {
    normalized.mrp = normalized.sellingPrice;
  }

  // Barcode / SKU fallback derivation
  if (!normalized.sku && normalized.barcode) {
    normalized.sku = normalized.barcode;
  }
  if (!normalized.barcode && normalized.sku) {
    normalized.barcode = normalized.sku;
  }

  return normalized;
}

/**
 * Validate and simulate import (Read-Only Preview)
 */
async function validateAndPreview(db, rawRows = [], options = {}) {
  const columnMapping = options.columnMapping || autoMapHeaders(Object.keys(rawRows[0] || {}));
  const importId = options.importId || `imp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const defaultLocationId = options.defaultLocationId || 'default';
  const strategy = options.strategy || 'ADD_AND_UPDATE'; // 'ADD_AND_UPDATE', 'ADD_NEW_ONLY', 'UPDATE_EXISTING_ONLY'

  const processedRows = [];
  let readyCount = 0;
  let newCount = 0;
  let existingCount = 0;
  let conflictCount = 0;
  let invalidCount = 0;
  let warningCount = 0;

  const seenBarcodesInBatch = new Map();
  const seenSkusInBatch = new Map();

  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    const rowNumber = i + 1;
    const row = normalizeRowData(rawRow, columnMapping);
    const issues = [];
    const warnings = [];
    let classification = 'NEW';
    let matchedProduct = null;

    // 1. Mandatory Validations
    if (!row.productName) {
      issues.push({ field: 'productName', code: 'MISSING_NAME', message: 'Product name is required' });
    }

    if (row.sellingPrice <= 0 && row.purchasePrice <= 0) {
      issues.push({ field: 'sellingPrice', code: 'INVALID_PRICE', message: 'Selling price and purchase price must be greater than zero' });
    }

    const validGsts = [0, 5, 12, 18, 28];
    if (!validGsts.includes(row.gst)) {
      warnings.push({ field: 'gst', code: 'UNUSUAL_GST', message: `GST rate ${row.gst}% is non-standard. Valid slabs: 0, 5, 12, 18, 28%` });
    }

    // Auto-generate barcode/sku if missing
    if (!row.barcode && !row.sku) {
      row.barcode = `VC${String(Date.now()).slice(-6)}${rowNumber}`;
      row.sku = row.barcode;
      warnings.push({ field: 'barcode', code: 'AUTO_GENERATED_BARCODE', message: `Auto-generated barcode ${row.barcode}` });
    }

    // 2. Intra-Batch Duplicate Check
    if (row.barcode) {
      if (seenBarcodesInBatch.has(row.barcode)) {
        issues.push({
          field: 'barcode',
          code: 'DUPLICATE_BARCODE_IN_BATCH',
          message: `Barcode '${row.barcode}' appears multiple times in spreadsheet (first seen at row ${seenBarcodesInBatch.get(row.barcode)})`
        });
      } else {
        seenBarcodesInBatch.set(row.barcode, rowNumber);
      }
    }

    if (row.sku) {
      if (seenSkusInBatch.has(row.sku)) {
        issues.push({
          field: 'sku',
          code: 'DUPLICATE_SKU_IN_BATCH',
          message: `SKU '${row.sku}' appears multiple times in spreadsheet (first seen at row ${seenSkusInBatch.get(row.sku)})`
        });
      } else {
        seenSkusInBatch.set(row.sku, rowNumber);
      }
    }

    // 3. Database Matching Priority (Exact Barcode -> Exact SKU -> Variant Barcode -> Variant SKU)
    if (db && row.barcode) {
      // 3.1 Check barcode table / primary product barcode
      const barcodeRecord = await db.collection('product_barcodes').findOne({ barcode: row.barcode });
      if (barcodeRecord) {
        matchedProduct = await db.collection('products').findOne({ id: barcodeRecord.productId });
      } else {
        matchedProduct = await db.collection('products').findOne({ barcode: row.barcode });
      }
    }

    if (db && !matchedProduct && row.sku) {
      // 3.2 Check SKU match
      matchedProduct = await db.collection('products').findOne({ sku: row.sku });
    }

    // 4. Classify Row & Detect Cross-Product Conflicts
    if (matchedProduct) {
      classification = 'EXISTING';

      // Verify that if both barcode and SKU are supplied, they don't belong to two different products
      if (db && row.sku && matchedProduct.sku !== row.sku) {
        const skuProduct = await db.collection('products').findOne({ sku: row.sku });
        if (skuProduct && skuProduct.id !== matchedProduct.id) {
          issues.push({
            field: 'sku',
            code: 'SKU_CROSS_PRODUCT_CONFLICT',
            message: `Barcode belongs to '${matchedProduct.name}' but SKU '${row.sku}' belongs to '${skuProduct.name}'`
          });
          classification = 'CONFLICT';
        }
      }

      // Check price changes
      if (row.sellingPrice !== matchedProduct.sellingPrice || row.purchasePrice !== matchedProduct.purchasePrice) {
        warnings.push({
          field: 'price',
          code: 'PRICE_CHANGE',
          message: `Price change detected: Purchase ₹${matchedProduct.purchasePrice} -> ₹${row.purchasePrice}, Selling ₹${matchedProduct.sellingPrice} -> ₹${row.sellingPrice}`
        });
        if (classification !== 'CONFLICT') classification = 'UPDATE';
      }
    } else if (db && row.productName) {
      // Check if product with identical name exists under a different barcode (Notice: DO NOT auto-merge)
      const nameMatch = await db.collection('products').findOne({ name: { $regex: new RegExp(`^${row.productName.trim()}$`, 'i') } });
      if (nameMatch) {
        warnings.push({
          field: 'productName',
          code: 'POSSIBLE_NAME_MATCH',
          message: `Product with similar name '${nameMatch.name}' already exists with different barcode '${nameMatch.barcode}'. Will create as distinct new product.`
        });
      }
    }

    // 5. Store / Location Resolution
    let resolvedLocationId = defaultLocationId;
    if (row.store && row.store !== 'default' && db) {
      const storeDoc = await db.collection('stores').findOne({
        $or: [{ id: row.store }, { name: { $regex: new RegExp(`^${row.store.trim()}$`, 'i') } }]
      });
      if (storeDoc) {
        resolvedLocationId = storeDoc.id;
      } else {
        const bizDoc = await db.collection('businesses').findOne({
          $or: [{ id: row.store }, { name: { $regex: new RegExp(`^${row.store.trim()}$`, 'i') } }]
        });
        if (bizDoc) {
          resolvedLocationId = bizDoc.id;
        } else if (row.openingStock > 0) {
          warnings.push({
            field: 'store',
            code: 'UNKNOWN_STORE_FALLBACK',
            message: `Store '${row.store}' not found. Opening stock will allocate to default store '${defaultLocationId}'.`
          });
        }
      }
    }

    // 6. Strategy Filtering
    let isBlockedByStrategy = false;
    if (strategy === 'ADD_NEW_ONLY' && (classification === 'EXISTING' || classification === 'UPDATE')) {
      classification = 'SKIPPED';
      isBlockedByStrategy = true;
    } else if (strategy === 'UPDATE_EXISTING_ONLY' && classification === 'NEW') {
      classification = 'SKIPPED';
      isBlockedByStrategy = true;
    }

    // 7. Overall Row Status
    let status = 'READY';
    if (classification === 'CONFLICT') {
      status = 'CONFLICT';
      conflictCount++;
    } else if (issues.length > 0) {
      status = 'INVALID';
      invalidCount++;
    } else if (classification === 'SKIPPED') {
      status = 'SKIPPED';
    } else {
      readyCount++;
      if (classification === 'NEW') newCount++;
      if (classification === 'EXISTING' || classification === 'UPDATE') existingCount++;
    }

    if (warnings.length > 0) warningCount++;

    processedRows.push({
      rowNumber,
      status,
      classification,
      isBlockedByStrategy,
      rawRow,
      normalizedData: {
        ...row,
        resolvedLocationId,
        matchedProductId: matchedProduct ? matchedProduct.id : null
      },
      issues,
      warnings
    });
  }

  return {
    success: true,
    importId,
    strategy,
    summary: {
      totalRows: rawRows.length,
      readyRows: readyCount,
      newRows: newCount,
      existingRows: existingCount,
      conflictRows: conflictCount,
      invalidRows: invalidCount,
      warningRows: warningCount
    },
    columnMapping,
    rows: processedRows
  };
}

/**
 * Commit Import Execution (Transactional Batch Mutations + Authoritative Inventory)
 */
async function commitImport(db, io, importId, validatedRows = [], options = {}, user = null, req = null) {
  if (!importId) {
    throw new Error("importId is required for commit execution");
  }

  // Idempotency: Prevent duplicate execution of same import session
  const existingSession = await db.collection('import_sessions').findOne({ importId });
  if (existingSession && existingSession.status === 'COMPLETED') {
    return {
      success: true,
      importId,
      status: 'COMPLETED',
      duplicate: true,
      summary: existingSession.summary
    };
  }

  const username = user ? user.username : 'system';
  const now = new Date().toISOString();

  // Create or update import session record
  await db.collection('import_sessions').updateOne(
    { importId },
    {
      $set: {
        importId,
        status: 'PROCESSING',
        strategy: options.strategy || 'ADD_AND_UPDATE',
        startedBy: username,
        updatedAt: now
      },
      $setOnInsert: {
        createdAt: now,
        totalRows: validatedRows.length
      }
    },
    { upsert: true }
  );

  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let inventoryMovementsCount = 0;
  const errorLogs = [];
  const successfulProducts = [];

  // Group opening stock items by target location for batch allocation
  const stockByLocation = new Map();

  for (const item of validatedRows) {
    if (item.status === 'INVALID' || item.status === 'CONFLICT' || item.status === 'SKIPPED') {
      skippedCount++;
      continue;
    }

    const row = item.normalizedData;
    const rowNum = item.rowNumber;

    try {
      // 1. Server-side Revalidation
      const existingBarcode = await db.collection('product_barcodes').findOne({ barcode: row.barcode });
      if (existingBarcode && (!row.matchedProductId || existingBarcode.productId !== row.matchedProductId)) {
        throw new Error(`Server revalidation failed: Barcode '${row.barcode}' was assigned to another product concurrently.`);
      }

      const productId = row.matchedProductId || `prd-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const cleanSku = String(row.sku || row.barcode).trim();
      const primaryBarcode = String(row.barcode || cleanSku).trim();

      const productDoc = {
        id: productId,
        name: row.productName,
        sku: cleanSku,
        barcode: primaryBarcode,
        category: row.category || 'Dairy & Ghee',
        brand: row.brand || 'VC Organic',
        supplier: row.supplier || 'Direct Farmer Market',
        type: (row.type || 'OWN').toUpperCase(),
        unit: row.unit || '1 Unit',
        weight: row.weight || 0,
        weightUnit: row.weightUnit || 'g',
        purchasePrice: row.purchasePrice,
        sellingPrice: row.sellingPrice,
        mrp: row.mrp || row.sellingPrice,
        cost: row.purchasePrice, // legacy alias
        price: row.sellingPrice, // legacy alias
        costPrice: row.purchasePrice, // legacy alias
        gst: row.gst,
        reorderLevel: row.reorderLevel || 10,
        maxStock: row.maxStock || 100,
        dom: row.dom || now.split('T')[0],
        doe: row.doe || '',
        image: row.imageUrl || '/uploads/system/default-product.webp',
        description: row.description || '',
        sellingMode: row.sellingMode || 'packaged',
        status: 'active',
        isArchived: false,
        updatedAt: now
      };

      // 2. Persist Product Master
      const isExisting = !!row.matchedProductId;
      await db.collection('products').updateOne(
        { id: productId },
        {
          $set: productDoc,
          $setOnInsert: { createdAt: now }
        },
        { upsert: true }
      );

      // 3. Synchronize Barcode Registry
      const { syncProductBarcodes } = require('../modules/products');
      if (typeof syncProductBarcodes === 'function') {
        await syncProductBarcodes(db, productId, primaryBarcode, [], []);
      }

      if (isExisting) {
        updatedCount++;
        await auditService.writeAuditLog('PRODUCT_UPDATED', 'inventory', productId, null, productDoc, req);
      } else {
        importedCount++;
        await auditService.writeAuditLog('PRODUCT_CREATED', 'inventory', productId, null, productDoc, req);
      }

      successfulProducts.push(productDoc);

      // 4. Queue Opening Stock for Authoritative Inventory Allocation
      if (row.openingStock > 0) {
        const locId = row.resolvedLocationId || options.defaultLocationId || 'default';
        if (!stockByLocation.has(locId)) {
          stockByLocation.set(locId, []);
        }
        stockByLocation.get(locId).push({
          productId,
          name: row.productName,
          quantity: row.openingStock,
          unitCost: row.purchasePrice,
          unit: row.unit || 'unit'
        });
      }

    } catch (rowErr) {
      console.error(`[BulkImport] Error committing row ${rowNum} (${row.productName}):`, rowErr);
      failedCount++;
      errorLogs.push({
        rowNumber: rowNum,
        productName: row.productName,
        error: rowErr.message || 'Error processing row'
      });
    }
  }

  // 5. Execute Authoritative Inventory Allocation via InventoryService
  for (const [locationId, stockItems] of stockByLocation.entries()) {
    try {
      await inventoryService.addStockBatch(
        stockItems,
        locationId,
        `IMPORT:${importId}`,
        username
      );
      inventoryMovementsCount += stockItems.length;

      await auditService.writeAuditLog(
        'STOCK_OPENING',
        'inventory',
        importId,
        null,
        { locationId, itemsCount: stockItems.length, reference: `IMPORT:${importId}` },
        req
      );
    } catch (invErr) {
      console.error(`[BulkImport] Failed to allocate opening stock for location '${locationId}':`, invErr);
      errorLogs.push({
        locationId,
        error: `Failed to allocate opening stock: ${invErr.message}`
      });
    }
  }

  const finalStatus = failedCount === 0 ? 'COMPLETED' : (importedCount + updatedCount > 0 ? 'PARTIAL' : 'FAILED');

  const summary = {
    totalRows: validatedRows.length,
    imported: importedCount,
    updated: updatedCount,
    inventoryMovements: inventoryMovementsCount,
    skipped: skippedCount,
    failed: failedCount,
    errors: errorLogs
  };

  await db.collection('import_sessions').updateOne(
    { importId },
    {
      $set: {
        status: finalStatus,
        summary,
        completedAt: new Date().toISOString()
      }
    }
  );

  await auditService.writeAuditLog('IMPORT_COMPLETED', 'inventory', importId, null, summary, req);

  // Emit granular socket events
  if (io) {
    io.to('sync_global').emit('products_imported', { importId, count: importedCount + updatedCount });
    io.to('sync_global').emit('import_completed', { importId, summary });
  }

  return {
    success: true,
    importId,
    status: finalStatus,
    summary
  };
}

module.exports = {
  HEADER_ALIASES,
  cleanHeaderKey,
  detectCanonicalField,
  autoMapHeaders,
  normalizeRowData,
  validateAndPreview,
  commitImport
};
