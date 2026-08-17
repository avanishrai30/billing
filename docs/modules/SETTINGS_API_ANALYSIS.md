# Phase 16A — Settings & Configuration Contract Forensics & API Analysis

## 1. Executive Summary & Forensic Scope

Phase 16A performs contract forensics and analysis for the **Settings & System Configuration** domain across backend services (`modules/settings.js`, `modules/upload.js`, `modules/stores.js`, `services/authzService.js`, `services/auditService.js`) and legacy client behaviors in `aiavro_billing_system.html`.

### Key Forensic Discoveries:
1. **Global Landing & Public Portal Settings (`settings` collection):**
   - Stored under a single document: `{ key: "landing_settings" }`.
   - Fields: `title` (string) and `logo` (string media path / URL).
   - Read unauthenticated via `GET /api/v1/public/settings`.
   - Mutated by privileged administrators via `POST /api/v1/settings`.
2. **Business / Store Operational Settings (`stores` / `businesses` collection):**
   - Active store configuration: `name`, `subtitle`, `gstin`, `phone`, `email`, `upiId`, `address`, `logo`, `invoicePrefix`, `currency`.
   - Managed via the store domain endpoints (`GET /api/v1/stores`, `POST /api/v1/stores`, `GET /api/v1/businesses`, `POST /api/v1/businesses`).
3. **Media & Brand Asset Upload Pipeline (`modules/upload.js`):**
   - Handled via `POST /api/v1/upload?type=logos` (authenticated via `verifyJWT`).
   - Compresses and converts images to WebP format using `sharp` (max 800x800, quality 80, size <= 200KB).
   - Returns absolute-path media URLs (`/uploads/logos/brand-logo-*.webp`), which must be resolved through the frontend `normalizePublicAssetUrl` helper to prevent origin truncation.
4. **Backup & Disaster Recovery Realities:**
   - **No Backend REST Backup Endpoint:** The backend exposes no `/api/v1/backup` endpoint.
   - **Legacy Client Backup:** In `aiavro_billing_system.html`, `exportDataBackup()` generated a client-side JSON dump of browser memory/localStorage, and `importDataBackup()` re-imported JSON records into memory.
   - **Production Server Backup:** Handled externally via system cron scripts (`scripts/backup-drive.sh` using `mongodump` $\to$ `tar.gz` $\to$ `rclone` to cloud storage).
5. **Client Visual Display Preferences:**
   - E.g., `showProductImages` (thumbnails vs emojis in catalogs and POS): Persisted client-side in `localStorage` (`aiavro_pref_show_product_images`).

---

## 2. Endpoint Discovery & Verified Contracts

### 2.1 Public Portal Settings
- **HTTP Method & Path:** `GET /api/v1/public/settings`
- **Controller:** `modules/settings.js`
- **Authentication:** `None` (Public unauthenticated)
- **Permissions:** None
- **Store Scope:** Global
- **Request Parameters:** None
- **Database Query:** `db.collection('settings').findOne({ key: "landing_settings" })`
- **Success Response (200 OK):**
  ```json
  {
    "title": "VC Organic Billing",
    "logo": "/uploads/logos/brand-logo-1723456789.webp"
  }
  ```
  *Fallback if unseeded:* `{ "title": "AIAVRO Business OS", "logo": "transparent logo aiavro Background Removed.png" }`
- **Error Response (500):** `{ "success": false, "error": { "code": "SERVER_ERROR", "message": "Failed to fetch public settings" } }`
- **Realtime / Audit:** None on read.

---

### 2.2 Save Portal Branding Settings
- **HTTP Method & Path:** `POST /api/v1/settings`
- **Controller:** `modules/settings.js`
- **Authentication:** `verifyJWT` (Bearer token required)
- **Permissions:** `settings.update` (via `requirePermission('settings.update')`)
- **Store Scope:** Global
- **Request Body:**
  ```json
  {
    "title": "VC Organics & Natural Dairy",
    "logo": "/uploads/logos/brand-logo-main.webp"
  }
  ```
- **Database Mutation:**
  `db.collection('settings').updateOne({ key: "landing_settings" }, { $set: { title, logo, updatedAt: new Date().toISOString() } }, { upsert: true })`
- **Audit Logging:**
  `auditService.writeAuditLog('settings_updated', 'settings', 'landing_settings', null, { title, logo }, req)`
