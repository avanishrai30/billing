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
const auditRouter = require('./modules/audit');
const settingsRouter = require('./modules/settings');

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

// 5. Authenticate Socket.IO connections via JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error("Authentication error"));
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('JOIN_SESSION', (data) => {
    if (data && data.sessionId) {
      socket.join(data.sessionId);
      console.log(`[Socket] Client ${socket.id} joined scanner session: ${data.sessionId}`);
    }
  });

  socket.on('JOIN_SYNC', (data) => {
    if (data) {
      // Ensure users only join room sync lists they are authorized to access
      if (socket.user.assignedStoreId && socket.user.assignedStoreId !== 'all') {
        if (data.storeId && data.storeId !== socket.user.assignedStoreId) {
          console.log(`[Socket] Unauthorized room join attempt by ${socket.id} for store ${data.storeId}`);
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

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
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

    // Serve central API client JS files dynamically
    app.get('/api/:file.js', (req, res, next) => {
      const fileName = req.params.file;
      const allowedFiles = [
        'client', 'auth', 'users', 'businesses', 'stores', 'products',
        'categories', 'brands', 'inventory', 'purchases', 'invoices',
        'customers', 'suppliers', 'audit', 'settings', 'franchise',
        'dashboard', 'scanner'
      ];
      if (allowedFiles.includes(fileName)) {
        const filePath = path.join(__dirname, 'api', `${fileName}.js`);
        if (fs.existsSync(filePath)) {
          res.setHeader('Content-Type', 'application/javascript');
          return res.sendFile(filePath);
        }
      }
      next();
    });

    // Initialize all modular routers
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/users', usersRouter);
    app.use('/api/v1/products', productsRouter);
    app.use('/api/v1/inventory', inventoryRouter);
    app.use('/api/v1/invoices', billingRouter);
    app.use('/api/v1/purchases', purchasesRouter);
    app.use('/api/v1/audit-logs', auditRouter);
    app.use('/api/v1', franchiseRouter); // mounts /franchises and /franchise-supply-orders
    app.use('/api/v1', settingsRouter); // mounts /role-permissions and /settings

    // Image Upload Endpoint (optimizes base64 images via Sharp and saves to disk)
    const handleImageUpload = async (req, res) => {
      const { fileName, base64Data } = req.body;
      const uploadType = req.query.type || 'products'; // products, invoices, logos, employees
      
      if (!fileName || !base64Data) {
        return res.status(400).json({ success: false, message: "Missing fileName or image base64Data" });
      }

      const targetDir = UPLOAD_SUBDIRS[uploadType] || UPLOAD_SUBDIRS.products;

      try {
        const base64Str = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Str, 'base64');

        const cleanBaseName = path.basename(fileName, path.extname(fileName))
                                  .toLowerCase()
                                  .replace(/[^a-z0-9\-]/g, '-');
        const outputFileName = `${cleanBaseName}-${Date.now()}.webp`;
        const targetPath = path.join(targetDir, outputFileName);

        await sharp(buffer)
          .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 80 })
          .toFile(targetPath);

        let stats = fs.statSync(targetPath);
        if (stats.size > 200 * 1024) {
          await sharp(targetPath)
            .webp({ quality: 60 })
            .toFile(targetPath);
          stats = fs.statSync(targetPath);
        }

        const imagePath = `/uploads/${uploadType}/${outputFileName}`;
        const imageId = `img-${Date.now()}`;

        if (uploadType === 'products') {
          await db.collection('product_images').insertOne({
            id: imageId,
            productId: req.query.productId || "",
            filename: outputFileName,
            filepath: targetPath,
            webpPath: imagePath,
            size: `${Math.round(stats.size / 1024)}KB`,
            mimeType: "image/webp",
            width: 800,
            height: 800,
            uploadedBy: req.user ? req.user.username : "system",
            createdAt: new Date().toISOString()
          });
        }

        res.json({ success: true, imagePath, imageId });
      } catch (err) {
        console.error("Image upload failed:", err);
        res.status(500).json({ success: false, message: "Failed to optimize and upload product image" });
      }
    };

    // Scanner Endpoint
    const handleScannerScan = async (req, res) => {
      const { sessionId, barcode } = req.body;
      if (!sessionId || !barcode) {
        return res.status(400).json({ success: false, message: "Missing sessionId or barcode number" });
      }

      try {
        let product = await db.collection('products').findOne({ $or: [{ barcode: barcode }, { sku: barcode }] });
        
        if (!product) {
          const barcodeMapping = await db.collection('product_barcodes').findOne({ barcode: barcode });
          if (barcodeMapping) {
            product = await db.collection('products').findOne({ id: barcodeMapping.productId });
            if (product) {
              product.scannedVariantName = barcodeMapping.variantName;
            }
          }
        }

        if (product) {
          io.to(sessionId).emit('PRODUCT_ADDED', { product });
          return res.json({ success: true, product });
        } else {
          io.to(sessionId).emit('PRODUCT_NOT_FOUND', { barcode });
          return res.status(404).json({ success: false, message: "Product not found" });
        }
      } catch (err) {
        res.status(500).json({ success: false, message: "Barcode scanner check failed" });
      }
    };

    app.post('/api/upload', verifyJWT, handleImageUpload);
    app.post('/api/v1/upload', verifyJWT, handleImageUpload);

    app.post('/api/scan', handleScannerScan);
    app.post('/api/v1/scan', handleScannerScan);

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
