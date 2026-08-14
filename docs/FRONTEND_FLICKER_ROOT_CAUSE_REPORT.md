# Master Frontend Forensic Report — Stage C → G Root-Cause Regression Analysis

## 1. Executive Summary & Observed Symptoms

During forensic analysis across stages C through G and commit history (`ad0bda1` → `529bc59`), three distinct rendering failure modes were identified:

1. **Symptom A & C: Login Surface Disappearance & Visual Incompleteness**
   - *Behavior*: Botanical login background appears, but the card/form can disappear, clip, or appear as a narrow squished column on viewports $\le 600\text{px}$.
   - *First Introduced*: Commit `98e7de7` ("feat: redesign aiavro login experience") and `6074266` ("fix: eliminate login first-paint flicker").
   - *Mechanism*: `@media (max-width: 600px)` clamped `.login-card` to `width: min(260px, calc(100vw - 112px))` with `padding: 28px 24px`, leaving only $200\text{px}$ usable width.

2. **Symptom B: Native Browser "Please fill in this field" Validation Popup**
   - *Behavior*: Native browser tooltips intercept submission instead of the app's styled error banner.
   - *First Introduced*: Commit `98e7de7`.
   - *Mechanism*: `<form id="login-form">` lacked `novalidate` while `<input required>` attributes were used with `<button type="submit">`.

3. **Symptom D: Blank Workspace & Layout Burst after Authentication**
   - *Behavior*: Authenticated shell (sidebar/header) renders, but the main workspace is blank or experiences visual stutter.
   - *First Introduced*: Progressively accumulated across **Stage C (`9eaf41c`) through Stage G (`6604b08`)**, with CSS specificity conflict introduced in `8c925c3`.
   - *Mechanism*: 
     - Architectural: `syncStateWithServer()` eagerly rendered ALL 7+ background domain views (POS, CRM, Invoices, Inventory, etc.) simultaneously on startup.
     - CSS Specificity: `.app-view[data-view-state="hidden"]` (`display: none`) had equal specificity $(0,2,0)$ to `.app-view.active` (`display: block`) but appeared later in the stylesheet, overriding `.active` whenever state attributes lagged.

---

## 2. Historical Regression Matrix

| Stage / Commit | Commit Message | Login Card State | App Shell State | syncState Render Scope | View Router CSS Mechanism | Risk Level |
|---|---|---|---|---|---|---|
| **Baseline** (`ad0bda1`) | `feat: build new app shell` | Dark overlay, JS fade | `style="display:none"` | Rendered ALL views | Standard `.app-view.active { display: block }` | Low |
| **Stage C** (`9eaf41c`) | `feat: redesign dashboard` | Dark overlay, JS fade | `style="display:none"` | Rendered ALL + Dashboard | Standard `.app-view.active` | Moderate |
| **Stage D** (`c8d78f5`) | `feat: redesign pos terminal` | Dark overlay, JS fade | `style="display:none"` | Rendered ALL + POS | Standard `.app-view.active` | Moderate |
| **Stage E** (`1c4c7a3`) | `feat: redesign product master` | Dark overlay, JS fade | `style="display:none"` | Rendered ALL + Products | Standard `.app-view.active` | High DOM Churn |
| **Stage F** (`b54e4cd`) | `feat: inventory command center` | Dark overlay, JS fade | `style="display:none"` | Rendered ALL + Inventory | Standard `.app-view.active` | High DOM Churn |
| **Stage G** (`6604b08`) | `feat: purchase & invoice` | Dark overlay, JS fade | `style="display:none"` | Rendered ALL + Purchases | Standard `.app-view.active` | Critical DOM Churn |
| **Login Redesign** (`98e7de7`) | `feat: redesign login exp` | Botanical, `active` first | `style="display:none"` | Rendered ALL views | Form `required` + Mobile $260\text{px}$ clamp | Form popup / Mobile clip |
| **Render Fix** (`8c925c3`) | `fix: stabilize render arch` | Botanical, `active` first | `style="display:none"` | Rendered ALL views | Added `data-view-state` (specificity conflict) | Blank View Risk |
| **Current Fix** (`529bc59`) | `fix: active-view rendering` | Botanical, `active` first | `style="display:none"` | **Active View Only** | Specificity fix needed | Clean Foundation |

---

## 3. Five Mandatory Forensic Questions & Answers

### QUESTION 1: At which commit did the behavior first appear?
- **DOM Layout Burst / Second Render Wave**: Commenced at **Stage C (`9eaf41c`)** and grew progressively worse through Stage G (`6604b08`) as 16+ renderers were piled into `syncStateWithServer()`.
- **Login Card Mobile Clipping & Native Validation**: Introduced in commit **`98e7de7`**.
- **Blank Workspace / CSS Specificity Lock**: Introduced in commit **`8c925c3`**.

### QUESTION 2: What exact code path caused it?
1. `initAuthentication()` (L8101) sets `.app-container.style.display = "grid"` and calls `switchView(state.activeView)`.
2. `switchView()` (L10167) sets `data-view-state="hidden"` on all views, then adds `.active` and `data-view-state="entering"` on target, scheduling `data-view-state="visible"` in `requestAnimationFrame`.
3. `syncStateWithServer()` (L7933) runs asynchronously over the network. In previous commits, it eagerly called 8+ render functions; in commit `529bc59`, it was scoped to `state.activeView`.

### QUESTION 3: What exact DOM/CSS state produced the visual artifact?
1. `.app-view[data-view-state="hidden"] { display: none; }` (L520) has specificity $(0,2,0)$ and appears after `.app-view.active { display: block; }` (L513), causing `display: none` to win.
2. `@media (max-width: 600px) { .login-card { width: min(260px, calc(100vw - 112px)); } }` (L2477) shrank the login card down to $248\text{px}$, causing overflow and visual truncation.
3. `<form id="login-form">` (L2958) lacked `novalidate`, triggering HTML5 constraint validation tooltips.

### QUESTION 4: Why did previous fixes not eliminate it?
Previous attempts patched isolated symptoms (e.g. adding fonts, adjusting z-indexes, adding opacity transitions, or building entire V2 shells) rather than addressing the core root causes:
1. CSS specificity collision between `[data-view-state]` and `.active`.
2. Clamping media queries on `.login-card`.
3. Uncoordinated render loops across all domain views in `syncStateWithServer()`.

### QUESTION 5: Does fixing this affect backend behavior?
**NO.** All changes are purely frontend DOM/CSS geometry and render lifecycle coordination. Zero backend, REST, database, or socket changes are required.

---

## 4. Minimal Safe Fix Plan

1. **CSS Specificity Correction**:
   - Ensure `.app-view.active` has higher specificity or explicitly handles `data-view-state`:
     ```css
     .app-view.active { display: block; }
     .app-view:not(.active)[data-view-state="hidden"] { display: none; }
     ```
2. **Login Card Responsive Geometry**:
   - Change `@media (max-width: 600px)` `.login-card` width to `width: min(440px, calc(100vw - 32px));` so mobile screens provide full, comfortable form padding.
3. **Form Constraint Validation**:
   - Add `novalidate` to `<form id="login-form" novalidate>` and handle validation in `triggerLogin()`.
4. **Enforce Active-View-Only Render Contract**:
   - Maintain the active-view-only dispatching in `syncStateWithServer()` and ensure `switchView()` lazily renders views on navigation.
