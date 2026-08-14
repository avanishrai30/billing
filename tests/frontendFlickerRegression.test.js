const fs = require('fs');
const path = require('path');

describe('Master Frontend Regression Guard: Stage C -> G Flicker & Render Forensics', () => {
  let html;

  beforeAll(() => {
    const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
    html = fs.readFileSync(htmlPath, 'utf8');
  });

  describe('1. Logged-Out First-Paint & Login Geometry Contract', () => {
    test('Login screen overlay exists with active class and pending auth state', () => {
      expect(html).toContain('id="login-screen-overlay" class="login-screen-overlay active" data-auth-state="pending"');
    });

    test('App shell (.app-container) is hidden inline on first paint', () => {
      expect(html).toContain('<div class="app-container" data-render-layer="shell" style="display:none">');
    });

    test('Login card has proper structure with no clipping on mobile', () => {
      expect(html).toContain('class="login-card"');
      expect(html).toContain('width: min(440px, calc(100vw - 32px))');
      expect(html).toMatch(/<form id="login-form"[^>]*novalidate/);
    });

    test('Login form inputs have required attributes with novalidate form wrapper', () => {
      expect(html).toContain('id="login-username" class="login-input" placeholder="e.g. admin" required');
      expect(html).toContain('id="login-password" class="login-input" placeholder="Enter password" required');
    });
  });

  describe('2. CSS Specificity & Active View Exclusivity Contract', () => {
    test('.app-view.active rule contains display: block !important to prevent specificity overrides', () => {
      expect(html).toMatch(/\.app-view\.active\s*\{[^}]*display:\s*block\s*!important/);
    });

    test('.app-view:not(.active)[data-view-state="hidden"] and .app-view[data-view-state="hidden"] hide inactive views cleanly', () => {
      expect(html).toContain('.app-view[data-view-state="hidden"]');
      expect(html).toContain('.app-view:not(.active)[data-view-state="hidden"]');
    });

    test('Exactly one .app-view has active class in initial markup (#view-dashboard)', () => {
      const activeMatches = html.match(/<div[^>]+class="app-view active"/g) || [];
      expect(activeMatches).toHaveLength(1);
      expect(html).toContain('id="view-dashboard" class="app-view active" data-view-state="visible"');
    });

    test('All other .app-view elements have data-view-state="hidden"', () => {
      const hiddenMatches = html.match(/class="app-view"[^>]*data-view-state="hidden"/g) || [];
      expect(hiddenMatches.length).toBeGreaterThan(5);
    });
  });

  describe('3. Active-View-Only Sync & Lazy Navigation Contract', () => {
    test('syncStateWithServer() dispatches rendering ONLY to state.activeView', () => {
      expect(html).toMatch(/if\s*\(state\.activeView\s*===\s*'billing'\)\s*\{\s*renderPOSProducts\(\);/);
      expect(html).toMatch(/else\s+if\s*\(state\.activeView\s*===\s*'customers'\)/);
      expect(html).toMatch(/else\s+if\s*\(state\.activeView\s*===\s*'invoices'\)/);
      expect(html).toMatch(/else\s+if\s*\(state\.activeView\s*===\s*'inventory'\)/);
      expect(html).toMatch(/else\s+if\s*\(state\.activeView\s*===\s*'dashboard'\)/);
    });

    test('switchView() function contains lazy render invocation for all views', () => {
      expect(html).toMatch(/if\s*\(viewName\s*===\s*'dashboard'\)[\s\S]*?initDashboardAnalytics\(\)/);
      expect(html).toMatch(/else\s+if\s*\(viewName\s*===\s*'billing'\)[\s\S]*?renderPOSProducts\(\)/);
      expect(html).toMatch(/else\s+if\s*\(viewName\s*===\s*'inventory'\)[\s\S]*?initInventoryCommandCenter\(\)/);
      expect(html).toMatch(/else\s+if\s*\(viewName\s*===\s*'customers'\)[\s\S]*?initCRMWorkspace\(\)/);
      expect(html).toMatch(/else\s+if\s*\(viewName\s*===\s*'invoices'\)[\s\S]*?initInvoiceWorkspace\(\)/);
      expect(html).toMatch(/else\s+if\s*\(viewName\s*===\s*'purchase'\)[\s\S]*?initPurchaseWorkspace\(\)/);
      expect(html).toMatch(/else\s+if\s*\(viewName\s*===\s*'auditor'\)[\s\S]*?initAuditorDashboard\(\)/);
    });
  });

  describe('4. Clean Auth Lifecycle & Defensive Chart Null Safety', () => {
    test('initAuthentication sets data-auth-state="authenticated" and unhides shell', () => {
      expect(html).toContain('loginOverlay.setAttribute("data-auth-state", "authenticated")');
      expect(html).toContain('appContainer.style.display = "grid"');
    });

    test('triggerLogout removes socket listeners and resets session cleanly', () => {
      expect(html).toContain('function triggerLogout()');
      expect(html).toContain('syncSocket.removeAllListeners()');
    });

    test('buildSVGSalesChart and buildCategoryPieChart have null-safety guards', () => {
      expect(html).toContain('if (!dynamicGroup) return;');
      expect(html).toContain('if (!segmentGroup || !legendBox) return;');
    });
  });
});
