# Login Design Implementation

## Visual Design

The login screen is a fullscreen AIAVRO-branded experience built inside the existing single-file frontend. It uses the AIAVRO organic palette: deep forest green, soft sage, warm white, mist green, and charcoal.

The foreground is a centered soft-surface card with restrained translucency, a subtle border, and a gentle shadow. The card is readable without backdrop support and does not rely on aggressive glass effects.

## Logo Placement

The logo appears above all login fields in a deterministic 64px image inside a reserved 72px mark container. The brand lockup is:

- Logo mark
- `#login-brand-name`
- Billing OS descriptor
- Login heading
- Username and password fields

The existing `#login-brand-logo-img` and `#login-brand-name` IDs remain in place so cached/public settings can continue updating the brand name and logo.

## Background Architecture

The background is CSS-only. It uses static gradients and organic pseudo-elements, with all login background motion disabled during first paint so the final surface appears immediately.

No WebGL, shader, canvas, or pointer listener is used. This avoids renderer recreation, animation-loop leaks, and mouse-event listener accumulation.

## Responsive Strategy

The login card uses stable viewport-bound geometry:

- Desktop: `width: min(440px, calc(100vw - 32px))`
- Mobile: `width: min(260px, calc(100vw - 112px))`
- Mobile padding is reduced while preserving comfortable touch targets.

Inputs and buttons are constrained to the card width to prevent horizontal overflow or clipped controls.

## Authentication Integration

Authentication still uses the existing `triggerLogin(event)` flow and `api.auth.login(usernameInput, passwordInput)`.

The frontend button now shows `Signing in...` while disabled, and a duplicate-submit guard exits if the login button is already disabled. No backend route, JWT, RBAC, session, or API contract was changed.

## Accessibility

- Labels use explicit `for` attributes.
- Inputs preserve `autocomplete="username"` and `autocomplete="current-password"`.
- The error region uses `role="alert"` and `aria-live="polite"`.
- Inputs reference the error region with `aria-describedby`.
- The password visibility toggle keeps `aria-label` and `aria-pressed`.
- Keyboard order remains username, password, login.

Browser password-manager/autofill UI is untouched.

## Motion

The login first paint is animation-free: the background, card, and overlay do not animate or fade while the browser and auth state initialize. Input and button transitions remain available after the surface is visible.

The existing global `prefers-reduced-motion` rule disables animations and transitions for users who request reduced motion.

## Fallback

If backdrop filtering is unavailable, the base gradient background and solid readable card remain intact.

## Performance

The implementation uses no JavaScript animation loop, no ResizeObserver, no pointer listeners, and no WebGL resources. There is no path for duplicated render loops, shader reinitialization, or a login fade-in flicker.

## Flicker Prevention

Initial markup remains stable:

- `#login-screen-overlay` starts active with `data-auth-state="pending"`.
- `.app-container` starts with `display:none`.
- Authenticated state restores `.app-container` as CSS Grid.

The previous large horizontal block cannot return because the login card no longer uses the old `720px / 640px` panel geometry and mobile card width remains viewport-bound.
