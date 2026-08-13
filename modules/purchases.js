const express = require('express');
const { getContext, verifyJWT } = require('./context');
const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');

const router = express.Router();

// GET /api/v1/purchases - Fetch all non-archived purchase records
router.get('/', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const purchases = await db.collection('purchases').find({ isArchived: { $ne: true } }).toArray();
    res.json(purchases);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "FETCH_ERROR", message: "Failed to fetch purchases" },
      requestId: req.headers['x-request-id'] || null
    });
  }
});

// GET /api/v1/purchases/:id - Fetch single purchase
router.get('/:id', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const purchase = await db.collection('purchases').findOne({
      $or: [{ id: req.params.id }, { purchaseId: req.params.id }, { invoiceNumber: req.params.id }]
    });
    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: { code: "PURCHASE_NOT_FOUND", message: "Purchase record not found" },
        requestId: req.headers['x-request-id'] || null
      });
    }
    res.json(purchase);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "FETCH_ERROR", message: "Failed to fetch purchase" },
      requestId: req.headers['x-request-id'] || null
    });
  }
});

// POST /api/v1/purchases - Create purchase entry with idempotency & atomic batch stock addition
router.post('/', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const purchaseData = req.body;
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  const targetLocationId = purchaseData.locationId || purchaseData.storeId;
  const transactionId = purchaseData.transactionId || purchaseData.clientTransactionId || purchaseData.id;

  if (!purchaseData.items || !Array.isArray(purchaseData.items) || purchaseData.items.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_ITEMS", message: "Purchase must contain at least one valid item" },
      requestId
    });
  }

  if (!targetLocationId) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_LOCATION", message: "Destination location/store is required" },
      requestId
    });
  }

  try {
    // 1. Idempotency check: if transactionId exists, return existing purchase
    if (transactionId) {
      const existingPurchase = await db.collection('purchases').findOne({
        $or: [{ transactionId }, { id: transactionId }, { purchaseId: transactionId }],
        isArchived: { $ne: true }
      });
      if (existingPurchase) {
        console.log(`[Purchases] Idempotent hit: purchase #${existingPurchase.id || transactionId} already recorded.`);
        return res.json({ success: true, purchase: existingPurchase, duplicate: true });
      }
    }

    const purchaseId = purchaseData.id || purchaseData.purchaseId || `pur-${Date.now()}`;
    const username = req.user ? req.user.username : 'system';

    // 2. Validate and recalculate line items and totals
    let calculatedSubtotal = 0;
    let calculatedTax = 0;
    const validatedItems = [];

    for (const item of purchaseData.items) {
      const prodId = item.productId || item.id;
      const qty = parseFloat(item.quantity) || 0;
      const unitCost = parseFloat(item.unitCost || item.cost || item.purchasePrice || item.rate || 0);
      const taxRate = parseFloat(item.gst || item.tax || 0);

      if (!prodId || qty <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_QUANTITY", message: `Invalid item or quantity for product ${prodId || 'unknown'}` },
          requestId
        });
      }

      const lineCost = qty * unitCost;
      const lineTax = (lineCost * taxRate) / 100;
      const lineTotal = lineCost + lineTax;

      calculatedSubtotal += lineCost;
      calculatedTax += lineTax;

      validatedItems.push({
        productId: prodId,
        variantId: item.variantId || null,
        name: item.name || prodId,
        unit: item.unit || 'unit',
        quantity: qty,
        unitCost,
        cost: unitCost, // legacy alias
        tax: lineTax,
        gst: taxRate,
        lineTotal: Math.round(lineTotal * 100) / 100
      });
    }

    const calculatedTotal = Math.round((calculatedSubtotal + calculatedTax) * 100) / 100;

    // 3. Add stock batch atomically via inventoryService
    await inventoryService.addStockBatch(
      validatedItems,
      targetLocationId,
      purchaseId,
      username
    );

    // 4. Save purchase record with canonical fields and legacy aliases
    const purchaseDoc = {
      purchaseId,
      id: purchaseId, // legacy alias
      transactionId: transactionId || purchaseId,
      supplierId: purchaseData.supplierId || null,
      supplier: purchaseData.supplier || purchaseData.supplierName || 'General Supplier',
      supplierName: purchaseData.supplierName || purchaseData.supplier || 'General Supplier',
      locationId: targetLocationId,
      storeId: targetLocationId, // legacy alias
      invoiceNumber: purchaseData.invoiceNumber || `BILL-${Date.now()}`,
      purchaseDate: purchaseData.purchaseDate || purchaseData.date || new Date().toISOString(),
      date: purchaseData.purchaseDate || purchaseData.date || new Date().toISOString(),
      items: validatedItems,
      subtotal: Math.round(calculatedSubtotal * 100) / 100,
      tax: Math.round(calculatedTax * 100) / 100,
      total: calculatedTotal,
      grandTotal: calculatedTotal, // legacy alias
      status: 'COMPLETED',
      notes: purchaseData.notes || '',
      createdBy: username,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('purchases').insertOne(purchaseDoc);

    // 5. Write structured audit log
    await auditService.writeAuditLog(
      'STOCK_PURCHASE',
      'purchase',
      purchaseId,
      null,
      purchaseDoc,
      req
    );

    // 6. Emit realtime event
    if (io) {
      io.to('sync_global').emit('purchase_created', { purchaseId, locationId: targetLocationId });
    }

    res.json({ success: true, purchase: purchaseDoc });
  } catch (err) {
    console.error(`[Purchases] Error creating purchase #${purchaseData.id || 'N/A'}:`, err);
    res.status(500).json({
      success: false,
      error: { code: "PURCHASE_CREATION_FAILED", message: err.message || "Server error processing purchase" },
      requestId
    });
  }
});

