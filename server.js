const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8181;
const DB_FILE = path.join(__dirname, 'aiavro_db_fallback.json');

app.use(cors());
app.use(express.json());

// Serve static assets from the current workspace
app.use(express.static(__dirname));

// Route root request to aiavro_billing_system.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'aiavro_billing_system.html'));
});

// Seed data helper to ensure database exists out-of-the-box
const DEFAULT_PRODUCTS = [
  { id: "prod-1", name: "A2 Gir Cow Desi Ghee", category: "Dairy & Ghee", emoji: "🐄", sku: "8901234567011", barcode: "8901234567011", unit: "1 Liter Jars", cost: 600, price: 850, stock: 75, reorder: 15, dom: "2026-01-01", doe: "2027-01-01", gst: 12, brand: "AIAVRO", supplier: "Golden Ghee Co.", maxStock: 200, store: "Main Store", status: "active" },
  { id: "prod-2", name: "A2 Buffalo Desi Ghee", category: "Dairy & Ghee", emoji: "🥛", sku: "8901234567012", barcode: "8901234567012", unit: "1 Liter Jars", cost: 500, price: 720, stock: 50, reorder: 12, dom: "2026-02-15", doe: "2027-02-15", gst: 12, brand: "AIAVRO", supplier: "Golden Ghee Co.", maxStock: 150, store: "Main Store", status: "active" },
  { id: "prod-3", name: "Fresh White Organic Butter", category: "Dairy & Ghee", emoji: "🧈", sku: "8901234567021", barcode: "8901234567021", unit: "250g Leaf-Wrap", cost: 140, price: 210, stock: 40, reorder: 15, dom: "2026-05-10", doe: "2026-06-25", gst: 12, brand: "AIAVRO", supplier: "Golden Ghee Co.", maxStock: 100, store: "Main Store", status: "active" },
  { id: "prod-4", name: "Cold Pressed Virgin Coconut Oil", category: "Cold Pressed Oils", emoji: "🥥", sku: "8901234567031", barcode: "8901234567031", unit: "500ml Bottle", cost: 190, price: 310, stock: 65, reorder: 20, dom: "2026-01-10", doe: "2027-10-10", gst: 5, brand: "AIAVRO", supplier: "Agro Farms", maxStock: 200, store: "Main Store", status: "active" },
  { id: "prod-5", name: "Wood Pressed Mustard Oil", category: "Cold Pressed Oils", emoji: "🌱", sku: "8901234567032", barcode: "8901234567032", unit: "1 Liter Bottle", cost: 150, price: 230, stock: 35, reorder: 10, dom: "2025-12-01", doe: "2026-12-01", gst: 5, brand: "AIAVRO", supplier: "Agro Farms", maxStock: 120, store: "Main Store", status: "active" },
  { id: "prod-6", name: "Raw Honey (Wild Forest)", category: "Organic Spreads", emoji: "🍯", sku: "8901234567041", barcode: "8901234567041", unit: "500g Honeycomb", cost: 260, price: 420, stock: 8, reorder: 10, dom: "2026-01-05", doe: "2028-01-05", gst: 5, brand: "AIAVRO", supplier: "Wild Spreads Ltd.", maxStock: 50, store: "Main Store", status: "active" },
  { id: "prod-7", name: "Organic A2 Fresh Yogurt", category: "Dairy & Ghee", emoji: "🥣", sku: "8901234567061", barcode: "8901234567061", unit: "500g Cup", cost: 80, price: 120, stock: 15, reorder: 5, dom: "2026-05-01", doe: "2026-05-20", gst: 5, brand: "AIAVRO", supplier: "Golden Ghee Co.", maxStock: 80, store: "Main Store", status: "active" },
  { id: "prod-8", name: "Organic Farm Cottage Cheese (Paneer)", category: "Dairy & Ghee", emoji: "🧀", sku: "8901234567071", barcode: "8901234567071", unit: "500g Packet", cost: 110, price: 160, stock: 25, reorder: 8, dom: "2026-05-22", doe: "2026-05-29", gst: 5, brand: "AIAVRO", supplier: "Golden Ghee Co.", maxStock: 100, store: "Main Store", status: "active" },
  { id: "prod-9", name: "Fresh Country Buffalo Milk", category: "Dairy & Ghee", emoji: "🥛", sku: "8901234567081", barcode: "8901234567081", unit: "1 Liter Packet", cost: 50, price: 75, stock: 40, reorder: 10, dom: "2026-05-25", doe: "2026-05-27", gst: 0, brand: "AIAVRO", supplier: "Golden Ghee Co.", maxStock: 100, store: "Main Store", status: "active" },
  { id: "prod-10", name: "Farm Fresh Whipping Cream", category: "Dairy & Ghee", emoji: "🧁", sku: "8901234567091", barcode: "8901234567091", unit: "250ml Cup", cost: 70, price: 110, stock: 20, reorder: 5, dom: "2026-05-05", doe: "2026-05-22", gst: 12, brand: "AIAVRO", supplier: "Golden Ghee Co.", maxStock: 80, store: "Main Store", status: "active" }
];

function initDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    const initialDb = {
      products: DEFAULT_PRODUCTS,
      invoices: [],
      inventoryLogs: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf8');
    console.log("Seeded default database to aiavro_db_fallback.json");
  }
}
initDatabase();

function readDatabase() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file", err);
    return { products: [], invoices: [], inventoryLogs: [] };
  }
}

function writeDatabase(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing database file", err);
  }
}

// REST ENDPOINT - Scan Barcode
app.post('/api/scan', (req, res) => {
  const { sessionId, barcode } = req.body;
  if (!sessionId || !barcode) {
    return res.status(400).json({ success: false, message: "Missing sessionId or barcode" });
  }

  console.log(`[API /api/scan] Scanned barcode ${barcode} for session ${sessionId}`);

  const db = readDatabase();
  // Find product by barcode or SKU
  const product = db.products.find(p => p.barcode === barcode || p.sku === barcode);

  if (product) {
    // Emit PRODUCT_ADDED to the socket room matching sessionId
    io.to(sessionId).emit('PRODUCT_ADDED', { product });
    console.log(`[Socket] Emitted PRODUCT_ADDED for product ${product.name} to room ${sessionId}`);
    return res.json({ success: true, product });
  } else {
    // Emit PRODUCT_NOT_FOUND to the socket room matching sessionId
    io.to(sessionId).emit('PRODUCT_NOT_FOUND', { barcode });
    console.log(`[Socket] Emitted PRODUCT_NOT_FOUND for barcode ${barcode} to room ${sessionId}`);
    return res.status(404).json({ success: false, message: "Product not found" });
  }
});

// REST ENDPOINT - Get server network info
app.get('/api/server-info', (req, res) => {
  const os = require('os');
  let localIp = 'localhost';
  try {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        const isIpv4 = alias.family === 'IPv4' || alias.family === 4;
        if (isIpv4 && alias.address !== '127.0.0.1' && !alias.internal) {
          localIp = alias.address;
          break;
        }
      }
      if (localIp !== 'localhost') break;
    }
  } catch (e) {
    console.error("Failed to get local IP", e);
  }
  res.json({ localIp, port: PORT });
});

// REST ENDPOINT - Get all products (useful to sync local state)
app.get('/api/products', (req, res) => {
  const db = readDatabase();
  res.json(db.products);
});

// REST ENDPOINT - Save / Update products
app.post('/api/products', (req, res) => {
  const db = readDatabase();
  const prod = req.body;
  if (!prod.name || !prod.sku) {
    return res.status(400).json({ success: false, message: "Missing product name or SKU" });
  }

  const existingIndex = db.products.findIndex(p => p.id === prod.id || p.sku === prod.sku);
  if (existingIndex > -1) {
    db.products[existingIndex] = { ...db.products[existingIndex], ...prod, updatedDate: new Date().toISOString() };
  } else {
    prod.id = prod.id || `prod-${Date.now()}`;
    prod.createdDate = new Date().toISOString();
    db.products.push(prod);
  }

  writeDatabase(db);
  res.json({ success: true, product: prod });
});

// REST ENDPOINT - Excel Import Save
app.post('/api/products/import', (req, res) => {
  const db = readDatabase();
  const { newProducts, logs } = req.body;
  if (!Array.isArray(newProducts)) {
    return res.status(400).json({ success: false, message: "Invalid payload" });
  }

  newProducts.forEach(prod => {
    const existingIndex = db.products.findIndex(p => p.sku === prod.sku || (prod.barcode && p.barcode === prod.barcode));
    if (existingIndex > -1) {
      db.products[existingIndex] = { ...db.products[existingIndex], ...prod, updatedDate: new Date().toISOString() };
    } else {
      db.products.push(prod);
    }
  });

  if (Array.isArray(logs)) {
    db.inventoryLogs = [...db.inventoryLogs, ...logs];
  }

  writeDatabase(db);
  res.json({ success: true, count: newProducts.length });
});

// Socket.IO Room Management
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Join Room
  socket.on('JOIN_SESSION', (data) => {
    const { sessionId, role } = data;
    if (sessionId) {
      socket.join(sessionId);
      console.log(`[Socket] Client ${socket.id} (${role || 'unknown'}) joined room ${sessionId}`);
    }
  });

  // Remove Item
  socket.on('REMOVE_ITEM', (data) => {
    const { sessionId, productId } = data;
    if (sessionId && productId) {
      io.to(sessionId).emit('REMOVE_ITEM', { productId });
      console.log(`[Socket] REMOVE_ITEM emitted for product ${productId} in session ${sessionId}`);
    }
  });

  // Complete Invoice (Cashier closes the session)
  socket.on('COMPLETE_INVOICE', (data) => {
    const { sessionId } = data;
    if (sessionId) {
      io.to(sessionId).emit('SESSION_CLOSED', { sessionId });
      console.log(`[Socket] SESSION_CLOSED emitted for room ${sessionId}`);
      // Clean up room
      io.socketsLeave(sessionId);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(` AIAVRO Billing Server running on http://localhost:${PORT}`);
  console.log(` Socket.IO Server integrated`);
  console.log(` Serving static HTML spa webapp`);
  console.log(`=============================================================`);
});
