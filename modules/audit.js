const express = require('express');
const { getContext, verifyJWT } = require('./context');

const router = express.Router();

router.get('/', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const logs = await db.collection('audit_logs').find({}).sort({ timestamp: -1 }).limit(1000).toArray();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

module.exports = router;
