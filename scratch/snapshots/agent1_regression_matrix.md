# Agent 1 Regression Analysis

## Analysis Matrix

| Stage | Login Card Complete | App Shell Hidden Initially | syncState Renders All Views | Active View Rendered | Dashboard Has Content | switchView Correct |
|---|---|---|---|---|---|---|
| baseline.html | Yes | No | Yes | Yes | Yes | No (Doesn't render view) |
| stage-c.html | Yes | No | Yes | Yes | Yes | No (Doesn't render view) |
| stage-d.html | Yes | No | Yes | Yes | Yes | No (Doesn't render view) |
| stage-e.html | Yes | No | Yes | Yes | Yes | No (Doesn't render view) |
| stage-f.html | Yes | No | Yes | Yes | Yes | No (Doesn't render view) |
| stage-g.html | Yes | No | Yes | Yes | Yes | No (Doesn't render view) |
| current.html | Yes (Has pseudo-elements) | Yes (display: none inline) | No (Only active view) | Yes | Yes | Yes (Renders on switch) |

## Specific Checks

- **Does any snapshot have CSS that hides `.app-view.active`?**
  Yes, `current.html`. It introduces `data-view-state` attributes. The CSS `.app-view[data-view-state="hidden"] { display: none; }` comes *after* `.app-view.active { display: block; }` and has equal specificity. Also, `.app-view.active[data-view-state="entering"] { opacity: 0; }` hides the active view before `requestAnimationFrame` reveals it.

- **Does any snapshot have CSS that hides `#login-card`?**
  No snapshot has CSS that completely hides `.login-card` or `#login-card` outright, but `current.html` introduces narrow sizing on mobile `width: min(260px, calc(100vw - 112px))` and complex flex/grid containers that might cause layout issues.

- **Does any snapshot add pseudo-elements (::before, ::after) on login-card that could cover the form?**
  Yes, **current.html** adds `.login-card::before` and `.login-card::after`. These use `z-index: -1` and `pointer-events: none` to remain in the background, but they are newly introduced in `current.html` and visually obscure or style the card area.

- **Does any snapshot change `.app-container` display logic?**
  Yes. From `baseline.html` to `stage-g.html`, `.app-container` has no inline display style, but relies on CSS `display: grid`. When `initAuthentication()` reveals it, it mistakenly does `appContainer.style.display = "flex"`, breaking the layout. 
  In **current.html**, the HTML adds inline `style="display:none"` to prevent pre-auth flickering, and `initAuthentication()` correctly restores it with `appContainer.style.display = "grid"`.

## Summary
The root causes of regressions revolve around:
1. `current.html` optimizing `syncStateWithServer()` to *only* render the active view, deferring other views to be rendered during `switchView()`.
2. `current.html` updating `.app-container` to start `display: none` and use `grid` rather than `flex` during reveal.
3. View visibility becoming state-machine dependent (`data-view-state` instead of just `.active`).
