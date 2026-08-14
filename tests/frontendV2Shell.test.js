const fs = require('fs');
const path = require('path');

describe('Frontend V2 shell architecture', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'aiavro_billing_system.html'), 'utf8');
  const v2Css = fs.readFileSync(path.join(root, 'ui', 'frontend-v2.css'), 'utf8');
  const v2Js = fs.readFileSync(path.join(root, 'ui', 'frontend-v2.js'), 'utf8');

  test('1. frontendV2 flag is explicit and isolated to presentation assets', () => {
    expect(html).toContain('data-frontend-version="2"');
    expect(html).toContain('<link rel="stylesheet" href="/ui/frontend-v2.css">');
    expect(html).toContain('<script src="/ui/frontend-v2.js"></script>');
    expect(v2Js).toContain('featureFlag: true');
  });

  test('2. shell components are named without rebuilding the whole DOM', () => {
    expect(html).toContain('data-component="AppShell"');
    expect(html).toContain('data-component="TopBar"');
    expect(html).toContain('data-component="Sidebar"');
    expect(html).toContain('data-component="MainWorkspace"');
    expect(html).toContain('data-component="PageHeader"');
    expect(html).toContain('data-component="ContextBar"');
    expect(html).toContain('data-component="NotificationLayer"');
    expect(v2Js).not.toMatch(/innerHTML\s*=\s*`[\s\S]*(AppShell|Sidebar|TopBar)/);
  });

  test('3. navigation has grouped V2 registry and one active view manager', () => {
    expect(v2Js).toContain('{ id: "dashboard", group: "operations"');
    expect(v2Js).toContain('{ id: "customers", group: "relationships"');
    expect(v2Js).toContain('{ id: "settings", group: "control"');
    expect(v2Js).toContain('function setActiveView(viewId)');
    expect(v2Js).toContain('view.setAttribute("data-view-state", isTarget ? "visible" : "hidden")');
    expect(html).toContain('window.AIAVROFrontendV2?.navigation?.setActiveView(viewName)');
  });

  test('4. active view contract remains display none for inactive screens', () => {
    const activeViews = html.match(/<div[^>]+class="app-view active"/g) || [];
    expect(activeViews).toHaveLength(1);
    expect(html.match(/id="view-[^"]+" class="app-view/g) || []).toHaveLength(11);
    expect(v2Css).toContain('.app-view[data-view-state="hidden"]');
    expect(v2Css).toContain('display: none !important;');
  });

  test('5. responsive shell rules exist for desktop, tablet, and mobile', () => {
    expect(v2Css).toContain('@media (max-width: 1024px)');
    expect(v2Css).toContain('@media (max-width: 768px)');
    expect(v2Css).toContain('@media (max-width: 480px)');
    expect(v2Css).toContain('min-height: 100dvh');
  });

  test('6. modal and drawer state are coordinated without duplicate overlays', () => {
    expect(v2Js).toContain('const DrawerManager');
    expect(v2Js).toContain('data-drawer-state');
    expect(v2Js).toContain('global.ModalManager.sync()');
    expect(html).toContain('const ModalManager = window.ModalManager');
    expect(html).toContain('window.__modalStateObserver');
  });

  test('7. login remains stable and uses only credential auth', () => {
    const loginStart = html.indexOf('id="login-screen-overlay"');
    const loginEnd = html.indexOf('<div class="app-container"', loginStart);
    const loginMarkup = html.slice(loginStart, loginEnd);
    expect(loginMarkup).toContain('AIAVRO');
    expect(loginMarkup).toContain('Billing OS');
    expect(loginMarkup).toContain('id="login-username"');
    expect(loginMarkup).toContain('id="login-password"');
    expect(loginMarkup).not.toMatch(/Google|Microsoft|Office|phone mockup|SSO/i);
    expect(html).toContain('class="login-screen-overlay active" data-auth-state="pending"');
  });

  test('8. no fake data or backend contract changes are introduced', () => {
    const combined = `${html}\n${v2Css}\n${v2Js}`;
    expect(combined).not.toMatch(/fake invoice|fake product|fake customer|fake supplier|sample purchase|dummy inventory/i);
    expect(v2Js).not.toMatch(/fetch\(|XMLHttpRequest|api\.request|\/api\/v1/);
  });
});
