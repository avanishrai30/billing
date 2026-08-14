const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Self-healing dependency verification engine
try {
  console.log("[Engine] Verifying package dependencies...");
  const pkgPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = Object.keys(pkg.dependencies || {});
    let missing = false;
    for (const dep of deps) {
      try {
        require.resolve(dep);
      } catch (e) {
        console.warn(`[Engine] Missing dependency detected: ${dep}`);
        missing = true;
        break;
      }
    }
    if (missing) {
      console.log("[Engine] Installing missing dependencies automatically, please wait...");
      execSync('npm install --no-audit --no-fund', { cwd: __dirname, stdio: 'inherit' });
      console.log("[Engine] All dependencies installed successfully!");
    } else {
      console.log("[Engine] All dependencies are present.");
    }
  }
} catch (err) {
  console.error("[Engine] Dependency check failed:", err);
}

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
require('dotenv').config();

const { setupContext, verifyJWT } = require('./modules/context');
const authRouter = require('./modules/auth');
const usersRouter = require('./modules/users');
const productsRouter = require('./modules/products');
const inventoryRouter = require('./modules/inventory');
const billingRouter = require('./modules/billing');
const purchasesRouter = require('./modules/purchases');
const franchiseRouter = require('./modules/franchise');
const businessesRouter = require('./modules/businesses');
const storesRouter = require('./modules/stores');
const customersRouter = require('./modules/customers');
const suppliersRouter = require('./modules/suppliers');
const scannerRouter = require('./modules/scanner');
const uploadRouter = require('./modules/upload');
const auditRouter = require('./modules/audit');
const settingsRouter = require('./modules/settings');
const systemRouter = require('./modules/system');

const realtimeService = require('./services/realtimeService');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const activePresences = new Map();

const JWT_SECRET = process.env.JWT_SECRET || 'vc_organic_master_jwt_secret_2026';

