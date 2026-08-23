# Enterprise Deployment Architecture & Environment Specification

**AIavro / VC Organic Billing System — Architecture Blueprint**  
**Document Status:** FROZEN & CANONICAL  
**Verified Checkpoint:** `f3bfded` (`fix(realtime): propagate user role updates to all authenticated sockets`)

---

## 1. Environment Overview

The application operates across two strictly isolated production and staging environments on the host infrastructure. Both environments share the same modern Next.js + Express backend codebase, but operate with independent process trees, port allocations, environment variables, domain endpoints, and database connections.

```
                     ┌────────────────────────────────────────────────────────┐
                     │                     NGINX REVERSE PROXY                │
                     └───────────────────────────┬────────────────────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   ▼                                                           ▼
      ┌─────────────────────────┐                                 ┌─────────────────────────┐
      │       PRODUCTION        │                                 │         STAGING         │
      │  billing.vcorganics.com │                                 │ staging.billing.vcorgan │
      └────────────┬────────────┘                                 └────────────┬────────────┘
                   │                                                           │
        ┌──────────┴──────────┐                                     ┌──────────┴──────────┐
        ▼                     ▼                                     ▼                     ▼
┌───────────────┐     ┌───────────────┐                     ┌───────────────┐     ┌───────────────┐
│ Next.js (Web) │     │ Express API   │                     │ Next.js (Web) │     │ Express API   │
│ Port 3001     │     │ Port 8181     │                     │ Port 3000     │     │ Port 8281     │
│ PM2: ...prod  │     │ PM2: ...api   │                     │ PM2: ...stage │     │ PM2: ...stage │
└───────┬───────┘     └───────┬───────┘                     └───────┬───────┘     └───────┬───────┘
        │                     │                                     │                     │
        │   REST / WSS        │                                     │   REST / WSS        │
        └─────────────────────┘                                     └─────────────────────┘
```

---

## 2. Production Architecture

- **Public Frontend URL:** `https://billing.vcorganics.com`
- **Frontend Working Copy:** `/opt/vc-organic-frontend-production/apps/web`
- **Frontend Runtime:** Next.js (Node.js 20+ / React 19)
- **Frontend PM2 Process:** `vc-organic-billing-frontend-production`
- **Frontend Local Port:** `127.0.0.1:3001`
- **Frontend Environment File:** `/opt/vc-organic-frontend-production/apps/web/.env.production`
- **Frontend Build Configuration:** `NEXT_PUBLIC_API_BASE_URL=https://api.vcorganics.com`
- **Public Backend API URL:** `https://api.vcorganics.com`
- **Backend Working Copy:** `/opt/vc-organic`
- **Backend PM2 Process:** `vc-organic-billing-api`
- **Backend Local Port:** `127.0.0.1:8181`
- **Socket.IO Endpoint:** `wss://api.vcorganics.com/socket.io/`
- **Database Scope:** Production MongoDB (`vc_organic_billing_prod`)
- **Rollback Backup Location:** `/opt/vc-organic/backups/rbac-f3bfded`
- **Legacy Static Fallback:** `/opt/vc-organic` (preserved for zero-downtime Nginx fallback)

---

## 3. Staging Architecture

- **Public Frontend URL:** `https://staging.billing.vcorganics.com`
- **Frontend Working Copy:** `/opt/vc-organic-staging/apps/web`
- **Frontend Runtime:** Next.js (Node.js 20+ / React 19)
- **Frontend PM2 Process:** `vc-organic-billing-frontend-staging`
- **Frontend Local Port:** `127.0.0.1:3000`
- **Frontend Environment File:** `/opt/vc-organic-staging/apps/web/.env.production`
- **Frontend Build Configuration:** `NEXT_PUBLIC_API_BASE_URL=https://api-staging.vcorganics.com`
- **Public Backend API URL:** `https://api-staging.vcorganics.com`
- **Backend Working Copy:** `/opt/vc-organic-staging`
- **Backend PM2 Process:** `vc-organic-billing-api-staging`
- **Backend Local Port:** `127.0.0.1:8281`
- **Socket.IO Endpoint:** `wss://api-staging.vcorganics.com/socket.io/`
- **Database Scope:** Staging MongoDB (`vc_organic_billing_staging`)

---

## 4. Frontend / API / Socket.IO Matrix

| Dimension | Production | Staging |
| :--- | :--- | :--- |
| **Frontend Host** | `billing.vcorganics.com` | `staging.billing.vcorganics.com` |
| **API Host** | `api.vcorganics.com` | `api-staging.vcorganics.com` |
| **Socket Protocol** | `wss://api.vcorganics.com/socket.io/` | `wss://api-staging.vcorganics.com/socket.io/` |
| **Local Web Port** | `3001` | `3000` |
| **Local API Port** | `8181` | `8281` |
| **PM2 Frontend** | `vc-organic-billing-frontend-production` | `vc-organic-billing-frontend-staging` |
| **PM2 Backend** | `vc-organic-billing-api` | `vc-organic-billing-api-staging` |
| **Build Target Env** | `NEXT_PUBLIC_API_BASE_URL=https://api.vcorganics.com` | `NEXT_PUBLIC_API_BASE_URL=https://api-staging.vcorganics.com` |

