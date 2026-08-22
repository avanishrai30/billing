const express = require('express');
const { getContext, verifyJWT } = require('./context');
const { DEFAULT_ROLE_PERMISSIONS, requirePermission, assertRoleMatrixUpdateAllowed } = require('../services/authzService');
const auditService = require('../services/auditService');

const router = express.Router();

// GET /api/v1/role-permissions - Fetch RBAC permissions matrix
router.get('/role-permissions', verifyJWT, requirePermission('roles.view'), async (req, res) => {
  const { db } = getContext();
  try {
    const doc = await db.collection('role_permissions').findOne({ key: "matrix" });
    if (doc) {
      res.json(doc.permissions);
    } else {
      const defaults = {
        admin: DEFAULT_ROLE_PERMISSIONS.admin,
        employee: DEFAULT_ROLE_PERMISSIONS.employee,
        auditor: DEFAULT_ROLE_PERMISSIONS.auditor
      };
      res.json(defaults);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch permissions" } });
  }
});

// POST /api/v1/role-permissions - Save RBAC permissions matrix (Admin / Owner only)
router.post('/role-permissions', verifyJWT, requirePermission('roles.update'), async (req, res) => {
  const { db, io } = getContext();
  const permissions = req.body.permissions || req.body;

  try {
    await assertRoleMatrixUpdateAllowed(req.user, permissions);
    await db.collection('role_permissions').updateOne(
      { key: "matrix" },
      { $set: { permissions, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    await auditService.writeAuditLog('rbac_updated', 'permissions', 'matrix', null, permissions, req);
    if (io) io.to('sync_global').emit('rbac_updated', permissions);
    res.json({ success: true, message: "Role permissions matrix updated successfully" });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || "SERVER_ERROR", message: err.message || "Failed to save permissions" }
    });
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
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch public settings" } });
  }
});

// POST /api/v1/settings - Save portal branding settings (Admin / Owner only)
router.post('/settings', verifyJWT, requirePermission('settings.update'), async (req, res) => {
  const { db, io } = getContext();
  const { title, logo } = req.body;

  try {
    await db.collection('settings').updateOne(
      { key: "landing_settings" },
      { $set: { title, logo, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    await auditService.writeAuditLog('settings_updated', 'settings', 'landing_settings', null, { title, logo }, req);
    if (io) io.to('sync_global').emit('settings_updated', { title, logo });
    res.json({ success: true, message: "Settings saved successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to save settings" } });
  }
});

module.exports = router;
