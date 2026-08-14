const express = require('express');
const { getContext, verifyJWT } = require('./context');
const { requirePermission, requireStoreScope, getStoreScopeFilter, isSuperAdmin } = require('../services/authzService');
const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');

const router = express.Router();

// GET /api/v1/purchases - Fetch all non-archived purchase records with store scoping
// GET /api/v1/purchases - Fetch paginated non-archived purchases with store scoping and filtering (Stage 12 P0)
router.get('/', verifyJWT, requirePermission('purchases.view'), async (req, res) => {
  const { db } = getContext();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;

  try {
    const scopeFilter = getStoreScopeFilter(req.user, ['locationId', 'storeId']);
    const filter = { isArchived: { $ne: true }, ...scopeFilter };

    // Query Filters
    if (req.query.supplierId) {
      filter.supplierId = req.query.supplierId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.locationId || req.query.storeId) {
      const loc = req.query.locationId || req.query.storeId;
      filter.$or = [{ locationId: loc }, { storeId: loc }];
    }
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) filter.createdAt.$gte = req.query.startDate;
      if (req.query.endDate) filter.createdAt.$lte = req.query.endDate;
    }

    // Pagination configuration (default 50, max 100)
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = req.query.skip !== undefined ? Math.max(0, parseInt(req.query.skip) || 0) : (page - 1) * limit;

    const total = await db.collection('purchases').countDocuments(filter);
    const purchases = await db.collection('purchases')
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json({
      success: true,
      purchases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: (skip + limit) < total,
        hasPrev: page > 1
      },
      requestId
    });
  } catch (err) {
    console.error("[Purchases] Error fetching paginated purchases:", err);
    res.status(500).json({
      success: false,
      error: { code: "FETCH_ERROR", message: "Failed to fetch purchases" },
      requestId
    });
  }
});

// GET /api/v1/purchases/:id - Fetch single purchase with store scoping
router.get('/:id', verifyJWT, requirePermission('purchases.view'), async (req, res) => {
  const { db } = getContext();
  try {
    const scopeFilter = getStoreScopeFilter(req.user, ['locationId', 'storeId']);
    const purchase = await db.collection('purchases').findOne({
      $or: [{ id: req.params.id }, { purchaseId: req.params.id }, { invoiceNumber: req.params.id }],
      ...scopeFilter
    });
    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: { code: "PURCHASE_NOT_FOUND", message: "Purchase record not found or access denied" },
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
router.post('/', verifyJWT, requirePermission('purchases.create'), requireStoreScope(req => req.body.locationId || req.body.storeId), async (req, res) => {
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

    // 2. Format items for batch inventory allocation
    const itemsForInventory = purchaseData.items.map(item => {
      const productId = item.id || item.productId;
      const quantity = parseFloat(item.quantity) || 1;
      const cost = parseFloat(item.cost || item.purchasePrice || item.rate || 0);
      return {
        productId,
        name: item.name,
        quantity,
        cost,
        purchasePrice: cost,
        unit: item.unit || 'unit'
      };
    });

    // 3. Atomically add stock batch using inventoryService
    const inventoryResult = await inventoryService.addStockBatch(
      itemsForInventory,
      targetLocationId,
      purchaseId,
      username
    );

    // 4. Calculate totals
    let calculatedSubtotal = 0;
    purchaseData.items.forEach(item => {
      const cost = parseFloat(item.cost || item.purchasePrice || item.rate || 0);
      const qty = parseFloat(item.quantity) || 1;
      calculatedSubtotal += (cost * qty);
    });

    const taxAmount = parseFloat(purchaseData.taxAmount || purchaseData.tax || 0);
    const shipping = parseFloat(purchaseData.shipping || 0);
    const grandTotal = calculatedSubtotal + taxAmount + shipping;

    const now = new Date().toISOString();
    const purchaseDoc = {
      ...purchaseData,
      id: purchaseId,
      purchaseId,
      transactionId: transactionId || purchaseId,
      locationId: targetLocationId,
      storeId: targetLocationId,
      subtotal: calculatedSubtotal,
      taxAmount,
      shipping,
      grandTotal,
      items: purchaseData.items,
      inventoryMovements: inventoryResult.movements || [],
      status: purchaseData.status || 'RECEIVED',
      isArchived: false,
      createdAt: purchaseData.createdAt || now,
      updatedAt: now,
      createdBy: username
    };

    await db.collection('purchases').insertOne(purchaseDoc);

    // 5. Write structured audit log
    await auditService.writeAuditLog(
      'purchase_created',
      'purchase',
      purchaseId,
      null,
      purchaseDoc,
      req
    );

    // 6. Emit real-time synchronization event strictly to store room
    if (io) {
      const realtimeService = require('../services/realtimeService');
      const envelope = realtimeService.createEventEnvelope(
        'purchase',
        'created',
        purchaseId,
        targetLocationId,
        { purchase: purchaseDoc }
      );
      io.to(`store_${targetLocationId}`).emit('purchase_created', envelope);
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
router.delete('/:id', verifyJWT, requirePermission('purchases.void'), async (req, res) => {
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

    // Store scope check for purchase voiding
    if (req.user && req.user.assignedStoreId && req.user.assignedStoreId !== 'all' && !isSuperAdmin(req.user)) {
      const purStore = purchase.locationId || purchase.storeId;
      if (purStore && purStore !== req.user.assignedStoreId) {
        await auditService.writeAuditLog(
          'AUTHORIZATION_DENIED',
          'security',
          req.user.id || req.user.username,
          null,
          {
            requiredPermission: 'purchases.void',
            userStore: req.user.assignedStoreId,
            purchaseStore: purStore,
            endpoint: req.originalUrl || req.path,
            method: 'DELETE',
            reason: `Store scope mismatch: cannot void purchase belonging to store '${purStore}'`
          },
          req
        );
        return res.status(403).json({
          success: false,
          error: { code: "STORE_ACCESS_DENIED", message: `Forbidden: You are not authorized to void purchases for store '${purStore}'` },
          requestId
        });
      }
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
      'purchase_deleted',
      'purchase',
      purchase.purchaseId || purchase.id,
      null,
      { purchaseId: purchase.purchaseId || purchase.id, items: purchase.items, locationId: locId },
      req
    );

    if (io) {
      const realtimeService = require('../services/realtimeService');
      const envelope = realtimeService.createEventEnvelope(
        'purchase',
        'deleted',
        purchase.purchaseId || purchase.id,
        locId,
        { purchaseId: purchase.purchaseId || purchase.id }
      );
      io.to(`store_${locId}`).emit('purchase_deleted', envelope);
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
