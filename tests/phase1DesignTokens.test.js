const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Phase 1: Master Design Tokens & Specification Suite', () => {
  let html;
  let designCss;
  let inlineScripts = [];

  beforeAll(() => {
    const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
    const cssPath = path.join(__dirname, '..', 'docs', 'billing_design_system.css');
    
    html = fs.readFileSync(htmlPath, 'utf8');
    designCss = fs.readFileSync(cssPath, 'utf8');

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

  test('1. Master design system CSS file exists and exports complete typography and color tokens', () => {
    expect(designCss).toContain('--font-sans');
    expect(designCss).toContain('--bg-primary: #f6f8f6');
    expect(designCss).toContain('--bg-panel: #ffffff');
    expect(designCss).toContain('--text-primary: #111f16');
    expect(designCss).toContain('--text-muted: #52695c');
    expect(designCss).toContain('--border-color: #e2e8e4');
    expect(designCss).toContain('--accent-green: #10b981');
    expect(designCss).toContain('--accent-gold: #f59e0b');
    expect(designCss).toContain('--accent-blue: #2563eb');
    expect(designCss).toContain('--accent-danger: #ef4444');
  });

  test('2. Master design system defines semantic radius scale and tabular numeric utility', () => {
    expect(designCss).toContain('--radius-sm: 10px');
    expect(designCss).toContain('--radius-md: 14px');
    expect(designCss).toContain('--radius-lg: 18px');
    expect(designCss).toContain('--radius-pill: 999px');
    expect(designCss).toContain('.tabular-nums');
    expect(designCss).toContain('font-variant-numeric: tabular-nums');
  });

  test('3. HTML file :root is synchronized with Phase 1 design tokens', () => {
    expect(html).toContain('--bg-primary: #f6f8f6');
    expect(html).toContain('--bg-panel: #ffffff');
    expect(html).toContain('--text-primary: #111f16');
    expect(html).toContain('--text-muted: #52695c');
    expect(html).toContain('--border-color: #e2e8e4');
    expect(html).toContain('--accent-green: #10b981');
    expect(html).toContain('font-family: var(--font-sans)');
  });

  test('4. Master design tokens strictly forbid transition: all', () => {
    expect(designCss).not.toContain('transition: all');
    expect(html).not.toMatch(/--transition:\s*all/);
  });

  test('5. GPU Compositing Policy: Zero global GPU promotion on design token rules', () => {
    expect(designCss).not.toContain('transform: translateZ(0)');
    expect(designCss).not.toContain('backface-visibility: hidden');
    expect(designCss).not.toContain('will-change');
  });

  test('6. All inline scripts compile cleanly with 0 syntax errors', () => {
    expect(inlineScripts.length).toBeGreaterThan(0);
    inlineScripts.forEach((code) => {
      expect(() => {
        new vm.Script(code);
      }).not.toThrow();
    });
  });
});
