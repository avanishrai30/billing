const express = require('express');
const { verifyJWT } = require('./context');
const auditService = require('../services/auditService');

const router = express.Router();

// GET /api/v1/audit-logs - Read audit log history
router.get('/', verifyJWT, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000;
    const logs = await auditService.listAuditLogs(limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

module.exports = router;
