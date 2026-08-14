const fs = require('fs');
const path = require('path');

describe('Frontend rendering architecture', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'aiavro_billing_system.html'), 'utf8');
  const theme = fs.readFileSync(path.join(root, 'ui', 'theme.css'), 'utf8');

  test('1. rendering layers are tokenized and ordered', () => {
    expect(theme).toContain('--z-layer-foundation: 0');
    expect(theme).toContain('--z-layer-shell: 10');
    expect(theme).toContain('--z-layer-auth: 20');
    expect(theme).toContain('--z-layer-view: 30');
    expect(theme).toContain('--z-layer-overlay: 40');
    expect(theme).toContain('--z-layer-modal: 50');
    expect(theme).toContain('--z-layer-toast: 60');
    expect(html).toContain('data-render-layer="shell"');
    expect(html).toContain('data-render-layer="auth"');
    expect(html).toContain('data-render-layer="active-view"');
    expect(html).toContain('data-render-layer="toast"');
  });

  test('2. shell is persistent and the initial view contract is explicit', () => {
    expect(html).toContain('<div class="app-container" data-render-layer="shell" style="display:none">');
    expect(html).toContain('id="view-dashboard" class="app-view active" data-view-state="visible"');
    expect(html).toContain('data-view-state="hidden" aria-hidden="true"');
    expect(html).toContain('.app-view[data-view-state="hidden"]');
    expect(html).toContain('contain: layout;');
    expect(html).not.toMatch(/function\s+renderAppShell\s*\(/);
  });

  test('3. exactly one primary view is active in the initial markup', () => {
    const activeViews = html.match(/<div[^>]+class="app-view active"/g) || [];
    expect(activeViews).toHaveLength(1);
    expect(html.match(/id="view-[^"]+" class="app-view/g) || []).toHaveLength(11);
  });

  test('4. boot state has one auth surface and no full-screen loading placeholder', () => {
    expect(html).toContain('class="login-screen-overlay active" data-auth-state="pending"');
    expect(html).toContain('data-render-layer="auth"');
    expect(html).not.toMatch(/class="[^"]*(?:loading-overlay|fullscreen-loader|full-screen-loader|boot-overlay|splash-screen)[^"]*"/i);
    expect(html).not.toMatch(/<div[^>]+style="[^"]*(?:width:\s*100vw|height:\s*100vh)[^"]*"[^>]*>[^<]*(?:Loading|Please wait)/i);
  });

  test('5. modal infrastructure is centralized and stale overlays are normalized', () => {
    expect(html).toContain('const ModalManager = window.ModalManager');
    expect(html).toContain('open(id)');
    expect(html).toContain('closeAll()');
    expect(html).toContain('data-overlay-state');
    expect(html).toContain('window.__modalStateObserver');
    expect(html).toContain('document.body.classList.toggle("modal-open"');
  });

  test('6. realtime handlers preserve targeted updates and drawer state', () => {
    expect(html).toContain('function upsertRealtimePurchaseRow(purchase)');
    expect(html).toContain('function upsertRealtimeInvoiceRow(invoice)');
    expect(html).toContain('if (state.activeView === \'purchase\') renderPurchaseTable();');
    expect(html).toContain('if (state.activeView === \'invoices\') renderInvoicesTable();');
    expect(html).toContain('purchaseWorkspaceState.currentPurchaseId');
    expect(html).toContain('invoiceWorkspaceState.currentInvoiceId');
  });

  test('7. diagnostics are dev-only and include mutation and layout-shift observation', () => {
    expect(html).toContain('function initRenderDiagnostics()');
    expect(html).toContain('params.get("renderDiagnostics") !== "1"');
    expect(html).toContain('new MutationObserver');
    expect(html).toContain('layout-shift');
    expect(html).toContain('window.__renderDiagnostics');
  });

  test('8. frontend-only pass does not introduce fake records or font requests', () => {
    expect(html).not.toMatch(/fake invoice|fake inventory|fake product|sample purchase/i);
    expect(`${html}\n${theme}`).not.toMatch(/fonts\.googleapis|fonts\.gstatic|\.woff2?|@font-face/);
  });
});
