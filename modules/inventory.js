const express = require('express');
const { verifyJWT } = require('./context');
const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');

const router = express.Router();

// GET /api/v1/inventory/summary - Fast aggregated inventory metrics
router.get('/summary', verifyJWT, async (req, res) => {
  try {
    const locId = req.query.locationId || req.query.storeId;
    const summary = await inventoryService.getInventorySummary(locId);
    res.json(summary);
  } catch (err) {
    console.error("Failed to generate inventory summary:", err);
    res.status(500).json({ success: false, message: "Server error generating inventory summary" });
  }
});

// POST /api/v1/inventory/check-availability - Pre-flight stock availability checker
router.post('/check-availability', verifyJWT, async (req, res) => {
  const { items, storeId, locationId } = req.body;
  const locId = locationId || storeId;
  try {
    const result = await inventoryService.checkStockAvailability(items, locId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: "Error checking stock availability" });
  }
});

// GET /api/v1/inventory - Fetch current inventory snapshot
router.get('/', verifyJWT, async (req, res) => {
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
    res.status(500).json({ success: false, message: "Server error fetching inventory" });
  }
});

// GET /api/v1/inventory/logs - Fetch paginated immutable inventory ledger records
router.get('/logs', verifyJWT, async (req, res) => {
  try {
    const result = await inventoryService.getLedgerLogs(req.query);
    res.json(result);
  } catch (err) {
    console.error("Failed to fetch inventory ledger logs:", err);
    res.status(500).json({ success: false, message: "Server error fetching inventory logs" });
  }
});

// POST /api/v1/inventory/adjust - Adjust stock atomically with reason and audit trail
router.post('/adjust', verifyJWT, async (req, res) => {
  const { productId, storeId, locationId, quantity, type, referenceId, notes, cost } = req.body;
  const locId = locationId || storeId;

  if (!productId || !locId || quantity === undefined) {
    return res.status(400).json({ success: false, message: "Missing required fields: productId, storeId/locationId, quantity" });
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
    res.status(500).json({ success: false, message: err.message || "Server error adjusting inventory" });
  }
});

// POST /api/v1/inventory/transfer - Transfer stock atomically between stores
router.post('/transfer', verifyJWT, async (req, res) => {
  const { productId, fromStoreId, toStoreId, fromLocationId, toLocationId, quantity, notes } = req.body;
  const fromLoc = fromLocationId || fromStoreId;
  const toLoc = toLocationId || toStoreId;

  if (!productId || !fromLoc || !toLoc || !quantity) {
    return res.status(400).json({ success: false, message: "Missing required fields for transfer" });
  }

  try {
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
      code: err.code || 'TRANSFER_ERROR',
      message: err.message || "Server error transferring inventory"
    });
  }
});

module.exports = router;
