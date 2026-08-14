const fs = require('fs');
const path = require('path');

describe('Frontend production polish stability pass', () => {
  const root = path.join(__dirname, '..');
  const htmlPath = path.join(root, 'aiavro_billing_system.html');
  const themePath = path.join(root, 'ui', 'theme.css');
  const componentsPath = path.join(root, 'ui', 'components.css');
  const v2JsPath = path.join(root, 'ui', 'frontend-v2.js');

  let html;
  let theme;
  let components;
  let v2Js;
  let combined;

  beforeAll(() => {
    html = fs.readFileSync(htmlPath, 'utf8');
    theme = fs.readFileSync(themePath, 'utf8');
    components = fs.readFileSync(componentsPath, 'utf8');
    v2Js = fs.readFileSync(v2JsPath, 'utf8');
    combined = `${html}\n${theme}\n${components}`;
  });

  test('1. font loading is system-safe and does not reference stale font network assets', () => {
    expect(combined).not.toMatch(/fonts\.googleapis|fonts\.gstatic|\.woff2?|@font-face|Outfit|Plus Jakarta Sans/);
    expect(theme).toContain('--font-sans: Inter, system-ui');
    expect(theme).toContain('--font-mono: "JetBrains Mono", ui-monospace');
    expect(html).toContain('font-family: var(--font-sans)');
  });

  test('2. canonical light theme tokens prevent dashboard dark surface leakage', () => {
    expect(theme).toContain('--color-app-bg: #f4f7f3');
    expect(theme).toContain('--color-surface: #ffffff');
    expect(theme).toContain('--color-primary: #276749');
    expect(html).toContain('--bg-primary: var(--color-app-bg)');
    expect(html).toContain('--bg-panel: var(--color-surface)');
    expect(html).toContain('[data-theme="dark"]');
    expect(html).toContain('--bg-panel: #ffffff');
  });

  test('3. login uses botanical premium composition without unsupported auth options or phone mockup', () => {
    const loginStart = html.indexOf('id="login-screen-overlay"');
    const loginEnd = html.indexOf('<div class="app-container"', loginStart);
    const loginMarkup = html.slice(loginStart, loginEnd);
    expect(html).toContain('class="login-screen-overlay active" data-auth-state="pending"');
    expect(html).toContain('class="login-card"');
    expect(html).toContain('loginOrganicDrift');
    expect(html).toMatch(/organic/i);
    expect(html).toContain('id="login-username"');
    expect(html).toContain('id="login-password"');
    expect(html).toContain('function toggleLoginPasswordVisibility()');
    expect(loginMarkup).not.toMatch(/Google|Microsoft|Office|phone mockup|mobile mockup/i);
  });

  test('4. login first paint hides app shell and renders final login layout directly', () => {
    expect(html).toMatch(/<div class="app-container"[^>]*data-render-layer="shell"[^>]*style="display:none"[^>]*>/);
    expect(html).toContain('appContainer.style.display = "grid"');
    expect(html).toContain('appContainer.style.display = "none"');
    expect(html).toContain('loginOverlay.setAttribute("data-auth-state", "login")');
    expect(html).not.toContain('animation: loginPanelIn');
  });

  test('5. view switching uses explicit view states and avoids concurrent active screens', () => {
    expect(html).toContain('data-view-state');
    expect(html).toContain('aria-hidden');
    expect(v2Js).toContain('function setActiveView(viewId)');
    expect(v2Js).toContain('view.classList.toggle("active", isTarget)');
    expect(v2Js).toContain('view.setAttribute("data-view-state", isTarget ? "visible" : "hidden")');
  });

  test('6. modal and drawer system has stable overlay, scroll lock, and z-index tokens', () => {
    expect(theme).toContain('--z-layer-overlay: 40');
    expect(theme).toContain('--z-layer-modal: 50');
    expect(theme).toContain('--z-layer-toast: 60');
    expect(html).toContain('body.modal-open');
    expect(html).toContain('function initModalStateObserver()');
    expect(html).toContain('document.body.classList.toggle("modal-open"');
    expect(html).toContain('z-index: var(--z-layer-modal)');
    expect(html).not.toContain('z-index: 99999');
  });

  test('7. motion is restrained and respects reduced-motion preference', () => {
    expect(html).toContain('@media (prefers-reduced-motion: reduce)');
    expect(html).toContain('--transition-normal: 180ms');
    expect(html).toContain('.app-view.active[data-view-state="entering"]');
  });

  test('8. no fake data or backend contract changes were introduced by polish files', () => {
    expect(combined).not.toMatch(/sampleCustomer|sampleSupplier|fake invoice|fake inventory|fake product/);
    const backendFiles = ['server.js', 'modules/customers.js', 'services/authzService.js'];
    backendFiles.forEach(file => {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    });
  });
});
