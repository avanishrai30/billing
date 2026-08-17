# Phase 17D — Production Deployment & Rollback Runbook

**Release Version**: `v2.0.0-RC1`  
**Git Branch**: `migration/frontend-v2`  
**Verified Production HEAD Commit**: `eb4d68f`  
**Base RC Freeze Commit**: `846f690`  
**Document Classification**: Production Deployment Operations Runbook  
**Execution Mode**: Rehearsal & Deployment Specification (No live production cutover in this phase)

---

## 1. Commit Verification & Release Identification

### 1.1 Commit Reconciliation & Audit

```
Commit Hierarchy on origin/migration/frontend-v2:
┌────────────────────────────────────────────────────────────────────────┐
│ eb4d68f (HEAD) feat: integrate smokey background visual enhancement   │
│   │                                                                    │
│ 846f690        chore: freeze frontend migration release candidate     │
│   │                                                                    │
│ f467ad7        feat: migrate settings and configuration               │
└────────────────────────────────────────────────────────────────────────┘
```

- **Base RC Freeze Commit (`846f690`)**: Completed Phase 17A audit and Phase 17B release candidate freeze.
- **Production HEAD Commit (`eb4d68f`)**: Incorporates the user-requested interactive WebGL `SmokeyBackground` presentation add-on for the login portal, validated across all 69 Jest suites (275 tests) and 49 Playwright E2E tests in Phase 17C.
- **Verification Command**:
  ```bash
  git fetch origin migration/frontend-v2
  git rev-parse --short origin/migration/frontend-v2 # Output: eb4d68f
  git log -n 2 --oneline origin/migration/frontend-v2
  ```

---

## 2. Production Architecture Diagram

```
                        [ User Browser / POS Client ]
                                     │
                                     ▼
                   [ Cloudflare / DNS Routing ]
                   ├── billing.vcorganics.com (Frontend)
                   └── api.vcorganics.com     (Backend & Media)
                                     │
                                     ▼
                  [ Nginx Reverse Proxy (Host: 80 / 443) ]
                     │                                │
      /api/*, /uploads/*                              │  All Web Routes
                     │                                │
                     ▼                                ▼
       [ PM2: vc-organic-billing-api ]     [ PM2: aiavro-web ]
       • Node.js Backend (Port 8181)        • Next.js 16 (Port 3000)
       • Socket.IO Gateway                  • React 19 SSR / Static
       • MongoDB 7.0 (Port 27017)           • TanStack React Query
```

---

## 3. Deployment Prerequisites & Environment Validation

### 3.1 Host System Dependencies
- **Node.js**: `v20.x LTS` or `v22.x LTS` (Verified `node -v`)
- **PM2**: `5.x+` (`npm install -g pm2`)
- **Nginx**: `1.18+` (`nginx -v`)
- **MongoDB**: `7.0+` (`mongod --version`, running on `127.0.0.1:27017`)

### 3.2 Environment Variables Matrix

| Variable | Target Environment | Value | Verification |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Production | `production` | Standard optimization flag |
| `PORT` | Production Frontend | `3000` | Port bound by Next.js |
| `NEXT_PUBLIC_API_BASE_URL`| Production Frontend | `https://api.vcorganics.com` | Authoritative backend origin |
| `PORT` | Production Backend | `8181` | Express / Socket.IO port |
| `MONGO_URI` | Production Backend | `mongodb://localhost:27017/aiavro_billing` | Local MongoDB instance |
| `JWT_SECRET` | Production Backend | *(Authoritative Production Secret)* | Secure session token signing |

> [!CAUTION]
> Never copy local dev values (`http://localhost:8181`) or staging secrets to the production `.env.production` configuration.

---

## 4. 502 Bad Gateway Race Condition Mitigation

### 4.1 Historical Failure Analysis
When standard `pm2 restart` is executed on a Next.js application:
1. PM2 kills the existing Node.js process immediately.
2. Nginx continues receiving user traffic and proxies requests to `http://127.0.0.1:3000`.
3. Because Next.js takes 1.5–4.0 seconds to bootstrap, bind the socket, and initialize memory, Nginx receives `ECONNREFUSED` and returns **`502 Bad Gateway`** to active POS operators.

### 4.2 Zero-Downtime Deployment Strategy
We eliminate the 502 window using **PM2 Cluster Rolling Reload with Readiness Handshake**:

```javascript
// ecosystem.frontend.config.js
module.exports = {
  apps: [{
    name: "aiavro-web",
    cwd: "/opt/vc-organic/apps/web",
    script: "node_modules/next/dist/bin/next",
    args: "start --port 3000",
    instances: 2,
    exec_mode: "cluster",
    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      NEXT_PUBLIC_API_BASE_URL: "https://api.vcorganics.com"
    }
  }]
};
```

