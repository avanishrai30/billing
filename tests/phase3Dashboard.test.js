const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Phase 3: Modernized Editorial Enterprise Dashboard Suite', () => {
  let html;
  let inlineScripts = [];

  beforeAll(() => {
    const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
    html = fs.readFileSync(htmlPath, 'utf8');

    const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    for (const match of html.matchAll(scriptRegex)) {
      const attrs = match[1];
      const body = match[2];
      if (!/src\s*=/i.test(attrs) && body.trim()) {
        inlineScripts.push(body);
      }
    }
  });

  test('1. Dashboard container #view-dashboard exists and is active by default', () => {
    expect(html).toContain('id="view-dashboard" class="app-view active"');
  });

  test('2. All 13 core dashboard metric IDs are intact and preserved', () => {
    const metricIds = [
      'metric-total-sales',
      'metric-net-profit',
      'metric-asset-valuation-cost',
      'metric-asset-valuation-retail',
      'metric-franchise-earnings',
      'metric-total-products',
      'metric-own-products',
      'metric-external-products',
      'metric-low-stock-count',
      'metric-out-of-stock-count',
      'metric-categories-count',
      'metric-brands-count',
      'metric-suppliers-count'
    ];
    metricIds.forEach((id) => {
      expect(html).toContain(`id="${id}"`);
    });
  });

  test('3. Metric card typography utilizes editorial system font with tabular numbers', () => {
    const metricCardInfoMatch = html.match(/\.metric-info h2\s*\{([\s\S]*?)\}/);
    expect(metricCardInfoMatch).not.toBeNull();
    const body = metricCardInfoMatch[1];
    expect(body).toContain('font-family: var(--font-sans)');
    expect(body).toContain('font-variant-numeric: tabular-nums');
  });

  test('4. Metric cards maintain paint-only hover without layout-shifting transforms or size jumps', () => {
    const cardHoverMatch = html.match(/\.metric-card:hover\s*\{([\s\S]*?)\}/);
    expect(cardHoverMatch).not.toBeNull();
    const body = cardHoverMatch[1];
    expect(body).not.toMatch(/\b(width|height|padding|margin)\s*:/);
    expect(body).not.toMatch(/\btranslateY\(/);
    expect(body).toContain('border-color');
    expect(body).toContain('box-shadow');
  });

  test('5. Dynamic SVG sales chart and category donut chart elements exist', () => {
    expect(html).toContain('id="dashboard-sales-chart"');
    expect(html).toContain('id="chart-dynamic-group"');
    expect(html).toContain('id="donut-dynamic-segments"');
    expect(html).toContain('id="donut-sales-count"');
  });

  test('6. Active store outlet banner is modernized with design tokens', () => {
    expect(html).toContain('id="dashboard-active-outlet-banner"');
    expect(html).toContain('id="dashboard-active-outlet-name"');
    expect(html).toContain('id="dashboard-active-outlet-status"');
  });

  test('7. All inline scripts compile cleanly with 0 errors', () => {
    expect(inlineScripts.length).toBeGreaterThan(0);
    inlineScripts.forEach((code) => {
      expect(() => {
        new vm.Script(code);
      }).not.toThrow();
    });
  });
});
