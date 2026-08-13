const express = require('express');
const { getContext, verifyJWT, writeAuditLog } = require('./context');

const router = express.Router();

// GET /api/v1/customers - Fetch all customers
router.get('/', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const customers = await db.collection('customers').find().toArray();
    res.json(customers); // Return array directly for backward compatibility
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// GET /api/v1/customers/:id - Fetch customer by ID
router.get('/:id', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const customer = await db.collection('customers').findOne({ id: req.params.id });
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

// POST /api/v1/customers - Create or update customer
router.post('/', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const cust = req.body;
  if (!cust.name || !cust.phone) {
    return res.status(400).json({ success: false, message: "Name and Phone required" });
  }

  try {
    const custId = cust.id || `cust-${Date.now()}`;
    const custDoc = {
      ...cust,
      id: custId,
      updatedAt: new Date().toISOString()
    };

    if (cust.id) {
      await db.collection('customers').updateOne({ id: custId }, { $set: custDoc });
      await writeAuditLog('customer_updated', 'customers', custId, null, custDoc, req);
    } else {
      custDoc.createdAt = new Date().toISOString();
      await db.collection('customers').insertOne(custDoc);
      await writeAuditLog('customer_created', 'customers', custId, null, custDoc, req);
    }

    if (io) io.to('sync_global').emit('customer_updated', { customer: custDoc });
    res.json({ success: true, customer: custDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save customer" });
  }
});

// PATCH /api/v1/customers/:id - Partial update
router.patch('/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const custId = req.params.id;
  const updates = { ...req.body, updatedAt: new Date().toISOString() };
  delete updates.id;
  delete updates._id;

  try {
    const result = await db.collection('customers').findOneAndUpdate(
      { id: custId },
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!result || !result.value && !result.id) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    const updatedDoc = result.value || result;
    await writeAuditLog('customer_updated', 'customers', custId, null, updates, req);
    if (io) io.to('sync_global').emit('customer_updated', { customer: updatedDoc });
    res.json({ success: true, customer: updatedDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update customer" });
  }
});

// DELETE /api/v1/customers/:id - Delete customer
router.delete('/:id', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const custId = req.params.id;
  try {
    const result = await db.collection('customers').deleteOne({ id: custId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    await writeAuditLog('customer_deleted', 'customers', custId, null, null, req);
    if (io) io.to('sync_global').emit('customer_deleted', { id: custId });
    res.json({ success: true, message: "Customer deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete customer" });
  }
});

module.exports = router;
