# AIAVRO Billing OS — Authoritative Data Model & MongoDB Schema Map

This document defines the authoritative MongoDB collections, document structures, data types, indexes, and entity relationships implemented in the database layer.

---

## 1. Primary Collections & Schemas

### 1. `products`
- **Collection Name:** `products`
- **Indexes:**
  - `{ sku: 1 }` (unique, sparse)
  - `{ barcode: 1 }` (sparse)
  - `{ name: "text", category: "text", brand: "text" }` (text search index)
- **Document Schema:**
  ```ts
  interface ProductDocument {
    _id?: ObjectId;
    id: string;                    // Primary business identifier (e.g. "prod-1")
    name: string;                  // Display title
    sku: string;                   // Unique SKU code
    barcode?: string;              // Primary unit barcode
    categoryId?: string;           // Category reference ID
    category?: string;             // Category name
    brandId?: string;              // Brand reference ID
    brand?: string;                // Brand name
    supplierId?: string;           // Supplier reference ID
    supplier?: string;             // Supplier name
    purchasePrice?: number;        // Default procurement cost
    cost?: number;                 // Alias for purchasePrice
    sellingPrice?: number;         // Retail selling price
    price?: number;                // Alias for sellingPrice
    stock?: number;                // Legacy cached stock (non-authoritative)
    reorder?: number;              // Low stock threshold
    reorderLevel?: number;         // Alias for reorder
    maxStock?: number;             // Maximum store capacity
    gst?: number;                  // Tax rate percentage (0, 5, 12, 18, 28)
    unit?: string;                 // Unit of measurement ("kg", "jar", "packet", "bottle")
    sellingMode: "packaged" | "loose";
    type: "OWN" | "EXTERNAL";      // Own farm produce vs third-party brand
    dom?: string;                  // Date of manufacturing
    doe?: string;                  // Date of expiry
    emoji?: string;                // Optional category icon emoji
    status: "active" | "archived"; // Lifecycle state
    isArchived?: boolean;          // Soft-deletion flag
    description?: string;          // Detailed item notes
    image?: string;                // WebP thumbnail URL (e.g. "/uploads/products/ghee-123.webp")
    barcodes?: BarcodeMapping[];   // Variant / Alternate barcode mappings
    variants?: ProductVariant[];   // Nested SKU variant items
    createdAt: string;             // ISO-8601 UTC
    updatedAt: string;             // ISO-8601 UTC
  }
  ```

### 2. `product_barcodes`
- **Collection Name:** `product_barcodes`
- **Indexes:** `{ barcode: 1 }`, `{ productId: 1 }`
- **Document Schema:**
  ```ts
  interface ProductBarcodeDocument {
    _id?: ObjectId;
    productId: string;             // Foreign key to products.id
    barcode: string;               // Unique EAN-13 / Code-128 barcode
    type: "PRIMARY" | "VARIANT" | "ALTERNATE";
    variantId?: string | null;     // Optional variant ID
    variantName: string;           // Label (e.g. "500ml Pack", "1kg Tin")
    active: boolean;
    createdAt: string;
    updatedAt: string;
  }
  ```

### 3. `inventory` (Authoritative Stock Balances)
- **Collection Name:** `inventory`
- **Indexes:** `{ productId: 1, locationId: 1 }` (composite), `{ locationId: 1 }`
- **Document Schema:**
  ```ts
  interface InventoryDocument {
    _id?: ObjectId;
    productId: string;             // Foreign key to products.id
    locationId: string;            // Foreign key to stores.id
    storeId?: string;              // Alias for locationId
    quantity: number;              // Authoritative physical stock level
    version: number;               // Monotonically increasing concurrency version
    updatedAt: string;
  }
  ```

### 4. `inventory_ledger` (Immutable Audit Trail)
- **Collection Name:** `inventory_ledger`
- **Indexes:**
  - `{ createdAt: -1, productId: 1, locationId: 1 }`
  - `{ locationId: 1, createdAt: -1 }`
  - `{ referenceId: 1 }`
- **Document Schema:**
  ```ts
  interface InventoryLedgerDocument {
    _id?: ObjectId;
    productId: string;             // Foreign key to products.id
    locationId: string;            // Foreign key to stores.id
    change: number;                // Delta quantity (+10, -2)
    previousQuantity: number;      // Balance before mutation
    newQuantity: number;           // Balance after mutation
    type: "SALE" | "PURCHASE" | "TRANSFER_IN" | "TRANSFER_OUT" | "VOID" | "MANUAL_ADJUSTMENT";
    referenceId: string;           // Transaction ID (e.g. "INV-2026-0089", "PO-2026-0045")
    performedBy: string;           // Username
    notes?: string;
    cost?: number;                 // Item cost at time of ledger entry
    version: number;
    createdAt: string;
  }
  ```

### 5. `invoices` (POS Transactions)
- **Collection Name:** `invoices`
- **Indexes:**
  - `{ locationId: 1, createdAt: -1 }`
  - `{ invoiceNumber: 1 }` (unique, sparse)
  - `{ transactionId: 1 }` (sparse)
  - `{ createdAt: -1 }`
