const express = require('express');
const { getContext, verifyJWT, writeAuditLog } = require('./context');

const router = express.Router();

// GET /api/v1/businesses - Fetch all businesses
router.get('/', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const businesses = await db.collection('businesses').find().toArray();
    res.json(businesses); // Return array directly for backward compatibility
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch business configurations" });
  }
});

// GET /api/v1/businesses/:id - Fetch single business
router.get('/:id', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const biz = await db.collection('businesses').findOne({ id: req.params.id });
    if (!biz) return res.status(404).json({ success: false, message: "Business profile not found" });
    res.json(biz);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch business profile" });
  }
});

// POST /api/v1/businesses - Create or update business profile
router.post('/', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const biz = req.body;
  if (!biz.name) {
    return res.status(400).json({ success: false, message: "Business name is required" });
  }

  // Permission check: Admin, Owner, or Super Admin
  const userRole = (req.user.role || '').toLowerCase();
  const userCategory = (req.user.category || '').toLowerCase();
  const allowedRoles = ['owner', 'super admin', 'admin'];
  if (!allowedRoles.includes(userRole) && userCategory !== 'super admin' && userCategory !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Only Admin or Owner can manage outlet configurations" });
  }

  try {
    const docId = biz.id || "biz-" + Date.now();
    const docStatus = biz.status || "active";

    const bizDoc = {
      id: docId,
      name: biz.name,
      subtitle: biz.subtitle || "",
      owner: biz.owner || "",
      gstin: biz.gstin || "",
      phone: biz.phone || "",
      email: biz.email || "",
      address: biz.address || "",
      bankName: biz.bankName || "",
      accountNo: biz.accountNo || "",
      ifsc: biz.ifsc || "",
      upiId: biz.upiId || "",
      terms: biz.terms || "",
      logo: biz.logo || "",
      status: docStatus,
      updatedAt: new Date().toISOString()
    };

    const storeDoc = {
      id: docId,
      name: biz.name,
      code: biz.code || `ST-${biz.name.substring(0, 3).toUpperCase()}`,
      address: biz.address || "",
      status: docStatus,
      updatedAt: new Date().toISOString()
    };

    // Upsert into businesses collection
    await db.collection('businesses').updateOne(
      { id: docId },
      { $set: bizDoc, $setOnInsert: { createdAt: new Date().toISOString() } },
      { upsert: true }
    );

    // Keep stores collection synchronized for backward compatibility
    await db.collection('stores').updateOne(
      { id: docId },
      { $set: storeDoc, $setOnInsert: { createdAt: new Date().toISOString() } },
      { upsert: true }
    );

    await writeAuditLog('business_updated', 'business', docId, null, bizDoc, req);
    if (io) io.to('sync_global').emit('business_updated', { business: bizDoc });
    res.json({ success: true, message: "Business profile saved successfully", business: bizDoc });
  } catch (err) {
    console.error("Failed to save business configuration:", err);
    res.status(500).json({ success: false, message: "Failed to save business profile" });
  }
});

// PATCH /api/v1/businesses/:id - Partial update
router.patch('/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const bizId = req.params.id;

  const userRole = (req.user.role || '').toLowerCase();
  const userCategory = (req.user.category || '').toLowerCase();
  const allowedRoles = ['owner', 'super admin', 'admin'];
  if (!allowedRoles.includes(userRole) && userCategory !== 'super admin' && userCategory !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Only Admin or Owner can manage outlet configurations" });
  }

  const updates = { ...req.body, updatedAt: new Date().toISOString() };
  delete updates.id;
  delete updates._id;

  try {
    const result = await db.collection('businesses').findOneAndUpdate(
      { id: bizId },
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!result || !result.value && !result.id) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }
    const updatedBiz = result.value || result;

    // Sync store name/address/status if present
    const storeUpdates = {};
    if (updates.name) storeUpdates.name = updates.name;
    if (updates.address) storeUpdates.address = updates.address;
    if (updates.status) storeUpdates.status = updates.status;
    if (Object.keys(storeUpdates).length > 0) {
      storeUpdates.updatedAt = new Date().toISOString();
      await db.collection('stores').updateOne({ id: bizId }, { $set: storeUpdates });
    }

    await writeAuditLog('business_updated', 'business', bizId, null, updates, req);
    if (io) io.to('sync_global').emit('business_updated', { business: updatedBiz });
    res.json({ success: true, business: updatedBiz });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update business profile" });
  }
});

// DELETE /api/v1/businesses/:id - Delete business profile
router.delete('/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const bizId = req.params.id;

  // Only OWNER or super admin
  const userRole = (req.user.role || '').toLowerCase();
  const userCategory = (req.user.category || '').toLowerCase();
  if (userRole !== 'owner' && userRole !== 'super admin' && userCategory !== 'super admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Only Super Admin can delete outlet configurations" });
  }

  try {
    await db.collection('businesses').deleteOne({ id: bizId });
    await db.collection('stores').deleteOne({ id: bizId });
    await writeAuditLog('business_deleted', 'business', bizId, null, null, req);
    if (io) io.to('sync_global').emit('business_deleted', { id: bizId });
    res.json({ success: true, message: "Business profile deleted successfully" });
  } catch (err) {
    console.error("Failed to delete business configuration:", err);
    res.status(500).json({ success: false, message: "Failed to delete business profile" });
  }
});

module.exports = router;
