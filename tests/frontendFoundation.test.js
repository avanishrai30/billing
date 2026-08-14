const fs = require('fs');
const path = require('path');
const UI = require('../ui/components');

describe('Stage 13 Phase A + B: Frontend Foundation & Shared Primitives', () => {
  const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
  const themeCssPath = path.join(__dirname, '..', 'ui', 'theme.css');
  const componentsCssPath = path.join(__dirname, '..', 'ui', 'components.css');
  let htmlContent;
  let themeCss;
  let componentsCss;

  beforeAll(() => {
    htmlContent = fs.readFileSync(htmlPath, 'utf8');
    themeCss = fs.readFileSync(themeCssPath, 'utf8');
    componentsCss = fs.readFileSync(componentsCssPath, 'utf8');
  });

  // ==========================================
  // 1. DESIGN TOKENS (Phase A)
  // ==========================================

  test('1. ui/theme.css defines required surface, border, and semantic tokens', () => {
    expect(themeCss).toContain('--bg-app:');
    expect(themeCss).toContain('--bg-surface:');
    expect(themeCss).toContain('--bg-surface-raised:');
    expect(themeCss).toContain('--border-subtle:');
    expect(themeCss).toContain('--border-default:');
    expect(themeCss).toContain('--text-primary:');
    expect(themeCss).toContain('--text-secondary:');
    expect(themeCss).toContain('--accent-primary:');
    expect(themeCss).toContain('--accent-success:');
    expect(themeCss).toContain('--accent-warning:');
    expect(themeCss).toContain('--accent-danger:');
    expect(themeCss).toContain('--font-sans:');
    expect(themeCss).toContain('--font-mono:');
    expect(themeCss).toContain('--space-1:');
    expect(themeCss).toContain('--space-4:');
  });

  // ==========================================
  // 2. COMPONENT CSS PRIMITIVES (Phase B)
  // ==========================================

  test('2. ui/components.css defines styles for buttons, badges, tables, and cards', () => {
    expect(componentsCss).toContain('.btn');
    expect(componentsCss).toContain('.btn-primary');
    expect(componentsCss).toContain('.btn-secondary');
    expect(componentsCss).toContain('.btn-danger');
    expect(componentsCss).toContain('.status-badge');
    expect(componentsCss).toContain('.status-success');
    expect(componentsCss).toContain('.status-warning');
    expect(componentsCss).toContain('.status-danger');
    expect(componentsCss).toContain('.data-table-shell');
    expect(componentsCss).toContain('.metric-card-shell');
    expect(componentsCss).toContain('.pagination-shell');
    expect(componentsCss).toContain('.sync-badge');
    expect(componentsCss).toContain('.kbd-badge');
    expect(componentsCss).toContain('.skeleton-box');
  });

  // ==========================================
  // 3. UI HELPER LIBRARY (ui/components.js)
  // ==========================================

  test('3. UI.formatCurrency formats INR values with tabular commas', () => {
    expect(UI.formatCurrency(0)).toBe('₹0.00');
    expect(UI.formatCurrency(124500.5)).toBe('₹1,24,500.50');
    expect(UI.formatCurrency(350)).toBe('₹350.00');
  });

  test('4. UI.formatQuantityWithUnit formats loose and packaged quantities', () => {
    expect(UI.formatQuantityWithUnit(250, 'g', 'loose')).toBe('250 g');
    expect(UI.formatQuantityWithUnit(5, 'Units', 'packaged')).toBe('5 Units');
  });

  test('5. UI.renderButton generates semantic button HTML with hotkey badge', () => {
    const btnHtml = UI.renderButton({
      label: 'Checkout',
      variant: 'primary',
      size: 'lg',
      hotkey: 'Enter'
    });
    expect(btnHtml).toContain('btn btn-primary btn-lg');
    expect(btnHtml).toContain('Checkout');
    expect(btnHtml).toContain('<span class="kbd-badge">Enter</span>');
  });

  test('6. UI.renderStatusBadge generates status badges with semantic classes', () => {
    const badgeSuccess = UI.renderStatusBadge({ label: 'PAID', variant: 'success' });
    expect(badgeSuccess).toContain('status-badge status-success');
    expect(badgeSuccess).toContain('PAID');

    const badgeMono = UI.renderStatusBadge({ label: 'SKU-10024', variant: 'neutral', mono: true });
    expect(badgeMono).toContain('badge-mono');
    expect(badgeMono).toContain('SKU-10024');
  });

  test('7. UI.renderMetricCard generates metric card with tabular numbers', () => {
    const cardHtml = UI.renderMetricCard({
      label: 'Total Net Sales',
      value: '₹1,54,200.00',
      trend: '+12% vs last week'
    });
    expect(cardHtml).toContain('metric-card-shell');
    expect(cardHtml).toContain('Total Net Sales');
    expect(cardHtml).toContain('metric-value-tabular');
    expect(cardHtml).toContain('₹1,54,200.00');
  });

  test('8. UI.renderSyncBadge renders connection states', () => {
    expect(UI.renderSyncBadge('connected')).toContain('sync-dot-online');
    expect(UI.renderSyncBadge('connected')).toContain('Online');
    expect(UI.renderSyncBadge('syncing')).toContain('sync-dot-syncing');
    expect(UI.renderSyncBadge('offline')).toContain('sync-dot-offline');
  });

  // ==========================================
  // 4. HTML SHELL & INTEGRATION
  // ==========================================

  test('9. aiavro_billing_system.html links theme.css, components.css, and components.js', () => {
    expect(htmlContent).toContain('<link rel="stylesheet" href="/ui/theme.css">');
    expect(htmlContent).toContain('<link rel="stylesheet" href="/ui/components.css">');
    expect(htmlContent).toContain('<script src="/ui/components.js"></script>');
  });

  test('10. HTML shell has structured navigation groups and TopBar sync badge', () => {
    expect(htmlContent).toContain('Operations');
    expect(htmlContent).toContain('Relationships');
    expect(htmlContent).toContain('Control & Settings');
    expect(htmlContent).toContain('id="app-sync-status-badge"');
    expect(htmlContent).toContain('id="global-business-select"');
  });

  test('11. HTML shell contains all 12 operational views and key modal backdrops', () => {
    expect(htmlContent).toContain('id="view-dashboard"');
    expect(htmlContent).toContain('id="view-billing"');
    expect(htmlContent).toContain('id="view-inventory"');
    expect(htmlContent).toContain('id="view-purchase"');
    expect(htmlContent).toContain('id="view-businesses"');
    expect(htmlContent).toContain('id="view-customers"');
    expect(htmlContent).toContain('id="view-invoices"');
    expect(htmlContent).toContain('id="view-auditor"');
    expect(htmlContent).toContain('id="view-permissions"');
    expect(htmlContent).toContain('id="view-settings"');
    expect(htmlContent).toContain('id="view-scanner"');

    // Modals
    expect(htmlContent).toContain('id="invoice-modal"');
    expect(htmlContent).toContain('id="product-modal"');
    expect(htmlContent).toContain('id="transfer-stock-modal"');
    expect(htmlContent).toContain('id="pos-weight-modal"');
  });
});
