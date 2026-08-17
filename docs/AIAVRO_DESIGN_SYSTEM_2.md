# AIAVRO Design Engineering System 2.0 Blueprint

## 1. System Vision & Core Design Principles

**AIAVRO Billing OS** is an enterprise-grade ERP & Retail Operating System. The design system is optimized for **OPERATE** mode with:
- **Design Variance**: `4 / 10`
- **Motion Intensity**: `5 / 10`
- **Visual Density**: `7 / 10`

---

## 2. Centralized Design Tokens Specification

### A. Color Palette & Surface Tokens
All colors are mathematically coordinated to maintain high contrast, zero pure black, and subtle structural depth.

```css
:root {
  /* 1. Surfaces & Canvas */
  --bg-canvas: #090d16;             /* Base viewport background */
  --bg-surface: #0f172a;            /* Primary card / table / panel container */
  --bg-surface-subtle: #131d33;     /* Nested sections / table headers */
  --bg-surface-elevated: #1a2542;   /* Modals, drawers, popovers, dropdowns */
  --bg-surface-interactive: #16223b;/* Hover / Active table row states */
  --bg-overlay: rgba(3, 7, 18, 0.75);/* Backdrop blur shield */

  /* 2. Borders & Dividers */
  --border-hairline: rgba(255, 255, 255, 0.05); /* Internal subtle row dividers */
  --border-default: rgba(255, 255, 255, 0.10);  /* Standard container border */
  --border-strong: rgba(255, 255, 255, 0.18);   /* Focused inputs, active cards */
  --border-focus: #3b82f6;                      /* Accessible keyboard focus ring */

  /* 3. Text & Typographic Hierarchy */
  --text-primary: #f8fafc;          /* High-contrast headlines, active values */
  --text-secondary: #cbd5e1;        /* Body copy, labels, table cells */
  --text-muted: #94a3b8;            /* Secondary subtitles, timestamps */
  --text-dim: #64748b;              /* Placeholders, disabled states */
  --text-inverse: #090d16;          /* Dark text on light accent badges */

  /* 4. Semantic Accents & Status */
  --accent-brand: #2563eb;          /* Primary actions, active navigation */
  --accent-brand-hover: #3b82f6;
  --accent-brand-soft: rgba(37, 99, 235, 0.12);

  --accent-success: #10b981;        /* Paid status, in-stock, positive margin */
  --accent-success-hover: #34d399;
  --accent-success-soft: rgba(16, 185, 129, 0.12);

  --accent-warning: #f59e0b;        /* Partial payment, low stock, in-transit */
  --accent-warning-hover: #fbbf24;
  --accent-warning-soft: rgba(245, 158, 11, 0.12);

  --accent-danger: #ef4444;         /* Voided invoice, out of stock, delete */
  --accent-danger-hover: #f87171;
  --accent-danger-soft: rgba(239, 68, 68, 0.12);

  --accent-info: #6366f1;           /* External brand, audit events, metadata */
  --accent-info-hover: #818cf8;
  --accent-info-soft: rgba(99, 102, 241, 0.12);

  /* 5. Realtime Sync Highlights */
  --highlight-flash: rgba(59, 130, 246, 0.25);
  --highlight-success: rgba(16, 185, 129, 0.25);
}
```

---

### B. Typography Scale & Hierarchy

| Token | Size | Line Height | Weight | Tracking | Primary Usage |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `display-lg` | 24px | 32px | 700 | -0.02em | Page title, dashboard hero numbers |
| `title-md` | 18px | 26px | 600 | -0.01em | Modal headers, section titles |
| `title-sm` | 15px | 22px | 600 | 0.00em | Card headers, table section titles |
| `body-md` | 13px | 18px | 400/500 | 0.00em | Standard table cells, form labels |
| `body-sm` | 12px | 16px | 400/500 | 0.00em | Helper text, secondary table metadata |
| `caption-xs` | 11px | 14px | 500/600 | 0.02em | Badges, tags, status pills, table headers |
| `mono-nums` | 12px/14px | 16px/20px | 500/600 | tabular | SKU, Barcode, Currency, Quantities, Dates |

---

### C. Spatial Grid & Control Heights

