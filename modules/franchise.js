const express = require('express');
const { getContext, verifyJWT, writeAuditLog } = require('./context');

const router = express.Router();

router.get('/franchises', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const franchises = await db.collection('franchises').find({}).toArray();
    res.json({ success: true, franchises });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post('/franchises', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const franchiseData = req.body;
  try {
    const franchiseId = franchiseData.id || `fran-${Date.now()}`;
    const franchiseDoc = { ...franchiseData, id: franchiseId };
    
    if (!franchiseData.id) {
      franchiseDoc.createdAt = new Date().toISOString();
      await db.collection('franchises').insertOne(franchiseDoc);
      await writeAuditLog('franchise_created', 'businesses', franchiseId, null, franchiseDoc, req);
    } else {
      await db.collection('franchises').updateOne({ id: franchiseId }, { $set: franchiseDoc });
      await writeAuditLog('franchise_updated', 'businesses', franchiseId, null, franchiseDoc, req);
    }
    
    io.to('sync_global').emit('franchise_updated', { franchiseId });
    res.json({ success: true, franchise: franchiseDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete('/franchises/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  try {
    await db.collection('franchises').deleteOne({ id: req.params.id });
    await writeAuditLog('franchise_deleted', 'businesses', req.params.id, null, null, req);
    io.to('sync_global').emit('franchise_deleted', { franchiseId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get('/franchise-supply-orders', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const orders = await db.collection('franchise_supply_orders').find({}).toArray();
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post('/franchise-supply-orders', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const orderData = req.body;
  try {
    const orderId = orderData.id || `fso-${Date.now()}`;
    const orderDoc = { ...orderData, id: orderId, createdAt: new Date().toISOString() };
    
    await db.collection('franchise_supply_orders').insertOne(orderDoc);
    await writeAuditLog('franchise_order_created', 'purchase', orderId, null, orderDoc, req);
    
    io.to('sync_global').emit('franchise_order_created', { orderId });
    res.json({ success: true, order: orderDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
