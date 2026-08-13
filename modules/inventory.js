const express = require('express');
const { getContext, verifyJWT, writeAuditLog, recordInventoryMovement } = require('./context');

const router = express.Router();

router.get('/', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const inventory = await db.collection('inventory').find({}).toArray();
    res.json({ success: true, inventory });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post('/adjust', verifyJWT, async (req, res) => {
  const { productId, storeId, quantity, type, referenceId } = req.body;
  if (!productId || !storeId || quantity === undefined) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const newQty = await recordInventoryMovement(
      productId,
      storeId,
      type || 'adjustment',
      quantity,
      'manual',
      referenceId || 'N/A',
      req.user.username
    );

    await writeAuditLog('inventory_updated', 'inventory', productId, null, { quantity: newQty }, req);
    res.json({ success: true, quantity: newQty });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error adjusting inventory" });
  }
});

router.post('/transfer', verifyJWT, async (req, res) => {
  const { productId, fromStoreId, toStoreId, quantity } = req.body;
  if (!productId || !fromStoreId || !toStoreId || !quantity) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    // Deduct from source
    await recordInventoryMovement(
      productId,
      fromStoreId,
      'transfer_out',
      -Math.abs(quantity),
      'transfer',
      `tf-${Date.now()}`,
      req.user.username
    );

    // Add to destination
    await recordInventoryMovement(
      productId,
      toStoreId,
      'transfer_in',
      Math.abs(quantity),
      'transfer',
      `tf-${Date.now()}`,
      req.user.username
    );

    await writeAuditLog('inventory_transfer', 'inventory', productId, null, { fromStoreId, toStoreId, quantity }, req);
    res.json({ success: true, message: "Transfer completed" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error transferring inventory" });
  }
});

module.exports = router;
