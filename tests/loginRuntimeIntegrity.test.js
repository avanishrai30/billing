const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('P0 Production Recovery: Login Runtime Integrity & JavaScript Parse Validation', () => {
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

  test('All inline scripts parse cleanly without SyntaxError', () => {
    expect(inlineScripts.length).toBeGreaterThan(0);
    inlineScripts.forEach((code, index) => {
      expect(() => {
        new vm.Script(code);
      }).not.toThrow();
    });
  });

  test('No duplicate segmentGroup or legendBox lexical declarations in buildCategoryPieChart', () => {
    const fnMatch = html.match(/function buildCategoryPieChart\(\)[\s\S]*?\n    \}/);
    expect(fnMatch).toBeTruthy();
    const fnBody = fnMatch[0];

    const segmentGroupDecls = fnBody.match(/(?:const|let|var)\s+segmentGroup\b/g) || [];
    const legendBoxDecls = fnBody.match(/(?:const|let|var)\s+legendBox\b/g) || [];

    expect(segmentGroupDecls.length).toBe(1);
    expect(legendBoxDecls.length).toBe(1);
  });

  test('Critical authentication and routing functions exist in source', () => {
    expect(html).toContain('function triggerLogin');
    expect(html).toContain('function toggleLoginPasswordVisibility');
    expect(html).toContain('function initAuthentication');
    expect(html).toContain('function switchView');
    expect(html).toContain('function syncStateWithServer');
    expect(html).toContain('function loadDatabaseState');
  });

  test('Login form has novalidate attribute and valid onsubmit handler', () => {
    expect(html).toMatch(/<form id="login-form"[^>]*novalidate[^>]*onsubmit="triggerLogin\(event\)"/);
  });

  test('Active-view-only rendering contract is preserved in syncStateWithServer', () => {
    expect(html).toMatch(/if\s*\(state\.activeView\s*===\s*'billing'\)\s*\{\s*renderPOSProducts\(\);/);
    expect(html).toMatch(/else\s+if\s*\(state\.activeView\s*===\s*'customers'\)/);
    expect(html).toMatch(/else\s+if\s*\(state\.activeView\s*===\s*'invoices'\)/);
    expect(html).toMatch(/else\s+if\s*\(state\.activeView\s*===\s*'dashboard'\)/);
  });

  test('Chart functions have defensive null checks before DOM access', () => {
    expect(html).toMatch(/function buildSVGSalesChart\(\)\s*\{[\s\S]*?if\s*\(!dynamicGroup\)\s*return;/);
    expect(html).toMatch(/function buildCategoryPieChart\(\)\s*\{[\s\S]*?if\s*\(!segmentGroup\s*\|\|\s*!legendBox\)\s*return;/);
  });

  test('No extraneous SSO or phone mockup elements on login surface', () => {
    expect(html).not.toContain('Sign in with Google');
    expect(html).not.toContain('Sign in with Microsoft');
    expect(html).not.toContain('phone-mockup-frame');
  });
});
