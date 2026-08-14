const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Pre-Stage-13 Frontend Baseline Verification Suite', () => {
  let html;
  let inlineScripts = [];

  beforeAll(() => {
    const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
    html = fs.readFileSync(htmlPath, 'utf8');

    const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      const attrs = match[1];
      const body = match[2];
      if (!/src\s*=/i.test(attrs) && body.trim()) {
        inlineScripts.push(body);
      }
    }
  });

  test('1. Baseline frontend loads and contains core root containers', () => {
    expect(html).toContain('id="login-screen-overlay"');
    expect(html).toContain('class="app-container"');
    expect(html).toContain('style="display:none"');
  });

  test('2. Login screen exists with proper authentication controls', () => {
    expect(html).toContain('id="login-username"');
    expect(html).toContain('id="login-password"');
    expect(html).toContain('function triggerLogin');
  });

  test('3. App shell exists with navigation and main workspace', () => {
    expect(html).toContain('<aside>');
    expect(html).toContain('<main>');
    expect(html).toContain('class="nav-menu"');
  });

  test('4. Dashboard view exists with baseline analytics initializer', () => {
    expect(html).toContain('id="view-dashboard"');
    expect(html).toContain('function initDashboardAnalytics');
  });

  test('5. POS billing terminal view exists', () => {
    expect(html).toContain('id="view-billing"');
    expect(html).toContain('function recalculatePOSTotals');
  });

  test('6. Products master view exists', () => {
    expect(html).toContain('id="view-inventory"');
    expect(html).toContain('function renderInventoryTable');
  });

  test('7. Inventory balances view exists', () => {
    expect(html).toContain('id="view-inventory"');
  });

  test('8. Purchase entry view exists with baseline purchase sheet renderer', () => {
    expect(html).toContain('id="view-purchase"');
    expect(html).toContain('function renderPurchaseSheet');
  });

  test('9. Invoices database view exists', () => {
    expect(html).toContain('id="view-invoices"');
    expect(html).toContain('function renderInvoicesTable');
  });

  test('10. CRM / Customers view exists', () => {
    expect(html).toContain('id="view-customers"');
    expect(html).toContain('function renderCustomersTable');
  });

  test('11. No Frontend V2 markers or V2 script tags', () => {
    expect(html).not.toContain('AIAVROFrontendV2');
    expect(html).not.toContain('data-frontend-version="2.0"');
    expect(html).not.toContain('frontend-v2.js');
    expect(html).not.toContain('frontend-v2.css');
  });

  test('12. No Stage 13 UI token external stylesheet dependencies', () => {
    expect(html).not.toContain('/ui/theme.css');
    expect(html).not.toContain('/ui/components.css');
    expect(html).not.toContain('/ui/components.js');
    expect(html).not.toContain('/ui/login.css');
  });

  test('13. No Stage 13 Phase A-H redesign markers', () => {
    expect(html).not.toContain('botanical-cover');
    expect(html).not.toContain('login-product-kicker');
    expect(html).not.toContain('data-render-layer="shell"');
    expect(html).not.toContain('data-render-layer="auth"');
  });

  test('14. All inline scripts parse with zero SyntaxErrors', () => {
    expect(inlineScripts.length).toBeGreaterThan(0);
    inlineScripts.forEach((code) => {
      expect(() => {
        new vm.Script(code);
      }).not.toThrow();
    });
  });

  test('15. Core lifecycle and router functions exist in script scope', () => {
    expect(html).toContain('function triggerLogin');
    expect(html).toContain('function toggleLoginPasswordVisibility');
    expect(html).toContain('function initAuthentication');
    expect(html).toContain('function switchView');
    expect(html).toContain('function syncStateWithServer');
    expect(html).toContain('function loadDatabaseState');
  });
});
