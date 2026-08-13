const express = require('express');
const { getContext, verifyJWT } = require('./context');
const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');

const router = express.Router();

// GET /api/v1/inventory/summary - Fast aggregated inventory metrics
router.get('/summary', verifyJWT, async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  try {
    const locId = req.query.locationId || req.query.storeId;
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
router.post('/check-availability', verifyJWT, async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  const { items, storeId, locationId } = req.body;
  const locId = locationId || storeId;
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

// GET /api/v1/inventory - Fetch current inventory snapshot
router.get('/', verifyJWT, async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  try {
    const filter = {};
    if (req.query.storeId || req.query.locationId) {
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
router.get('/logs', verifyJWT, async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  try {
    const result = await inventoryService.getLedgerLogs(req.query);
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
router.post('/adjust', verifyJWT, async (req, res) => {
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

  // Store authorization check
  if (req.user && req.user.assignedStoreId && req.user.assignedStoreId !== 'all') {
    if (req.user.assignedStoreId !== locId) {
      return res.status(403).json({
        success: false,
        error: { code: "UNAUTHORIZED_STORE", message: `User is not authorized to adjust inventory in store '${locId}'` },
        requestId
      });
    }
  }

  try {
    const newQty = await inventoryService.adjustStock(
      productId,
      locId,
      quantity,
      type || 'ADJUSTMENT',
      referenceId || 'N/A',
      req.user ? req.user.username : 'system',
      notes || '',
      cost || 0
    );

    await auditService.writeAuditLog(
      'STOCK_ADJUSTMENT',
      'inventory',
      productId,
      null,
      { locationId: locId, targetQuantity: quantity, newQuantity: newQty, notes },
      req
    );

    res.json({ success: true, quantity: newQty });
  } catch (err) {
    console.error("Stock adjustment error:", err);
    res.status(500).json({
      success: false,
      error: { code: "ADJUSTMENT_FAILED", message: err.message || "Server error adjusting inventory" },
      requestId
    });
  }
});

// POST /api/v1/inventory/transfer - Transfer stock atomically between stores with idempotency
router.post('/transfer', verifyJWT, async (req, res) => {
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
  if (req.user && req.user.assignedStoreId && req.user.assignedStoreId !== 'all') {
    if (req.user.assignedStoreId !== fromLoc) {
      return res.status(403).json({
        success: false,
        error: { code: "UNAUTHORIZED_STORE", message: `User is not authorized to transfer stock out of store '${fromLoc}'` },
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
      'STOCK_TRANSFER',
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
