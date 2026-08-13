const express = require('express');
const { getContext, verifyJWT, validateBody, schemas, writeAuditLog } = require('./context');
const bcrypt = require('bcryptjs');

const router = express.Router();

router.get('/', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const users = await db.collection('users').find({}).project({ passwordHash: 0, password: 0 }).toArray();
    res.json(users); // Return array directly
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get('/presences', verifyJWT, (req, res) => {
  const { activePresences } = getContext();
  res.json(Array.from(activePresences.values()));
});

router.post('/', verifyJWT, validateBody(schemas.userSchema), async (req, res) => {
  const { db, io } = getContext();
  const userData = req.validatedBody;
  
  if (req.user.role !== 'SUPER ADMIN' && req.user.role !== 'OWNER' && req.user.category !== 'super admin') {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  try {
    const userId = userData.id || `usr-${Date.now()}`;
    const passwordHash = userData.password ? bcrypt.hashSync(userData.password, 12) : undefined;
    
    const userDoc = {
      ...userData,
      id: userId,
      updatedAt: new Date().toISOString()
    };
    if (passwordHash) {
      userDoc.passwordHash = passwordHash;
    }
    delete userDoc.password;

    if (!userData.id) {
      userDoc.createdAt = new Date().toISOString();
      await db.collection('users').insertOne(userDoc);
      await writeAuditLog('user_created', 'user', userId, null, userDoc, req);
    } else {
      await db.collection('users').updateOne({ id: userId }, { $set: userDoc });
      await writeAuditLog('user_updated', 'user', userId, null, userDoc, req);
    }

    io.to('sync_global').emit('user_updated', { user: userDoc });
    res.json({ success: true, user: userDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post('/profile', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const { name, email, phone } = req.body;
  try {
    await db.collection('users').updateOne(
      { id: req.user.id },
      { $set: { name, email, phone, updatedAt: new Date().toISOString() } }
    );
    const updated = await db.collection('users').findOne({ id: req.user.id }, { projection: { passwordHash: 0, password: 0 } });
    await writeAuditLog('user_updated', 'user', req.user.id, null, { name, email, phone }, req);
    io.to('sync_global').emit('user_updated', { user: updated });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post('/avatar', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ success: false, message: "Avatar path is required" });

  try {
    await db.collection('users').updateOne(
      { id: req.user.id },
      { $set: { avatar, updatedAt: new Date().toISOString() } }
    );
    const updated = await db.collection('users').findOne({ id: req.user.id }, { projection: { passwordHash: 0, password: 0 } });
    await writeAuditLog('user_updated', 'user', req.user.id, null, { avatar }, req);
    io.to('sync_global').emit('user_updated', { user: updated });
    res.json({ success: true, avatar });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update avatar" });
  }
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update password" });
  }
});

module.exports = router;
