const express = require('express');
const { getContext, verifyJWT } = require('./context');
const { isSuperAdmin } = require('../services/authzService');
const adminCleanupService = require('../services/adminCleanupService');
const auditService = require('../services/auditService');

const router = express.Router();

/**
 * Canonical Super Admin authorization guard middleware
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user || !isSuperAdmin(req.user)) {
    auditService.writeAuditLog(
      'AUTHORIZATION_DENIED',
      'security',
      req.user?.id || req.user?.username || 'anonymous',
      null,
      {
        requiredCategory: 'super admin',
        userCategory: req.user?.category || req.user?.role,
        endpoint: req.originalUrl || req.path,
        method: req.method,
        reason: 'Super Admin category required for data cleanup & maintenance.'
      },
      req
    ).catch(e => console.warn("[Audit] Non-fatal auth failure logging error:", e.message));

    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Super Admin authorization required for Data Cleanup & Maintenance Center.'
      }
    });
  }
  next();
}

// 1. GET /api/v1/admin/cleanup/summary - Domain counts & last maintenance job
router.get('/summary', verifyJWT, requireSuperAdmin, async (req, res) => {
  try {
    const summary = await adminCleanupService.getDomainSummary(req.user);
    res.json({ success: true, summary });
  } catch (err) {
    console.error("[AdminCleanup] Error fetching summary:", err);
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: { code: err.code || 'FETCH_ERROR', message: err.message } });
  }
});

// 2. POST /api/v1/admin/cleanup/:domain/query - Filtered domain records
router.post('/:domain/query', verifyJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { domain } = req.params;
    const { filters = {}, pagination = {} } = req.body;
    const result = await adminCleanupService.queryDomainRecords(domain, filters, pagination, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(`[AdminCleanup] Error querying records for domain ${req.params.domain}:`, err);
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: { code: err.code || 'QUERY_ERROR', message: err.message } });
  }
});

// 3. POST /api/v1/admin/cleanup/:domain/preview - Dry-run impact preview
router.post('/:domain/preview', verifyJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { domain } = req.params;
    const { action, targetIds = [], filters = {} } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Cleanup action is required' }
      });
    }

    const preview = await adminCleanupService.previewCleanup(domain, action, targetIds, filters, req.user);
    res.json({ success: true, preview });
  } catch (err) {
    console.error(`[AdminCleanup] Error generating preview for domain ${req.params.domain}:`, err);
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: { code: err.code || 'PREVIEW_ERROR', message: err.message } });
  }
});

// 4. POST /api/v1/admin/cleanup/:domain/execute - Execute maintenance operation
router.post('/:domain/execute', verifyJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { domain } = req.params;
    const { action, targetIds = [], filters = {}, previewToken, confirmCode, password } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Cleanup action is required' }
      });
    }

    const result = await adminCleanupService.executeCleanup({
      domain,
      action,
      targetIds,
      filters,
      previewToken,
      confirmCode,
      password,
      user: req.user,
      req
    });

    res.json({ success: true, result });
  } catch (err) {
    console.error(`[AdminCleanup] Error executing cleanup for domain ${req.params.domain}:`, err);
    const status = err.statusCode || (err.code === 'STALE_PREVIEW' || err.code === 'DUPLICATE_EXECUTION' ? 409 : 400);
    res.status(status).json({
      success: false,
      error: { code: err.code || 'EXECUTION_ERROR', message: err.message }
    });
  }
});

// 5. GET /api/v1/admin/cleanup/operations - List past operations
router.get('/operations', verifyJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { limit = 20, skip = 0 } = req.query;
    const result = await adminCleanupService.listOperations(limit, skip, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[AdminCleanup] Error listing operations:", err);
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: { code: err.code || 'FETCH_ERROR', message: err.message } });
  }
});

// 6. GET /api/v1/admin/cleanup/operations/:operationId - Get operation status/manifest
router.get('/operations/:operationId', verifyJWT, requireSuperAdmin, async (req, res) => {
  try {
    const operation = await adminCleanupService.getOperation(req.params.operationId, req.user);
    res.json({ success: true, operation });
  } catch (err) {
    console.error(`[AdminCleanup] Error fetching operation ${req.params.operationId}:`, err);
    const status = err.statusCode || 404;
    res.status(status).json({ success: false, error: { code: err.code || 'NOT_FOUND', message: err.message } });
  }
});

// 7. POST /api/v1/admin/cleanup/operations/:operationId/rollback - Rollback reversible operation
router.post('/operations/:operationId/rollback', verifyJWT, requireSuperAdmin, async (req, res) => {
  try {
    const result = await adminCleanupService.rollbackOperation(req.params.operationId, req.user, req);
    res.json({ success: true, result });
  } catch (err) {
    console.error(`[AdminCleanup] Error rolling back operation ${req.params.operationId}:`, err);
    const status = err.statusCode || 400;
    res.status(status).json({ success: false, error: { code: err.code || 'ROLLBACK_ERROR', message: err.message } });
  }
});

module.exports = router;