- **Realtime Broadcast:**
  `io.to('sync_global').emit('settings_updated', { title, logo })`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Settings saved successfully"
  }
  ```
- **Error Response (500):** `{ "success": false, "error": { "code": "SERVER_ERROR", "message": "Failed to save settings" } }`

---

### 2.3 Brand Logo & Media Asset Upload
- **HTTP Method & Path:** `POST /api/v1/upload?type=logos` (also aliased as `POST /api/upload?type=logos`)
- **Controller:** `modules/upload.js`
- **Authentication:** `verifyJWT`
- **Permissions:** Authenticated user with valid token
- **Rate Limit:** 100 requests per 15 minutes (`uploadLimiter`)
- **Request Body:**
  ```json
  {
    "fileName": "company-logo.png",
    "base64Data": "data:image/png;base64,iVBORw0KGgo..."
  }
  ```
- **Processing Logic:**
  - Whitelist validates `type=logos`.
  - Converts base64 to binary buffer.
  - Generates sanitized filename `${cleanBaseName}-${Date.now()}.webp`.
  - Processes through `sharp`: resize max $800 \times 800$, WebP quality 80 (falls back to 60 if size $> 200\text{KB}$).
  - Saves to `/opt/vc-organics/uploads/logos/` (or local `uploads/logos/`).
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "imagePath": "/uploads/logos/company-logo-1786800000000.webp",
    "imageId": "img-1786800000000"
  }
  ```
- **Error Response (400 / 500):**
  - 400: `{ "success": false, "message": "Missing fileName or image base64Data" }`
  - 500: `{ "success": false, "message": "Failed to optimize and upload image" }`

---

### 2.4 Active Store / Business Profile Settings
- **HTTP Method & Path:** `POST /api/v1/stores` (or `POST /api/v1/businesses`)
- **Controller:** `modules/stores.js`
- **Authentication:** `verifyJWT`
- **Permissions:** `stores.manage` (or `stores.create` / `stores.update`)
- **Request Body:**
  ```json
  {
    "id": "store-1",
    "name": "VC Organics Flagship",
    "subtitle": "Fresh Dairy & Farm Produce",
    "gstin": "27AAAAA0000A1Z5",
    "phone": "+91 98765 43210",
    "email": "contact@vcorganics.com",
    "upiId": "vcorganics@icici",
    "address": "Shop 4, Market Yard, Pune",
    "logo": "/uploads/logos/store-1-logo.webp",
    "invoicePrefix": "VC-MUM-",
    "currency": "INR",
    "isActive": true
  }
  ```
- **Audit Logging:** `auditService.writeAuditLog('store_updated', 'stores', id, ...)`
- **Realtime Broadcast:** `io.to('sync_global').emit('store_updated', ...)`

---

## 3. Settings Domain Boundaries & Separation of Concerns

To maintain architectural clarity and avoid conflating authorization domains, Settings is partitioned into distinct sub-domains:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           SETTINGS DOMAINS                               │
├──────────────────────┬───────────────────────────────────────────────────┤
│ Domain               │ Scope & Storage Target                            │
├──────────────────────┼───────────────────────────────────────────────────┤
│ 1. Portal Branding   │ Global landing_settings in db.settings            │
│ 2. Business Profile  │ Active outlet profile in db.stores                │
│ 3. Store Overrides   │ Multi-tenant store profile & invoice prefix       │
│ 4. User Preferences  │ Client localStorage (product images, visual mode) │
│ 5. Account & Profile │ User account (name, password, contact)            │
│ 6. Roles & Access    │ RBAC matrix (Migrated in Phase 13B)               │
│ 7. System Backup     │ Client JSON export / diagnostic info              │
└──────────────────────┴───────────────────────────────────────────────────┘
```

---

## 4. Media & Asset URL Resolution Forensics

A critical bug in the legacy system was prepending relative URLs (`/uploads/...`) directly to image `src` attributes, which broke whenever the frontend ran on a distinct port/domain from the backend API.

### Verified Architecture (`lib/utils/media.ts`):
- All media paths returned by the backend (`/uploads/logos/...`, `/uploads/products/...`) must pass through `normalizePublicAssetUrl(path)`.
- If `path` is an absolute HTTP/HTTPS URL or Data URI $\to$ returned as-is.
- If `path` starts with `/uploads/` $\to$ prepends `NEXT_PUBLIC_API_BASE_URL` (or current API origin `http://localhost:3000`).
- Fallback placeholders: Transparent SVG data URI or brand icon when image fails to load (`onError`).

