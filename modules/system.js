const express = require('express');
const os = require('os');

const router = express.Router();

// GET /api/v1/server-info - Get local host network IP and port
router.get('/server-info', (req, res) => {
  let localIp = 'localhost';
  try {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
          localIp = alias.address;
          break;
        }
      }
      if (localIp !== 'localhost') break;
    }
  } catch (e) {
    console.error("Failed to fetch host IP:", e);
  }
  const PORT = process.env.PORT || 8181;
  res.json({ localIp, port: PORT });
});

module.exports = router;
