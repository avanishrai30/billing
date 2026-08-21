# Phase 23G.2 — Protected Route Lifecycle Deep Forensics & Resolution

## 1. Executive Summary
This document provides complete forensic root-cause analysis and resolution for protected application route stability across the **AIAVRO Billing OS** Next.js App Router architecture.

---

## 2. Forensic Evidence & Symptoms

### Observed Symptoms
- Intermittent protected route failures under live network latency (e.g. Dashboard content, Product Master, Customers/Suppliers links reporting `"element was detached from the DOM"`).
- Server-Client Hydration Mismatches during initial page rendering when navigating directly to protected routes.

### WebServer Forensic Log
```text
Uncaught Error: Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:
- A server/client branch if (typeof window !== 'undefined').

<ProtectedLayout>
  <StoreScopeProvider>
    <AppShell>
      <div className="min-h-[100dvh] bg-[var(--bg-canvas)] ...">
      - className="min-h-screen flex items-center justify-center bg-[#001845] ..."
```

---

## 3. Root-Cause Analysis

### The Hydration Race Condition
1. **Server Rendering (SSR)**:
   During server compilation, `typeof window === 'undefined'`, so `AuthProvider` initialized with `user: null`, `token: null`, `lifecycle: 'initializing'`. `ProtectedLayout` evaluated `lifecycle === 'initializing'` and rendered the initial fallback loader:
   `<div className="min-h-screen flex items-center justify-center bg-[#001845] ...">Verifying authentication session...</div>`
2. **Client Hydration (First Paint)**:
   When `AuthProvider` read `sessionManager.getToken()` directly in its state initializers via `typeof window !== 'undefined'`, it immediately resolved to `lifecycle: 'authenticated'`.
3. **React Hydration Mismatch**:
   React compared the SSR HTML (the loading div) with the client First Paint (`AppShell`), detected a mismatch, discarded the SSR DOM, and triggered a complete client DOM regeneration. This regeneration caused elements like Sidebar navigation anchors and Topbar controls to momentarily detach and remount.

---

## 4. Lifecycle Timeline & Fix Architecture

### Before Fix:
```text
[SSR]        AuthProvider (initializing) → ProtectedLayout (LoadingScreen) → HTML Sent
[Client M1]  AuthProvider (authenticated) → ProtectedLayout (AppShell)     → Hydration Mismatch!
[Client M2]  React discards DOM → Re-mounts entire tree → DOM nodes detach
```

### After Fix:
```text
[SSR]        AuthProvider (initializing) → ProtectedLayout (LoadingScreen) → HTML Sent
[Client M1]  AuthProvider (initializing) → ProtectedLayout (LoadingScreen) → Perfect Match (0 error)
[Client M2]  useEffect runs on Client     → sessionManager reads storage   → AuthProvider (authenticated)
[Client M3]  Smooth transition to AppShell → No DOM detachment, completely stable tree!
```

---

## 5. Verification Results

### Automated Quality Gates
1. **Playwright E2E Suite**:
   - **Targeted Protected Shell Batch**: `authShell`, `dashboard`, `customers`, `suppliers`, `storeScope`, `roleAccess` (23/23 PASS)
   - **Full Suite**: **69 / 69 passed (100%)**
2. **Jest Unit Suite**:
   - **77 / 77 suites passed (304 / 304 tests)**
3. **TypeScript Typecheck**:
   - `tsc --noEmit` passed with 0 errors.
4. **Next.js Production Build**:
   - `next build` compiled 21/21 static pages successfully.
