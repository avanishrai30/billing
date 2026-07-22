# AIavro Billing System v2 — OpenAPI / API Contract

This document outlines the planned API contract between the Next.js frontend and NestJS backend.

---

## 1. Authentication (`/api/auth`)
Handled via **Better Auth**.
* `POST /api/auth/signup` — Sign up a new user (admin/employee/auditor).
* `POST /api/auth/signin` — Authenticate and start a session.
* `POST /api/auth/signout` — Terminate session.

---

## 2. Tenant & Store Management (`/api/stores`)
* `GET /api/stores` — List all stores/businesses under the active tenant.
* `POST /api/stores` — Register a new store.

---

## 3. Product Catalog (`/api/products`)
* `GET /api/products` — Query products (supports search by name, SKU, barcode, category, brand).
* `POST /api/products` — Create a new product profile.
* `PUT /api/products/:id` — Update product details.

---

## 4. Billing & POS Transactions (`/api/invoices`)
* `POST /api/invoices` — Create new invoice transaction.
* `GET /api/invoices` — Retrieve invoice logs.
