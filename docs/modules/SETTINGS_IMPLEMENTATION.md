# Phase 16B — Settings & Configuration Implementation Specification

## 1. Executive Summary & Architecture

Phase 16B delivers the typed **Settings & Configuration** module at `apps/web/features/settings/` and [`apps/web/app/(protected)/settings/page.tsx`](file:///Users/avanish/Documents/billing%20system/apps/web/app/%28protected%29/settings/page.tsx).

### Architecture Highlights:
1. **Separation of Concerns:**
   - **Global Portal Branding:** Persisted in `db.settings` under `{ key: "landing_settings" }` via `POST /api/v1/settings` and consumed unauthenticated by `GET /api/v1/public/settings`.
   - **Store & Business Profiles:** Persisted in `db.stores` via `POST /api/v1/stores` with multi-tenant store scoping.
   - **Media Upload Pipeline:** Handled via `POST /api/v1/upload?type=logos` with automated WebP optimization ($800 \times 800$, quality 80) and URL normalization (`normalizePublicAssetUrl`).
   - **Workstation Preferences:** Stored client-side in `localStorage` (`aiavro_pref_show_product_images`).
2. **Zero Fake Backup APIs:**
   - Explicitly avoids inventing pseudo-REST backup or restore endpoints.
   - Server-side disaster recovery remains managed via automated system crons (`scripts/backup-drive.sh`).
3. **Reactive Real-time Synchronization:**
   - Listens for `settings_updated` and `store_updated` events over Socket.IO room `sync_global` to invalidate TanStack query caches without full-page reloads.

---

## 2. API Contracts & Data Flow

| Domain | Method | Endpoint | Authorization | State Mutation | Realtime Event |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Public Branding** | `GET` | `/api/v1/public/settings` | None (Public) | Read `landing_settings` | — |
| **Update Branding** | `POST` | `/api/v1/settings` | `verifyJWT` + `settings.update` | Upsert `landing_settings` | `settings_updated` |
| **Logo Media Upload** | `POST` | `/api/v1/upload?type=logos` | `verifyJWT` | Sharp WebP disk write | — |
| **Store Profile** | `POST` | `/api/v1/stores` | `verifyJWT` + `stores.manage` | Update store record | `store_updated` |

---

## 3. Directory Layout (`features/settings/`)

```
apps/web/features/settings/
├── types.ts                   # PublicSettingsDoc, SaveBrandingPayload, StoreProfileFormValues
├── schemas.ts                 # Zod validation schemas (BrandingFormSchema, StoreProfileFormSchema)
├── api.ts                     # settingsApi (getPublicSettings, updatePortalSettings, uploadLogo, updateStoreProfile)
├── hooks.ts                   # usePortalSettingsQuery, useUpdatePortalSettingsMutation, useVisualPreferences
├── components/
│   ├── SettingsHeader.tsx     # Section header with active store indicator and live badges
│   ├── LogoUploader.tsx       # Image upload with Sharp WebP optimization and live preview
│   ├── BrandingSettings.tsx   # Global portal title and brand identity form
│   ├── BusinessSettings.tsx   # Store profile (name, GSTIN, phone, email, address, UPI ID)
│   ├── StoreSettings.tsx      # Registered outlet directory and scope selector
│   ├── PreferenceSettings.tsx # Local workstation display toggles (product thumbnails)
│   └── index.ts
└── page.tsx
```

---

## 4. Media Asset Resolution & Anti-Flicker Strategy

- All image paths returned by backend (`/uploads/logos/...`) are normalized via `normalizePublicAssetUrl` to ensure API origin compatibility across decoupled frontend/backend deployments.
- Form submissions update local React Query caches selectively rather than causing full application remounts or DOM flashes.
