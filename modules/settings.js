const express = require('express');
const { getContext, verifyJWT } = require('./context');
const auditService = require('../services/auditService');

const router = express.Router();

// GET /api/v1/role-permissions - Fetch RBAC permissions matrix
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

// POST /api/v1/role-permissions - Save RBAC permissions matrix (Admin / Owner only)
router.post('/role-permissions', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const permissions = req.body.permissions || req.body;
  if (req.user.role !== 'SUPER ADMIN' && req.user.role !== 'OWNER' && req.user.category !== 'super admin') {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  try {
    await db.collection('role_permissions').updateOne(
      { key: "matrix" },
      { $set: { permissions, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    await auditService.writeAuditLog('rbac_updated', 'permissions', 'matrix', null, permissions, req);
    if (io) io.to('sync_global').emit('rbac_updated', permissions);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save permissions" });
  }
});

// GET /api/v1/public/settings - Public portal branding settings (no auth required)
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

// POST /api/v1/settings - Save portal branding settings (Admin / Owner only)
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
    await auditService.writeAuditLog('settings_updated', 'settings', 'landing_settings', null, { title, logo }, req);
    if (io) io.to('sync_global').emit('settings_updated', { title, logo });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save settings" });
  }
});

module.exports = router;
