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
    res.json(purchases); // Return array directly for backward compatibility
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch purchases" });
  }
});

// GET /api/v1/purchases/:id - Fetch single purchase
router.get('/:id', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const purchase = await db.collection('purchases').findOne({
      $or: [{ id: req.params.id }, { invoiceNumber: req.params.id }]
    });
    if (!purchase) return res.status(404).json({ success: false, message: "Purchase not found" });
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch purchase" });
  }
});

// POST /api/v1/purchases - Create purchase entry & add stock via inventoryService
router.post('/', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const purchaseData = req.body;

  try {
    const purchaseId = purchaseData.id || `pur-${Date.now()}`;
    const purchaseDoc = {
      ...purchaseData,
      id: purchaseId,
      isArchived: false,
      createdAt: new Date().toISOString()
    };

    await db.collection('purchases').insertOne(purchaseDoc);

    // Increment inventory via domain inventoryService
    if (purchaseDoc.items && purchaseDoc.storeId) {
      await inventoryService.addStock(
        purchaseDoc.items,
        purchaseDoc.storeId,
        purchaseId,
        req.user ? req.user.username : 'system'
      );
    }

    await auditService.writeAuditLog('purchase_created', 'purchase', purchaseId, null, purchaseDoc, req);
    if (io) {
      io.to('sync_global').emit('purchase_created', { purchaseId });
    }
    res.json({ success: true, purchase: purchaseDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error creating purchase" });
  }
});

// DELETE /api/v1/purchases/:id - Soft delete purchase entry & revert stock via inventoryService
router.delete('/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const purchaseId = req.params.id;

  try {
    const purchase = await db.collection('purchases').findOne({ id: purchaseId });
    if (!purchase) return res.status(404).json({ success: false, message: "Purchase not found" });
    if (purchase.isArchived) return res.status(400).json({ success: false, message: "Purchase already deleted" });

    await db.collection('purchases').updateOne(
      { id: purchaseId },
      { $set: { isArchived: true, deletedAt: new Date().toISOString() } }
    );

    // Revert stock via domain inventoryService
    if (purchase.items && purchase.storeId) {
      await inventoryService.revertStock(
        purchase.items,
        purchase.storeId,
        'purchase_void',
        'purchase_void',
        purchaseId,
        req.user ? req.user.username : 'system'
      );
    }

    await auditService.writeAuditLog('purchase_deleted', 'purchase', purchaseId, null, null, req);
    if (io) {
      io.to('sync_global').emit('purchase_deleted', { purchaseId });
    }
    res.json({ success: true, message: "Purchase deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error deleting purchase" });
  }
});

module.exports = router;
