# AIavro Business OS (v2) — Enterprise SaaS Billing & ERP

Welcome to the **AIavro Business OS v2** codebase. This repository contains the next-generation, multi-tenant SaaS ERP and POS Billing platform built to support AIavro-owned brands (VC Organic) and third-party vendor products.

This system is engineered under strict architectural constraints to eliminate technical debt, guarantee transaction performance, enforce tenant isolation, and ensure high modularity and scalability.

---

## 🚀 1. Technology Stack Specification

The platform utilizes a modern, strictly typed full-stack monorepo architecture:

### Frontend (`apps/frontend`)
* **Framework**: Next.js 15+ (App Router, Server Actions, React 19)
* **Language**: TypeScript (strict mode)
* **Styling**: Tailwind CSS v4 & shadcn/ui
* **Animations**: Framer Motion
* **State Management**: Zustand (client state) & TanStack Query v5 (server cache)
* **Forms & Validation**: React Hook Form & Zod
* **Observability**: Sonner (Toast notifications)

### Backend (`apps/backend`)
* **Framework**: NestJS (TypeScript)
* **Authentication**: Better Auth (with MongoDB adapter)
* **Realtime**: Socket.IO (Cashier terminal ↔ Mobile phone camera scanner)
* **Observability**: Pino / Winston Logger
* **Security & Optimization**: Helmet, CORS, Compression, and Throttler rate limiting

### Database & Persistence
* **Engine**: MongoDB (Self-Hosted on KVM 2 VPS)
* **ODM**: Mongoose
* **Caching**: NestJS Memory Cache (with future Redis abstraction)

---

## 📁 2. Monorepo Repository Structure

We organize applications and libraries using **npm workspaces** to promote shared logic and typescript contracts:

```text
aiavro-business-os/
├── apps/
│   ├── frontend/             # Next.js 15+ React SPA Client
│   └── backend/              # NestJS WebSockets/REST API Service
├── packages/
│   ├── domain/               # ⭐ Shared Pure Business Rules & Calculations (GST, Rounding)
│   ├── database/             # ⭐ Shared Mongoose Schemas, Repositories & Indexes
│   ├── api/                  # ⭐ Shared API Contracts (DTOs, Req/Res Interfaces)
│   ├── auth/                 # Decoupled Better Auth configuration & RBAC Guards
│   ├── ui/                   # Reusable Design System Component library (shadcn/ui wraps)
│   ├── config/               # Shared TSConfig, ESLint, and environment templates
│   └── shared/               # Shared constants, helpers & formatters
├── docker/
│   ├── compose/              # Local multi-service run configurations
│   ├── frontend/             # Production Next.js Docker context
│   └── backend/              # Production NestJS Docker context
│   ├── mongo/                # Persistent Mongo configuration
│   └── nginx/                # Reverse proxy & SSL configurations
├── docs/                     # API Contracts, OpenAPI specs & architectural blueprints
├── scripts/                  # Development setup & workspace bootstrap scripts
└── package.json              # Monorepo root workspaces configuration
```

---

## 🛠️ 3. Core Architectural Improvements (V2 Specs)

To achieve target architecture (10/10 rating), the team follows the prioritized improvement roadmap:

### Domain-Driven Design (DDD)
1. **Shared Domain Layer (`packages/domain`)**: Core business rules (like GST calculations, currency rounding, product classification, and discount policies) must reside *only* in this package. Business math is strictly banned in raw React components or NestJS controllers to prevent logic drift.
2. **Database Package (`packages/database`)**: Schemas, validation middleware, mongoose indexes, and Repository patterns are centralized into a single package shared across all services.
3. **API Contract (`packages/api`)**: Complete request/response DTOs, Zod validators, and OpenAPI definitions are declared once and shared between frontend and backend.

### POS & Inventory Rules
4. **Billing Session Engine**: Product scans are processed in-memory (using Socket.io/Zustand billing sessions) and never written directly to MongoDB per scan. The invoice is generated, totals are verified, and inventory is modified *only* when the transaction is completed (paid).
5. **Split Billing Modules**: Instead of a monolithic billing service, the system divides operations into independent sub-services: `BillingSession`, `InvoiceService`, `PaymentProcessor`, `DiscountEngine`, `TaxService`, and `ReturnManager`.
6. **Strict Inventory Sources**: Manual changes to stock quantities are disallowed. Inventory levels can only be updated through verified business events: **Purchases, Billing Transactions, Customer Returns, Store-to-Store Transfers**, or **Authorized Manual Adjustments**.

