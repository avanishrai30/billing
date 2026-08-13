const express = require('express');
const { getContext, verifyJWT, writeAuditLog } = require('./context');

const router = express.Router();

router.get('/role-permissions', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const doc = await db.collection('role_permissions').findOne({ key: "matrix" });
    if (doc) {
      res.json(doc.permissions);
    } else {
      const defaults = {
        admin: ['dashboard', 'billing', 'inventory', 'purchase', 'businesses', 'customers', 'invoices', 'settings', 'auditor', 'permissions', 'scanner', 'verification', 'remote-scanner', 'refunds'],
        employee: ['billing', 'inventory', 'purchase', 'scanner', 'verification'],
        auditor: ['invoices', 'auditor']
      };
      res.json(defaults);
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

router.post('/role-permissions', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const permissions = req.body;
  if (req.user.role !== 'SUPER ADMIN' && req.user.role !== 'OWNER' && req.user.category !== 'super admin') {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  try {
    await db.collection('role_permissions').updateOne(
      { key: "matrix" },
      { $set: { permissions, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    await writeAuditLog('rbac_updated', 'permissions', 'matrix', null, permissions, req);
    io.to('sync_global').emit('rbac_updated', permissions);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save permissions" });
  }
});

router.get('/public/settings', async (req, res) => {
  const { db } = getContext();
  try {
    const settings = await db.collection('settings').findOne({ key: "landing_settings" });
    if (settings) {
      res.json({ title: settings.title, logo: settings.logo });
    } else {
      res.json({ title: "AIAVRO Business OS", logo: "transparent logo aiavro Background Removed.png" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch public settings" });
  }
});

router.post('/settings', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const { title, logo } = req.body;
  if (req.user.role !== 'SUPER ADMIN' && req.user.role !== 'OWNER' && req.user.category !== 'super admin') {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  try {
    await db.collection('settings').updateOne(
      { key: "landing_settings" },
      { $set: { title, logo, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    await writeAuditLog('settings_updated', 'settings', 'landing_settings', null, { title, logo }, req);
    io.to('sync_global').emit('settings_updated', { title, logo });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save settings" });
  }
});

module.exports = router;