- **Document Schema:**
  ```ts
  interface InvoiceDocument {
    _id?: ObjectId;
    id: string;                    // Primary ID (e.g. "INV-2026-0089")
    invoiceNumber: string;         // Unique formatted bill number
    transactionId?: string;        // Idempotency token
    locationId: string;            // Foreign key to stores.id
    storeId?: string;              // Alias for locationId
    customerId?: string;           // Optional foreign key to customers.id
    customerName: string;          // Buyer name or "Walk-in Customer"
    customerPhone?: string;        // Buyer contact
    paymentMode: "CASH" | "UPI" | "CARD" | "BANK";
    status: "PAID" | "COMPLETED" | "VOIDED";
    isArchived?: boolean;          // True when voided
    subtotal: number;
    discount: number;
    tax: number;
    grandTotal: number;
    items: InvoiceItem[];          // Array of line items
    voidedAt?: string;             // ISO-8601 UTC when voided
    createdAt: string;
    updatedAt: string;
  }
  ```

### 6. `purchases` (Procurement Records)
- **Collection Name:** `purchases`
- **Indexes:**
  - `{ locationId: 1, createdAt: -1 }`
  - `{ supplierId: 1 }`
  - `{ id: 1 }` (sparse)
- **Document Schema:**
  ```ts
  interface PurchaseDocument {
    _id?: ObjectId;
    id: string;                    // Primary ID (e.g. "PO-2026-0045")
    purchaseNo?: string;           // Purchase order number
    invoiceNumber?: string;        // Supplier's external invoice number
    transactionId?: string;        // Idempotency token
    supplierId?: string;           // Foreign key to suppliers.id
    supplier: string;              // Supplier display name
    locationId: string;            // Target warehouse/store ID
    store?: string;                // Store name
    status: "COMPLETED" | "PAID" | "VOIDED";
    paymentStatus: "paid" | "pending";
    paymentMode: "CASH" | "BANK" | "UPI" | "CREDIT";
    isArchived?: boolean;          // True when voided
    subtotal: number;
    tax: number;
    grandTotal: number;
    items: PurchaseItem[];
    voidedAt?: string;
    createdAt: string;
    updatedAt: string;
  }
  ```

### 7. `users` (Accounts & Credentials)
- **Collection Name:** `users`
- **Indexes:** `{ username: 1 }` (unique, sparse), `{ id: 1 }` (unique, sparse)
- **Document Schema:**
  ```ts
  interface UserDocument {
    _id?: ObjectId;
    id: string;                    // User identifier (e.g. "usr-1")
    name: string;                  // Full name
    username: string;              // Login username
    email?: string;                // Contact email
    phone?: string;                // Contact phone
    passwordHash?: string;         // Bcrypt hash (12 rounds)
    role: string;                  // Role title (e.g. "SUPER ADMIN", "STORE MANAGER")
    category: "super admin" | "admin" | "employee" | "auditor";
    assignedStoreId: string;       // Primary store scope (e.g. "st-1" or "all")
    assignedStores?: string[];     // Multi-store scopes (e.g. ["st-1", "st-2"])
    permissions?: string[];        // Direct permission overrides
    tokenVersion: number;          // Active session token version
    status: "active" | "suspended" | "inactive";
    avatar?: string;               // Profile picture WebP URL
    createdAt: string;
    updatedAt: string;
  }
  ```

### 8. `audit_logs` (Security & Audit Trail)
- **Collection Name:** `audit_logs`
- **Indexes:** `{ timestamp: -1 }`, `{ storeId: 1, timestamp: -1 }`
- **Document Schema:**
  ```ts
  interface AuditLogDocument {
    _id?: ObjectId;
    eventType: string;             // Action identifier (e.g. "LOGIN_SUCCESS", "invoice_created", "AUTHORIZATION_DENIED")
    entity: string;                // Target domain ("auth", "inventory", "billing", "security", "users")
    entityId: string;              // Target document ID
    before?: Record<string, any>;  // Pre-mutation snapshot (sanitized)
    after?: Record<string, any>;   // Post-mutation snapshot (sanitized)
    performedBy: string;           // Username
    user: string;                  // User string "Full Name (@username)"
    role: string;                  // User role in uppercase
    action: string;                // Verb category ("create", "update", "delete", "auth", "security")
    view: string;                  // Associated UI view
    details: string;               // Human-readable audit description
    businessId: string;            // Associated store ID or "all"
    businessName: string;          // Store name
    ip: string;                    // Client IP address
    userAgent: string;             // Client User-Agent
    requestId: string;             // Tracing correlation ID
    timestamp: string;             // ISO-8601 UTC
  }
  ```

---

## 2. Supporting Collections

- **`stores`:** `{ id, name, code, address, status, createdAt, updatedAt }`
- **`businesses`:** `{ id, name, subtitle, owner, gstin, phone, email, address, bankName, accountNo, ifsc, upiId, terms, logo, status, createdAt, updatedAt }`
- **`customers`:** `{ id, name, phone, email, address, balance, loyaltyPoints, createdAt, updatedAt }`
- **`suppliers`:** `{ id, name, contact, phone, email, address, gstin, createdAt, updatedAt }`
- **`franchises`:** `{ id, name, owner, phone, email, address, location, status, createdAt, updatedAt }`
- **`franchise_supply_orders`:** `{ id, franchiseId, storeId, items, grandTotal, paymentStatus, createdAt }`
- **`role_permissions`:** `{ key: "matrix", permissions: { admin: [...], employee: [...], auditor: [...] }, updatedAt }`
- **`settings`:** `{ key: "landing_settings", title: "...", logo: "...", updatedAt }`
- **`product_images`:** `{ id, productId, filename, filepath, webpPath, size, mimeType, width, height, uploadedBy, createdAt }`
