const express = require('express');
const { getContext, verifyJWT, validateBody, schemas, writeAuditLog } = require('./context');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
  const { db, io } = getContext();
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Missing current or new password" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "New password must be at least 6 characters long" });
  }

  try {
    const user = await db.collection('users').findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const match = bcrypt.compareSync(currentPassword, user.passwordHash || user.password);
    if (!match) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    const newHash = bcrypt.hashSync(newPassword, 12);
    await db.collection('users').updateOne(
      { id: req.user.id },
      { $set: { passwordHash: newHash, updatedAt: new Date().toISOString() } }
    );

    await writeAuditLog('user_updated', 'user', req.user.id, null, null, req);
    io.to('sync_global').emit('user_updated', { userId: req.user.id });
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error updating password" });
  }
});

module.exports = router;
