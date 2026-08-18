# Phase 23C Design Direction

## 1. Current Problem

Phase 23B stabilized contracts and introduced light-theme primitives, but the product still carries mixed visual eras. The global tokens are light, while the AppShell root still uses a dark canvas, several surfaces retain cockpit density, and POS still has dark skeleton panels. The visual result reads as a partially recolored admin dashboard instead of a complete premium enterprise product.

Key defects to remove:

- Mixed dark and light surfaces inside the same application shell.
- Repeated rounded card containers where data should use structure, grouping, and hierarchy.
- Overuse of tiny uppercase labels, decorative status dots, and version-style footer text.
- POS product cards and cart actions that feel like generic ecommerce tiles instead of fast retail operations.
- Tables that rely on containers inside containers, producing heavier chrome than the data needs.
- Mobile layouts that are usable but not yet composed for cashier and manager workflows.

Backend modules, legacy HTML, API payloads, RBAC gates, store scope behavior, and test contracts remain frozen.

## 2. Target Visual Language

AIAVRO should feel like a light enterprise operating system for daily billing, inventory, and ownership review. The language is precise, warm-neutral, high-contrast, and calm under pressure.

The durable direction:

- Warm off-white canvas, white operational surfaces, and charcoal typography.
- Strategic blue for primary actions and active navigation only.
- Semantic green, amber, and red reserved for business state.
- 8px operational radius for controls and repeated data items, with slightly larger radius only for major panels.
- Hairline borders, soft offset shadows, and clear focus rings.
- Tabular numerals for money, stock, GST, and ledger values.
- Dense but legible layouts with obvious scan paths.

The design dials are locked for this phase:

- `DESIGN_VARIANCE=6`
- `MOTION_INTENSITY=5`
- `VISUAL_DENSITY=6`

## 3. Dashboard Composition

The dashboard should move from equal KPI-card stacking to an owner-grade command overview.

Target composition:

- A quiet page header with store scope, refresh action, and current sync state.
- A primary financial band where sales, profit, purchases, and stock valuation read as a single business ledger.
- Secondary operational metrics grouped by inventory risk, catalog health, and franchise contribution.
- Financial distribution shown with ledger-like rows and bars that do not imitate decorative progress widgets.
- Low-stock watchlist and recent activity tables presented as operational queues.

The dashboard should answer three questions quickly: how the business is performing, what requires attention, and what changed recently.

## 4. AppShell Composition

The shell should become a calm enterprise frame, not a dark control room.

Target composition:

- Light canvas across the full app root.
- Sidebar as a stable white rail with grouped navigation, clear active state, and no version footer.
- Topbar as a utility strip for active store, user role, and session controls.
- Main workspace with a wider operational max width and responsive padding.
- Mobile sidebar with a crisp overlay, large tap targets, and no layout shift.

Navigation keeps labels, permissions, routes, and accessible contracts unchanged.

## 5. Product Master Composition

Product Master should feel like a controlled catalog workspace, not a loose table page.

Target composition:

- Header emphasizes catalog control, realtime sync, import, and SKU creation.
- Summary metrics read as compact catalog counters, not oversized cards.
- Filters are an integrated command bar with search first, then categorical refinements.
- Table remains the primary working surface, with image, SKU, price, tax, status, and actions scannable at speed.
- Realtime highlight should be visible but restrained, using a soft blue flash and border rather than a loud glow.

Mobile Product Master prioritizes search, result count, and table access without hiding critical actions.

## 6. POS Composition

POS should feel faster and more tactile than the back-office pages.

Target composition:

- Header presents terminal, store, cashier, sync, and mobile cart count in one compact band.
- Barcode input remains always available and visually quiet.
- Search and category selection behave like operational controls, not marketing pills.
- Product cards are stable, compact selling tiles with price, unit, stock clarity, and a strong add target.
- Desktop cart is sticky, settlement-focused, and visually distinct without becoming dark or heavy.
- Mobile cart action remains persistent and thumb-friendly.

The POS interaction should support repeated scanning and tapping with minimal visual fatigue.

## 7. Motion Principles

Motion is purposeful and restrained.

- Use motion for feedback, state change, and hierarchy only.
- Prefer opacity and transform transitions between 140ms and 220ms.
- Use a small amount of scale or translate feedback on press.
- Realtime highlights should decay quickly and never move layout.
- Avoid route-level spectacle, scroll hijacking, and infinite decoration.
- Respect reduced motion in CSS and component motion utilities.

## 8. Mobile Principles

Mobile must be composed rather than merely collapsed.

- Sidebar becomes an overlay rail with clear close behavior.
- Workspace padding tightens while preserving touch targets.
- Product and POS grids maintain fixed tile geometry to prevent jumping.
- Tables stay horizontally scrollable with sticky context where already supported.
- Primary actions should remain near the top or in a clear bottom/action area.
- Long filter sets stack into readable single-column controls.

## 9. Anti-Slop Rules

Phase 23C rejects the following patterns:

- Dark navy dashboard surfaces.
- Neon accents, heavy glow, crypto-style visuals, and decorative gradient blobs.
- Large decorative glass panels.
- Card-inside-card layouts.
- Oversized rounded rectangles everywhere.
- Generic three-card symmetry as the default page structure.
- Decorative status dots that do not communicate real state.
- Version labels and environment stamps in user-facing chrome.
- Emoji or hand-rolled decorative icons.
- Placeholder-as-label form controls.
- `transition-all`, layout-shifting animation, and motion that ignores reduced-motion settings.

This phase is complete only when the built UI looks like a single light enterprise product across dashboard, Product Master, POS, inventory, and shared primitives.
