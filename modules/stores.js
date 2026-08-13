const express = require('express');
const { getContext, verifyJWT, writeAuditLog } = require('./context');

const router = express.Router();

// GET /api/v1/stores - Fetch all stores
router.get('/', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const stores = await db.collection('stores').find().toArray();
    res.json(stores); // Return array directly for backward compatibility
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stores" });
  }
});

// GET /api/v1/stores/:id - Fetch single store
router.get('/:id', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const store = await db.collection('stores').findOne({ id: req.params.id });
    if (!store) return res.status(404).json({ success: false, message: "Store not found" });
    res.json(store);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch store" });
  }
});

// POST /api/v1/stores - Create or update store
router.post('/', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const storeData = req.body;
  if (!storeData.name) {
    return res.status(400).json({ success: false, message: "Store name is required" });
  }

  try {
    const storeId = storeData.id || `st-${Date.now()}`;
    const storeDoc = {
      ...storeData,
      id: storeId,
      code: storeData.code || `ST-${storeData.name.substring(0, 3).toUpperCase()}`,
      status: storeData.status || 'active',
      updatedAt: new Date().toISOString()
    };

    if (storeData.id) {
      await db.collection('stores').updateOne({ id: storeId }, { $set: storeDoc });
      await writeAuditLog('store_updated', 'stores', storeId, null, storeDoc, req);
    } else {
      storeDoc.createdAt = new Date().toISOString();
      await db.collection('stores').insertOne(storeDoc);
      await writeAuditLog('store_created', 'stores', storeId, null, storeDoc, req);
    }

    if (io) io.to('sync_global').emit('store_updated', { store: storeDoc });
    res.json({ success: true, store: storeDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save store" });
  }
});

// PATCH /api/v1/stores/:id - Partial update
router.patch('/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const storeId = req.params.id;
  const updates = { ...req.body, updatedAt: new Date().toISOString() };
  delete updates.id;
  delete updates._id;

  try {
    const result = await db.collection('stores').findOneAndUpdate(
      { id: storeId },
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!result || !result.value && !result.id) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }
    const updatedStore = result.value || result;
    await writeAuditLog('store_updated', 'stores', storeId, null, updates, req);
    if (io) io.to('sync_global').emit('store_updated', { store: updatedStore });
    res.json({ success: true, store: updatedStore });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update store" });
  }
});

// DELETE /api/v1/stores/:id - Delete store
router.delete('/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const storeId = req.params.id;
  try {
    const result = await db.collection('stores').deleteOne({ id: storeId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }
    await writeAuditLog('store_deleted', 'stores', storeId, null, null, req);
    if (io) io.to('sync_global').emit('store_deleted', { id: storeId });
    res.json({ success: true, message: "Store deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete store" });
  }
});

module.exports = router;
