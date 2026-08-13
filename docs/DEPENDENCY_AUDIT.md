# Dependency Audit Report — VC Organic Billing ERP

**Audit Date**: August 14, 2026  
**Scope**: Full workspace audit across Root, `apps/backend`, `apps/frontend`, and packages.  
**Action Taken**: **AUDIT ONLY** (No packages modified or upgraded).

---

## 1. Executive Summary

| Category | Count / Status | Notes |
| :--- | :--- | :--- |
| **Total Dependencies** | 48 packages in workspace | Monorepo structure across root, frontend, backend, packages |
| **Direct Deprecated** | 0 | All direct dependencies have active releases |
| **Transitive Deprecated** | 2 (`inflight`, `glob@7.2.3`) | Both isolated to dev/testing toolchains (`jest` / `ts-jest`) |
| **Security Advisories** | 11 vulnerabilities (1 moderate, 10 high) | Mostly transitive in dev build tools; Next.js 16.2.9 and Multer in Nest |
| **Safe Upgrades (No code changes)** | 16 packages | Patch/minor updates within same major version |
| **Migration-Required Upgrades** | 5 packages (`recharts`, `zod`, `framer-motion`, `lucide-react`, `mongoose`) | Major version jumps requiring API audit |

---

## 2. In-Depth Analysis of Special Attention Packages

### A. `inflight`
*   **Package**: `inflight`
*   **Current Version**: `1.0.6`
*   **Why It Exists**: Deduplicates asynchronous function calls with the same key.
*   **Classification**: **TRANSITIVE** / **DEV ONLY**
*   **Who Depends On It**:
    ```
    apps/backend
    └── ts-jest@29.4.11
        └── @jest/transform@30.4.1
            └── babel-plugin-istanbul@7.0.1
                └── test-exclude@6.0.0
                    └── glob@7.2.3
                        └── inflight@1.0.6
    ```
*   **Deprecation Status**: **DEPRECATED** (Upstream package is abandoned and known to leak memory in long-running processes).
*   **Safe Upgrade Path**: Do not install directly. Upgrading Jest/ts-jest test-exclude coverage runner will eliminate it.
*   **Breaking-Change Risk**: **ZERO** in production (not bundled in runtime app or server).
*   **Recommended Action**: Leave untouched for now; will naturally resolve during test runner updates.

---

### B. `glob`
*   **Package**: `glob`
*   **Current Versions**: `13.0.6`, `10.5.0`, `7.2.3`
*   **Why It Exists**: File and path pattern matching in CLI tools and test runners.
*   **Classification**: **TRANSITIVE** / **DEV ONLY**
*   **Who Depends On It**:
    ```
    apps/backend
    ├── @nestjs/cli@11.0.23 -> glob@13.0.6 (Active / Modern)
    ├── jest@30.4.2 -> @jest/reporters / jest-config / jest-runtime -> glob@10.5.0 (Active)
    └── ts-jest@29.4.11 -> babel-plugin-istanbul -> test-exclude -> glob@7.2.3 (Deprecated)
    ```
*   **Deprecation Status**: `glob@7.2.3` is deprecated; `glob@10.x` and `glob@13.x` are fully supported.
*   **Safe Upgrade Path**: Nest CLI and Jest core are already using modern Glob v10/v13.
*   **Breaking-Change Risk**: **ZERO** in production.
*   **Recommended Action**: No manual intervention needed.

---

### C. `recharts`
*   **Package**: `recharts`
*   **Current Version**: `2.15.4` (Latest: `3.10.1`)
*   **Why It Exists**: SVG charting library for business dashboards, POS analytics, and sales trends in `apps/frontend`.
*   **Classification**: **DIRECT** / **PRODUCTION** (in `apps/frontend`)
*   **Who Depends On It**: `apps/frontend/package.json`
*   **Deprecation Status**: **ACTIVE** (Active major version 3.x line available).
*   **Safe Upgrade Path**: Stay on `2.15.4` until a dedicated testing window for Next.js App Router & React 19 compatibility is scheduled.
*   **Breaking-Change Risk**: **HIGH**.
    *   Recharts v3 drops legacy component props.
    *   Changes behavior of `ResponsiveContainer` sizing inside flexbox/CSS grid.
    *   Has breaking TypeScript type definition changes for tooltip formatters and axis ticks.
*   **Recommended Action**: **HOLD / DO NOT UPGRADE YET**. Keep `recharts@2.15.4`.

---

## 3. Complete Dependency Tree Classification

### Root Project (`package.json`)

| Package | Version | Type | Environment | Status | Safe Upgrade Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `bcryptjs` | `^3.0.3` | Direct | Production | Active | `3.0.3` (Latest) |
| `express-rate-limit` | `^8.6.2` | Direct | Production | Active | `8.6.2` (Latest) |
| `helmet` | `^8.3.0` | Direct | Production | Active | `8.3.0` (Latest) |
| `jsonwebtoken` | `^9.0.3` | Direct | Production | Active | `9.0.3` (Latest) |
| `mongodb` | `^7.5.0` | Direct | Production | Active | `7.5.0` (Latest) |
| `pdfkit` | `^0.19.1` | Direct | Production | Active | `0.19.1` (Latest) |
| `sharp` | `^0.35.3` | Direct | Production | Active | `0.35.3` (Latest) |
| `zod` | `^4.4.3` | Direct | Production | Active | `4.4.3` (Latest) |

