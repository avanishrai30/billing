const express = require('express');
const { getContext, verifyJWT, writeAuditLog } = require('./context');

const router = express.Router();

// GET /api/v1/suppliers - Fetch all suppliers
router.get('/', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const suppliers = await db.collection('suppliers').find().toArray();
    res.json(suppliers); // Return array directly for backward compatibility
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

// GET /api/v1/suppliers/:id - Fetch supplier by ID
router.get('/:id', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const supplier = await db.collection('suppliers').findOne({ id: req.params.id });
    if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch supplier" });
  }
});

// POST /api/v1/suppliers - Create or update supplier
router.post('/', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const supplier = req.body;
  if (!supplier.name || !supplier.contact) {
    return res.status(400).json({ success: false, message: "Supplier name and contact required" });
  }

  try {
    const supId = supplier.id || `sup-${Date.now()}`;
    const supDoc = {
      ...supplier,
      id: supId,
      updatedAt: new Date().toISOString()
    };

    if (supplier.id) {
      await db.collection('suppliers').updateOne({ id: supId }, { $set: supDoc });
      await writeAuditLog('supplier_updated', 'suppliers', supId, null, supDoc, req);
    } else {
      supDoc.createdAt = new Date().toISOString();
      await db.collection('suppliers').insertOne(supDoc);
      await writeAuditLog('supplier_created', 'suppliers', supId, null, supDoc, req);
    }

    if (io) io.to('sync_global').emit('supplier_updated', { supplier: supDoc });
    res.json({ success: true, supplier: supDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save supplier" });
  }
});

// PATCH /api/v1/suppliers/:id - Partial update
router.patch('/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const supId = req.params.id;
  const updates = { ...req.body, updatedAt: new Date().toISOString() };
  delete updates.id;
  delete updates._id;

  try {
    const result = await db.collection('suppliers').findOneAndUpdate(
      { id: supId },
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!result || !result.value && !result.id) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }
    const updatedDoc = result.value || result;
    await writeAuditLog('supplier_updated', 'suppliers', supId, null, updates, req);
    if (io) io.to('sync_global').emit('supplier_updated', { supplier: updatedDoc });
    res.json({ success: true, supplier: updatedDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update supplier" });
  }
});

// DELETE /api/v1/suppliers/:id - Delete supplier
router.delete('/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const supId = req.params.id;
  try {
    const result = await db.collection('suppliers').deleteOne({ id: supId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }
    await writeAuditLog('supplier_deleted', 'suppliers', supId, null, null, req);
    if (io) io.to('sync_global').emit('supplier_deleted', { id: supId });
    res.json({ success: true, message: "Supplier deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete supplier" });
  }
});

module.exports = router;
