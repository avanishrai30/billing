const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('DOM Manipulation Anti-Flicker & Atomic Rendering Suite', () => {
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

  test('1. Views do not trigger opacity flash or slideUp animations on view activation', () => {
    const appViewMatch = html.match(/\.app-view\s*\{([\s\S]*?)\}/);
    expect(appViewMatch).not.toBeNull();
    const body = appViewMatch[1];
    expect(body).not.toContain('slideUp');
    expect(body).not.toContain('opacity');
  });

  test('2. POS cart cards do not trigger bouncing/entry animations during quantity recalculation', () => {
    const cartCardMatch = html.match(/\.cart-item-card\s*\{([\s\S]*?)\}/);
    expect(cartCardMatch).not.toBeNull();
    const body = cartCardMatch[1];
    expect(body).not.toContain('itemEntry');
    expect(body).not.toContain('animation');
  });

  test('3. Sales Invoices table uses atomic in-memory batching (no empty-frame wipe)', () => {
    expect(html).toContain('function renderInvoicesTable');
    expect(html).toMatch(/const rowsHtml = sortedList\.map/);
    expect(html).toContain('tbody.innerHTML = rowsHtml');
  });

  test('4. runInvoiceFilter properly scopes user and avoids reference errors', () => {
    expect(html).toContain('function runInvoiceFilter');
    expect(html).toMatch(/function runInvoiceFilter\(\)\s*\{[\s\S]*?const user = state\.currentUser;/);
  });

  test('5. Master Inventory table populates dropdowns and rows in memory without empty flash', () => {
    expect(html).toContain('function renderInventoryTable');
    expect(html).toMatch(/const rowsHtml = list\.map/);
    expect(html).toContain('tbody.innerHTML = rowsHtml');
  });

  test('6. Customer CRM table updates rows atomically and does not thrash POS dropdown on search', () => {
    expect(html).toContain('function renderCustomersTable');
    expect(html).toMatch(/const rowsHtml = list\.map/);
    expect(html).toMatch(/if \(!filtered\)\s*\{[\s\S]*?posSelect/);
  });

  test('7. POS cart updates subtotal and cart items atomically in recalculatePOSTotals', () => {
    expect(html).toContain('function recalculatePOSTotals');
    expect(html).toMatch(/const cardsHtml = state\.cart\.map/);
    expect(html).toContain('tbody.innerHTML = cardsHtml');
  });

  test('8. Invoice Preview Modal and 58mm Thermal Receipt use atomic HTML generation', () => {
    expect(html).toContain('function openInvoicePreviewModal');
    expect(html).toMatch(/tbody\.innerHTML = \(inv\.items \|\| \[\]\)\.map/);
    expect(html).toMatch(/recItemsBody\.innerHTML = \(inv\.items \|\| \[\]\)\.map/);
  });

  test('9. All inline scripts compile cleanly with 0 errors', () => {
    expect(inlineScripts.length).toBeGreaterThan(0);
    inlineScripts.forEach((code) => {
      expect(() => {
        new vm.Script(code);
      }).not.toThrow();
    });
  });
});
