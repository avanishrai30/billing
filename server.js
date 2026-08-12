const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');
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
const JWT_SECRET = process.env.JWT_SECRET || 'vc_organic_master_jwt_secret_2026';
const UPLOAD_ROOT = process.env.UPLOAD_PATH || (fs.existsSync('/opt/vc-organic') ? '/opt/vc-organic/uploads' : path.join(__dirname, 'uploads'));

// Create organized upload directory subfolders
const UPLOAD_SUBDIRS = {
  products: path.join(UPLOAD_ROOT, 'products'),
  invoices: path.join(UPLOAD_ROOT, 'invoices'),
  logos: path.join(UPLOAD_ROOT, 'logos'),
  employees: path.join(UPLOAD_ROOT, 'employees')
};

Object.values(UPLOAD_SUBDIRS).forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Serve uploaded assets directly
app.use('/uploads', express.static(UPLOAD_ROOT, {
  maxAge: 31536000000,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

// Route root request to static page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'aiavro_billing_system.html'));
});

// Database Client Setup
let dbClient = null;
let db = null;

async function initDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vc_organic';
  try {
    dbClient = new MongoClient(uri);
    await dbClient.connect();
    db = dbClient.db();
    console.log(`[Database] Connected to self-hosted MongoDB: ${db.databaseName}`);

    // Create Indexes
    await db.collection('products').createIndex({ barcode: 1 });
    await db.collection('products').createIndex({ sku: 1 }, { unique: true });
    await db.collection('customers').createIndex({ phone: 1 });
    await db.collection('invoices').createIndex({ invoiceNumber: 1 }, { unique: true });
    await db.collection('inventory').createIndex({ productId: 1, storeId: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('product_barcodes').createIndex({ barcode: 1 });
    await db.collection('product_barcodes').createIndex({ productId: 1 });
    console.log("[Database] Collections indexes registered.");

    // Seed default stores
    const defaultStores = [
      { id: "store-wf", name: "Whitefield Store", code: "ST-WF", address: "Whitefield Retail Hub, Sector 2, Bengaluru, Karnataka", status: "active", createdAt: new Date().toISOString() },
      { id: "store-hsr", name: "HSR Layout Store", code: "ST-HSR", address: "HSR Layout, Sector 6, Bengaluru, Karnataka", status: "active", createdAt: new Date().toISOString() },
      { id: "store-kor", name: "Koramangala Store", code: "ST-KO", address: "Koramangala 4th Block, Bengaluru, Karnataka", status: "active", createdAt: new Date().toISOString() }
    ];

    const storeCount = await db.collection('stores').countDocuments();
    if (storeCount === 0) {
      await db.collection('stores').insertMany(defaultStores);
      console.log("[Database] Seeded 3 default store locations.");
      
      // Seed these stores as active businesses as well
      const defaultBusinesses = defaultStores.map((s, idx) => ({
        id: s.id,
        name: s.name,
        subtitle: "Organic Farms Outlet",
        owner: "VC Organic Admin",
        gstin: `27AIAVRO111${idx}A1Z0`,
        phone: "+91 98765 43210",
        email: "support@vcorganics.com",
        address: s.address,
        bankName: "HDFC Farmers Cooperative Bank",
        accountNo: `5020001234567${idx}`,
        ifsc: "HDFC0001234",
        upiId: "vcorganic@upi",
        terms: "1. Fresh Organic Products.\n2. Returns within 24h for perishables."
      }));
      await db.collection('businesses').insertMany(defaultBusinesses);
      console.log("[Database] Seeded business outlet configurations.");
    }

    // Seed default Owner account (hash with bcrypt 12 rounds)
    const userCount = await db.collection('users').countDocuments();
    if (userCount === 0) {
      const ownerAccount = {
        id: "usr-owner",
        name: "VC Organic Owner",
        username: "owner",
        password: bcrypt.hashSync("ChangeOnFirstLogin", 12),
        role: "OWNER",
        category: "super admin",
        assignedStoreId: "all",
        assignedStores: ["all"],
        status: "active",
        createdAt: new Date().toISOString()
      };
      await db.collection('users').insertOne(ownerAccount);
      console.log("[Database] Seeded default Owner account: owner / ChangeOnFirstLogin");
    }

  } catch (err) {
    console.error("[Database] Initial connection failed:", err);
  }
}

// JWT Authorization Middleware
function verifyJWT(req, res, next) {
  let token = req.query.token;

  const authHeader = req.headers['authorization'];
  if (authHeader) {
    token = authHeader.split(' ')[1];
  }

  if (!token) return res.status(401).json({ success: false, message: "Missing authorization token" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ success: false, message: "Invalid or expired token" });
    req.user = decoded;
    next();
  });
}

