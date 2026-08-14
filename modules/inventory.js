const express = require('express');
const { getContext, verifyJWT } = require('./context');
const { requirePermission, requireStoreScope, getStoreScopeFilter, isSuperAdmin } = require('../services/authzService');
const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');

const router = express.Router();

// GET /api/v1/inventory/summary - Fast aggregated inventory metrics
router.get('/summary', verifyJWT, requirePermission('inventory.view'), async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  try {
    let locId = req.query.locationId || req.query.storeId;
    if (!isSuperAdmin(req.user) && req.user.assignedStoreId && req.user.assignedStoreId !== 'all') {
      locId = req.user.assignedStoreId;
    }
    const summary = await inventoryService.getInventorySummary(locId);
    res.json(summary);
  } catch (err) {
    console.error("Failed to generate inventory summary:", err);
    res.status(500).json({
      success: false,
      error: { code: "SUMMARY_ERROR", message: "Server error generating inventory summary" },
      requestId
    });
  }
});

// POST /api/v1/inventory/check-availability - Pre-flight stock availability checker
router.post('/check-availability', verifyJWT, requirePermission('inventory.view'), async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  const { items, storeId, locationId } = req.body;
  let locId = locationId || storeId;

  if (!isSuperAdmin(req.user) && req.user.assignedStoreId && req.user.assignedStoreId !== 'all') {
    if (locId && locId !== req.user.assignedStoreId) {
      return res.status(403).json({
        success: false,
        error: { code: "STORE_ACCESS_DENIED", message: `Forbidden: You cannot check inventory for store '${locId}'` },
        requestId
      });
    }
    locId = req.user.assignedStoreId;
  }

  try {
    const result = await inventoryService.checkStockAvailability(items, locId);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "AVAILABILITY_CHECK_ERROR", message: "Error checking stock availability" },
      requestId
    });
  }
});

// GET /api/v1/inventory - Fetch current inventory snapshot with store scoping
router.get('/', verifyJWT, requirePermission('inventory.view'), async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  try {
    const filter = {};
    if (!isSuperAdmin(req.user) && req.user.assignedStoreId && req.user.assignedStoreId !== 'all') {
      filter.locationId = req.user.assignedStoreId;
    } else if (req.query.storeId || req.query.locationId) {
      filter.locationId = req.query.locationId || req.query.storeId;
    }

    if (req.query.productId) {
      filter.productId = req.query.productId;
    }

    const inventory = await inventoryService.listInventory(filter);
    res.json({ success: true, inventory });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "FETCH_ERROR", message: "Server error fetching inventory" },
      requestId
    });
  }
});

// GET /api/v1/inventory/logs - Fetch paginated immutable inventory ledger records
router.get('/logs', verifyJWT, requirePermission('inventory.view'), async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  try {
    const queryOptions = { ...req.query };
    if (!isSuperAdmin(req.user) && req.user.assignedStoreId && req.user.assignedStoreId !== 'all') {
      queryOptions.storeId = req.user.assignedStoreId;
      queryOptions.locationId = req.user.assignedStoreId;
    }
    const result = await inventoryService.getLedgerLogs(queryOptions);
    res.json(result);
  } catch (err) {
    console.error("Failed to fetch inventory ledger logs:", err);
    res.status(500).json({
      success: false,
      error: { code: "FETCH_ERROR", message: "Server error fetching inventory logs" },
      requestId
    });
  }
});

