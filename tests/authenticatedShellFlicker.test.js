const fs = require('fs');
const path = require('path');

describe('Authenticated shell flicker prevention', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'aiavro_billing_system.html'), 'utf8');

  test('1. stylesheet and critical inline CSS are parsed before heavy third-party libraries', () => {
    const styleIndex = html.indexOf('<style>');
    const barcodeScriptIndex = html.indexOf('JsBarcode.all.min.js');
    expect(styleIndex).toBeGreaterThan(-1);
    expect(barcodeScriptIndex).toBeGreaterThan(-1);
    expect(styleIndex).toBeLessThan(barcodeScriptIndex);
  });

  test('2. authenticated shell is hidden in the initial HTML until auth routing completes', () => {
    expect(html).toContain('<body class="app-booting">');
    expect(html).toContain('<div class="app-container" aria-hidden="true">');
    expect(html).toContain('body.app-booting .app-container');
    expect(html).toContain('visibility: hidden;');
    expect(html).toContain('opacity: 0;');
    expect(html).not.toContain('<div class="app-container" style="display:none"');
  });

  test('3. auth flow selects the permitted target view before revealing the shell', () => {
    const initAuth = html.match(/function initAuthentication\(\)\s*\{([\s\S]*?)\n    \}/);
    expect(initAuth).not.toBeNull();
    const body = initAuth[1];
    expect(body.indexOf('appContainer.setAttribute("aria-hidden", "true")')).toBeLessThan(body.indexOf('switchView(state.activeView)'));
    expect(body.indexOf('switchView(state.activeView)')).toBeLessThan(body.indexOf('revealAuthenticatedShell(loginOverlay, appContainer)'));
    expect(body).not.toContain('appContainer.style.display = "flex"');
    expect(body).not.toContain('appContainer.style.display = "none"');
  });

  test('4. shell reveal is atomic and does not use display flips or overlay fade', () => {
    expect(html).toContain('function revealAuthenticatedShell(loginOverlay, appContainer)');
    expect(html).toContain('appContainer.style.removeProperty("display")');
    expect(html).toContain('document.body.classList.add("authenticated-shell-ready")');
    expect(html).toContain('loginOverlay.classList.remove("active")');
    expect(html).toContain('document.body.classList.remove("app-booting")');
    expect(html).toContain('body.authenticated-shell-ready .login-screen-overlay');
  });

  test('5. route changes suppress structural transitions without hiding the live shell', () => {
    expect(html).toContain('function beginStableViewRouting()');
    expect(html).toContain('function endStableViewRouting()');
    expect(html).toContain('body.view-routing .app-container *');
    expect(html).not.toContain('body.view-routing .app-container {\n      visibility: hidden;');
    expect(html).toMatch(/function switchView\(viewName\)\s*\{[\s\S]*?beginStableViewRouting\(\);/);
    expect(html).toMatch(/function switchView\(viewName\)\s*\{[\s\S]*?endStableViewRouting\(\);/);
  });

  test('6. duplicate public settings hydration is not scheduled on DOMContentLoaded', () => {
    const domReady = html.match(/window\.addEventListener\("DOMContentLoaded", async \(\) => \{([\s\S]*?)\n    \}\);/);
    expect(domReady).not.toBeNull();
    expect(domReady[1]).toContain('const initialSync = loadDatabaseState();');
    expect(domReady[1]).toContain('initAuthentication();');
    expect(domReady[1]).not.toContain('loadPublicSettings();');
  });

  test('7. initial authenticated sync hydrates before shell reveal and renders only once', () => {
    expect(html).toContain('const initialSync = loadDatabaseState();');
    expect(html).toContain('await initialSync.catch');
    expect(html).toContain('initialSyncPromise = syncStateWithServer({ render: false })');
    expect(html).toContain('await syncStateWithServer({ render: false });');
  });

  test('8. realtime updates are coalesced and do not call stale renderer names', () => {
    expect(html).toContain('function queueRealtimeRender');
    expect(html).toContain('const realtimeDirtyViews = new Set()');
    expect(html).not.toContain('renderProductsTable();');
    expect(html).not.toContain('renderBusinessesTable();');
    expect(html).not.toContain('renderPurchaseTable();');
    expect(html).not.toContain('renderFranchisesTable();');
  });

  test('9. shell and modal layers avoid layout-triggering visibility transitions', () => {
    expect(html).toContain('.app-container[aria-hidden="true"]');
    expect(html).toContain('visibility: hidden;');
    expect(html).toContain('pointer-events: none;');
    expect(html).toContain('z-index: 100000;');
    expect(html).toMatch(/\.modal-backdrop\s*\{[\s\S]*?visibility: hidden;/);
    expect(html).toMatch(/\.modal-backdrop\.active\s*\{[\s\S]*?visibility: visible;/);
    expect(html).toContain('transform: translateX(-290px);');
    expect(html).not.toContain('left: -290px; /* Hidden by default */');
  });
});
