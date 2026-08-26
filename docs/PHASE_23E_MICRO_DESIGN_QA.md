# PHASE 23E Micro Design QA

Baseline: 7550407

Design read: operate-mode light enterprise UI. Preserve the Phase 23D visual world and refine interaction precision with variance 6, motion 5, density 6.

## POS

| Issue | Root Cause | Fix | Visual Impact | Mobile Impact | Motion Impact |
|---|---|---|---|---|---|
| Product card action column felt tight against long prices. | Local Add button width was tuned to one label, not the product card grid. | Increased the stable action column to 72px and routed the button through the shared Button primitive. | Better price/action baseline and more predictable CTA shape. | Prevents cramped Add action at narrow card widths. | Uses existing restrained press feedback. |
| Quantity control geometry had uneven internal rhythm. | Icon buttons and quantity value were flex-spaced instead of fixed tracks. | Switched to fixed 32/34/32 tracks. | Quantity stepper reads as one precise control. | Improves touch target predictability. | No extra animation. |
| Payment options relied mostly on color. | Payment mode buttons were one-off controls. | Added min-height, active press feedback, and grid behavior for mobile. | Selection states feel more tactile and stable. | Single-column payment choices are easier to tap. | Subtle transform only. |
| Cart empty and checkout panel spacing was slightly loose. | Item spacing and checkout CTA alignment differed from other controls. | Tightened item rhythm and made checkout CTA use shared button alignment. | Cart feels more deliberate and less assembled. | CTA remains full-width and reachable. | No remount or layout animation. |

## Dashboard

| Issue | Root Cause | Fix | Visual Impact | Mobile Impact | Motion Impact |
|---|---|---|---|---|---|
| KPI cards could vary in perceived height and value baseline. | StatCard had no minimum height and value line-height was looser. | Added minimum card height and tighter numeric leading. | KPI grid scans more evenly. | Values wrap more safely on small widths. | Color-only hover remains restrained. |
| Financial bars had slightly weak value alignment. | Label and numeric values were flexed with variable baselines. | Changed chart label rows to grid with fixed value column. | Ledger amounts align cleanly. | Prevents label/value collision on smaller widths. | No new animation. |
| Chart bars felt visually thin. | Bar height was 8px. | Increased to 10px. | Better chart legibility without adding visual noise. | Easier to read on phone. | Static, no animation. |

## Products

| Issue | Root Cause | Fix | Visual Impact | Mobile Impact | Motion Impact |
|---|---|---|---|---|---|
| Product filter footer could compress status filter and result text. | Footer used a single flex row without wrapping safeguards. | Added wrapping and full-width mobile status select. | Filter bar feels less brittle. | Archive filter no longer crowds result text. | No motion change. |
| Product table action buttons were bespoke. | Inline buttons bypassed shared IconButton contracts. | Replaced inspect/edit/archive controls with IconButton. | Action cluster has consistent 32px geometry and focus behavior. | Larger predictable targets in dense tables. | Shared active/focus rhythm only. |
| Realtime row highlight looked like a loose outline. | Ring was not inset. | Changed highlight ring to inset. | Highlight feels contextual to the row. | Avoids subtle horizontal bleed. | Existing short highlight behavior preserved. |
| Barcode manager remove control was one-off. | Local icon button lacked shared sizing/focus. | Replaced with IconButton. | Barcode rows align with product table actions. | Better touch target and focus state. | No extra motion. |

## Inventory

| Issue | Root Cause | Fix | Visual Impact | Mobile Impact | Motion Impact |
|---|---|---|---|---|---|
| Inventory tables inherit shared table rhythm. | Table geometry was owned by shared primitive. | Standardized Table header height, cell alignment, numeric alignment, and sticky header contrast. | Inventory tables become more consistent without module-local churn. | Existing responsive tests remain protected by shared behavior. | No module-level animation. |

## Shared Controls

| Issue | Root Cause | Fix | Visual Impact | Mobile Impact | Motion Impact |
|---|---|---|---|---|---|
| Icons could sit optically off baseline in buttons. | Button/IconButton did not normalize child SVG display. | Added inline-flex SVG normalization and leading-none. | Icons align more crisply with labels. | Controls feel more stable at compact sizes. | Shared 150ms ease-out press remains. |
| Reduced motion was not globally enforced. | Controls used Tailwind transitions/animations directly. | Added a global prefers-reduced-motion guard. | No visual change for default users. | Safer for motion-sensitive users. | Animations and transitions collapse under reduced motion. |
| Disabled press state could still carry active transform classes. | Variant classes included active transforms. | Added disabled active-scale neutralization. | Disabled controls feel inactive. | Avoids tactile false feedback. | Prevents disabled press feedback. |

## Tables

| Issue | Root Cause | Fix | Visual Impact | Mobile Impact | Motion Impact |
|---|---|---|---|---|---|
| Header/cell geometry varied by usage. | Header height and alignment were implicit. | Added 36px dense and 40px comfortable header heights with vertical alignment. | Tables scan more evenly. | Sticky headers remain more readable. | No motion. |
| Numeric/data rhythm needed stronger defaults. | Table cells did not enforce vertical alignment. | Added align-middle and kept numeric tabular classes. | Financial columns align more cleanly. | Reduces visual jitter in dense mobile tables. | No motion. |

## Drawers

| Issue | Root Cause | Fix | Visual Impact | Mobile Impact | Motion Impact |
|---|---|---|---|---|---|
| Drawer header could crowd long titles. | Header items were center-aligned. | Switched to top alignment and min-width guarded title area. | Product identity hierarchy reads better. | Long names do not push the close control. | No remount or entrance animation. |
| Footer did not reserve safe-area space. | Footer padding was fixed. | Added safe-area-aware bottom padding. | No desktop visual penalty. | Buttons avoid bottom inset collisions. | No motion. |

## Dialogs

| Issue | Root Cause | Fix | Visual Impact | Mobile Impact | Motion Impact |
|---|---|---|---|---|---|
| Dialog max-height was viewport-percent based. | `90vh` can be awkward on mobile browser chrome. | Added `100dvh` based mobile max-height. | Dialogs feel less cramped. | More reliable on 390x844 and 430x932. | No lifecycle change. |
| Close button had bespoke padding. | It was not using a fixed 32px geometry. | Changed to fixed 32px inline-flex geometry. | Header controls align with IconButton scale. | Better touch and keyboard target. | Subtle color state only. |

## Verification Notes

- Backend, database, API semantics, RBAC, store scope, financial calculations, and legacy HTML are intentionally untouched.
- Realtime architecture is preserved. Product row contextual highlight was refined visually without changing invalidation behavior.
- No wait hacks, forced clicks, hidden DOM text, or test expectation weakening were introduced.
