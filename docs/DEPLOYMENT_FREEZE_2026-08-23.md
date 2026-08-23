# Architecture & Deployment Freeze Record — 2026-08-23

**Date:** 2026-08-23  
**Status:** FROZEN & RATIFIED  
**Baseline Verified Checkpoint:** `f3bfded` (`fix(realtime): propagate user role updates to all authenticated sockets`)

---

## 1. Frozen Environment Topology

### Production Environment
- **Web URL:** `https://billing.vcorganics.com`
- **Frontend Source Location:** `/opt/vc-organic-frontend-production/apps/web`
- **Frontend Runtime:** Next.js 16.2 (Node 20+ / React 19)
- **Frontend PM2 Name:** `vc-organic-billing-frontend-production`
- **Frontend Bind Port:** `127.0.0.1:3001`
- **Embedded API Config:** `NEXT_PUBLIC_API_BASE_URL=https://api.vcorganics.com`
- **API URL:** `https://api.vcorganics.com`
- **Backend Source Location:** `/opt/vc-organic`
- **Backend PM2 Name:** `vc-organic-billing-api`
- **Backend Bind Port:** `127.0.0.1:8181`
- **Socket.IO Realtime Endpoint:** `wss://api.vcorganics.com/socket.io/`
- **Rollback Location:** `/opt/vc-organic/backups/rbac-f3bfded` & `/opt/vc-organic` (legacy frontend)

### Staging Environment
- **Web URL:** `https://staging.billing.vcorganics.com`
- **Frontend Source Location:** `/opt/vc-organic-staging/apps/web`
- **Frontend Runtime:** Next.js 16.2 (Node 20+ / React 19)
- **Frontend PM2 Name:** `vc-organic-billing-frontend-staging`
- **Frontend Bind Port:** `127.0.0.1:3000`
- **Embedded API Config:** `NEXT_PUBLIC_API_BASE_URL=https://api-staging.vcorganics.com`
- **API URL:** `https://api-staging.vcorganics.com`
- **Backend Source Location:** `/opt/vc-organic-staging`
- **Backend PM2 Name:** `vc-organic-billing-api-staging`
- **Backend Bind Port:** `127.0.0.1:8281`
- **Socket.IO Realtime Endpoint:** `wss://api-staging.vcorganics.com/socket.io/`

---

## 2. Environment Isolation Guarantees

1. **Zero API Bleed:**
   - Production frontend queries ONLY `https://api.vcorganics.com` and connects to `wss://api.vcorganics.com/socket.io/`.
   - Staging frontend queries ONLY `https://api-staging.vcorganics.com` and connects to `wss://api-staging.vcorganics.com/socket.io/`.
2. **Zero Filesystem Bleed:**
   - Production Next.js working tree is `/opt/vc-organic-frontend-production`.
   - Production API backend working tree is `/opt/vc-organic`.
   - Staging unified working tree is `/opt/vc-organic-staging`.
3. **Zero Database Overlap:**
   - Staging operations and test mutations never target production MongoDB collections.

---

## 3. RBAC & Realtime Status

- **Authorization Hierarchy:** `super admin > admin > employee | auditor`
- **Canonical Source of Truth:** User `category` field drives authorization; `role` provides descriptive display title.
- **Socket.IO Propagation:**
  - `sync_global` membership is automatically established on connection for all authenticated sockets.
  - `user_access_updated` dispatches directly to target sockets with complete payload.
  - `user_updated` dispatches to `sync_global` for directory live updates.
  - Frontend `AuthProvider` and `useUsersQuery` patch state in-place without logout, reload, or AppShell remount.

---

## 4. Verification Checkpoint Confirmation

- **Commit:** `f3bfded`
- **Jest Unit Tests:** 78 / 78 suites PASS (314 / 314 tests)
- **TypeScript Typecheck:** 0 errors (`tsc --noEmit` PASS)
- **Next.js Production Build:** 22 / 22 static pages generated (`next build` PASS)
- **Playwright E2E Tests:** 72 / 72 PASS
