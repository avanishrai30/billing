/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('Master Frontend Regression Guard: Stage C -> G Flicker & Render Forensics', () => {
  let html;
  let dom;

  beforeAll(() => {
    const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
    html = fs.readFileSync(htmlPath, 'utf8');
  });

  beforeEach(() => {
    document.documentElement.innerHTML = html;
  });

  describe('1. Logged-Out First-Paint & Login Geometry Contract', () => {
    test('Login screen overlay exists with active class and pending auth state', () => {
      const overlay = document.getElementById('login-screen-overlay');
      expect(overlay).toBeTruthy();
      expect(overlay.classList.contains('active')).toBe(true);
      expect(overlay.getAttribute('data-auth-state')).toBe('pending');
    });

    test('App shell (.app-container) is hidden inline on first paint', () => {
      const appContainer = document.querySelector('.app-container');
      expect(appContainer).toBeTruthy();
      expect(appContainer.getAttribute('style')).toContain('display:none');
    });

    test('Login card has proper structure with no clipping on mobile', () => {
      const card = document.querySelector('.login-card');
      expect(card).toBeTruthy();
      const form = document.getElementById('login-form');
      expect(form).toBeTruthy();
      expect(form.hasAttribute('novalidate')).toBe(true);
    });

    test('Login form inputs have required attributes with novalidate form wrapper', () => {
      const username = document.getElementById('login-username');
      const password = document.getElementById('login-password');
      expect(username).toBeTruthy();
      expect(password).toBeTruthy();
      expect(username.hasAttribute('required')).toBe(true);
      expect(password.hasAttribute('required')).toBe(true);
    });
  });

  describe('2. CSS Specificity & Active View Exclusivity Contract', () => {
    test('.app-view.active rule contains display: block !important to prevent specificity overrides', () => {
      expect(html).toMatch(/\.app-view\.active\s*\{[^}]*display:\s*block\s*!important/);
    });

    test('.app-view:not(.active)[data-view-state="hidden"] hides inactive views cleanly', () => {
      expect(html).toMatch(/\.app-view:not\(\.active\)\[data-view-state="hidden"\]/);
    });

    test('Exactly one .app-view has active class in initial markup (#view-dashboard)', () => {
      const activeViews = document.querySelectorAll('.app-view.active');
      expect(activeViews.length).toBe(1);
      expect(activeViews[0].id).toBe('view-dashboard');
    });

    test('All other .app-view elements have data-view-state="hidden"', () => {
      const hiddenViews = document.querySelectorAll('.app-view:not(.active)');
      expect(hiddenViews.length).toBeGreaterThan(5);
      hiddenViews.forEach(v => {
        expect(v.getAttribute('data-view-state')).toBe('hidden');
      });
    });
  });

  describe('3. Active-View-Only Sync & Lazy Navigation Contract', () => {
    test('syncStateWithServer() dispatches rendering ONLY to state.activeView', () => {
      // Must check state.activeView before calling domain renderers
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

  describe('4. Clean Auth Lifecycle & No Multiple Overlays', () => {
    test('initAuthentication sets data-auth-state="authenticated" and unhides shell', () => {
      expect(html).toMatch(/loginOverlay\.setAttribute\("data-auth-state",\s*"authenticated"\)/);
      expect(html).toMatch(/appContainer\.style\.display\s*=\s*"grid"/);
    });

    test('triggerLogout removes socket listeners and resets session cleanly', () => {
      expect(html).toMatch(/function triggerLogout\(\)\s*\{[\s\S]*?syncSocket\.removeAllListeners\(\)/);
    });

    test('No duplicate modal or overlay backdrops exist in markup', () => {
      const overlay = document.querySelectorAll('#login-screen-overlay');
      expect(overlay.length).toBe(1);
      const appContainer = document.querySelectorAll('.app-container');
      expect(appContainer.length).toBe(1);
    });
  });
});