// DELETE /api/v1/purchases/:id - Void purchase entry & revert stock batch atomically
router.delete('/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const purchaseId = req.params.id;
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;

  try {
    const purchase = await db.collection('purchases').findOne({
      $or: [{ id: purchaseId }, { purchaseId }]
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: { code: "PURCHASE_NOT_FOUND", message: "Purchase not found" },
        requestId
      });
    }

    // Double-void protection
    if (purchase.isArchived || purchase.status === 'VOIDED') {
      return res.status(400).json({
        success: false,
        error: { code: "PURCHASE_ALREADY_VOIDED", message: "This purchase entry is already voided" },
        requestId
      });
    }

    const username = req.user ? req.user.username : 'system';
    const locId = purchase.locationId || purchase.storeId;

    // 1. Revert stock batch via inventoryService
    if (purchase.items && locId) {
      await inventoryService.revertStockBatch(
        purchase.items,
        locId,
        'purchase_void',
        'purchase_void',
        purchase.purchaseId || purchase.id,
        username
      );
    }

    // 2. Mark purchase as VOIDED without physical deletion
    const now = new Date().toISOString();
    await db.collection('purchases').updateOne(
      { _id: purchase._id },
      { $set: { status: 'VOIDED', isArchived: true, voidedAt: now, deletedAt: now, updatedAt: now } }
    );

    // 3. Write audit log
    await auditService.writeAuditLog(
      'STOCK_VOID',
      'purchase',
      purchase.purchaseId || purchase.id,
      null,
      { purchaseId: purchase.purchaseId || purchase.id, items: purchase.items, locationId: locId },
      req
    );

    if (io) {
      io.to('sync_global').emit('purchase_deleted', { purchaseId: purchase.purchaseId || purchase.id });
    }

    res.json({ success: true, message: "Purchase voided and inventory stock reverted successfully" });
  } catch (err) {
    console.error(`[Purchases] Error voiding purchase ${purchaseId}:`, err);
    res.status(500).json({
      success: false,
      error: { code: "PURCHASE_VOID_FAILED", message: err.message || "Server error voiding purchase" },
      requestId
    });
  }
});

module.exports = router;
