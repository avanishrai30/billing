# Phase 25 Icon/Text Alignment Audit

## Root Cause

Icon/text alignment drift came from inconsistent icon-slot contracts. `Button` already used `inline-flex` and `items-center`, but several controls rendered raw SVG nodes or page-level icons as normal children with `mr-*` spacing. Those SVGs could keep inline baseline behavior, different intrinsic sizes, and different label line-height from the shared button primitive.

The most visible examples were in Settings:
- `Upload Custom Logo`
- `Reset Default`
- `Refresh`
- `Save Branding Settings`
- `Save Business Profile`

## Shared Fix

Added a shared `IconSlot` primitive:

- `inline-flex`
- `items-center`
- `justify-center`
- `shrink-0`
- `leading-none`
- direct SVG children use `display: block`
- direct SVG children use `flex-shrink: 0`

Applied it to:

- `Button`
- `IconButton`
- `Input` adornments
- `Select` chevron
- `TabsTrigger`
- `Dropdown` menu item icons
- `Badge` / `Tag` remove icon
- `Dialog` close button
- `Drawer` close button
- `Toast` status and dismiss icons
- `PasswordInput` visibility toggle

Settings buttons that previously embedded icons as children now use `leftIcon`, so the shared `Button` contract owns spacing and vertical centering.

## Standards

Control heights:

- Compact / `sm`: `32px`
- Default / `md`: `36px`
- Large / `lg`: `42px`

Icon sizes:

- Compact / `sm`: `14px`
- Default / `md`: `16px`
- Large / `lg`: `18px`

Gaps:

- Compact / `sm`: `6px`
- Default / `md`: `8px`
- Large / `lg`: `8px`

Text:

- Button labels are `inline-flex`, `items-center`, `leading-none`.
- Icon+label controls avoid label `leading-normal` / `leading-relaxed`.

No arbitrary `top`, `translate-y`, `mt`, or `mb` pixel nudges were introduced for button icon alignment.

## Route Audit Summary

Covered the requested route set:

`/login`, `/dashboard`, `/pos`, `/products`, `/inventory`, `/purchases`, `/invoices`, `/customers`, `/suppliers`, `/stores`, `/franchises`, `/users`, `/permissions`, `/audit`, `/tax`, `/settings`, `/design-system`.

Findings:

- Most add/filter/table actions already flow through `Button` or `IconButton`, so primitive-level normalization addresses repeated route drift.
- Settings had the highest visible child-icon bypass risk and was corrected locally.
- Table action buttons had mixed caller icon sizes; `IconButton` now normalizes icon size per control size.
- Login remains a deliberate standalone visual surface per the Phase 25 constraint and was not redesigned.
- Header/tab/filter layout differences found by the audit were broader design-system drift, not direct icon/text centering defects, so they were not changed in this focused pass.

## Visual Evidence

Before:

- User-provided Phase 25 screenshot showed `Upload Custom Logo` with the upload icon optically higher than the label. That screenshot was supplied in the brief and is not checked into the repo.

After:

- `apps/web/test-results/desktop-design-system.png`
- `apps/web/test-results/mobile-design-system.png`
- `apps/web/test-results/desktop-dashboard.png`
- `apps/web/test-results/mobile-dashboard.png`
- `apps/web/test-results/desktop-inventory.png`
- `apps/web/test-results/mobile-inventory.png`
- `apps/web/test-results/desktop-pos.png`
- `apps/web/test-results/mobile-pos.png`

Browser geometry verification was added to `tests/e2e/designSystem.spec.ts`. It verifies the rendered icon/text button has:

- 32px compact button height
- SVG `display: block`
- icon wrapper `flex-shrink: 0`
- icon center within 1px of button center
- text center within 1px of button center
- compact gap of 6px
- label line-height locked to the compact text geometry

## Regression Tests

Added `tests/unit/components/button.test.tsx` coverage for:

- shared button heights and gaps
- `Button` label `leading-none`
- icon slot `inline-flex` centering
- icon slot `shrink-0`
- direct SVG `display:block` and `shrink-0`
- normalized icon sizes for `sm`, `md`, and `lg`
- `IconButton` using the same icon-slot sizing contract

Added `tests/e2e/designSystem.spec.ts` browser geometry coverage for:

- compact/default/large button heights
- stable button height when label font size and line-height are mutated
- icon/text center alignment in an actual rendered control
- no inline SVG baseline gap

Also fixed a missing media-asset mock in `rootRedirect.spec.ts`; the test already mocked public settings with a logo path, but did not mock the logo asset request, causing a backend `ERR_CONNECTION_REFUSED` console error during the full E2E suite.

## Verification Results

Baseline before changes:

- `npm test -w apps/web`: 77 suites, 304 tests passed
- `npm run typecheck -w apps/web`: passed
- `npm run build -w apps/web`: passed outside sandbox; sandbox run hit Turbopack internal port-binding restriction

After changes:

- `npm test -w apps/web -- tests/unit/components/button.test.tsx`: 4 tests passed
- `npm run typecheck -w apps/web`: passed
- `npm test -w apps/web`: 77 suites, 305 tests passed
- `npm run build -w apps/web`: passed outside sandbox; sandbox run hit the same Turbopack internal port-binding restriction
- `npm run test:e2e -w apps/web -- tests/e2e/rootRedirect.spec.ts`: 3 tests passed
- `npm run test:e2e -w apps/web`: 69 tests passed

## Skill/Agent Notes

Used:

- `impeccable`
- `emil-design-eng`
- `karpathy-guidelines`

`leonxlnx/taste-skill` was requested but was not installed in this session, so its optical-polish role was covered through the available frontend design skills and the dedicated optical audit agent.

Five read-only subagents completed the requested audits:

- shared primitives forensics
- global button/action audit
- route usage audit
- optical alignment review
- design-system contract review