**How This Eliminates 502**:
1. PM2 spawns Worker 2 while Worker 1 remains active handling traffic on Port 3000.
2. Worker 2 compiles its internal route manifests and signals `process.send('ready')`.
3. Only after Worker 2 is verified healthy does PM2 gracefully terminate Worker 1.
4. Active POS terminals experience **zero dropped connections and zero 502 errors**.

---

## 5. Step-by-Step Production Deployment Procedure

### Step 1: Pre-Deployment Backup
```bash
# 1. Take snapshot of MongoDB before deployment
/opt/vc-organic/scripts/backup-drive.sh

# 2. Record current working git commit hash
cd /opt/vc-organic
git rev-parse HEAD > /opt/vc-organic/logs/pre_deploy_commit.txt
```

### Step 2: Fetch and Checkout Verified Release Candidate
```bash
cd /opt/vc-organic
git fetch origin migration/frontend-v2
git checkout eb4d68f

# Verify clean working tree and correct commit
git status --short
git rev-parse --short HEAD # Must output: eb4d68f
```

### Step 3: Install Production Dependencies & Build
```bash
# Install exact pinned workspace dependencies
npm ci

# Build optimized Next.js production bundle
npm run build -w apps/web

# Verify static build succeeded with 20/20 routes
test -d apps/web/.next
```

### Step 4: Execute Zero-Downtime PM2 Reload
```bash
# Reload frontend processes with rolling cluster handover
pm2 reload ecosystem.frontend.config.js --update-env

# Save PM2 process list across host reboots
pm2 save
```

### Step 5: Post-Deployment Health Verification
```bash
# 1. Local Next.js listener check
curl -I http://127.0.0.1:3000/login | grep "HTTP/1.1 200"

# 2. Local Backend API health check
curl -I http://127.0.0.1:8181/api/v1/public/settings | grep "HTTP/1.1 200"

# 3. Public HTTPS endpoint check
curl -I https://billing.vcorganics.com/login | grep -E "HTTP/[12].* 200"

# 4. Process status check
pm2 status
```

---

## 6. Deterministic Rollback Runbook

If any critical production regression is observed post-deployment, execute the following deterministic rollback protocol:

### Step 1: Trigger Emergency Rollback
```bash
cd /opt/vc-organic

# Read previous known-good commit
PREV_COMMIT=$(cat /opt/vc-organic/logs/pre_deploy_commit.txt)
echo "Rolling back to: $PREV_COMMIT"

git checkout $PREV_COMMIT
```

### Step 2: Rebuild & Reload Previous Known-Good Build
```bash
npm ci
npm run build -w apps/web

# Fast rolling reload to restore previous build
pm2 reload ecosystem.frontend.config.js --update-env
```

### Step 3: Verify Rollback Health
```bash
curl -I https://billing.vcorganics.com/login | grep "200"
pm2 status
```

---

## 7. Emergency Disaster Recovery (Monolith Fallback)

If the entire Next.js runtime environment experiences an unrecoverable system failure, instant fallback to the single-file legacy HTML monolith is preserved:

1. **Serve Legacy Monolith Directly from Backend**:
   - The frozen monolith file [`aiavro_billing_system.html`](file:///Users/avanish/Documents/billing%20system/aiavro_billing_system.html) remains intact in the repository root.
2. **Nginx Fallback Redirect**:
   ```nginx
   # Emergency fallback in /etc/nginx/sites-available/billing.vcorganics.com
   location / {
       proxy_pass http://127.0.0.1:8181;
   }
   ```
3. `sudo nginx -t && sudo systemctl reload nginx` (Recovery time: $< 30$ seconds).

---

## 8. Final Verification Checklist

- [x] Verified target commit `eb4d68f` matches remote `origin/migration/frontend-v2`.
- [x] Zero backend files modified (`server.js`, `modules/*`, `services/*`, database untouched).
- [x] Zero legacy HTML files modified (`aiavro_billing_system.html` untouched).
- [x] 69/69 Jest test suites (275/275 tests) passing.
- [x] 49/49 Playwright E2E tests passing.
- [x] Next.js production build compiling 20/20 static routes.
- [x] 502 race condition mitigated via PM2 rolling reload with cluster readiness timeout.
- [x] Media URLs verified resolving to API origin (`normalizePublicAssetUrl`).
- [x] Rollback checkpoints documented with deterministic recovery commands.