---

### Frontend Application (`apps/frontend/package.json`)

| Package | Version | Type | Environment | Status | Upgrade Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `next` | `16.2.9` | Direct | Production | Needs Patch (`16.3.0`) | Low (Security fixes) |
| `react` | `19.2.4` | Direct | Production | Patch available (`19.2.8`) | Low |
| `react-dom` | `19.2.4` | Direct | Production | Patch available (`19.2.8`) | Low |
| `zustand` | `^5.0.0` | Direct | Production | Patch available (`5.0.15`) | Low |
| `@tanstack/react-query` | `^5.0.0` | Direct | Production | Patch available (`5.101.4`) | Low |
| `lucide-react` | `^0.470.0` | Direct | Production | Major available (`1.31.0`) | Medium (Icon naming changes) |
| `framer-motion` | `^11.0.0` | Direct | Production | Major available (`13.1.0`) | Medium (Animation prop changes) |
| `react-hook-form` | `^7.50.0` | Direct | Production | Minor available (`7.85.0`) | Low |
| `zod` | `^3.23.0` | Direct | Production | Major available (`4.4.3`) | High (Zod 4 breaking changes) |
| `recharts` | `^2.12.0` (`2.15.4`) | Direct | Production | Major available (`3.10.1`) | **HIGH (Hold)** |
| `sonner` | `^1.4.0` | Direct | Production | Major available (`2.0.8`) | Medium |
| `@tanstack/react-table` | `^8.15.0` | Direct | Production | Major available (`9.1.2`) | High |
| `date-fns` | `^3.6.0` | Direct | Production | Major available (`4.4.0`) | Medium |
| `@tailwindcss/postcss` | `^4` | Direct | Dev | Patch available (`4.3.3`) | Low |
| `tailwindcss` | `^4` | Direct | Dev | Patch available (`4.3.3`) | Low |
| `typescript` | `^5` | Direct | Dev | Major available (`7.0.2`) | High |

---

### Backend Application (`apps/backend/package.json`)

| Package | Version | Type | Environment | Status | Upgrade Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `@nestjs/common` | `^11.0.1` | Direct | Production | Patch available (`11.1.29`) | Low |
| `@nestjs/core` | `^11.0.1` | Direct | Production | Patch available (`11.1.29`) | Low |
| `@nestjs/platform-express` | `^11.0.1` | Direct | Production | Patch available (`11.1.29`) | Low (Addresses Multer advisory) |
| `@nestjs/mongoose` | `^11.0.0` | Direct | Production | Active | Low |
| `mongoose` | `^8.3.0` | Direct | Production | Major available (`9.9.2`) | High (Mongoose 9 breaking query API) |
| `socket.io` | `^4.7.5` | Direct | Production | Active | Low |
| `better-auth` | `^1.1.0` | Direct | Production | Patch available (`1.6.27`) | Low |
| `class-validator` | `^0.14.1` | Direct | Production | Minor available (`0.15.1`) | Low |
| `pino` | `^9.0.0` | Direct | Production | Major available (`10.3.1`) | Medium |
| `pino-pretty` | `^11.0.0` | Direct | Production | Major available (`13.1.3`) | Medium |
| `helmet` | `^7.1.0` | Direct | Production | Major available (`8.3.0`) | Low (Sync with root helmet 8) |
| `dotenv` | `^16.4.5` | Direct | Production | Major available (`17.4.2`) | Low |

---

## 4. Security Vulnerabilities Summary (`npm audit`)

| Advisory Package | Severity | Affected Dependency | Impact | Remediation Plan |
| :--- | :--- | :--- | :--- | :--- |
| `next` | High | `apps/frontend` | Server Actions / Middleware | Safe minor update to `next@16.3.0` |
| `multer` | High | `@nestjs/platform-express` | File upload DoS | Minor update to `@nestjs/platform-express@11.1.29` |
| `postcss` | High | `@tailwindcss/postcss` | Source map path traversal | Update `@tailwindcss/postcss@4.3.3` |
| `socket.io-parser` | High | `socket.io` | Zero-attachment memory | Update `socket.io-parser` patch |
| `brace-expansion` | High | `jest` / `ts-jest` / `eslint` | Dev-only Regex DoS | Safe patch update via `npm audit fix` (no breaking changes) |
| `js-yaml` | High | `babel-plugin-istanbul` | Dev-only CPU consumption | Safe patch update via `npm audit fix` |
| `fast-uri` | High | `ajv` / schema validators | Transitive URI parse | Safe patch update |
| `nanoid` | High | Transitive ID generator | Negative size loop | Safe patch update |

---

## 5. Recommended Upgrade Strategy (For Future Stages)

1. **Step 1: Safe Minor / Patch Security Fixes**
   - Run non-breaking audit fixes (`npm audit fix` without `--force`).
   - Bump `next` to `16.3.0` and `@nestjs/*` to `11.1.29`.
2. **Step 2: Hold High-Risk Migrations**
   - **Hold `recharts` at `2.15.4`**: Avoid charting regressions.
   - **Hold `zod` at `3.x` in frontend**: Avoid breaking Zod schema validator contracts until a full schema test suite is in place.
   - **Hold `mongoose` at `8.x` in backend**: Avoid breaking Mongoose 9 query casting.
3. **Step 3: Verification**
   - Execute full build tests (`npm run build:frontend`, `npm run build:backend`, and root gateway tests) after any dependency modification.