```
4px Base Grid Scale:
--space-1: 4px   (gap-1)
--space-2: 8px   (gap-2, p-2)
--space-3: 12px  (gap-3, p-3)
--space-4: 16px  (gap-4, p-4)
--space-5: 20px  (gap-5, p-5)
--space-6: 24px  (gap-6, p-6)
--space-8: 32px  (gap-8, p-8)

Standardized Control Heights:
- Compact (Table actions, filter inputs):  32px (h-8)
- Default (Standard forms, modal buttons): 36px (h-9)
- Large (Primary hero inputs, POS quick add): 42px (h-10.5)

Corner Radii Scale:
- Small (Badges, tags, inner inputs): 6px (rounded-md)
- Default (Buttons, inputs, cards): 8px / 10px (rounded-lg / rounded-xl)
- Large (Dialogs, drawers, main panels): 14px (rounded-2xl)
```

---

## 3. Motion System (`apps/web/lib/motion/`)

All animations use **hardware-accelerated transforms and paint-only opacity**, respecting user accessibility preferences (`prefers-reduced-motion`).

### Easing & Durations
- **Fast / Micro (Hover, Tooltips, Buttons)**: `120ms` • `ease: [0.16, 1, 0.3, 1]`
- **Standard (Modals, Tabs, Highlight Flashes)**: `200ms` • `ease: [0.16, 1, 0.3, 1]`
- **Complex / Spatial (Drawers, Sheet Slide-overs)**: `260ms` • `ease: [0.25, 1, 0.5, 1]`

### Motion Vocabulary
```ts
export const motionPresets = {
  appear: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
  },
  drawerSlideRight: {
    initial: { x: '100%', opacity: 0.8 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0.8 },
    transition: { duration: 0.24, ease: [0.25, 1, 0.5, 1] }
  },
  staggerContainer: {
    animate: {
      transition: { staggerChildren: 0.04 }
    }
  },
  staggerItem: {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.15, ease: 'easeOut' }
  },
  realtimePulse: {
    initial: { backgroundColor: 'var(--highlight-flash)' },
    animate: { backgroundColor: 'transparent' },
    transition: { duration: 1.2, ease: 'easeOut' }
  }
};
```

---

## 4. Shared Primitives Specification (`components/ui/`)

1. **Button**:
   - Variants: `primary`, `secondary`, `ghost`, `danger`, `success`, `outline`
   - Sizes: `sm (h-8)`, `md (h-9)`, `lg (h-11)`
   - Built-in loading spinner, disabled state, accessible focus ring, keyboard trigger.
2. **Input & Select**:
   - Height matched to button scale (`h-9`).
   - Prefix/Suffix icons with optical alignment.
   - Built-in `hasError`, `isNumeric` (right-aligned tabular nums), and disabled state.
3. **Table & Data Grid**:
   - `density="comfortable"` (12px py) vs `density="dense"` (8px py).
   - Sticky header support with subtle backdrop-blur.
   - Numeric alignment (`isNumeric`) with `tabular-nums font-mono text-right`.
4. **Dialog & Drawer**:
   - Body scroll locking, Escape key dismissal, backdrop click, autofocus first input.
   - Animated exit and entry via `AnimatePresence`.
5. **Tabs**:
   - Accessible ARIA tabs with animated `layoutId="activeTabPill"` background pill.
6. **Badge & StatusBadge**:
   - Domain status color mappings (`paid`, `unpaid`, `partially_paid`, `voided`, `active`, `suspended`, `in_transit`).
   - Optional live pulsing status dot for active streaming connections.
7. **MetricCard & StatCard**:
   - Semantic color borders on warning/critical status.
   - Tabular font-mono values with delta indicators (`+12.4% vs yesterday`).

---

## 5. Responsive Transformation Strategy

- **Desktop (1024px+)**: High-density multi-column data grid with actions column, instant search, and side drawer inspectors.
- **Tablet (768px - 1023px)**: Compact data grid with abbreviated column headers, responsive drawer overlay.
- **Mobile (390px - 767px)**:
  - Tables adapt into clean **priority cards** (Item title + brand, SKU badge, stock quantity, selling price, and tap-to-inspect drawer action).
  - No critical information is hidden behind arbitrary horizontal panning.
  - Cart and action triggers pin cleanly to bottom thumb zone.
