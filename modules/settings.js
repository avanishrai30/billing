const express = require('express');
const { getContext, verifyJWT, writeAuditLog } = require('./context');

const router = express.Router();

router.get('/role-permissions', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const roles = await db.collection('role_permissions').find({}).toArray();
    res.json({ success: true, roles });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post('/role-permissions', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const roleData = req.body;
  if (req.user.role !== 'SUPER ADMIN' && req.user.role !== 'OWNER' && req.user.category !== 'super admin') {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  try {
    const roleId = roleData.id || `role-${Date.now()}`;
    const roleDoc = { ...roleData, id: roleId, updatedAt: new Date().toISOString() };

    await db.collection('role_permissions').updateOne(
      { id: roleId },
      { $set: roleDoc },
      { upsert: true }
    );
    await writeAuditLog('rbac_updated', 'permissions', roleId, null, roleDoc, req);
    io.to('sync_global').emit('rbac_updated', { roleId });
    res.json({ success: true, role: roleDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
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