---

## 5. Real-Time Synchronization & Cache Invalidation

| Event Name | Socket Room | Triggering Action | Frontend Reaction |
| :--- | :--- | :--- | :--- |
| `settings_updated` | `sync_global` | `POST /api/v1/settings` | Invalidate `['public-settings']`, update topbar/login brand title & logo dynamically |
| `store_updated` | `sync_global` | `POST /api/v1/stores` | Invalidate `['stores']`, update store profile settings |
| `rbac_updated` | `sync_global` | `POST /api/v1/role-permissions` | Invalidate `['role-permissions']`, refresh RBAC matrix |

---

## 6. RBAC & Access Control Matrix

| Action | Required Permission | Allowed Roles |
| :--- | :--- | :--- |
| View Public Settings | *None (Public)* | All users & Unauthenticated guests |
| View Settings Screen | `settings.view` | Super Admin, Owner, Store Manager |
| Update Portal Branding | `settings.update` | Super Admin, Owner |
| Update Business/Store Profile | `stores.manage` | Super Admin, Owner |
| Upload Brand Logos | Authenticated (`verifyJWT`) | Super Admin, Owner, Store Manager |
| Export Data Backup | `settings.view` | Super Admin, Owner |

---

## 7. Audit Log Traceability

| Operation | Event Key (`eventType`) | Entity (`entity`) | Entity ID (`entityId`) | Payload Details |
| :--- | :--- | :--- | :--- | :--- |
| Update Portal Settings | `settings_updated` | `settings` | `landing_settings` | `{ title, logo }` |
| Update Store Profile | `store_updated` | `stores` | Store UUID | Updated store document |
| Update Role Permissions | `rbac_updated` | `permissions` | `matrix` | Updated matrix payload |

---

## 8. Legacy Risks & Anti-Flicker Strategy

1. **No Global State Thrashing:** Legacy `saveQuickBrandSetup()` triggered a full `syncStateWithServer()` causing whole-page DOM reflows and flicker. The typed frontend must use React Query targeted cache invalidation (`queryClient.invalidateQueries({ queryKey: ['public-settings'] })`).
2. **Deterministic Media URLs:** Ensure brand logo preview updates reactively without broken image badges.
3. **Store-Scoped Form Isolation:** Form values for store business profile must sync to the currently selected store in `StoreScopeProvider`, with visual feedback on saving.

---

## 9. New Frontend Feature Blueprint (`apps/web/features/settings/`)

```
apps/web/features/settings/
├── types.ts                   # SettingsFormValues, PortalSettingsDoc, VisualPreferences
├── schemas.ts                 # Zod validation schemas for portal & store settings forms
├── api.ts                     # settingsApi.getPublicSettings, updatePortalSettings, uploadLogo
├── hooks.ts                   # usePortalSettingsQuery, useUpdatePortalSettingsMutation, useLogoUpload
├── components/
│   ├── SettingsHeader.tsx     # Section header with active scope badge
│   ├── BrandingSettings.tsx   # Portal title, company logo upload & live preview
│   ├── BusinessProfileSettings.tsx # Store name, GSTIN, phone, email, UPI ID, address
│   ├── VisualPreferences.tsx  # Product image thumbnail toggles
│   ├── SystemBackupControl.tsx# Client-side JSON backup export & system stats
│   ├── SettingsNavTabs.tsx    # Segmented navigation (Branding, Business, Visual, Backup)
│   └── index.ts
└── index.ts
```

---

## 10. Test Strategy for Implementation

### Unit Tests
1. `tests/unit/settingsSchemas.test.ts`: Zod schema validation for branding and store profile payloads.
2. `tests/unit/settingsApi.test.ts`: API client calls for `getPublicSettings`, `updatePortalSettings`, `uploadLogo`.
3. `tests/unit/settingsComponents.test.tsx`: Component rendering, logo upload previews, and form handlers.

### E2E Tests (`tests/e2e/settings.spec.ts`)
1. **Complete Settings Lifecycle:**
   - Super admin logs in and navigates to `/settings`.
   - Modifies portal title & uploads a custom logo.
   - Verifies `POST /api/v1/settings` request & real-time topbar branding update.
   - Modifies store profile (GSTIN, phone, address) and saves.
   - Exports JSON data backup and validates payload integrity.
2. **Mobile Responsive Viewport (430x932 & 390x844):** Zero horizontal overflow on form layouts and file upload containers.