// 5. Authenticate Socket.IO connections via JWT & MongoDB active session validation
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error("AUTHENTICATION_REQUIRED"));

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) return next(new Error("INVALID_TOKEN"));

    try {
      if (db && decoded && decoded.id) {
        const user = await db.collection('users').findOne({ id: decoded.id });
        if (!user) {
          return next(new Error("AUTHENTICATION_REQUIRED"));
        }
        if (user.status === 'suspended' || user.status === 'inactive') {
          return next(new Error("ACCOUNT_SUSPENDED"));
        }
        const currentVersion = user.tokenVersion || 1;
        const tokenVersion = decoded.tokenVersion || 1;
        if (currentVersion !== tokenVersion) {
          return next(new Error("SESSION_REVOKED"));
        }
        socket.user = { ...decoded, ...user };
      } else {
        socket.user = decoded;
      }
      next();
    } catch (dbErr) {
      console.warn("[Socket Auth] User lookup warning:", dbErr.message);
      socket.user = decoded;
      next();
    }
  });
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id} (user: ${socket.user?.username || 'anonymous'})`);
  if (socket.user && socket.user.id) {
    realtimeService.registerUserSocket(socket.user.id, socket);
  }

  socket.on('JOIN_SESSION', (data) => {
    if (data && data.sessionId) {
      socket.join(data.sessionId);
      console.log(`[Socket] Client ${socket.id} joined scanner session: ${data.sessionId}`);
    }
  });

  socket.on('JOIN_SYNC', (data) => {
    if (data) {
      // Ensure users only join room sync lists they are authorized to access
      const userRole = socket.user?.role || '';
      const userCategory = socket.user?.category || '';
      const userStore = socket.user?.assignedStoreId;
      const isSuper = userRole.toLowerCase().includes('super') ||
                      userCategory === 'super admin' ||
                      userStore === 'all';

      if (!isSuper && data.storeId && data.storeId !== 'default') {
        const allowedStores = Array.isArray(socket.user?.assignedStores)
          ? socket.user.assignedStores
          : (userStore ? [userStore] : []);

        if (!allowedStores.includes(data.storeId)) {
          console.warn(`[Socket] Unauthorized room join attempt by ${socket.id} for store ${data.storeId}`);
          socket.emit('AUTHORIZATION_DENIED', {
            code: 'STORE_ACCESS_DENIED',
            message: `Access denied to store room 'store_${data.storeId}'`
          });
          return;
        }
      }
      
      socket.join('sync_global');
      if (data.storeId) {
        socket.join(`store_${data.storeId}`);
        console.log(`[Socket] Client ${socket.id} joined sync rooms: sync_global, store_${data.storeId}`);
      }
    }
  });

  socket.on('USER_HEARTBEAT', (presence) => {
    if (presence && presence.userId) {
      activePresences.set(socket.id, {
        socketId: socket.id,
        userId: presence.userId,
        username: presence.username,
        storeId: presence.storeId,
        lastSeen: new Date().toISOString()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    if (socket.user && socket.user.id) {
      realtimeService.unregisterUserSocket(socket.user.id, socket.id);
    }
    activePresences.delete(socket.id);
  });
});

const PORT = process.env.PORT || 8181;
const UPLOAD_ROOT = process.env.UPLOAD_PATH || (fs.existsSync('/opt/vc-organics') ? '/opt/vc-organics/uploads' : path.join(__dirname, 'uploads'));

const UPLOAD_SUBDIRS = {
  products: path.join(UPLOAD_ROOT, 'products'),
  invoices: path.join(UPLOAD_ROOT, 'invoices'),
  'purchase-bills': path.join(UPLOAD_ROOT, 'purchase-bills'),
  users: path.join(UPLOAD_ROOT, 'users'),
  stores: path.join(UPLOAD_ROOT, 'stores'),
  temp: path.join(UPLOAD_ROOT, 'temp'),
  logos: path.join(UPLOAD_ROOT, 'logos'),
  employees: path.join(UPLOAD_ROOT, 'employees')
};

Object.values(UPLOAD_SUBDIRS).forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
}));

const ALLOWED_CORS_ORIGINS = [
  'https://billing.vcorganics.com',
  'https://vcorganics.com',
  'https://www.vcorganics.com',
  'http://localhost:8181',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:8181',
  'http://127.0.0.1:5500'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      ALLOWED_CORS_ORIGINS.includes(origin) ||
      origin.endsWith('.vcorganics.com') ||
      origin.endsWith('.vercel.app') ||
      /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-Request-Id',
    'x-request-id'
  ],
  credentials: true,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '15mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { success: false, message: "Too many login attempts, please try again after 15 minutes." }
});
app.use('/api/v1/auth/', authLimiter);

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many image uploads, please try again after 15 minutes." }
});
app.use('/api/upload', uploadLimiter);

app.use('/uploads', express.static(UPLOAD_ROOT, {
  maxAge: 31536000000,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'aiavro_billing_system.html'));
});

let dbClient = null;
let db = null;

async function initDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vc_organic';
  try {
    dbClient = new MongoClient(uri);
    await dbClient.connect();
    db = dbClient.db();
    console.log(`[Database] Connected to self-hosted MongoDB: ${db.databaseName}`);

    // Call setupContext to make db and io available to all routers
    setupContext(db, io, JWT_SECRET, UPLOAD_ROOT, UPLOAD_SUBDIRS, activePresences);
    realtimeService.setup(io, () => db);

    // Non-destructive performance indexes
    try {
      await db.collection('products').createIndex({ sku: 1 }, { unique: true, sparse: true });
      await db.collection('products').createIndex({ barcode: 1 }, { sparse: true });
      await db.collection('products').createIndex({ name: "text", category: "text", brand: "text" });
      await db.collection('product_barcodes').createIndex({ barcode: 1 });
      await db.collection('product_barcodes').createIndex({ productId: 1 });
      await db.collection('inventory_ledger').createIndex({ createdAt: -1, productId: 1, locationId: 1 });
    } catch (idxErr) {
      console.warn("[Database] Index setup warning (non-fatal):", idxErr.message);
    }

    // Serve frontend API client JS files statically
    app.use('/frontend-api', express.static(path.join(__dirname, 'frontend-api')));

    // Initialize all domain routers
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/users', usersRouter);
    app.use('/api/v1/products', productsRouter);
    app.use('/api/v1/inventory', inventoryRouter);
    app.use('/api/v1/invoices', billingRouter);
    app.use('/api/v1/purchases', purchasesRouter);
    app.use('/api/v1/businesses', businessesRouter);
    app.use('/api/v1/stores', storesRouter);
    app.use('/api/v1/customers', customersRouter);
    app.use('/api/v1/suppliers', suppliersRouter);
    app.use('/api/v1/audit-logs', auditRouter);
    app.use('/api/v1', franchiseRouter); // mounts /franchises and /franchise-supply-orders
    app.use('/api/v1', settingsRouter); // mounts /role-permissions and /settings
    app.use('/api/v1', systemRouter);   // mounts /server-info
    app.use('/api/v1/scan', scannerRouter);
    app.use('/api/v1/upload', uploadRouter);

    // Compatibility aliases for legacy frontend routes
    app.use('/api/scan', scannerRouter);
    app.use('/api/upload', uploadRouter);

    app.get('/health', (req, res) => {
      res.json({
        status: db !== null ? "healthy" : "unhealthy",
        database: db !== null ? "connected" : "disconnected",
        uptime: `${Math.round(process.uptime())}s`
      });
    });

  } catch (err) {
    console.error("[Database] Initial connection failed:", err);
  }
}

initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`=============================================================`);
    console.log(` VC Organic API Gateway listening on http://localhost:${PORT}`);
    console.log(` Modular Express Routers Mounted Under /api/v1`);
    console.log(`=============================================================`);
  });
});
