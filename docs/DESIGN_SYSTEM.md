# Enterprise POS + ERP Design System

**Stage:** Stage 13 — Design System Specification  
**Visual Direction:** High-Performance Enterprise POS, Operational, Calm, Dense & Legible  
**Standard:** Vanilla CSS Custom Properties (Zero Heavy CSS Dependencies)

---

## 1. Design Philosophy & Aesthetic Principles

```
  ┌─────────────────────────────────────────────────────────────┐
  │ FAST          │ Sub-millisecond UI state response           │
  │ CALM          │ Neutral, distraction-free operational dark/light│
  │ DENSE         │ Information-rich layout with zero visual fluff│
  │ LEGIBLE       │ Tabular numbers, high-contrast monospace SKUs│
  │ KEYBOARD-FIRST│ Hotkeys for 100% of checkout actions        │
  │ HIGH-TRUST    │ Destructive actions explicit with confirmation│
  └─────────────────────────────────────────────────────────────┘
```

### Prohibited Design Anti-Patterns
- **No Purple-on-Dark or Neon Glows:** Uses dignified neutral slate tones with intentional semantic accents.
- **No Icon-Stuffed Bento Boxes:** Clean data metrics without decorative clutter.
- **No Pulsing Biscuit Pills or Gradient Text:** Direct typography focused on monetary and inventory values.
- **No Sluggish Transitions:** All operational feedback is instantaneous (120ms standard).

---

## 2. Design Token Dictionary (CSS Custom Properties)

```css
:root {
  /* ==================== CORE NEUTRAL PALETTE ==================== */
  --bg-app: #0c0f12;               /* Root application canvas */
  --bg-surface: #14181d;           /* Sidebar, header, panel containers */
  --bg-surface-raised: #1c2229;    /* Cards, table rows, dropdowns */
  --bg-surface-active: #252d36;    /* Selected rows, active tabs */
  --bg-input: #101418;             /* Textboxes, numeric inputs */

  /* ==================== BORDERS & DIVIDERS ==================== */
  --border-subtle: #242c35;        /* Subtle component separators */
  --border-strong: #333e4b;        /* Card boundaries, input focus */
  --border-highlight: #475569;     /* Active focus rings */

  /* ==================== TYPOGRAPHY & TEXT COLORS ==================== */
  --text-primary: #f8fafc;         /* High-contrast headlines, prices */
  --text-secondary: #94a3b8;       /* Table headers, metadata, labels */
  --text-muted: #64748b;           /* Placeholders, disabled text */
  --text-inverse: #0f172a;         /* High contrast on white badges */

  /* ==================== SEMANTIC ACCENT COLORS ==================== */
  --accent-primary: #3b82f6;       /* Blue: Primary actions, checkout */
  --accent-primary-hover: #2563eb;
  --accent-primary-subtle: rgba(59, 130, 246, 0.12);

  --accent-success: #10b981;       /* Emerald: Paid, in-stock, positive profit */
  --accent-success-subtle: rgba(16, 185, 129, 0.12);

  --accent-warning: #f59e0b;       /* Amber: Low stock, expiring soon */
  --accent-warning-subtle: rgba(245, 158, 11, 0.12);

  --accent-danger: #ef4444;        /* Rose: Out of stock, void, error */
  --accent-danger-subtle: rgba(239, 68, 68, 0.12);

  /* ==================== TYPOGRAPHIC SCALE ==================== */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace;

  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 13px;
  --text-md: 14px;
  --text-lg: 16px;
  --text-xl: 18px;
  --text-2xl: 22px;
  --text-3xl: 28px;

  /* ==================== SPACING TOKENS (4px Grid) ==================== */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  /* ==================== RADII & ELEVATION ==================== */
  --radius-xs: 3px;
  --radius-sm: 5px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 9999px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.6);

  /* ==================== TRANSITIONS & MOTION ==================== */
  --transition-fast: 120ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## 3. Specialized Data Formatting Rules

### Financial & Monetary Formatting
- Font: `var(--font-sans)` with `font-weight: 700`, `font-variant-numeric: tabular-nums`.
- Format: `₹1,24,500.00` (Indian comma grouping with 2 decimal places).
- Positive Net Profit: Green font (`var(--accent-success)`).
- Voided / Refunded: Rose font (`var(--accent-danger)`).

### SKUs, Barcodes & System Identifiers
- Font: `var(--font-mono)` with `letter-spacing: 0.04em`, `font-size: 11px`.
- Rendered in pill badges with subtle border (`border: 1px solid var(--border-subtle)`).

### Quantities & Units
- Packaged goods: `12 Units` (Standard font).
- Loose / Weighted items: `250 g`, `1.500 kg`, `500 ml`, `2.000 L` (Bold unit badge).

---

## 4. Component Design Patterns

### 1. Data Tables (Dense Operational Mode)
- **Header:** Sticky top header, `text-transform: uppercase`, `font-size: 11px`, `letter-spacing: 0.05em`.
- **Row Padding:** `8px 12px` (Compact) or `12px 16px` (Comfortable).
- **Hover State:** `background: var(--bg-surface-raised)` with subtle left border highlight.
- **Empty State:** Clean centered state with actionable button (e.g., "Add First Product").

### 2. Form Inputs & Selects
- **Inputs:** `background: var(--bg-input)`, `border: 1px solid var(--border-subtle)`, `border-radius: var(--radius-sm)`, `color: var(--text-primary)`.
- **Focus Ring:** `border-color: var(--accent-primary)`, `box-shadow: 0 0 0 2px var(--accent-primary-subtle)`.
- **Validation:** Direct inline red text (`var(--accent-danger)`) without shifting surrounding form layout.

### 3. POS Cart Row
- Highly legible grid: Product Title, Unit Price, Stepper Quantity Controls (`-` `Qty` `+`), Weight Badge, Line Total, Delete Action.
- Immediate subtotal calculation with zero delay.
