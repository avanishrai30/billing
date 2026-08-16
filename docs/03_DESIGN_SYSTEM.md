# AIAVRO Billing OS — Design System & UI Architecture Specification

**Status:** Phase 3 Complete & Authoritative
**Target Application:** `apps/web` (Next.js App Router, React 19, TypeScript Strict, Tailwind CSS v4)
**Design Direction:** Apple-inspired editorial enterprise UI — calm, premium, operational, restrained, and dense.

---

## 1. Core Principles & Philosophy

1. **Deterministic Paint & First-Paint Stability:**
   - Elements render in their final geometric positions on first paint.
   - Zero structural opacity fades ($0 \to 1$), zero layout-changing transforms (`scale`, `translateY`), and zero `transition: all`.
2. **Local System Typography (Zero External Font Dependencies):**
   - Uses `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
   - No Google Fonts, no `@font-face`, no external `.woff2` requests that could block rendering or trigger FOUT/FOUC layout thrashing.
   - Financial and inventory quantities enforce `font-variant-numeric: tabular-nums;` for rock-solid tabular data alignment.
3. **Paint-Only Micro-Interactions:**
   - Only CSS properties that do not trigger layout or paint-reflow reflows are allowed in transitions: `background-color`, `border-color`, `box-shadow`, `color`, `opacity`.
4. **Accessible Paint-Only Focus Rings:**
   - Focus states use `outline: 2px solid var(--color-brand); outline-offset: 2px;` or `ring-1/2`.
   - Never alter `width`, `height`, `padding`, `margin`, or `border-width` on `:focus` or `:hover`.

---

## 2. Design Tokens & Color System

| Token Category | CSS Variable / Token | Value | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `--color-bg-canvas` | `#001845` | Main viewport canvas |
| **Surface** | `--color-bg-surface` | `#021b47` | Sidebar, Topbar, Dense containers |
| **Surface Subtle** | `--color-bg-surface-subtle` | `#032154` | Primary cards, panels, tables |
| **Surface Elevated** | `--color-bg-surface-elevated` | `#042968` | Elevated cards, dropdowns, dialogs |
| **Overlay** | `--color-bg-overlay` | `rgba(0, 10, 30, 0.75)` | Dialog and Drawer backdrops |
| **Border Subtle** | `--color-border-subtle` | `rgba(255, 255, 255, 0.08)` | Inner dividers, subtle cell lines |
| **Border** | `--color-border` | `rgba(255, 255, 255, 0.14)` | Standard card and input borders |
| **Border Strong** | `--color-border-strong` | `rgba(255, 255, 255, 0.24)` | Active/focused containers |
| **Text Primary** | `--color-text-primary` | `#f8fafc` | Primary titles, values, labels |
| **Text Secondary** | `--color-text-secondary` | `#cbd5e1` | Secondary descriptions, captions |
| **Text Muted** | `--color-text-muted` | `#94a3b8` | Placeholders, inactive labels |
| **Brand Accent** | `--color-brand` | `#0ea5e9` | Primary action buttons, active tabs |
| **Success / Positive** | `--color-success` | `#10b981` | Paid status, upward financial trend |
| **Warning / Pending** | `--color-warning` | `#f59e0b` | Partially paid, draft, warning |
| **Danger / Negative** | `--color-danger` | `#ef4444` | Unpaid, voided, error alerts |

---

## 3. Strict Motion & Anti-Flicker Rules

```css
/* FORBIDDEN PATTERNS (Enforced by automated AST tests) */
* {
  /* FORBIDDEN: transition: all */
  /* FORBIDDEN: will-change: transform */
  /* FORBIDDEN: transform: translateZ(0) across global elements */
}

button:hover, card:hover {
  /* FORBIDDEN: transform: scale(1.02) */
  /* FORBIDDEN: transform: translateY(-2px) */
}

/* ALLOWED TRANSITION SPECIFICATION */
.btn-interaction {
  transition-property: background-color, border-color, color, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 4. Responsive Breakpoints

| Breakpoint | Minimum Width | Target Devices / Form Factors |
| :--- | :--- | :--- |
| `sm` | `640px` | Large mobile landscape, small tablets |
| `md` | `768px` | iPad / Tablet portrait |
| `lg` | `1024px` | Desktop POS stations, iPad Pro |
| `xl` | `1280px` | Standard Enterprise workstation |
| `2xl` | `1536px` | High-resolution multi-monitor terminals |
