const express = require('express');
const { getContext, verifyJWT, writeAuditLog, recordInventoryMovement } = require('./context');

const router = express.Router();

router.get('/', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const purchases = await db.collection('purchases').find({ isArchived: { $ne: true } }).toArray();
    res.json({ success: true, purchases });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

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

    if (purchaseDoc.items && purchaseDoc.storeId) {
      for (const item of purchaseDoc.items) {
        if (item.productId) {
          await recordInventoryMovement(
            item.productId,
            purchaseDoc.storeId,
            'purchase',
            Math.abs(item.quantity),
            'purchase',
            purchaseId,
            req.user.username
          );
        }
      }
    }

    await writeAuditLog('purchase_created', 'purchase', purchaseId, null, purchaseDoc, req);
    io.to('sync_global').emit('purchase_created', { purchaseId });
    res.json({ success: true, purchase: purchaseDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error creating purchase" });
  }
});

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

    // Revert inventory
    if (purchase.items && purchase.storeId) {
      for (const item of purchase.items) {
        if (item.productId) {
          await recordInventoryMovement(
            item.productId,
            purchase.storeId,
            'purchase_void',
            -Math.abs(item.quantity),
            'purchase_void',
            purchaseId,
            req.user.username
          );
        }
      }
    }

    await writeAuditLog('purchase_deleted', 'purchase', purchaseId, null, null, req);
    io.to('sync_global').emit('purchase_deleted', { purchaseId });
    res.json({ success: true, message: "Purchase deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error deleting purchase" });
  }
});

module.exports = router;
