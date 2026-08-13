const express = require('express');
const { getContext, verifyJWT, validateBody, schemas } = require('./context');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const auditService = require('../services/auditService');

const router = express.Router();

router.post('/login', validateBody(schemas.loginSchema), async (req, res) => {
  const { db, JWT_SECRET } = getContext();
  const { username, password } = req.validatedBody;

  try {
    const user = await db.collection('users').findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() }
      ]
    });
    if (!user) return res.status(401).json({ success: false, message: "Invalid username or password" });
    if (user.status === 'suspended') return res.status(403).json({ success: false, message: "Your account is suspended" });

    const match = bcrypt.compareSync(password, user.passwordHash || user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, category: user.category || 'employee', assignedStoreId: user.assignedStoreId || 'all' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await auditService.writeAuditLog('auth_login', 'auth', user.id, null, { username: user.username }, req);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        category: user.category || 'employee',
        assignedStoreId: user.assignedStoreId || 'all',
        assignedStores: user.assignedStores || ['all'],
        avatar: user.avatar || ''
      }
    });
  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get('/verify', verifyJWT, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.post('/change-password', verifyJWT, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const result = await userService.changePassword(req.user.id, currentPassword, newPassword, req);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message || "Failed to update password" });
  }
});

module.exports = router;
