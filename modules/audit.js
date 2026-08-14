const express = require('express');
const { verifyJWT } = require('./context');
const { requirePermission, isSuperAdmin } = require('../services/authzService');
const auditService = require('../services/auditService');

const router = express.Router();

// GET /api/v1/audit-logs - Read audit log history with pagination and store filtering
router.get('/', verifyJWT, requirePermission('audit.view'), async (req, res) => {
  try {
    const options = {
      limit: parseInt(req.query.limit) || 200,
      skip: parseInt(req.query.skip) || 0,
      eventType: req.query.eventType,
      entity: req.query.entity,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    // If user is scoped to a specific store, restrict query to that store
    if (!isSuperAdmin(req.user) && req.user.assignedStoreId && req.user.assignedStoreId !== 'all') {
      options.storeId = req.user.assignedStoreId;
    } else if (req.query.storeId) {
      options.storeId = req.query.storeId;
    }

    const logs = await auditService.listAuditLogs(options);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch audit logs" } });
  }
});

module.exports = router;