### Authentication vs. Authorization (RBAC)
7. **Better Auth Integration**: decoupled auth middleware (`packages/auth`) that handles user session validation, tokens, and cookies via MongoDB database adapters.
8. **Decoupled RBAC Engine**: The auth layer identifies *who* the user is (Authentication). The RBAC engine determines *what* they can do (Authorization).

---

## 🔐 4. Multi-Tenant Role-Based Access Control (RBAC)

### Roles
* **Super Admin**: Complete platform visibility, infrastructure parameters, and global system adjustments.
* **Owner**: Billing administration, reporting metrics, store updates, and employee configuration for their tenant.
* **Manager**: Product creation, inventory logging, supplier entry, and POS checkout access.
* **Cashier**: POS terminal access, scanning capabilities, and receipt printing.
* **Inventory Manager**: Supplier purchase entries, goods received notes, and stock audits.
* **Employee**: Basic operations based on active custom permissions.

### Authorization Pipeline
Every API Request follows this strict security pipeline:
$$\text{HTTP Request} \longrightarrow \text{Better Auth (Session Validation)} \longrightarrow \text{Tenant Isolation Check} \longrightarrow \text{RBAC Permission Guard} \longrightarrow \text{Business Controller}$$

---

## 🗄️ 5. MongoDB Collections & Indexes

The database structure maintains strict collections with indexing for high-volume POS throughput:

```text
Collections:
├── tenants                  # SaaS Tenant registration & profile metadata
├── stores                   # Business outlets, locations & store parameters
├── users                    # Login accounts, emails, passwords
├── sessions                 # Active auth sessions (Better Auth managed)
├── employees                # Tenant-to-user mappings & custom permissions
├── roles & permissions      # RBAC definitions
├── products                 # Global product database
├── product_barcodes         # Multiple barcode mappings to a single product record
├── categories & brands      # Product taxonomic attributes
├── suppliers                # Vendor profiles
├── inventory                # Real-time stock counts per store
├── inventory_logs           # Historical ledger of every stock modification
├── purchases                # Incoming inventory invoices from suppliers
├── invoices                 # Sales invoices generated at POS
├── payments                 # Log of transaction payments (UPI, Cash, Card)
├── scanner_sessions         # Real-time socket session pairing tokens
└── audit_logs               # Immutable log of security & transactional events
```

### Required Database Indexes
For sub-millisecond barcode lookup and fast reports, indexes must exist on:
* `barcode` & `sku` (Products)
* `invoiceNumber` (Invoices)
* `customerPhone` (Customers)
* `tenantId` & `storeId` (All tenant-specific transactional data)
* `employeeId` (Audit & POS tracing)

---

## 🐋 6. Production Deployment Architecture

We host the enterprise environment on KVM 2 VPS systems using Docker Compose:

```text
  Cloudflare (DNS & WAF)
         │
         ▼
  Hostinger VPS (Ubuntu 26.04 LTS)
         │
         ▼
  Nginx Reverse Proxy (SSL Certbot Certificate)
         ├── /             --> Next.js Frontend Container (Port 3000)
         ├── /api          --> NestJS Backend Container (Port 3001)
         └── /socket.io    --> Socket.IO Server (Real-time scanner pairing)
                 │
                 ▼
         MongoDB (Self-hosted docker container, accessible only to backend)
```

---

## 📜 7. Developer Coding Standards (The CTO Rules)

1. **Rule 1**: Never duplicate business math or rules. If you need to calculate a tax, discount, or valuation, use the shared domain package.
2. **Rule 2**: strict environment variables usage. Never hardcode credentials, ports, or API endpoints. Use `.env.example` as a template.
3. **Rule 3**: Git branch convention is mandatory. All features go through `feature/*` branches, merged to `develop` via Pull Request, and released to `main` via `release/*`. Direct commits to `main` are blocked.