// REST API - Authentication Login (Bcrypt Verification)
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password required" });
  }

  try {
    const user = await db.collection('users').findOne({ username: username.toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: "Invalid username or password" });
    if (user.status === 'suspended') return res.status(403).json({ success: false, message: "Your account is suspended" });

    // Compare with bcrypt
    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    // Sign JWT
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
        assignedStores: user.assignedStores || ['all']
      }
    });
  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// REST API - Fetch all products
app.get('/api/products', verifyJWT, async (req, res) => {
  try {
    const products = await db.collection('products').find().toArray();
    
    // Attach variant barcode history details to each product
    for (const prod of products) {
      const barcodes = await db.collection('product_barcodes').find({ productId: prod.id }).toArray();
      prod.barcodes = barcodes;
    }
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// REST API - Create / Update product
app.post('/api/products', verifyJWT, async (req, res) => {
  const prod = req.body;
  if (!prod.name || !prod.sku) {
    return res.status(400).json({ success: false, message: "Product name and SKU required" });
  }

  // Extract variants barcodes array if present
  const barcodesList = prod.barcodes || [];
  delete prod.barcodes; // Keep products document clean of linked array

  try {
    // Unique SKU check
    const existing = await db.collection('products').findOne({ sku: prod.sku });
    if (existing && existing.id !== prod.id) {
      return res.status(400).json({ success: false, message: "SKU / Barcode is already registered!" });
    }

    if (prod.id) {
      await db.collection('products').updateOne({ id: prod.id }, { $set: { ...prod, updatedAt: new Date().toISOString() } });
    } else {
      prod.id = `prod-${Date.now()}`;
      prod.createdAt = new Date().toISOString();
      await db.collection('products').insertOne(prod);

      // Initialize default inventory counts for all seeded stores if they don't exist
      const stores = await db.collection('stores').find().toArray();
      const inventoryDocs = stores.map(store => ({
        productId: prod.id,
        storeId: store.id,
        quantity: parseFloat(prod.stock) || 0,
        reorderLevel: parseFloat(prod.reorder) || 5,
        updatedAt: new Date().toISOString()
      }));
      await db.collection('inventory').insertMany(inventoryDocs);
    }

    // Sync product barcodes / variants configuration
    await db.collection('product_barcodes').deleteMany({ productId: prod.id });
    if (barcodesList.length > 0) {
      const barcodesToInsert = barcodesList.map(b => ({
        productId: prod.id,
        barcode: b.barcode,
        variantName: b.variantName || "",
        createdAt: new Date().toISOString()
      }));
      await db.collection('product_barcodes').insertMany(barcodesToInsert);
    }

    prod.barcodes = barcodesList; // Return clean representation to client
    res.json({ success: true, product: prod });
  } catch (err) {
    console.error("Save product failed:", err);
    res.status(500).json({ success: false, message: "Failed to save product" });
  }
});

// REST API - Fetch product variants barcodes
app.get('/api/products/:productId/barcodes', verifyJWT, async (req, res) => {
  try {
    const barcodes = await db.collection('product_barcodes').find({ productId: req.params.productId }).toArray();
    res.json(barcodes);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product barcodes" });
  }
});

// REST API - Fetch all customers
app.get('/api/customers', verifyJWT, async (req, res) => {
  try {
    const customers = await db.collection('customers').find().toArray();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// REST API - Create / Update customer
app.post('/api/customers', verifyJWT, async (req, res) => {
  const cust = req.body;
  if (!cust.name || !cust.phone) {
    return res.status(400).json({ success: false, message: "Name and Phone required" });
  }

  try {
    if (cust.id) {
      await db.collection('customers').updateOne({ id: cust.id }, { $set: { ...cust, updatedAt: new Date().toISOString() } });
    } else {
      cust.id = `cust-${Date.now()}`;
      cust.createdAt = new Date().toISOString();
      await db.collection('customers').insertOne(cust);
    }
    res.json({ success: true, customer: cust });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save customer" });
  }
});

// REST API - Fetch all suppliers
app.get('/api/suppliers', verifyJWT, async (req, res) => {
  try {
    const suppliers = await db.collection('suppliers').find().toArray();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

// REST API - Create / Update supplier
app.post('/api/suppliers', verifyJWT, async (req, res) => {
  const supplier = req.body;
  if (!supplier.name || !supplier.contact) {
    return res.status(400).json({ success: false, message: "Supplier name and contact required" });
  }

  try {
    if (supplier.id) {
      await db.collection('suppliers').updateOne({ id: supplier.id }, { $set: { ...supplier, updatedAt: new Date().toISOString() } });
    } else {
      supplier.id = `sup-${Date.now()}`;
      supplier.createdAt = new Date().toISOString();
      await db.collection('suppliers').insertOne(supplier);
    }
    res.json({ success: true, supplier });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save supplier" });
  }
});

// REST API - Fetch store-wise inventory
app.get('/api/inventory', verifyJWT, async (req, res) => {
  try {
    const inventory = await db.collection('inventory').find().toArray();
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// REST API - Fetch all inventory logs
app.get('/api/inventory/logs', verifyJWT, async (req, res) => {
  try {
    const logs = await db.collection('inventory_logs').find().toArray();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch inventory logs" });
  }
});

// REST API - Update store-wise inventory count manually
app.post('/api/inventory/adjust', verifyJWT, async (req, res) => {
  const { productId, storeId, quantity, notes } = req.body;
  if (!productId || !storeId) {
    return res.status(400).json({ success: false, message: "Product and Store IDs required" });
  }

  try {
    const qtyNum = parseFloat(quantity) || 0;
    await db.collection('inventory').updateOne(
      { productId, storeId },
      { $set: { quantity: qtyNum, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );

    // Save inventory adjustment logs
    const log = {
      id: `log-${Date.now()}`,
      productId,
      storeId,
      quantityAdjusted: qtyNum,
      notes: notes || "Manual inventory stock count adjustment",
      userId: req.user.id,
      timestamp: new Date().toISOString()
    };
    await db.collection('inventory_logs').insertOne(log);

    // Add system audit logs entry
    await db.collection('audit_logs').insertOne({
      userId: req.user.id,
      action: "inventory adjustment",
      module: "inventory",
      recordId: productId,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to adjust stock count" });
  }
});

// REST API - Store stock transfer module
app.post('/api/inventory/transfer', verifyJWT, async (req, res) => {
  const { productId, sourceStoreId, targetStoreId, quantity, notes } = req.body;
  if (!productId || !sourceStoreId || !targetStoreId || !quantity) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const qtyNum = parseFloat(quantity);
    if (qtyNum <= 0) return res.status(400).json({ success: false, message: "Quantity must be greater than zero" });

    // Check source stock level
    const sourceStock = await db.collection('inventory').findOne({ productId, storeId: sourceStoreId });
    if (!sourceStock || sourceStock.quantity < qtyNum) {
      return res.status(400).json({ success: false, message: "Insufficient stock in source outlet!" });
    }

    // Decrement source stock level
    await db.collection('inventory').updateOne(
      { productId, storeId: sourceStoreId },
      { $inc: { quantity: -qtyNum }, $set: { updatedAt: new Date().toISOString() } }
    );

    // Increment target stock level
    await db.collection('inventory').updateOne(
      { productId, storeId: targetStoreId },
      { $inc: { quantity: qtyNum }, $set: { updatedAt: new Date().toISOString() } },
      { upsert: true }
    );

    // Save stock logs (2 log entries: source out, target in)
    const dateStr = new Date().toISOString();
    await db.collection('inventory_logs').insertOne({
      id: `log-${Date.now()}-out`,
      productId,
      storeId: sourceStoreId,
      quantityAdjusted: -qtyNum,
      notes: notes || `Stock Transfer to store: ${targetStoreId}`,
      userId: req.user.id,
      timestamp: dateStr
    });

    await db.collection('inventory_logs').insertOne({
      id: `log-${Date.now()}-in`,
      productId,
      storeId: targetStoreId,
      quantityAdjusted: qtyNum,
      notes: notes || `Stock Transfer from store: ${sourceStoreId}`,
      userId: req.user.id,
      timestamp: dateStr
    });

    // Audit log entry
    await db.collection('audit_logs').insertOne({
      userId: req.user.id,
      action: "Stock Transfer",
      module: "inventory",
      recordId: productId,
      timestamp: dateStr
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Transfer failed" });
  }
});

// REST API - Fetch all sales transaction invoices
app.get('/api/invoices', verifyJWT, async (req, res) => {
  try {
    const invoices = await db.collection('invoices').find().toArray();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// REST API - Fetch Invoice PDF file
app.get('/api/invoices/:invoiceNumber/pdf', verifyJWT, (req, res) => {
  const invoiceNumber = req.params.invoiceNumber;
  const filePath = path.join(UPLOAD_SUBDIRS.invoices, `${invoiceNumber}.pdf`);
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoiceNumber}.pdf"`);
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).json({ success: false, message: "Invoice PDF not found on VPS server." });
  }
});

// PDF Kit dynamic invoice rendering helper
function buildInvoicePDF(invoice, business, outputPath) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(fs.createWriteStream(outputPath));

  // Outlet title header
  doc.fontSize(22).text(business.name, { align: 'center', stroke: true });
  doc.fontSize(10).text(business.subtitle || 'Organic Farms Outlet', { align: 'center' });
  doc.text(business.address, { align: 'center' });
  doc.text(`GSTIN: ${business.gstin || 'N/A'} | Phone: ${business.phone || 'N/A'}`, { align: 'center' });
  doc.moveDown();

  // Horizontal divider
  doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  // Bill metadata
  doc.fontSize(11).text(`Invoice Number: ${invoice.invoiceNumber}`, 40, doc.y);
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleString()}`);
  doc.text(`Payment Mode: ${invoice.paymentMode.toUpperCase()}`);
  doc.moveDown();

  // Draw table header columns
  doc.fontSize(10).text('Product Name', 40, doc.y, { width: 230 });
  doc.text('Qty', 280, doc.y, { width: 50 });
  doc.text('Rate', 340, doc.y, { width: 60 });
  doc.text('GST %', 410, doc.y, { width: 50 });
  doc.text('Amount', 470, doc.y, { width: 80 });
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.5);

  // Print items list rows
  invoice.items.forEach(item => {
    doc.text(item.name, 40, doc.y, { width: 230 });
    doc.text(item.quantity.toString(), 280, doc.y, { width: 50 });
    doc.text(`₹${item.price.toFixed(2)}`, 340, doc.y, { width: 60 });
    doc.text(`${item.gstRate || 0}%`, 410, doc.y, { width: 50 });
    doc.text(`₹${(item.price * item.quantity).toFixed(2)}`, 470, doc.y, { width: 80 });
    doc.moveDown();
  });

  doc.moveDown();
  doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  // Calculations totals blocks
  doc.fontSize(11).text(`Subtotal: ₹${invoice.subtotal.toFixed(2)}`, { align: 'right' });
  doc.text(`Discount: ₹${invoice.discount.toFixed(2)}`, { align: 'right' });
  doc.text(`GST Tax: ₹${invoice.tax.toFixed(2)}`, { align: 'right' });
  doc.text(`Grand Total: ₹${invoice.grandtotal.toFixed(2)}`, { align: 'right', stroke: true });

  doc.end();
}

// REST API - Save transaction invoice & deduct stock
app.post('/api/invoices', verifyJWT, async (req, res) => {
  const inv = req.body;
  if (!inv.items || inv.items.length === 0) {
    return res.status(400).json({ success: false, message: "Cannot submit empty invoice transaction" });
  }

  try {
    // Generate Serial Invoice Sequence Number
    const count = await db.collection('invoices').countDocuments();
    inv.invoiceNumber = `VC-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;
    inv.createdAt = new Date().toISOString();
    inv.cashierId = req.user.id;

    // Deduct stock levels per product for the assigned store
    for (const item of inv.items) {
      await db.collection('inventory').updateOne(
        { productId: item.productId, storeId: inv.storeId },
        { $inc: { quantity: -parseFloat(item.quantity) }, $set: { updatedAt: new Date().toISOString() } }
      );

      // Track stock changes in logs
      await db.collection('inventory_logs').insertOne({
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: item.productId,
        storeId: inv.storeId,
        quantityAdjusted: -parseFloat(item.quantity),
        notes: `Sale Checkout transaction: ${inv.invoiceNumber}`,
        userId: req.user.id,
        timestamp: new Date().toISOString()
      });
    }

    await db.collection('invoices').insertOne(inv);

    // Load active business configurations to seed headers
    const business = await db.collection('businesses').findOne({ id: inv.businessId }) || {
      name: "VC Organic Outlet",
      subtitle: "Fresh Farmers Hub",
      address: "Main Store location",
      gstin: "N/A"
    };

    // Generate dynamic invoice PDF using PDF Kit
    const pdfPath = path.join(UPLOAD_SUBDIRS.invoices, `${inv.invoiceNumber}.pdf`);
    buildInvoicePDF(inv, business, pdfPath);

    // Save activity audit log
    await db.collection('audit_logs').insertOne({
      userId: req.user.id,
      action: "Invoice Creation",
      module: "billing",
      recordId: inv.invoiceNumber,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, invoiceNumber: inv.invoiceNumber });
  } catch (err) {
    console.error("Save invoice transaction failed:", err);
    res.status(500).json({ success: false, message: "Transaction submission failed" });
  }
});

// REST API - Fetch all purchase entries
app.get('/api/purchases', verifyJWT, async (req, res) => {
  try {
    const purchases = await db.collection('purchases').find().toArray();
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch purchase entries" });
  }
});

// REST API - Add Purchase invoice entry & increase stock
app.post('/api/purchases', verifyJWT, async (req, res) => {
  const purchase = req.body;
  if (!purchase.items || purchase.items.length === 0) {
    return res.status(400).json({ success: false, message: "Cannot submit empty purchase logs" });
  }

  try {
    purchase.id = `pur-${Date.now()}`;
    purchase.createdAt = new Date().toISOString();
    purchase.userId = req.user.id;

    // Increase stock levels per product for the target store
    for (const item of purchase.items) {
      await db.collection('inventory').updateOne(
        { productId: item.productId, storeId: purchase.storeId },
        { $inc: { quantity: parseFloat(item.quantity) }, $set: { updatedAt: new Date().toISOString() } },
        { upsert: true }
      );

      // Track stock changes in logs
      await db.collection('inventory_logs').insertOne({
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: item.productId,
        storeId: purchase.storeId,
        quantityAdjusted: parseFloat(item.quantity),
        notes: `Stock Purchase Invoice Entry: ${purchase.invoiceNumber || 'N/A'}`,
        userId: req.user.id,
        timestamp: new Date().toISOString()
      });
    }

    await db.collection('purchases').insertOne(purchase);

    // Save activity audit log
    await db.collection('audit_logs').insertOne({
      userId: req.user.id,
      action: "Purchase Entry",
      module: "purchase",
      recordId: purchase.id,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, id: purchase.id });
  } catch (err) {
    console.error("Save purchase log failed:", err);
    res.status(500).json({ success: false, message: "Failed to log purchase" });
  }
});

// REST API - Fetch all store locations
app.get('/api/stores', verifyJWT, async (req, res) => {
  try {
    const stores = await db.collection('stores').find().toArray();
    res.json(stores);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stores" });
  }
});

// REST API - Fetch all businesses
app.get('/api/businesses', verifyJWT, async (req, res) => {
  try {
    const businesses = await db.collection('businesses').find().toArray();
    res.json(businesses);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch business configurations" });
  }
});

// REST API - Fetch all user accounts
app.get('/api/users', verifyJWT, async (req, res) => {
  try {
    // Exclude password hashes from the return payload
    const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user directory" });
  }
});

// REST API - Create / Modify user account
app.post('/api/users', verifyJWT, async (req, res) => {
  const user = req.body;
  if (!user.name || !user.username || !user.role) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  // Ensure only OWNER role can create users
  if (req.user.role !== 'OWNER' && req.user.category !== 'super admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Only OWNER can manage user profiles" });
  }

  try {
    const existing = await db.collection('users').findOne({ username: user.username.toLowerCase() });
    if (existing && existing.id !== user.id) {
      return res.status(400).json({ success: false, message: "Username is already registered!" });
    }

    if (user.id) {
      const updateData = { ...user, updatedAt: new Date().toISOString() };
      // Encrypt password using bcrypt if a new password is sent
      if (user.password) {
        updateData.password = bcrypt.hashSync(user.password, 12);
      } else {
        delete updateData.password;
      }
      await db.collection('users').updateOne({ id: user.id }, { $set: updateData });
    } else {
      user.id = `usr-${Date.now()}`;
      user.createdAt = new Date().toISOString();
      user.password = bcrypt.hashSync(user.password || "ChangeOnFirstLogin", 12);
      await db.collection('users').insertOne(user);
    }

    // Add activity audit log
    await db.collection('audit_logs').insertOne({
      userId: req.user.id,
      action: "User Creation",
      module: "users",
      recordId: user.id,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, user });
  } catch (err) {
    console.error("Save user account failed:", err);
    res.status(500).json({ success: false, message: "Failed to save user account" });
  }
});

// REST API - Fetch system audit logs
app.get('/api/audit-logs', verifyJWT, async (req, res) => {
  try {
    const logs = await db.collection('audit_logs').find().toArray();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch audit log logs" });
  }
});

// REST API - Upload product image with compression (<200KB WebP) inside organized folders
app.post('/api/upload', verifyJWT, async (req, res) => {
  const { fileName, base64Data } = req.body;
  const uploadType = req.query.type || 'products'; // products, invoices, logos, employees
  
  if (!fileName || !base64Data) {
    return res.status(400).json({ success: false, message: "Missing fileName or image base64Data" });
  }

  // Resolve subfolder upload path
  const targetDir = UPLOAD_SUBDIRS[uploadType] || UPLOAD_SUBDIRS.products;

  try {
    const base64Str = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Str, 'base64');

    // Generate output file path (convert to WebP format)
    const cleanBaseName = path.basename(fileName, path.extname(fileName))
                              .toLowerCase()
                              .replace(/[^a-z0-9\-]/g, '-');
    const outputFileName = `${cleanBaseName}-${Date.now()}.webp`;
    const targetPath = path.join(targetDir, outputFileName);

    // Process image with sharp: resize to 800x800px max, convert to WebP, restrict size to <200KB
    await sharp(buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toFile(targetPath);

    // Verify output file size
    let stats = fs.statSync(targetPath);
    if (stats.size > 200 * 1024) {
      // Re-compress at a lower quality if still above 200KB threshold
      await sharp(targetPath)
        .webp({ quality: 60 })
        .toFile(targetPath);
      stats = fs.statSync(targetPath);
      console.log(`[Image Upload] File re-compressed to: ${stats.size} bytes`);
    }

    res.json({ success: true, imagePath: `/uploads/${uploadType}/${outputFileName}` });
  } catch (err) {
    console.error("Image upload failed:", err);
    res.status(500).json({ success: false, message: "Failed to optimize and upload product image" });
  }
});

// Socket-based barcode scanner integrations (supporting variant lookups)
app.post('/api/scan', async (req, res) => {
  const { sessionId, barcode } = req.body;
  if (!sessionId || !barcode) {
    return res.status(400).json({ success: false, message: "Missing sessionId or barcode number" });
  }

  try {
    // 1. Search in main product barcode field or SKU first
    let product = await db.collection('products').findOne({ $or: [{ barcode: barcode }, { sku: barcode }] });
    
    // 2. If not found, look up variant barcode history mappings
    if (!product) {
      const barcodeMapping = await db.collection('product_barcodes').findOne({ barcode: barcode });
      if (barcodeMapping) {
        product = await db.collection('products').findOne({ id: barcodeMapping.productId });
        if (product) {
          product.scannedVariantName = barcodeMapping.variantName; // Attach details
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
});

// Serve network IP address for local scanners
app.get('/api/server-info', (req, res) => {
  const os = require('os');
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
  res.json({ localIp, port: PORT });
});

// Start application after database is active
initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`=============================================================`);
    console.log(` VC Organic API Gateway listening on http://localhost:${PORT}`);
    console.log(` Nginx reverse proxy routing configured for api.vcorganic.com`);
    console.log(`=============================================================`);
  });
});
