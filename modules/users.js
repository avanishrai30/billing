const express = require('express');
const { getContext, verifyJWT, validateBody, schemas, writeAuditLog } = require('./context');
const bcrypt = require('bcryptjs');

const router = express.Router();

router.get('/', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const users = await db.collection('users').find({}).project({ passwordHash: 0, password: 0 }).toArray();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
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
      passwordHash,
      updatedAt: new Date().toISOString()
    };
    delete userDoc.password;

    if (!userData.id) {
      userDoc.createdAt = new Date().toISOString();
      await db.collection('users').insertOne(userDoc);
      await writeAuditLog('user_created', 'user', userId, null, userDoc, req);
    } else {
      await db.collection('users').updateOne({ id: userId }, { $set: userDoc });
      await writeAuditLog('user_updated', 'user', userId, null, userDoc, req);
    }

    io.to('sync_global').emit('user_updated', { userId });
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
    await writeAuditLog('user_updated', 'user', req.user.id, null, { name, email, phone }, req);
    io.to('sync_global').emit('user_updated', { userId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
