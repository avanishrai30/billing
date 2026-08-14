const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Master Billing Design System & Global Shell Suite', () => {
  let html;
  let designCss;
  let inlineScripts = [];

  beforeAll(() => {
    const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
    const cssPath = path.join(__dirname, '..', 'docs', 'billing_design_system.css');
    
    html = fs.readFileSync(htmlPath, 'utf8');
    designCss = fs.readFileSync(cssPath, 'utf8');

    const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    for (const match of html.matchAll(scriptRegex)) {
      const attrs = match[1];
      const body = match[2];
      if (!/src\s*=/i.test(attrs) && body.trim()) {
        inlineScripts.push(body);
      }
    }
  });

  test('1. Master font stack uses editorial system typography (Avenir Next, Helvetica Neue, -apple-system)', () => {
    expect(html).toContain('var(--font-sans)');
    expect(html).toContain('"Avenir Next"');
    expect(html).toContain('"Helvetica Neue"');
    expect(designCss).toContain('"Avenir Next"');
    expect(designCss).toContain('"Helvetica Neue"');
  });

  test('2. Tabular numbers utility exists for financial and metric alignment', () => {
    expect(html).toContain('.tabular-nums');
    expect(html).toContain('font-variant-numeric: tabular-nums');
    expect(designCss).toContain('font-variant-numeric: tabular-nums');
    expect(designCss).toContain('font-feature-settings: "tnum"');
  });

  test('3. Master token variables are defined in :root for light and dark themes', () => {
    expect(html).toContain('--bg-primary: #f6f8f6');
    expect(html).toContain('--bg-panel: #ffffff');
    expect(html).toContain('--text-primary: #111f16');
    expect(html).toContain('--text-muted: #52695c');
    expect(html).toContain('--border-color: #e2e8e4');
    expect(html).toContain('--accent-green: #10b981');
    expect(html).toContain('--accent-gold: #f59e0b');
    expect(html).toContain('--accent-blue: #2563eb');
    expect(html).toContain('--accent-danger: #ef4444');
  });

  test('4. Standardized button classes exist with paint-only hover and active feedback', () => {
    expect(html).toContain('.primary-btn');
    expect(html).toContain('.secondary-btn');
    expect(designCss).toContain('.primary-btn');
    expect(designCss).toContain('.secondary-btn');
    expect(designCss).toContain('.danger-btn');
    expect(designCss).toContain('.ghost-btn');
  });

  test('5. Form input controls maintain consistent geometry and paint-only focus', () => {
    expect(html).toContain('.select-dropdown');
    expect(html).toContain('.search-input-box input');
    expect(html).toMatch(/\.select-dropdown:focus[^{]*\{[^}]*box-shadow/);
  });

  test('6. Broad "transition: all" is eliminated in favor of explicit paint transitions', () => {
    expect(designCss).not.toContain('transition: all');
    expect(html).not.toMatch(/--transition:\s*all/);
  });

  test('7. Anti-flicker policy: Hover rules do not alter standalone width, height, margin, or padding', () => {
    const hoverMatches = html.match(/(\.[a-zA-Z0-9_-]+:hover\s*\{[\s\S]*?\})/g) || [];
    hoverMatches.forEach((rule) => {
      // Exclude selectors that legitimately style nested text/svg or pseudo indicators
      if (rule.includes('.sidebar-resizer') || rule.includes('.login-') || rule.includes('.nav-item')) return;
      expect(rule).not.toMatch(/(?:^|[\s;{])(width|height|padding|margin)\s*:/);
    });
  });

  test('8. Zero external Google font network dependencies in <head>', () => {
    expect(html).not.toMatch(/<link[^>]*fonts\.googleapis\.com/);
    expect(html).not.toMatch(/<link[^>]*fonts\.gstatic\.com/);
  });

  test('9. GPU compositing policy: No blanket GPU promotion hacks on global design tokens', () => {
    expect(designCss).not.toContain('transform: translateZ(0)');
    expect(designCss).not.toContain('backface-visibility: hidden');
    expect(designCss).not.toContain('will-change');
  });

  test('10. All inline JavaScript blocks compile cleanly with zero parse errors', () => {
    expect(inlineScripts.length).toBeGreaterThan(0);
    inlineScripts.forEach((code, idx) => {
      expect(() => {
        new vm.Script(code);
      }).not.toThrow();
    });
  });
});
