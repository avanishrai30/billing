const express = require('express');
const { getContext, verifyJWT, writeAuditLog } = require('./context');
const os = require('os');

const router = express.Router();

// REST API - Fetch all franchises
router.get('/franchises', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const franchises = await db.collection('franchises').find({}).toArray();
    res.json(franchises); // return array directly for backward compatibility
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// REST API - Create / Modify franchise
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
    
    io.to('sync_global').emit('franchise_updated', { franchise: franchiseDoc });
    res.json({ success: true, franchise: franchiseDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// REST API - Delete franchise
router.delete('/franchises/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  try {
    await db.collection('franchises').deleteOne({ id: req.params.id });
    await writeAuditLog('franchise_deleted', 'businesses', req.params.id, null, null, req);
    io.to('sync_global').emit('franchise_deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// REST API - Fetch franchise supply orders
router.get('/franchise-supply-orders', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const orders = await db.collection('franchise_supply_orders').find({}).toArray();
    res.json(orders); // return array directly
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// REST API - Create franchise supply order
router.post('/franchise-supply-orders', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const orderData = req.body;
  try {
    const orderId = orderData.id || `fso-${Date.now()}`;
    const orderDoc = { ...orderData, id: orderId, createdAt: new Date().toISOString() };
    
    await db.collection('franchise_supply_orders').insertOne(orderDoc);
    await writeAuditLog('franchise_order_created', 'purchase', orderId, null, orderDoc, req);
    
    io.to('sync_global').emit('franchise_order_created', { order: orderDoc });
    res.json({ success: true, order: orderDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// REST API - Fetch all businesses
router.get('/businesses', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const businesses = await db.collection('businesses').find().toArray();
    res.json(businesses); // Return array directly
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch business configurations" });
  }
});

// REST API - Create / Modify business configuration
router.post('/businesses', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const biz = req.body;
  if (!biz.name) {
    return res.status(400).json({ success: false, message: "Business name is required" });
  }

  // Ensure only admin, owner, or super admin can modify business configurations
  const userRole = (req.user.role || '').toLowerCase();
  const userCategory = (req.user.category || '').toLowerCase();
  const allowedRoles = ['owner', 'super admin', 'admin'];
  if (!allowedRoles.includes(userRole) && userCategory !== 'super admin' && userCategory !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Only Admin or Owner can manage outlet configurations" });
  }

  try {
    const docId = biz.id || "biz-" + Date.now();
    const docStatus = biz.status || "active";
    
    const storeObj = {
      id: docId,
      name: biz.name,
      code: biz.code || `ST-${biz.name.substring(0, 3).toUpperCase()}`,
      address: biz.address || "",
      status: docStatus,
      updatedAt: new Date().toISOString()
    };
    
    // Upsert into both businesses and stores to keep collections synchronized
    await db.collection('businesses').updateOne(
      { id: docId },
      { $set: { 
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
          status: docStatus
        } 
      },
      { upsert: true }
    );

    await db.collection('stores').updateOne(
      { id: docId },
      { $set: storeObj },
      { upsert: true }
    );

    await writeAuditLog('business_updated', 'business', docId, null, biz, req);
    io.to('sync_global').emit('business_updated', { business: biz });
    res.json({ success: true, message: "Business profile saved successfully", business: biz });
  } catch (err) {
    console.error("Failed to save business configuration:", err);
    res.status(500).json({ success: false, message: "Failed to save business profile" });
  }
});

// REST API - Delete business configuration
router.delete('/businesses/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const bizId = req.params.id;

  // Ensure only OWNER or super admin can delete business configurations
  if (req.user.role !== 'OWNER' && req.user.category !== 'super admin' && req.user.role !== 'Super Admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Only Super Admin can delete outlet configurations" });
  }

  try {
    await db.collection('businesses').deleteOne({ id: bizId });
    await db.collection('stores').deleteOne({ id: bizId });
    await writeAuditLog('business_deleted', 'business', bizId, null, null, req);
    io.to('sync_global').emit('business_deleted', { id: bizId });
    res.json({ success: true, message: "Business profile deleted successfully" });
  } catch (err) {
    console.error("Failed to delete business configuration:", err);
    res.status(500).json({ success: false, message: "Failed to delete business profile" });
  }
});

// REST API - Fetch all stores
router.get('/stores', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const stores = await db.collection('stores').find().toArray();
    res.json(stores); // Return array directly
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stores" });
  }
});

// REST API - Fetch all customers
router.get('/customers', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const customers = await db.collection('customers').find().toArray();
    res.json(customers); // Return array directly
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// REST API - Create / Update customer
router.post('/customers', verifyJWT, async (req, res) => {
  const { db } = getContext();
  const cust = req.body;
  if (!cust.name || !cust.phone) {
    return res.status(400).json({ success: false, message: "Name and Phone required" });
  }

  try {
    if (cust.id) {
      await db.collection('customers').updateOne({ id: cust.id }, { $set: { ...cust, updatedAt: new Date().toISOString() } });
    } else {
      cust.id = `cust-${Date.now()}`;
      cust.createdAt = new Date().toISOString();
      await db.collection('customers').insertOne(cust);
    }
    res.json({ success: true, customer: cust });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save customer" });
  }
});

// REST API - Fetch all suppliers
router.get('/suppliers', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const suppliers = await db.collection('suppliers').find().toArray();
    res.json(suppliers); // Return array directly
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

// REST API - Create / Update supplier
router.post('/suppliers', verifyJWT, async (req, res) => {
  const { db } = getContext();
  const supplier = req.body;
  if (!supplier.name || !supplier.contact) {
    return res.status(400).json({ success: false, message: "Supplier name and contact required" });
  }

  try {
    if (supplier.id) {
      await db.collection('suppliers').updateOne({ id: supplier.id }, { $set: { ...supplier, updatedAt: new Date().toISOString() } });
    } else {
      supplier.id = `sup-${Date.now()}`;
      supplier.createdAt = new Date().toISOString();
      await db.collection('suppliers').insertOne(supplier);
    }
    res.json({ success: true, supplier });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save supplier" });
  }
});

// REST API - Fetch server info
router.get('/server-info', (req, res) => {
  let localIp = 'localhost';
  try {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
          localIp = alias.address;
          break;
        }
      }
      if (localIp !== 'localhost') break;
    }
  } catch (e) {
    console.error("Failed to fetch host IP:", e);
  }
  const PORT = process.env.PORT || 8181;
  res.json({ localIp, port: PORT });
});

module.exports = router;