// POST /api/v1/inventory/adjust - Adjust stock atomically with reason and audit trail
router.post('/adjust', verifyJWT, requirePermission('inventory.adjust'), requireStoreScope(req => req.body.locationId || req.body.storeId), async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  const { productId, storeId, locationId, quantity, type, referenceId, notes, cost } = req.body;
  const locId = locationId || storeId;

  if (!productId || !locId || quantity === undefined) {
    return res.status(400).json({
      success: false,
      error: { code: "MISSING_FIELDS", message: "Missing required fields: productId, storeId/locationId, quantity" },
      requestId
    });
  }

  try {
    const result = await inventoryService.adjustStock(
      productId,
      locId,
      parseFloat(quantity),
      type || 'MANUAL_ADJUSTMENT',
      referenceId || `ADJ-${Date.now()}`,
      req.user ? req.user.username : 'system',
      notes || '',
      parseFloat(cost || 0)
    );

    await auditService.writeAuditLog(
      'inventory_updated',
      'inventory',
      productId,
      null,
      { quantity: result.quantity, locationId: locId, type: type || 'MANUAL_ADJUSTMENT', notes },
      req
    );

    res.json({
      success: true,
      message: "Inventory adjusted successfully",
      record: result
    });
  } catch (err) {
    console.error("Inventory adjustment error:", err);
    res.status(500).json({
      success: false,
      error: { code: "ADJUSTMENT_FAILED", message: err.message || "Server error adjusting inventory" },
      requestId
    });
  }
});

// POST /api/v1/inventory/transfer - Transfer stock atomically between stores with idempotency
router.post('/transfer', verifyJWT, requirePermission('inventory.transfer'), async (req, res) => {
  const { db } = getContext();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  const { productId, fromStoreId, toStoreId, fromLocationId, toLocationId, quantity, notes, transferId, transactionId } = req.body;
  const fromLoc = fromLocationId || fromStoreId;
  const toLoc = toLocationId || toStoreId;
  const transKey = transferId || transactionId;

  if (!productId || !fromLoc || !toLoc || !quantity) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_FIELDS", message: "Missing required fields for transfer: productId, source, target, quantity" },
      requestId
    });
  }

  if (fromLoc === toLoc) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_LOCATION", message: "Source and target locations cannot be the same" },
      requestId
    });
  }

  // Store authorization check on source store
  if (req.user && req.user.assignedStoreId && req.user.assignedStoreId !== 'all' && !isSuperAdmin(req.user)) {
    if (req.user.assignedStoreId !== fromLoc) {
      await auditService.writeAuditLog(
        'AUTHORIZATION_DENIED',
        'security',
        req.user.id || req.user.username,
        null,
        {
          requiredPermission: 'inventory.transfer',
          userStore: req.user.assignedStoreId,
          sourceStore: fromLoc,
          endpoint: req.originalUrl || req.path,
          method: 'POST',
          reason: `Store scope mismatch: cannot transfer stock out of store '${fromLoc}'`
        },
        req
      );
      return res.status(403).json({
        success: false,
        error: { code: "STORE_ACCESS_DENIED", message: `Forbidden: You are not authorized to transfer stock out of store '${fromLoc}'` },
        requestId
      });
    }
  }

  try {
    // Idempotency check: if transferId was already processed in ledger, return existing transfer
    if (transKey) {
      const existingLedger = await db.collection('inventory_ledger').findOne({ referenceId: transKey });
      if (existingLedger) {
        console.log(`[Transfer] Idempotent hit: transfer #${transKey} already recorded.`);
        return res.json({
          success: true,
          message: "Stock transfer already completed",
          referenceId: transKey,
          duplicate: true
        });
      }
    }

    const result = await inventoryService.transferStock(
      productId,
      fromLoc,
      toLoc,
      quantity,
      req.user ? req.user.username : 'system',
      notes || ''
    );

    await auditService.writeAuditLog(
      'inventory_transfer',
      'inventory',
      productId,
      null,
      { fromLocationId: fromLoc, toLocationId: toLoc, quantity, referenceId: result.referenceId, notes },
      req
    );

    res.json({
      success: true,
      message: "Stock transfer completed successfully",
      referenceId: result.referenceId,
      transfer: result
    });
  } catch (err) {
    console.error("Stock transfer error:", err);
    const statusCode = err.code === 'INSUFFICIENT_STOCK' ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: err.code || 'TRANSFER_ERROR',
        message: err.message || "Server error transferring inventory"
      },
      requestId
    });
  }
});

module.exports = router;