---

## 5. Nginx Routing Topology

```nginx
# ==========================================================
# PRODUCTION FRONTEND (billing.vcorganics.com -> 3001)
# ==========================================================
server {
    server_name billing.vcorganics.com;
    listen 443 ssl http2;
    # SSL certificates managed via Certbot / Let's Encrypt

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /opt/vc-organics/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}

# ==========================================================
# PRODUCTION BACKEND API (api.vcorganics.com -> 8181)
# ==========================================================
server {
    server_name api.vcorganics.com;
    listen 443 ssl http2;

    location / {
        proxy_pass http://127.0.0.1:8181;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ==========================================================
# STAGING FRONTEND (staging.billing.vcorganics.com -> 3000)
# ==========================================================
server {
    server_name staging.billing.vcorganics.com;
    listen 443 ssl http2;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ==========================================================
# STAGING BACKEND API (api-staging.vcorganics.com -> 8281)
# ==========================================================
server {
    server_name api-staging.vcorganics.com;
    listen 443 ssl http2;

    location / {
        proxy_pass http://127.0.0.1:8281;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. RBAC Backend Promotion & Compatibility Rules

### Historical Lesson Learned:
During Phase 26/27 rollout, an isolated update to `services/userService.js` on production caused `POST /api/v1/users` to throw HTTP 500 because `userService.js` called `authzService.assertCanGrantPermissions`, which did not exist in the older `authzService.js` on the server.

### Mandatory RBAC Promotion Rule:
RBAC backend changes MUST always be promoted together as an indivisible atomic set:
1. `services/userService.js`
2. `services/authzService.js`
3. `services/realtimeService.js`
4. `modules/context.js`
5. `modules/users.js`
6. `modules/auth.js`

Never cherry-pick or copy a single service file to production without its corresponding domain services.

---

## 7. Realtime Socket.IO Room & Propagation Rules

1. **Automatic Global Sync (`sync_global`):**
   - Every authenticated socket connection must immediately join `sync_global` upon connection.
   - Sockets must NOT require a `JOIN_SYNC` event to join `sync_global`.
   - "All Stores" users (`assignedStoreId = "all"`) rely on `sync_global` for global directory updates (`user_updated`, `store_updated`, `business_updated`, `customer_updated`, `supplier_updated`, `settings_updated`, `rbac_updated`).

2. **Targeted Access Updates (`user_access_updated`):**
   - When a user's category, role, or permissions change, the backend dispatches `user_access_updated` directly to that user's active socket connections via `realtimeService.emitToUser(userId, ...)`.
   - Frontend `RealtimeProvider` listens for `user_access_updated` and triggers `refreshSession()` + query cache invalidation without page reload, logout, or shell remount.

3. **Store Isolation:**
   - Operational transactional events (`purchase_created`, `inventory.updated`) remain strictly store-scoped (`store_<storeId>`) and must NEVER be emitted to `sync_global`.

4. **Reconnect Self-Healing:**
   - When a socket reconnects after network drop, the frontend automatically re-executes `refreshSession()`, `['users']` refetch, and `['auth', 'me']` verification to heal any state divergence.

---

## 8. Deployment Workflow & Promotion Pipeline

```
[ Developer Local ]
       │  Tests (Jest + Typecheck + Next build + Playwright)
       ▼
[ GitHub Remote ] (branch: migration/frontend-v2)
       │  Git Push / Merge
       ▼
[ Staging VPS ] (/opt/vc-organic-staging)
       │  git pull
       │  npm run build
       │  pm2 restart staging
       │  Real-Auth RBAC Test Suite
       │  Manual Acceptance Testing
       ▼
[ Production Approval ] (Explicit Human User Sign-Off)
       │
       ▼
[ Production VPS ] (/opt/vc-organic-frontend-production & /opt/vc-organic)
       │  git pull
       │  NEXT_PUBLIC_API_BASE_URL=https://api.vcorganics.com npm run build
       │  pm2 restart production
       │  Live Smoke Test & Health Check
```

---

## 9. Rollback Runbook

If the Next.js production frontend encounters an unforeseen blocker:
1. Revert Nginx `billing.vcorganics.com` root back to `/opt/vc-organic/aiavro_billing_system.html`.
2. Reload Nginx: `sudo nginx -t && sudo systemctl reload nginx`.
3. Legacy production frontend immediately resumes serving traffic with zero downtime.
4. Backend API and database state remain intact.
