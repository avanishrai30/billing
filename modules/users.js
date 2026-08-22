const express = require('express');
const { getContext, verifyJWT, validateBody, schemas } = require('./context');
const { requirePermission, requireAnyPermission } = require('../services/authzService');
const userService = require('../services/userService');

const router = express.Router();

// GET /api/v1/users - Fetch all users
router.get('/', verifyJWT, requirePermission('users.view'), async (req, res) => {
  try {
    const users = await userService.listUsers();
    res.json(users); // Return array directly for backward compatibility
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch users" } });
  }
});

// GET /api/v1/users/presences - Fetch active user presences
router.get('/presences', verifyJWT, requirePermission('users.view'), (req, res) => {
  const { activePresences } = getContext();
  res.json(Array.from(activePresences.values()));
});

// GET /api/v1/users/me/activity - Fetch current user's own audit activity
router.get('/me/activity', verifyJWT, async (req, res) => {
  try {
    const auditService = require('../services/auditService');
    const logs = await auditService.listAuditLogs({
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0,
      performedBy: req.user.username
    });
    res.json({ success: true, auditLogs: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch user activity" } });
  }
});

// GET /api/v1/users/:id/effective-permissions - Inspect computed access for one user
router.get('/:id/effective-permissions', verifyJWT, requirePermission('users.view'), async (req, res) => {
  try {
    const permissions = await userService.getEffectivePermissions(req.params.id);
    if (!permissions) return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });
    res.json({ success: true, ...permissions });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || "SERVER_ERROR", message: err.message || "Failed to fetch effective permissions" }
    });
  }
});

// POST /api/v1/users/:id/permissions - Save user-specific grant/deny overrides
router.post('/:id/permissions', verifyJWT, validateBody(schemas.userPermissionOverrideSchema), requireAnyPermission(['users.update', 'roles.update']), async (req, res) => {
  try {
    const result = await userService.updatePermissionOverrides(req.params.id, req.validatedBody || {}, req);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || "SERVER_ERROR", message: err.message || "Failed to update user permissions" }
    });
  }
});

// GET /api/v1/users/:id - Fetch single user
router.get('/:id', verifyJWT, requirePermission('users.view'), async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });
    res.json(user);
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch user" } });
  }
});

// POST /api/v1/users - Create or update user account (Admin / Super Admin only)
router.post('/', verifyJWT, validateBody(schemas.userSchema), requireAnyPermission(['users.create', 'users.update']), async (req, res) => {
  const userData = req.validatedBody;
  try {
    const userDoc = await userService.saveUser(userData, req);
    res.json({ success: true, user: userDoc });
  } catch (err) {
    if (!err.statusCode || err.statusCode >= 500) {
      console.error("[Users] Error saving user:", err);
    }
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || "SERVER_ERROR", message: err.message || "Server error saving user" }
    });
  }
});

// POST /api/v1/users/:id/deactivate - Deactivate user account
router.post('/:id/deactivate', verifyJWT, requirePermission('users.deactivate'), async (req, res) => {
  try {
    const deactivated = await userService.deactivateUser(req.params.id, req);
    if (!deactivated) return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });
    res.json({ success: true, message: "User account deactivated successfully", user: deactivated });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || "SERVER_ERROR", message: err.message || "Failed to deactivate user" }
    });
  }
});

// POST /api/v1/users/profile - Update own profile details
router.post('/profile', verifyJWT, async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const updated = await userService.updateProfile(req.user.id, { name, email, phone }, req);
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Server error updating profile" } });
  }
});

// POST /api/v1/users/avatar - Update own avatar path
router.post('/avatar', verifyJWT, async (req, res) => {
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ success: false, error: { code: "INVALID_AVATAR", message: "Avatar path is required" } });
  if (typeof avatar !== 'string' || !avatar.startsWith('/uploads/users/')) {
    return res.status(400).json({ success: false, error: { code: "INVALID_AVATAR", message: "Avatar must be an uploaded user profile image" } });
  }

  try {
    await userService.updateAvatar(req.user.id, avatar, req);
    res.json({ success: true, avatar });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to update avatar" } });
  }
});

// POST /api/v1/users/change-password - Change own password (calls central userService)
router.post('/change-password', verifyJWT, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const result = await userService.changePassword(req.user.id, currentPassword, newPassword, req);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, error: { code: "PASSWORD_CHANGE_FAILED", message: err.message || "Failed to update password" } });
  }
});

module.exports = router;
