# Login Rendering Bug

## Scope

This investigation covers only the login render layer. Backend routes, API contracts, auth behavior, browser autofill/password-manager UI, and application data flows were not changed.

## Root Cause

The large pale horizontal block was application-owned CSS from `.login-card`.

The prior login redesign made the card `width: min(720px, 58vw)` with `min-height: min(640px, calc(100vh - 96px))`. On wide production viewports this rendered as a large white rectangle during first paint. The decorative `.login-card::before` pseudo-element was also oversized (`height: 118%`, negative right offset), so the card layer looked wider and heavier while the page initialized.

This was not caused by:

- Browser password-manager/autofill UI.
- Extension console messages such as content scripts or object multiplexers.
- Backend/API initialization.
- A modal backdrop, skeleton, preloader, or fake placeholder.

## Evidence

Browser smoke was performed against the static page served from `http://127.0.0.1:8123/aiavro_billing_system.html`.

- Before screenshot: `/private/tmp/aiavro-login-before.png`
- After desktop screenshot: `/private/tmp/aiavro-login-after.png`
- After mobile screenshot: `/private/tmp/aiavro-login-after-430-final-v5.png`

The before image showed the white `.login-card` occupying a large horizontal panel. The after image shows the form rendering directly inside a compact panel without the oversized block.

Chrome emitted local headless/updater diagnostics during screenshot capture. Those messages were treated as browser/runtime noise, not app defects.

## Fix

The fix is CSS-only:

- Constrained `.login-card` to `width: min(390px, calc(100vw - 48px))`.
- Removed the old 640px minimum height by setting `min-height: 0`.
- Added `max-height: calc(100vh - 48px)` and `box-sizing: border-box`.
- Replaced the oversized organic pseudo-element with a contained 96px accent.
- Added mobile viewport bounds, title wrapping, and narrow-title sizing.

## Render Contract

Initial markup still renders:

- `#login-screen-overlay.active` with `data-auth-state="pending"`.
- `.app-container` as `display:none`.
- No active app-owned modal backdrop.

Authentication still switches the same elements:

- Authenticated state removes the login overlay and restores the app shell as CSS Grid.
- Unauthenticated state keeps the login overlay active and the app shell hidden.

## Regression Coverage

`tests/loginFlicker.test.js` guards:

- Initial login-only auth surface.
- No oversized login card geometry.
- Contained pseudo-elements.
- Mobile viewport-bound layout.
- Unchanged authentication display state.
- No app-owned active modal at first paint.
- No password-manager behavior modification.
