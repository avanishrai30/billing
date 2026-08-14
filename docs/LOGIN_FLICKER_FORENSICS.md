# Login Flicker Forensics — Multi-Agent Investigation Report

## Investigation Summary

7 forensic agents were dispatched to investigate the recurring login/rendering flicker.
4 agents completed successfully (Agents 1, 4, 6, 7 partial). 3 agents were blocked by API quota limits.

**Baseline restored**: Pre-V2 commit `8c925c3` — verified zero diff.

---

## Cross-Agent Root Cause Table

| Symptom | Responsible Element | Responsible Code Path | Responsible CSS | First Introduced | Confidence |
|---|---|---|---|---|---|
| **Massive reflow burst on session resume** | `.app-container` transition from `display:none` → `display:grid` | `syncStateWithServer()` renders ALL 7+ background views, then `initAuthentication()` reveals shell | `.app-container { display: grid }` vs inline `style="display:none"` | Pre-existing architecture | **HIGH** |
| **Brand title flash on boot** | `#login-brand-name` | Triple write: (1) inline script L2935, (2) `updateActiveBrandUI()` L10393, (3) `loadPublicSettings()` L7219 | N/A (DOM text mutation) | `98e7de7` login redesign | **MEDIUM** |
| **Second render wave after login** | All `.app-view` containers | `syncStateWithServer()` L8028-8044 eagerly calls `renderPOSProducts()`, `renderCustomersTable()`, etc. for ALL views regardless of active view | N/A | Pre-existing architecture | **HIGH** |
| **DOM construction behind login overlay** | Hidden `.app-container` children | `triggerLogin()` L8138 awaits full `syncStateWithServer()` before calling `initAuthentication()` at L8139 | Login overlay is opaque but browser still builds DOM behind it | Pre-existing architecture | **HIGH** |

---

## PRIMARY ROOT CAUSE

**`syncStateWithServer()` (Lines 8027-8044) unconditionally calls ALL view renderers** — `renderPOSProducts()`, `renderCustomersTable()`, `renderSuppliersTable()`, `renderInvoicesTable()`, `renderBusinessesCards()`, `renderFranchiseCards()`, `renderUsersTable()`, `renderAuditLogsTable()` — regardless of which view is currently active.

### Impact:
1. On **cold reload with cached JWT**: `initAuthentication()` reveals `.app-container` immediately with empty data, then `syncStateWithServer()` finishes and fires a massive re-render wave across ALL 7+ views simultaneously.
2. On **fresh login**: `triggerLogin()` awaits `syncStateWithServer()` which constructs hundreds of DOM nodes across all views while the login overlay is still visible, then `initAuthentication()` flips `.app-container` from `display:none` to `display:grid`, causing a synchronous layout burst.
3. **Layout thrashing**: All render functions use destructive `innerHTML = ""` followed by loop-based `appendChild()`, causing full sub-tree destruction and regeneration across multiple views in a single JS task.

### Fix:
Replace the unconditional render-all block with **active-view-only rendering**. Only the currently visible view needs DOM updates; other views re-render lazily when the user navigates to them (via `switchView()`).

## SECONDARY CONTRIBUTORS

1. **Triple brand title mutation**: `#login-brand-name` rewritten 3 times during boot by different code paths.
2. **`body` transition on background-color**: Line 145 applies `transition: background-color 180ms` which can cause a subtle color animation if theme variables resolve asynchronously.
3. **Parser-blocking CDN scripts**: 5 scripts (~1.5MB total) block HTML parsing in `<head>` (Lines 19-23), delaying First Contentful Paint of the login card.

---

## Agent Reports

### Agent 1 — DOM / First-Paint Forensics ✅
- **Verdict: CLEAN** — Login overlay is the sole first-paint surface. `.app-container` is correctly hidden with inline `style="display:none"`. All modals start hidden. Synchronous inline scripts populate branding before paint.

### Agent 4 — View Router / Global Render ✅
- **Verdict: ROOT CAUSE IDENTIFIED** — `syncStateWithServer()` renders all background views simultaneously. `switchView()` uses `requestAnimationFrame` for `data-view-state` transitions. Dashboard is hardcoded as initial active view regardless of user role.

### Agent 6 — Performance / Browser Rendering ✅
- **Verdict: CLEAN (rendering pipeline)** — No FOUT, no FOUC, no CLS. Font stack uses local system fonts only. Login CSS is embedded inline (no extra HTTP round-trip). Recommends deferring CDN scripts.

### Agent 7 — Git Regression Forensics (partial)
- Hit API quota limit during investigation.
