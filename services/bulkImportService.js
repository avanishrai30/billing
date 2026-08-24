const inventoryService = require('./inventoryService');
const auditService = require('./auditService');

// Canonical Header Alias Map
const HEADER_ALIASES = {
  productName: [
    'productname', 'name', 'itemname', 'title', 'product', 'item', 'description',
    'itemdescription', 'particulars', 'productservice', 'nameofitem', 'producttitle',
    'itemdesc', 'item_name', 'product_name', 'item_description', 'products', 'items'
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
    'unit', 'uom', 'pack', 'packaging', 'measure', 'size', 'package', 'packsize', 'weight'
  ],
  weight: [
    'weight', 'volume', 'netweight', 'quantityperpack', 'netweightvolume'
  ],
  weightUnit: [
    'weightunit', 'volumeunit', 'measurementunit'
  ],
  purchasePrice: [
    'purchaseprice', 'buyingprice', 'costprice', 'cost', 'buying', 'cp',
    'unitcost', 'purchase_price', 'buying_price', 'cost_price', 'wholesaleprice', 'purchase'
  ],
  sellingPrice: [
    'sellingprice', 'saleprice', 'retailprice', 'price', 'mrp', 'sp', 'rate',
    'retail', 'selling', 'selling_price', 'sale_price', 'retail_price', 'unitprice', 'mrp_rate'
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
    'doe', 'expiry', 'expdate', 'expirydate', 'useby', 'exp_date', 'defaultexpirydate', 'default_expiry_date', 'productexpiry', 'product_expiry'
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

// Extract weight and unit from strings like "1 LTR", "1LTR", "500 ML", "1KG", "250g"
function parseWeightAndUnit(rawStr) {
  if (!rawStr) return null;
  const str = String(rawStr).trim();
  const match = str.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
  if (!match) return null;

  const val = parseFloat(match[1]);
  const rawUnit = match[2].toLowerCase();

  let weightUnit = 'unit';
  if (['ltr', 'liter', 'litres', 'l'].includes(rawUnit)) weightUnit = 'L';
  else if (['ml', 'milli'].includes(rawUnit)) weightUnit = 'ml';
  else if (['kg', 'kilo', 'kilogram'].includes(rawUnit)) weightUnit = 'kg';
  else if (['g', 'gm', 'gram', 'grams'].includes(rawUnit)) weightUnit = 'g';
  else weightUnit = match[2];

  return {
    weight: val,
    weightUnit,
    unit: `${val}${weightUnit}`
  };
}

/**
 * Profile column values from sample rows
 */
function profileColumnData(values = []) {
  const cleanVals = values.filter(v => v !== undefined && v !== null && String(v).trim() !== '');
  if (cleanVals.length === 0) return { type: 'EMPTY' };

  let numericCount = 0;
  let weightUnitCount = 0;
  let textLengthSum = 0;

  for (const v of cleanVals) {
    const s = String(v).trim();
    if (!isNaN(parseFloat(s)) && isFinite(s)) {
      numericCount++;
    } else if (parseWeightAndUnit(s)) {
      weightUnitCount++;
    }
    textLengthSum += s.length;
  }

  const count = cleanVals.length;
  if (weightUnitCount / count > 0.5) {
    return { type: 'WEIGHT_UNIT', confidence: 'HIGH' };
  }
  if (numericCount / count > 0.8) {
    const nums = cleanVals.map(v => parseFloat(v)).filter(n => !isNaN(n));
    const allInts = nums.every(n => Number.isInteger(n));
    const maxVal = Math.max(...nums);
    if (allInts && maxVal <= 500) {
      return { type: 'QUANTITY_CANDIDATE', confidence: 'MEDIUM' };
    }
    return { type: 'CURRENCY_CANDIDATE', confidence: 'MEDIUM' };
  }
  if (textLengthSum / count > 3) {
    return { type: 'PRODUCT_NAME_CANDIDATE', confidence: 'MEDIUM' };
  }

  return { type: 'TEXT', confidence: 'LOW' };
}

/**
 * Multi-Row Header Extraction
 * Supports 1-row, 2-row, or 3-row headers (e.g. HEMA.xlsx with Row 1 & Row 2 headers)
 */
function extractHeadersAndRowsFromMatrix(matrix = []) {
  if (!matrix || matrix.length === 0) return { headers: [], rows: [] };

  let headerRowEndIndex = 0;
  let isMultiRow = false;

  // Inspect first 3 rows
  const row0 = matrix[0] || [];
  const row1 = matrix[1] || [];
  const row2 = matrix[2] || [];

  // Check if row 1 contains sub-headers (like WEIGHT, COST, QTY under parent headers)
  const row0NonEmpty = row0.filter(c => c !== undefined && String(c).trim() !== '').length;
  const row1NonEmpty = row1.filter(c => c !== undefined && String(c).trim() !== '').length;

  // If row 1 has header-like words (WEIGHT, COST, QTY, RATE, UNIT, PRICE)
  const row1IsSubHeader = row1.some(cell => {
    const k = cleanHeaderKey(cell);
    return ['weight', 'cost', 'qty', 'quantity', 'price', 'rate', 'unit', 'mrp'].includes(k);
  });

  if (row1IsSubHeader || (row0NonEmpty < row1NonEmpty && row1NonEmpty > 1)) {
    isMultiRow = true;
    headerRowEndIndex = 1;
  }

  const numCols = Math.max(row0.length, row1.length, (row2 ? row2.length : 0));
  const headers = [];

  for (let c = 0; c < numCols; c++) {
    let headerName = '';
    if (isMultiRow) {
      const topCell = row0[c] !== undefined ? String(row0[c]).trim() : '';
      const subCell = row1[c] !== undefined ? String(row1[c]).trim() : '';

      if (subCell && topCell && cleanHeaderKey(subCell) !== cleanHeaderKey(topCell)) {
        headerName = `${topCell} ${subCell}`.trim();
      } else if (subCell) {
        headerName = subCell;
      } else if (topCell) {
        headerName = topCell;
      } else {
        headerName = `Column_${c + 1}`;
      }
    } else {
      const cell = row0[c] !== undefined ? String(row0[c]).trim() : '';
      headerName = cell || `Column_${c + 1}`;
    }
    headers.push(headerName);
  }

  const dataRows = [];
  const startRowIdx = isMultiRow ? 2 : 1;

  for (let r = startRowIdx; r < matrix.length; r++) {
    const rawRow = matrix[r] || [];
    // Skip completely empty rows
    const hasData = rawRow.some(c => c !== undefined && c !== null && String(c).trim() !== '');
    if (!hasData) continue;

    const rowObj = {};
    for (let c = 0; c < headers.length; c++) {
      rowObj[headers[c]] = rawRow[c] !== undefined ? rawRow[c] : '';
    }
    dataRows.push(rowObj);
  }

  return {
    headers,
    rows: dataRows,
    isMultiRow
  };
}

/**
 * Intelligent Column Mapping with Confidence Scoring & Semantic Analysis
 */
function detectSmartFieldMapping(rawHeaders = [], sampleRows = []) {
  const mapping = {};
  const fieldExplanations = {};
  const usedCanonical = new Set();
  const unmappedColumns = [];

  const SERIAL_NO_ALIASES = ['slno', 'sno', 'srno', 'serialno', 'serialnumber', 'no', 'num', 'sl', 'index'];

  // PASS 1: Direct Header Keywords & Canonical Aliases
  for (let c = 0; c < rawHeaders.length; c++) {
    const header = rawHeaders[c];
    const clean = cleanHeaderKey(header);

    if (SERIAL_NO_ALIASES.includes(clean)) {
      mapping[header] = 'ignore';
      fieldExplanations[header] = {
        field: 'ignore',
        sourceColumn: header,
        confidence: 'HIGH',
        state: 'IGNORED',
        reason: 'Serial number / row sequence column'
      };
      continue;
    }

    let aliasMatch = null;
    for (const [canon, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(clean)) {
        aliasMatch = canon;
        break;
      }
    }

    if (clean === 'purchase') {
      const hasCostNeighbor = rawHeaders.some(h => cleanHeaderKey(h) === 'cost');
      if (hasCostNeighbor || usedCanonical.has('purchasePrice')) {
        mapping[header] = 'sellingPrice';
        fieldExplanations[header] = {
          field: 'sellingPrice',
          sourceColumn: header,
          confidence: 'MEDIUM',
          state: 'AMBIGUOUS',
          reason: 'Header is labeled "PURCHASE" alongside "COST". Candidate Selling Price — please confirm.'
        };
        usedCanonical.add('sellingPrice');
      } else {
        mapping[header] = 'purchasePrice';
        fieldExplanations[header] = {
          field: 'purchasePrice',
          sourceColumn: header,
          confidence: 'HIGH',
          state: 'DETECTED',
          reason: 'Direct header keyword match for "purchasePrice"'
        };
        usedCanonical.add('purchasePrice');
      }
    } else if (aliasMatch && !usedCanonical.has(aliasMatch)) {
      mapping[header] = aliasMatch;
      fieldExplanations[header] = {
        field: aliasMatch,
        sourceColumn: header,
        confidence: 'HIGH',
        state: 'DETECTED',
        reason: `Direct header keyword match for "${aliasMatch}"`
      };
      usedCanonical.add(aliasMatch);
    } else {
      unmappedColumns.push(header);
    }
  }

  // PASS 2: Data-Profiling Inference for Remaining Unmapped Columns
  for (const header of unmappedColumns) {
    const colValues = sampleRows.map(r => r[header]);
    const profile = profileColumnData(colValues);

    let mappedField = 'ignore';
    let confidence = 'LOW';
    let state = 'IGNORED';
    let reason = 'Unrecognized column';

    if (profile.type === 'WEIGHT_UNIT' && !usedCanonical.has('unit')) {
      mappedField = 'unit';
      confidence = 'HIGH';
      state = 'INFERRED';
      reason = 'Column values match measurement patterns (e.g. "1 LTR", "500 ML", "1KG")';
    } else if (profile.type === 'PRODUCT_NAME_CANDIDATE' && !usedCanonical.has('productName')) {
      mappedField = 'productName';
      confidence = 'MEDIUM';
      state = 'INFERRED';
      reason = 'Text-heavy column containing descriptive product names';
    } else if (profile.type === 'QUANTITY_CANDIDATE' && !usedCanonical.has('openingStock')) {
      mappedField = 'openingStock';
      confidence = 'MEDIUM';
      state = 'INFERRED';
      reason = 'Integer values matching stock quantity candidate';
    }

    if (mappedField !== 'ignore') {
      usedCanonical.add(mappedField);
    }

    mapping[header] = mappedField;
    fieldExplanations[header] = {
      field: mappedField,
      sourceColumn: header,
      confidence,
      state,
      reason
    };
  }

  return {
    mapping,
    fieldExplanations
  };
}

/**
 * Normalize single raw row using column mapping + safe derivations
 */
function normalizeRowData(rawRow, columnMapping = {}) {
  const normalized = {
    productName: '',
    sku: '',
    barcode: null,
    category: '',
    brand: '',
    supplier: '',
    type: 'OWN',
    unit: '1 Unit',
    weight: 0,
    weightUnit: 'g',
    purchasePrice: null,
    sellingPrice: null,
    mrp: null,
    gst: 5,
    openingStock: 0,
    store: '',
    reorderLevel: 10,
    maxStock: 100,
    dom: '',
    doe: '',
    imageUrl: '',
    description: '',
    sellingMode: 'packaged',
    inferredUnits: false
  };

  for (const [rawCol, val] of Object.entries(rawRow)) {
    const canonicalField = columnMapping[rawCol];
    if (canonicalField && canonicalField !== 'ignore' && val !== undefined && val !== null) {
      const strVal = String(val).trim();
      if (!strVal) continue;

      switch (canonicalField) {
        case 'barcode':
          normalized.barcode = strVal || null;
          break;
        case 'purchasePrice':
        case 'sellingPrice':
        case 'mrp':
          normalized[canonicalField] = parseFloat(strVal);
          break;
        case 'openingStock':
        case 'reorderLevel':
        case 'maxStock':
          normalized[canonicalField] = parseFloat(strVal) || 0;
          break;
        case 'gst':
          normalized.gst = parseInt(strVal, 10) || 0;
          break;
        case 'unit':
          // Attempt safe parsing of weight and unit from string like "1 LTR"
          const parsed = parseWeightAndUnit(strVal);
          if (parsed) {
            normalized.unit = parsed.unit;
            normalized.weight = parsed.weight;
            normalized.weightUnit = parsed.weightUnit;
            normalized.inferredUnits = true;
          } else {
            normalized.unit = strVal;
          }
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

  // Derive MRP if empty but sellingPrice present
  if (normalized.mrp === null && normalized.sellingPrice !== null) {
    normalized.mrp = normalized.sellingPrice;
  }

  return normalized;
}

/**
 * Validate and simulate import (Read-Only Preview with Flexible Safety Rules)
 */
async function validateAndPreview(db, rawRows = [], options = {}) {
  // Support both 2D array matrix and JSON row objects
  let parsedHeaders = [];
  let workingRows = rawRows;

  if (Array.isArray(rawRows) && rawRows.length > 0 && Array.isArray(rawRows[0])) {
    const extracted = extractHeadersAndRowsFromMatrix(rawRows);
    parsedHeaders = extracted.headers;
    workingRows = extracted.rows;
  } else if (workingRows.length > 0) {
    parsedHeaders = Object.keys(workingRows[0] || {});
  }

  const smartDetection = detectSmartFieldMapping(parsedHeaders, workingRows.slice(0, 10));
  const columnMapping = options.columnMapping || smartDetection.mapping;
  const fieldExplanations = smartDetection.fieldExplanations;
  const importId = options.importId || `imp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const defaultLocationId = options.defaultLocationId || options.defaultStore || 'default';
  const strategy = options.strategy || 'ADD_AND_UPDATE';

  const processedRows = [];
  let readyCount = 0;
  let warningCount = 0;
  let reviewRequiredCount = 0;
  let blockedCount = 0;
  let skippedCount = 0;

  const seenBarcodesInBatch = new Map();
  const seenSkusInBatch = new Map();

  for (let i = 0; i < workingRows.length; i++) {
    const rawRow = workingRows[i];
    const rowNumber = i + 1;
    const row = normalizeRowData(rawRow, columnMapping);
    const warnings = [];
    const reviewRequests = [];
    const blockReasons = [];
    let classification = 'NEW';
    let matchedProduct = null;

    // 1. Database Matching Priority (Exact Barcode -> Exact SKU -> Variant Barcode -> Variant SKU)
    const cleanRowBarcode = (row.barcode !== undefined && row.barcode !== null && String(row.barcode).trim() !== '') ? String(row.barcode).trim() : null;
    row.barcode = cleanRowBarcode;

    if (db && cleanRowBarcode) {
      const barcodeRecord = await db.collection('product_barcodes').findOne({ barcode: cleanRowBarcode });
      if (barcodeRecord) {
        matchedProduct = await db.collection('products').findOne({ id: barcodeRecord.productId });
      } else {
        matchedProduct = await db.collection('products').findOne({ barcode: cleanRowBarcode });
      }
    }

    if (db && !matchedProduct && row.sku && String(row.sku).trim()) {
      matchedProduct = await db.collection('products').findOne({ sku: String(row.sku).trim() });
    }

    // 2. Intra-Batch Duplicate Check (ONLY for non-empty barcodes)
    if (cleanRowBarcode) {
      if (seenBarcodesInBatch.has(cleanRowBarcode)) {
        blockReasons.push({
          field: 'barcode',
          code: 'DUPLICATE_BARCODE_IN_BATCH',
          message: `Barcode '${cleanRowBarcode}' appears multiple times in spreadsheet (first seen at row ${seenBarcodesInBatch.get(cleanRowBarcode)})`
        });
      } else {
        seenBarcodesInBatch.set(cleanRowBarcode, rowNumber);
      }
    }

    if (row.sku && String(row.sku).trim()) {
      const cleanSku = String(row.sku).trim();
      if (seenSkusInBatch.has(cleanSku)) {
        blockReasons.push({
          field: 'sku',
          code: 'DUPLICATE_SKU_IN_BATCH',
          message: `SKU '${cleanSku}' appears multiple times in spreadsheet (first seen at row ${seenSkusInBatch.get(cleanSku)})`
        });
      } else {
        seenSkusInBatch.set(cleanSku, rowNumber);
      }
    }

    // 3. Product Identity & Classification
    if (matchedProduct) {
      classification = 'EXISTING';

      // Check cross-product conflicts
      if (db && row.sku && matchedProduct.sku !== row.sku) {
        const skuProduct = await db.collection('products').findOne({ sku: row.sku });
        if (skuProduct && skuProduct.id !== matchedProduct.id) {
          blockReasons.push({
            field: 'sku',
            code: 'SKU_CROSS_PRODUCT_CONFLICT',
            message: `Barcode belongs to '${matchedProduct.name}' but SKU '${row.sku}' belongs to '${skuProduct.name}'`
          });
        }
      }

      // Check price changes
      if (row.sellingPrice !== null && row.sellingPrice !== matchedProduct.sellingPrice) {
        warnings.push({
          field: 'sellingPrice',
          code: 'PRICE_CHANGE',
          message: `Selling price update: ₹${matchedProduct.sellingPrice} -> ₹${row.sellingPrice}`
        });
        classification = 'UPDATE';
      }

      // If product name is missing on existing product, we can inherit it from DB
      if (!row.productName) {
        row.productName = matchedProduct.name;
        warnings.push({
          field: 'productName',
          code: 'INHERITED_EXISTING_NAME',
          message: `Using existing product name "${matchedProduct.name}" from catalog`
        });
      }
    } else {
      classification = 'NEW';

      // For NEW products, Product Name is strictly required
      if (!row.productName) {
        blockReasons.push({
          field: 'productName',
          code: 'MISSING_NAME_FOR_NEW_PRODUCT',
          message: 'Product Name is required to register a new product profile'
        });
      }

      // Check if product with identical name exists under different barcode (Warning, not auto-merge)
      if (db && row.productName) {
        const nameMatch = await db.collection('products').findOne({ name: { $regex: new RegExp(`^${row.productName.trim()}$`, 'i') } });
        if (nameMatch) {
          warnings.push({
            field: 'productName',
            code: 'POSSIBLE_NAME_MATCH',
            message: `Product with similar name '${nameMatch.name}' already exists (Barcode: ${nameMatch.barcode || 'None'}). Will create as distinct new product.`
          });
        }
      }

      // Barcode remains optional on new product (NEVER auto-fabricate retail barcodes)
      if (!cleanRowBarcode) {
        row.barcode = null;
        warnings.push({
          field: 'barcode',
          code: 'BARCODE_OPTIONAL',
          message: 'Barcode not supplied. Product will be created without a barcode.'
        });
      }

      // SKU generated only if missing according to Product Master policy
      if (!row.sku) {
        row.sku = `SKU-${Date.now().toString().slice(-6)}-${rowNumber}`;
        warnings.push({
          field: 'sku',
          code: 'AUTO_GENERATED_SKU',
          message: `SKU not supplied. Generated internal SKU: ${row.sku}`
        });
      }
    }

    // 4. Price & Valuation Safety
    if (classification === 'NEW') {
      if (row.sellingPrice === null && row.purchasePrice === null) {
        blockReasons.push({
          field: 'sellingPrice',
          code: 'MISSING_PRICES',
          message: 'Either Selling Price or Purchase Price must be specified for new products'
        });
      } else if (row.sellingPrice === null) {
        reviewRequests.push({
          field: 'sellingPrice',
          code: 'MISSING_SELLING_PRICE_FOR_NEW_PRODUCT',
          message: `Selling price is unset (Cost is ₹${row.purchasePrice}). Confirm before creating.`
        });
      }
    }

    // 5. Ambiguous Mapping Safety Check (e.g. PURCHASE mapped to sellingPrice alongside COST)
    for (const [rawHeader, mappedField] of Object.entries(columnMapping)) {
      const explanation = fieldExplanations[rawHeader];
      if (explanation && explanation.state === 'AMBIGUOUS' && mappedField !== 'ignore') {
        const isConfirmed = Array.isArray(options.confirmedAmbiguousMappings) && options.confirmedAmbiguousMappings.includes(rawHeader);
        if (!isConfirmed) {
          reviewRequests.push({
            field: mappedField,
            code: 'AMBIGUOUS_MAPPING_CONFIRMATION_REQUIRED',
            message: `Column "${rawHeader}" is mapped as ${mappedField} (${explanation.reason}). Please confirm mapping.`
          });
        }
      }
    }

    // 6. Store & Location Validation (Conditional)
    let resolvedLocationId = defaultLocationId;
    if (row.openingStock > 0) {
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
          } else {
            warnings.push({
              field: 'store',
              code: 'DEFAULT_STORE_ALLOCATION',
              message: `Store '${row.store}' not found. Opening stock (${row.openingStock}) will allocate to default store '${defaultLocationId}'.`
            });
          }
        }
      }
    } else {
      // Catalog only import (stock = 0) -> Location is optional
      resolvedLocationId = null;
    }

    // Optional fields notifications (Do NOT block)
    if (!row.category) {
      warnings.push({ field: 'category', code: 'CATEGORY_OPTIONAL', message: 'Category not specified (optional).' });
    }
    if (!row.brand) {
      warnings.push({ field: 'brand', code: 'BRAND_OPTIONAL', message: 'Brand not specified (optional).' });
    }

    // 7. Strategy Filtering
    let isBlockedByStrategy = false;
    if (strategy === 'ADD_NEW_ONLY' && (classification === 'EXISTING' || classification === 'UPDATE')) {
      classification = 'SKIPPED';
      isBlockedByStrategy = true;
    } else if (strategy === 'UPDATE_EXISTING_ONLY' && classification === 'NEW') {
      classification = 'SKIPPED';
      isBlockedByStrategy = true;
    }

    // 8. Determine Final Row State
    let status = 'READY';
    if (isBlockedByStrategy) {
      status = 'SKIPPED';
      skippedCount++;
    } else if (blockReasons.length > 0) {
      status = 'BLOCKED';
      blockedCount++;
    } else if (reviewRequests.length > 0) {
      status = 'REVIEW_REQUIRED';
      reviewRequiredCount++;
    } else if (warnings.length > 0) {
      status = 'WARNING';
      warningCount++;
    } else {
      status = 'READY';
      readyCount++;
    }

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
      blockReasons,
      reviewRequests,
      warnings
    });
  }

  return {
    success: true,
    importId,
    strategy,
    summary: {
      totalRows: workingRows.length,
      readyRows: readyCount,
      warningRows: warningCount,
      reviewRequiredRows: reviewRequiredCount,
      blockedRows: blockedCount,
      skippedRows: skippedCount
    },
    columnMapping,
    fieldExplanations,
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

  const stockByLocation = new Map();

  for (const item of validatedRows) {
    // Only import rows that are READY, WARNING, or confirmed REVIEW_REQUIRED
    if (item.status === 'BLOCKED' || item.status === 'SKIPPED') {
      skippedCount++;
      continue;
    }

    const row = item.normalizedData;
    const rowNum = item.rowNumber;

    try {
      // 1. Server-side Revalidation
      const cleanBarcode = (row.barcode !== undefined && row.barcode !== null && String(row.barcode).trim() !== '') ? String(row.barcode).trim() : null;

      if (cleanBarcode) {
        const existingBarcode = await db.collection('product_barcodes').findOne({ barcode: cleanBarcode });
        if (existingBarcode && (!row.matchedProductId || existingBarcode.productId !== row.matchedProductId)) {
          throw new Error(`Server revalidation failed: Barcode '${cleanBarcode}' was assigned to another product concurrently.`);
        }
      }

      const productId = row.matchedProductId || `prd-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const isExisting = !!row.matchedProductId;
      const cleanSku = String(row.sku || `SKU-${Date.now().toString().slice(-6)}-${rowNum}`).trim();

      const productDoc = {
        id: productId,
        name: row.productName,
        sku: cleanSku,
        category: row.category || '',
        brand: row.brand || '',
        supplier: row.supplier || '',
        type: (row.type || 'OWN').toUpperCase(),
        unit: row.unit || '1 Unit',
        weight: row.weight || 0,
        weightUnit: row.weightUnit || 'g',
        gst: row.gst || 0,
        reorderLevel: row.reorderLevel || 10,
        maxStock: row.maxStock || 100,
        dom: row.dom || '',
        doe: row.doe || row.defaultExpiryDate || '',
        defaultExpiryDate: row.defaultExpiryDate || row.doe || null,
        image: row.imageUrl || '/uploads/system/default-product.webp',
        description: row.description || '',
        sellingMode: row.sellingMode || 'packaged',
        status: 'active',
        isArchived: false,
        updatedAt: now
      };

      if (cleanBarcode) {
        productDoc.barcode = cleanBarcode;
      } else {
        delete productDoc.barcode;
      }

      // Set pricing without converting blank to zero
      if (row.purchasePrice !== null) {
        productDoc.purchasePrice = row.purchasePrice;
        productDoc.cost = row.purchasePrice;
        productDoc.costPrice = row.purchasePrice;
      }
      if (row.sellingPrice !== null) {
        productDoc.sellingPrice = row.sellingPrice;
        productDoc.price = row.sellingPrice;
        productDoc.mrp = row.mrp !== null ? row.mrp : row.sellingPrice;
      } else if (!isExisting && row.purchasePrice !== null) {
        productDoc.sellingPrice = row.purchasePrice;
        productDoc.price = row.purchasePrice;
        productDoc.mrp = row.purchasePrice;
      }

      // 2. Persist Product Master (Strictly prevent empty string barcodes)
      if (isExisting) {
        const updateFields = { ...productDoc };
        if (row.purchasePrice === null) {
          delete updateFields.purchasePrice;
          delete updateFields.cost;
          delete updateFields.costPrice;
        }
        if (row.sellingPrice === null) {
          delete updateFields.sellingPrice;
          delete updateFields.price;
          delete updateFields.mrp;
        }

        const updateOp = {
          $set: updateFields,
          $setOnInsert: { createdAt: now }
        };

        if (cleanBarcode) {
          updateOp.$set.barcode = cleanBarcode;
        } else {
          delete updateFields.barcode;
          // Preserve existing valid barcode if present; otherwise ensure field is completely unset
          const existingProduct = await db.collection('products').findOne({ id: productId });
          if (existingProduct && existingProduct.barcode && String(existingProduct.barcode).trim() !== '') {
            updateOp.$set.barcode = String(existingProduct.barcode).trim();
          } else {
            updateOp.$unset = { barcode: "" };
          }
        }

        await db.collection('products').updateOne(
          { id: productId },
          updateOp,
          { upsert: true }
        );
      } else {
        const insertDoc = { ...productDoc };
        const updateOp = {
          $set: insertDoc,
          $setOnInsert: { createdAt: now }
        };

        if (cleanBarcode) {
          updateOp.$set.barcode = cleanBarcode;
        } else {
          delete insertDoc.barcode;
          updateOp.$unset = { barcode: "" };
        }

        await db.collection('products').updateOne(
          { id: productId },
          updateOp,
          { upsert: true }
        );
      }

      // 3. Synchronize Barcode Registry only if cleanBarcode exists
      if (cleanBarcode) {
        const { syncProductBarcodes } = require('../modules/products');
        if (typeof syncProductBarcodes === 'function') {
          await syncProductBarcodes(db, productId, cleanBarcode, [], []);
        }
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
      if (row.openingStock > 0 && row.resolvedLocationId) {
        const locId = row.resolvedLocationId;
        if (!stockByLocation.has(locId)) {
          stockByLocation.set(locId, []);
        }
        stockByLocation.get(locId).push({
          productId,
          name: row.productName,
          quantity: row.openingStock,
          unitCost: row.purchasePrice || 0,
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

  // 5. Execute Authoritative Inventory Allocation via InventoryService (with suppressed per-item socket emissions)
  for (const [locationId, stockItems] of stockByLocation.entries()) {
    try {
      await inventoryService.addStockBatch(
        stockItems,
        locationId,
        `IMPORT:${importId}`,
        username,
        {
          type: 'STOCK_OPENING',
          referenceType: 'bulk_import',
          notes: `Bulk Import Opening Stock #${importId}`,
          skipRealtimeSocket: true
        }
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

  if (io) {
    const realtimeService = require('./realtimeService');
    // Emit bounded bulk inventory update to each affected store
    for (const [locationId, stockItems] of stockByLocation.entries()) {
      const bulkEnvelope = realtimeService.createEventEnvelope(
        'inventory',
        'bulk_updated',
        importId,
        locationId,
        {
          importId,
          locationId,
          storeId: locationId,
          affectedCount: stockItems.length
        }
      );
      io.to(`store_${locationId}`).emit('inventory.bulk_updated', bulkEnvelope);
    }

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
  parseWeightAndUnit,
  profileColumnData,
  extractHeadersAndRowsFromMatrix,
  detectSmartFieldMapping,
  normalizeRowData,
  validateAndPreview,
  commitImport
};
