const express = require('express');
const { verifyJWT } = require('./context');
const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');

const router = express.Router();

// GET /api/v1/inventory - Fetch current inventory snapshot
router.get('/', verifyJWT, async (req, res) => {
  try {
    const filter = {};
    if (req.query.storeId) filter.storeId = req.query.storeId;
    if (req.query.productId) filter.productId = req.query.productId;

    const inventory = await inventoryService.listInventory(filter);
    res.json({ success: true, inventory });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error fetching inventory" });
  }
});

// GET /api/v1/inventory/logs - Fetch paginated inventory ledger records
router.get('/logs', verifyJWT, async (req, res) => {
  try {
    const result = await inventoryService.getLedgerLogs(req.query);
    res.json(result);
  } catch (err) {
    console.error("Failed to fetch inventory ledger logs:", err);
    res.status(500).json({ success: false, message: "Server error fetching inventory logs" });
  }
});

// POST /api/v1/inventory/adjust - Adjust stock for a product in a store
router.post('/adjust', verifyJWT, async (req, res) => {
  const { productId, storeId, quantity, type, referenceId } = req.body;
  if (!productId || !storeId || quantity === undefined) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const newQty = await inventoryService.adjustStock(
      productId,
      storeId,
      quantity,
      type || 'adjustment',
      referenceId,
      req.user ? req.user.username : 'system'
    );

    await auditService.writeAuditLog('inventory_updated', 'inventory', productId, null, { quantity: newQty }, req);
    res.json({ success: true, quantity: newQty });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error adjusting inventory" });
  }
});

// POST /api/v1/inventory/transfer - Transfer stock between stores
router.post('/transfer', verifyJWT, async (req, res) => {
  const { productId, fromStoreId, toStoreId, quantity } = req.body;
  if (!productId || !fromStoreId || !toStoreId || !quantity) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const result = await inventoryService.transferStock(
      productId,
      fromStoreId,
      toStoreId,
      quantity,
      req.user ? req.user.username : 'system'
    );

    await auditService.writeAuditLog(
      'inventory_transfer',
      'inventory',
      productId,
      null,
      { fromStoreId, toStoreId, quantity },
      req
    );
    res.json({ success: true, message: "Transfer completed", referenceId: result.referenceId });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error transferring inventory" });
  }
});

module.exports = router;
