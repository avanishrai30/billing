# AI Agent Environment & Deployment Rules

**Applicability:** All Antigravity, Codex, and Autonomous Coding Agents  
**Target Repository:** `AIavro / VC Organic Billing System`  
**Rule Strictness:** MANDATORY & ZERO-EXCEPTION

---

## 1. Mandatory Pre-Flight Discovery Protocol

Before modifying ANY code, creating any build, or executing any remote command, every AI agent MUST:

1. **Check Git Status:**
   ```bash
   git status --short
   git rev-parse --short HEAD
   ```
2. **Identify Target Environment:**
   - Are you executing on Staging or Production?
   - Never assume commands for Staging apply identically to Production.
3. **Identify Frontend Location:**
   - Production Next.js Frontend: `/opt/vc-organic-frontend-production/apps/web`
   - Staging Unified Working Copy: `/opt/vc-organic-staging/apps/web`
   - Local Workspace: `./apps/web`
4. **Identify Backend Location:**
   - Production Backend: `/opt/vc-organic`
   - Staging Backend: `/opt/vc-organic-staging`
5. **Identify `NEXT_PUBLIC_API_BASE_URL` Before Next.js Build:**
   - Production Build MUST use: `NEXT_PUBLIC_API_BASE_URL=https://api.vcorganics.com`
   - Staging Build MUST use: `NEXT_PUBLIC_API_BASE_URL=https://api-staging.vcorganics.com`
   - *Note: `NEXT_PUBLIC_*` variables are embedded into client JS at build time. Compiling with the wrong URL permanently corrupts client routing.*
6. **Identify PM2 Process Names & Ports:**
   - Production Frontend: `vc-organic-billing-frontend-production` (Port `3001`)
   - Staging Frontend: `vc-organic-billing-frontend-staging` (Port `3000`)
   - Production Backend API: `vc-organic-billing-api` (Port `8181`)
   - Staging Backend API: `vc-organic-billing-api-staging` (Port `8281`)
7. **Identify Nginx Routing:**
   - `billing.vcorganics.com` proxies to `127.0.0.1:3001`
   - `api.vcorganics.com` proxies to `127.0.0.1:8181`
   - `staging.billing.vcorganics.com` proxies to `127.0.0.1:3000`
   - `api-staging.vcorganics.com` proxies to `127.0.0.1:8281`

---

## 2. Strict Inviolable Rules for AI Agents

### Rule 1: Never Assume Staging and Production Share Filesystem State
`/opt/vc-organic-staging` and `/opt/vc-organic-frontend-production` are independent working directories. Changes in one are NOT reflected in the other until explicitly deployed.

### Rule 2: Never Assume `/opt/vc-organic` is Next.js
`/opt/vc-organic` is the production backend and legacy static application root. The production Next.js frontend lives in `/opt/vc-organic-frontend-production`.

### Rule 3: Never Deploy Production Automatically
Passing staging tests does NOT authorize automatic production deployment. Production promotion requires explicit human user authorization.

### Rule 4: Never Execute Destructive Git Commands on Host Environments
NEVER run `git reset --hard`, `git clean -fd`, or `rm -rf` in `/opt/vc-organic` or `/opt/vc-organic-frontend-production` without explicit confirmation.

### Rule 5: Never Overwrite Production State Files
Never overwrite or delete:
- `.env` files
- `/uploads` directories and assets
- `package-lock.json` unless executing a deliberate dependency upgrade
- Backup archives in `/backups`

### Rule 6: Promote RBAC Backend Services as an Atomic Unit
When promoting RBAC changes to production backend, always deploy the complete cohesive set of service files:
- `services/userService.js`
- `services/authzService.js`
- `services/realtimeService.js`
- `modules/context.js`
- `modules/users.js`
- `modules/auth.js`

### Rule 7: Verify Socket.IO Realtime Room Isolation
- Global metadata (`user_updated`, `rbac_updated`, `settings_updated`) -> `sync_global`
- Targeted user access -> `user_access_updated` directly to `emitToUser(userId)`
- Store transactional events (`purchase_created`, `inventory.updated`) -> strictly `store_<storeId>`

---

## 3. Standard Troubleshooting Playbook

| Issue Encountered | Investigation Path | Resolution Action |
| :--- | :--- | :--- |
| **Staging works, Production fails** | Check frontend/backend version mismatch | Verify both production frontend (`/opt/vc-organic-frontend-production`) and backend (`/opt/vc-organic`) are on the same verified Git commit. |
| **`POST /api/v1/users` returns 500** | Check backend service compatibility | Ensure `userService.js` and `authzService.js` are in sync and both contain required assertion methods (`assertCanGrantPermissions`). |
| **POST succeeds but UI stays stale** | Check React Query and `userSyncKey` | Verify `useUsersQuery` cache patching and `userSyncKey` (`<id>:<updatedAt>`) update trigger in `UserModal`. |
| **REST works but Realtime silent** | Check `sync_global` socket room | Verify socket authenticated connection automatically joins `sync_global` in `server.js`. |
| **Missing features on Production** | Check Nginx proxy destination | Verify Nginx `billing.vcorganics.com` proxies to `127.0.0.1:3001` (Next.js) and not legacy static HTML. |
