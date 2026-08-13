const express = require('express');
const { getContext, verifyJWT } = require('./context');
const auditService = require('../services/auditService');

const router = express.Router();

// GET /api/v1/franchises - Fetch all franchises
router.get('/franchises', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const franchises = await db.collection('franchises').find({}).toArray();
    res.json(franchises); // return array directly for backward compatibility
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/v1/franchises/:id - Fetch single franchise
router.get('/franchises/:id', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const franchise = await db.collection('franchises').findOne({ id: req.params.id });
    if (!franchise) return res.status(404).json({ success: false, message: "Franchise not found" });
    res.json(franchise);
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/v1/franchises - Create / Modify franchise
router.post('/franchises', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const franchiseData = req.body;
  try {
    const franchiseId = franchiseData.id || `fran-${Date.now()}`;
    const franchiseDoc = {
      ...franchiseData,
      id: franchiseId,
      updatedAt: new Date().toISOString()
    };
    
    if (!franchiseData.id) {
      franchiseDoc.createdAt = new Date().toISOString();
      await db.collection('franchises').insertOne(franchiseDoc);
      await auditService.writeAuditLog('franchise_created', 'businesses', franchiseId, null, franchiseDoc, req);
    } else {
      await db.collection('franchises').updateOne({ id: franchiseId }, { $set: franchiseDoc });
      await auditService.writeAuditLog('franchise_updated', 'businesses', franchiseId, null, franchiseDoc, req);
    }
    
    if (io) io.to('sync_global').emit('franchise_updated', { franchise: franchiseDoc });
    res.json({ success: true, franchise: franchiseDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/v1/franchises/:id - Delete franchise
router.delete('/franchises/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  try {
    const result = await db.collection('franchises').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Franchise not found" });
    }
    await auditService.writeAuditLog('franchise_deleted', 'businesses', req.params.id, null, null, req);
    if (io) io.to('sync_global').emit('franchise_deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/v1/franchise-supply-orders - Fetch franchise supply orders
router.get('/franchise-supply-orders', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const orders = await db.collection('franchise_supply_orders').find({}).toArray();
    res.json(orders); // return array directly
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/v1/franchise-supply-orders - Create franchise supply order
router.post('/franchise-supply-orders', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const orderData = req.body;
  try {
    const orderId = orderData.id || `fso-${Date.now()}`;
    const orderDoc = { ...orderData, id: orderId, createdAt: new Date().toISOString() };
    
    await db.collection('franchise_supply_orders').insertOne(orderDoc);
    await auditService.writeAuditLog('franchise_order_created', 'purchase', orderId, null, orderDoc, req);
    
    if (io) io.to('sync_global').emit('franchise_order_created', { order: orderDoc });
    res.json({ success: true, order: orderDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
